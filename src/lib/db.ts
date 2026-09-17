import "@/lib/env";
import { Pool, types } from "@neondatabase/serverless";

// node-postgres parses date/timestamp columns into JS Date objects by default;
// the rest of the app expects the ISO strings the HTTP driver always returned
// (they are sliced/formatted/comparison-sorted as strings). Pin these parsers
// to the raw text form so nothing silently changes behavior.
types.setTypeParser(1082, (v: string) => v); // date
types.setTypeParser(1114, (v: string) => v); // timestamp
types.setTypeParser(1184, (v: string) => v); // timestamptz

const connectionString = process.env.DATABASE_URL;

// One pooled set of connections per server instance. Holding it on globalThis
// keeps Next.js dev/HMR from leaking whole pools on every module re-eval.
declare global {
  // eslint-disable-next-line no-var
  var __advrixPool: Pool | undefined;
}

function getPool(): Pool {
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!globalThis.__advrixPool) {
    globalThis.__advrixPool = new Pool({
      connectionString,
      max: 6,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    globalThis.__advrixPool.on("error", (err) =>
      console.error("advrix pg pool error", err)
    );
  }
  return globalThis.__advrixPool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

/** Interpolates a tagged-template SQL call into ($1, $2, …) placeholders. */
function joinTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}` + strings[i + 1];
  return text;
}

/**
 * Execute multiple statements inside one PostgreSQL transaction.
 * The callback receives a tagged-template SQL function (returns rows) that
 * runs on the same pooled connection.
 */
export async function transaction<T = void>(
  fn: (sql: any) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const sql = (strings: TemplateStringsArray, ...values: unknown[]) =>
      client.query(joinTemplate(strings, values)).then((r) => r.rows);
    const out = await fn(sql);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw e;
  } finally {
    client.release();
  }
}