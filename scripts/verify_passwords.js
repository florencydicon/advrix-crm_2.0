const bcrypt = require("bcryptjs");
const pg = require("pg");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const connectionString = match[1].replace(/"/g, "");

const pool = new pg.Pool({ connectionString });

(async () => {
  const users = await pool.query("SELECT id, email, password_hash FROM users ORDER BY email");
  console.log(`Found ${users.rowCount} users`);

  let fixed = 0;
  for (const u of users.rows) {
    const valid = bcrypt.compareSync("password123", u.password_hash);
    if (!valid) {
      const hash = bcrypt.hashSync("password123", 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, u.id]);
      console.log("FIXED:", u.email);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} users`);

  // Verify all
  const verify = await pool.query("SELECT email, password_hash FROM users");
  let allOk = true;
  for (const u of verify.rows) {
    const valid = bcrypt.compareSync("password123", u.password_hash);
    if (!valid) {
      console.log("STILL FAIL:", u.email);
      allOk = false;
    }
  }
  if (allOk) console.log("All users can login with password123!");

  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
