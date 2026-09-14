import pg from "pg";
import fs from "fs";

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_grldnN9hjkc7@ep-dark-poetry-az6rk6ec-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const outFile = process.argv[2] || `backup_${new Date().toISOString().slice(0,10)}.sql`;

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("Connected, dumping...");

let sql = `-- Advrix CRM full backup\n-- Generated: ${new Date().toISOString()}\n-- DB: neondb (branch production br-calm-feather-az3up18a)\n\\nSET statement_timeout = 0;\nSET lock_timeout = 0;\nSET idle_in_transaction_session_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\nSET check_function_bodies = false;\nSET xmloption = content;\nSET client_min_messages = warning;\nSET row_security = off;\n\n`;

// Extensions
const exts = await client.query(`SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql') ORDER BY extname`);
for (const r of exts.rows) {
  sql += `CREATE EXTENSION IF NOT EXISTS "${r.extname}" WITH SCHEMA public;\n`;
}
if (exts.rows.length) sql += `\n`;

// Get tables - all user schemas
const tablesRes = await client.query(`
  SELECT schemaname, tablename FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog','information_schema','pg_toast')
  ORDER BY schemaname, tablename
`);
console.log(`Found ${tablesRes.rows.length} tables:`, tablesRes.rows.map(r=>r.tablename).join(", "));

for (const { schemaname, tablename } of tablesRes.rows) {
  const fq = `"${schemaname}"."${tablename}"`;
  console.log(` - dumping ${fq}...`);

  // Drop
  sql += `\n-- Table: ${fq}\nDROP TABLE IF EXISTS ${fq} CASCADE;\n`;

  // Build CREATE from columns + defaults (approx, includes types)
  const cols = await client.query(`
    SELECT column_name, udt_name, character_maximum_length, numeric_precision, numeric_scale,
           is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_schema=$1 AND table_name=$2
    ORDER BY ordinal_position
  `, [schemaname, tablename]);

  const colDefs = cols.rows.map(c => {
    let t = c.udt_name;
    // map some udt_names to nicer types
    // Keep as-is for fidelity, but handle length
    let typ = t;
    if (c.character_maximum_length && (t==='varchar' || t==='bpchar')) typ = `${t}(${c.character_maximum_length})`;
    else if (t==='numeric' && c.numeric_precision) typ = `numeric(${c.numeric_precision},${c.numeric_scale})`;
    let def = `  "${c.column_name}" ${typ}`;
    if (c.is_nullable === 'NO') def += ' NOT NULL';
    if (c.column_default) def += ` DEFAULT ${c.column_default}`;
    return def;
  }).join(',\n');

  sql += `CREATE TABLE ${fq} (\n${colDefs}\n);\n`;

  // Constraints (pkey, unique, fk, check) via pg_get_constraintdef
  const cons = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = $1::regclass
    ORDER BY conname
  `, [`${schemaname}.${tablename}`]);
  for (const c of cons.rows) {
    sql += `ALTER TABLE ONLY ${fq} ADD CONSTRAINT "${c.conname}" ${c.def};\n`;
  }

  // Indexes (excluding those backing constraints)
  const idx = await client.query(`
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname=$1 AND tablename=$2
    ORDER BY indexname
  `, [schemaname, tablename]);
  for (const r of idx.rows) {
    // Skip indexes that are constraint-backed (they contain UNIQUE and same as constraint)
    // Keep all for fidelity – IF NOT EXISTS
    const isConstraint = cons.rows.some(c => r.indexdef.includes(`"${c.conname}"`) || r.indexdef.includes(c.conname));
    // still add if not constraint, to preserve performance indexes
    if (!isConstraint) {
      sql += `${r.indexdef};\n`;
    }
  }

  // Data
  const data = await client.query(`SELECT * FROM ${fq}`);
  if (data.rows.length === 0) {
    sql += `-- no rows in ${fq}\n`;
    continue;
  }
  const colNames = cols.rows.map(c => `"${c.column_name}"`).join(', ');
  sql += `\n-- Data: ${data.rows.length} rows\n`;
  // Batch inserts 500 rows per statement
  const batchSize = 500;
  for (let i = 0; i < data.rows.length; i += batchSize) {
    const batch = data.rows.slice(i, i + batchSize);
    const values = batch.map(row => {
      const vals = cols.rows.map(c => {
        const v = row[c.column_name];
        if (v === null || v === undefined) return 'NULL';
        const t = c.udt_name;
        if (t === 'bool') return v ? 'true' : 'false';
        if (['int2','int4','int8','float4','float8','numeric'].includes(t)) return String(v);
        if (v instanceof Date) return `'${v.toISOString()}'`;
        // json/jsonb
        if (t === 'json' || t === 'jsonb') {
          const j = JSON.stringify(v).replace(/'/g, "''");
          return `'${j}'::${t}`;
        }
        // uuid, text, varchar, etc – escape single quotes
        const s = String(v).replace(/'/g, "''");
        return `'${s}'`;
      }).join(', ');
      return `(${vals})`;
    }).join(',\n');
    sql += `INSERT INTO ${fq} (${colNames}) VALUES\n${values};\n`;
  }
}

sql += `\n-- Done\n`;

fs.writeFileSync(outFile, sql, 'utf8');
const stat = fs.statSync(outFile);
console.log(`\nBackup written: ${outFile} (${(stat.size/1024/1024).toFixed(2)} MB)`);
await client.end();
