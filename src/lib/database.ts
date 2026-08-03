import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured in environment variables");
}

// Global SQL client for executing raw queries
export const sql = neon(databaseUrl);