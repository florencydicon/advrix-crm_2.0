const fs = require("fs");
const { Client } = require("pg");
(async () => {
  const env = fs.readFileSync("./.env.local", "utf8");
  const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    `SELECT u.full_name, u.email, r.key role_key, f.platform, left(f.token,12) tok, f.created_at
     FROM fcm_tokens f JOIN users u ON u.id=f.user_id LEFT JOIN roles r ON r.id=u.role_id
     ORDER BY f.created_at DESC`
  );
  console.log(JSON.stringify(r.rows, null, 1));
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });