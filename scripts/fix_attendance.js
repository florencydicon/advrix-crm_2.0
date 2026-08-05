const pg = require("pg");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const connectionString = match[1].replace(/"/g, "");

const pool = new pg.Pool({ connectionString });

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

(async () => {
  console.log("Fixing attendance records with same punch_in and punch_out...");

  // Get all attendance records
  const records = await pool.query(
    "SELECT id, date, punch_in, punch_out FROM attendance WHERE punch_in IS NOT NULL"
  );

  let fixed = 0;
  for (const rec of records.rows) {
    const punchIn = new Date(rec.punch_in);
    let punchOut = rec.punch_out ? new Date(rec.punch_out) : null;

    // If punch_out is same as punch_in or before punch_in, fix it
    if (!punchOut || punchOut.getTime() <= punchIn.getTime()) {
      punchOut = new Date(punchIn.getTime() + (rand(7, 10) * 3600000) + rand(0, 59) * 60000);
      const hours = Math.round(((punchOut.getTime() - punchIn.getTime()) / 3600000) * 100) / 100;

      await pool.query(
        "UPDATE attendance SET punch_out = $1, hours_worked = $2 WHERE id = $3",
        [punchOut.toISOString(), hours, rec.id]
      );
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} attendance records`);

  // Verify
  const verify = await pool.query(
    "SELECT COUNT(*) as total, COUNT(CASE WHEN punch_out > punch_in THEN 1 END) as valid FROM attendance WHERE punch_in IS NOT NULL"
  );
  console.log(`Total records: ${verify.rows[0].total}, Valid (punch_out > punch_in): ${verify.rows[0].valid}`);

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
