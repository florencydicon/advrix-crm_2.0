import "@/lib/env";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

// One client per instance instead of re-creating on every query. The dominant
// cost is the network round trip to the Neon region; reusing the same function
// avoids per-query setup overhead so warm queries stay on the fastest path.
let client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  if (!client) client = neon(connectionString);
  return client;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await getClient()(text, params)) as T[];
}

/**
 * Execute multiple SQL statements inside a single PostgreSQL transaction.
 * Uses Neon serverless's built-in transaction support.
 * The callback receives a tagged-template SQL function and returns any result.
 */
export async function transaction<T = void>(
  fn: (sql: any) => Promise<T>
): Promise<T> {
  const c = getClient();
  // Neon's transaction callback expects a sync return of query array, but
  // the async callback pattern is supported at runtime. Cast to satisfy TS types.
  return (c.transaction as any)(fn) as Promise<T>;
}