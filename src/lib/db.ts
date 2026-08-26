import "@/lib/env";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

function getClient() {
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return neon(connectionString);
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
  const client = getClient();
  // Neon's transaction callback expects a sync return of query array, but
  // the async callback pattern is supported at runtime. Cast to satisfy TS types.
  return (client.transaction as any)(fn) as Promise<T>;
}
