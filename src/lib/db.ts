import "@/lib/env";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

export const sql = neon(connectionString);

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await sql(text, params)) as T[];
}