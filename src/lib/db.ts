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