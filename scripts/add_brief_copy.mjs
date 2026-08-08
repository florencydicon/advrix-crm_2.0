// Adds `brief_copy` to tasks so visual tasks can surface the approved WRITER copy.
import { neon } from "@neondatabase/serverless";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
delete process.env.DATABASE_URL;
process.loadEnvFile(join(rootDir, ".env.local"));

const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brief_copy TEXT`;
console.log("tasks.brief_copy added");

// Backfill: for each visual task, pull the approved copy from its paired content task.
const backfilled = await sql`
  UPDATE tasks v
  SET brief_copy = c.content
  FROM tasks c
  WHERE v.project_id = c.project_id
    AND v.deliverable_id = c.deliverable_id
    AND v.deliverable_id IS NOT NULL
    AND v.sequence = 2
    AND c.sequence = 1
    AND c.content IS NOT NULL
    AND v.brief_copy IS NULL
`;
console.log("backfilled visual brief_copy rows:", backfilled.length);
