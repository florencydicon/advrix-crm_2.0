import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const leaveReasons = [
  "Family function to attend", "Not feeling well", "Personal work", "Doctor appointment",
  "Wedding in family", "Child's school event", "House shifting", "Visa appointment",
  "Family emergency", "Dental surgery", "Cold and fever", "Migraine",
  "Parent-teacher meeting", "Car breakdown", "Relative visiting from abroad",
];

const leaveTypes = ["sick", "casual", "earned", "unpaid", "emergency"];
const leaveStatuses = ["pending", "approved", "approved", "approved", "rejected"];

async function run() {
  console.log("Checking current data...");

  const counts = {};
  for (const t of ["attendance", "leaves"]) {
    const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
    counts[t] = parseInt(r.rows[0].count);
  }
  console.log(`  attendance: ${counts.attendance} records`);
  console.log(`  leaves: ${counts.leaves} records`);

  // ---------- Get staff users ----------
  const staffUsers = await pool.query(`
    SELECT u.id, r.key as role_key
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.key IN ('DESIGNER', 'EDITOR', 'WRITER', 'SMM')
  `);
  console.log(`\nFound ${staffUsers.rows.length} staff users`);

  // ---------- Seed attendance (batch) ----------
  console.log("\nSeeding attendance data (last 30 days)...");
  const existingAttendance = await pool.query(
    `SELECT user_id, date FROM attendance`
  );
  const existingSet = new Set(existingAttendance.rows.map((r) => `${r.user_id}:${r.date}`));

  let attendanceCount = 0;
  const attendanceValues = [];
  const attendanceParams = [];
  let paramIdx = 1;

  for (const user of staffUsers.rows) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0) continue; // Skip Sundays

      const dateStr = date.toISOString().slice(0, 10);
      if (existingSet.has(`${user.id}:${dateStr}`)) continue;

      const isPresent = Math.random() > 0.15;
      const isLate = isPresent && Math.random() > 0.8;

      let status = "present";
      let punchIn = null;
      let punchOut = null;
      let hours = 0;

      if (isPresent) {
        const baseHour = isLate ? rand(10, 11) : rand(8, 9);
        const baseMinute = rand(0, 59);
        const inDate = new Date(date);
        inDate.setHours(baseHour, baseMinute, 0);
        punchIn = inDate.toISOString();

        const outDate = new Date(date);
        outDate.setHours(rand(17, 20), rand(0, 59), 0);
        punchOut = outDate.toISOString();

        hours = Math.round(((outDate.getTime() - inDate.getTime()) / 3600000) * 100) / 100;
        status = isLate ? "late" : "present";
      } else {
        status = "absent";
      }

      attendanceValues.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
      attendanceParams.push(user.id, dateStr, punchIn, punchOut, status, hours);
      paramIdx += 6;
      attendanceCount++;

      // Insert in batches of 100
      if (attendanceValues.length >= 100) {
        await pool.query(
          `INSERT INTO attendance (user_id, date, punch_in, punch_out, status, hours_worked) VALUES ${attendanceValues.join(", ")} ON CONFLICT DO NOTHING`,
          attendanceParams
        );
        attendanceValues.length = 0;
        attendanceParams.length = 0;
        paramIdx = 1;
      }
    }
  }

  // Insert remaining
  if (attendanceValues.length > 0) {
    await pool.query(
      `INSERT INTO attendance (user_id, date, punch_in, punch_out, status, hours_worked) VALUES ${attendanceValues.join(", ")} ON CONFLICT DO NOTHING`,
      attendanceParams
    );
  }
  console.log(`  - Created ${attendanceCount} new attendance records`);

  // ---------- Seed leaves ----------
  console.log("\nSeeding leave applications...");
  const adminId = await pool.query(`SELECT id FROM users WHERE email = 'admin@advrix.agency'`);

  let leaveCount = 0;
  const leaveValues = [];
  const leaveParams = [];
  let leaveParamIdx = 1;

  for (const user of staffUsers.rows) {
    const numLeaves = rand(0, 3);
    for (let l = 0; l < numLeaves; l++) {
      const status = pick(leaveStatuses);
      const startDateValues = new Date();
      startDateValues.setDate(startDateValues.getDate() - rand(5, 30));
      const startDate = startDateValues.toISOString().slice(0, 10);
      const days = rand(1, 4);
      const endDate = new Date(startDateValues);
      endDate.setDate(endDate.getDate() + days - 1);
      const endDateStr = endDate.toISOString().slice(0, 10);

      leaveValues.push(`($${leaveParamIdx}, $${leaveParamIdx + 1}, $${leaveParamIdx + 2}, $${leaveParamIdx + 3}, $${leaveParamIdx + 4}, $${leaveParamIdx + 5}, $${leaveParamIdx + 6}, $${leaveParamIdx + 7}, $${leaveParamIdx + 8})`);
      leaveParams.push(
        user.id,
        pick(leaveTypes),
        startDate,
        endDateStr,
        days,
        pick(leaveReasons),
        status,
        status !== "pending" && adminId.rows[0] ? adminId.rows[0].id : null,
        status !== "pending" ? new Date().toISOString() : null
      );
      leaveParamIdx += 9;
      leaveCount++;

      if (leaveValues.length >= 100) {
        await pool.query(
          `INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) VALUES ${leaveValues.join(", ")}`,
          leaveParams
        );
        leaveValues.length = 0;
        leaveParams.length = 0;
        leaveParamIdx = 1;
      }
    }
  }

  if (leaveValues.length > 0) {
    await pool.query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) VALUES ${leaveValues.join(", ")}`,
      leaveParams
    );
  }
  console.log(`  - Created ${leaveCount} new leave applications`);

  // ---------- Summary ----------
  console.log("\n========================================");
  console.log("SEED COMPLETE!");
  console.log("========================================");
  for (const t of ["clients", "projects", "tasks", "users", "attendance", "leaves", "project_deliverables"]) {
    const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
