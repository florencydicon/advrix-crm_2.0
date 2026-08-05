const bcrypt = require("bcryptjs");
const pg = require("pg");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const hash = bcrypt.hashSync("password123", 10);
  console.log("Generated hash:", hash);

  // Update all @advrix.agency users
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email LIKE $2",
    [hash, "%@advrix.agency"]
  );
  console.log("Updated", result.rowCount, "users");

  // Also update any other users that might exist
  const result2 = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE password_hash NOT LIKE '$2a$%'",
    [hash]
  );
  console.log("Updated", result2.rowCount, "additional users with invalid hashes");

  // Verify a user
  const test = await pool.query("SELECT email, password_hash FROM users LIMIT 3");
  for (const row of test.rows) {
    const valid = bcrypt.compareSync("password123", row.password_hash);
    console.log(`  ${row.email}: hash starts with "${row.password_hash.substring(0, 7)}" -> ${valid ? "OK" : "FAIL"}`);
  }

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
