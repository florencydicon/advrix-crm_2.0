import { neon } from "@neondatabase/serverless";

// 🚀 Bypass .env completely to fix folder mismatch issue
const databaseUrl = "postgresql://neondb_owner:npg_grldnN9hjkc7@ep-dark-poetry-az6rk6ec-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const sql = neon(databaseUrl);