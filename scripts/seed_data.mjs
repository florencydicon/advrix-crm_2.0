import { readFileSync } from "fs";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- Name pools ----------
const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Ananya", "Diya", "Myra", "Sara", "Aanya", "Aadhya", "Isha", "Riya", "Priya", "Shruti",
  "Rohan", "Karan", "Rahul", "Amit", "Saurabh", "Vikram", "Deepak", "Manish", "Suresh", "Rajesh",
  "Pooja", "Neha", "Kavita", "Sunita", "Meera", "Lakshmi", "Swati", "Pallavi", "Nisha", "Divya",
  "Nikhil", "Gaurav", "Yash", "Harsh", "Ashwin", "Pranav", "Siddharth", "Varun", "Tarun", "Nitin",
  "Sneha", "Tanvi", "Ankita", "Ritika", "Simran", "Nikita", "Ishita", "Anushka", "Krisha", "Jhanvi",
  "Mohammad", "Arif", "Rizwan", "Imran", "Salman", "Farhan", "Aman", "Shubham", "Abhishek", "Mayank",
];

const lastNames = [
  "Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Nair", "Menon", "Iyer",
  "Joshi", "Desai", "Mehta", "Shah", "Rao", "Pillai", "Chatterjee", "Banerjee", "Mukherjee", "Das",
  "Agarwal", "Bhatia", "Malhotra", "Kapoor", "Saxena", "Tiwari", "Pandey", "Dubey", "Srivastava", "Mishra",
  "Chopra", "Sethi", "Arora", "Thakur", "Sinha", "Ray", "Bose", "Sen", "Ghosh", "Chowdhury",
  "Rathod", "Chauhan", "Rajput", "Tomar", "Pawar", "More", "Kadam", "Patil", "Shinde", "Bhosale",
];

const companies = [
  "Lumina Cosmetics", "Aryush Heights", "TechNova Solutions", "GreenLeaf Organics", "Urban Threads",
  "Stellar Hotels", "FreshBite Foods", "DriveEasy Motors", "CloudNine Software", "EduBright Academy",
  "FitLife Gyms", "HomeStyle Interiors", "PixelPerfect Studios", "SwiftLogistics", "Golden Harvest Farms",
  "BlueWave Travels", "Diamond Jewels", "SmartGadgets", "PureWater Co", "Royal Bakery",
  "Zenith Pharma", "NovaTech Industries", "Crimson Couture", "Silverline Finance", "Horizon Realty",
  "Aroma Coffee", "Velocity Sports", "Tranquil Spas", "ElectroWorld", "Nature's Basket",
  "Pinnacle Architects", "Radiant Skin Clinic", "Summit Consulting", "Vibrant Events", "Cozy Homes",
  "Gourmet Bites", "TechSavvy Solutions", "Elite Motors", "Bloom Florists", "Peak Performance",
  "Stellar Marketing", "Innovation Labs", "DreamWaves Media", "Atlas Logistics", "Prism Digital",
  "Cascade Beverages", "Mosaic Arts", "Echo Music", "Flame Grills", "Orbit Space Tech",
  "Maple Interiors", "Jade Wellness", "Fusion Cuisine", "Nova Pharmaceuticals", "Zen Garden",
  "Apex Construction", "Breezy Fashions", "Crystal Clear Water", "Dazzling Events", "Eagle Eye Security",
  "Fresh Farms", "Grand Hotels", "Harmony Music", "Infinity Tech", "Jubilant Foods",
  "Keen Vision", "Lucky Star Gaming", "Majestic Builders", "Nimbus Cloud", "Omega Auto",
  "Pearl Hospital", "Quantum Labs", "Radiant Solar", "Skyline Towers", "Titan Steel",
  "Ultimate Fitness", "Vantage Point", "Zenith Motors", "Blaze Marketing", "Crest Foods",
];

const projectNames = [
  "Q3 Content Campaign", "Brand Launch", "Social Media Strategy", "Website Rebrand", "Product Shoot",
  "Festival Campaign", "New Year Special", "Summer Collection", "Diwali Dhamaka", "Grand Opening",
  "Influencer Collab", "Video Series", "Podcast Launch", "Email Newsletter", "SEO Optimization",
  "App Launch", "Customer Testimonial", "Behind the Scenes", "Monthly Posts", "Reel Series",
  "Logo Redesign", "Packaging Design", "Catalog Shoot", "Menu Design", "Brochure Design",
  "Trade Show Booth", "Billboard Campaign", "Radio Spot", "TV Commercial", "YouTube Series",
  "LinkedIn Campaign", "Twitter Strategy", "Facebook Ads", "Instagram Growth", "Pinterest Strategy",
];

const leaveReasons = [
  "Family function to attend", "Not feeling well", "Personal work", "Doctor appointment",
  "Wedding in family", "Child's school event", "House shifting", "Visa appointment",
  "Family emergency", "Dental surgery", "Cold and fever", "Migraine",
  "Parent-teacher meeting", "Car breakdown", "Relative visiting from abroad",
];

const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"];

// ---------- Helpers ----------
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function randomEmail(first, last) {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "company.in", "workmail.com"];
  return `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@${pick(domains)}`;
}

function randomPhone() {
  return `+91 ${rand(70000, 99999)} ${rand(10000, 99999)}`;
}

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysAgo));
  return d.toISOString().slice(0, 10);
}

async function run() {
  const sql = readFileSync(new URL("./seed_data.sql", import.meta.url), "utf8");

  const statements = sql
    .replace(/--[^\n]*/g, "") // Remove all single-line comments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = await pool.connect();
  try {
    let i = 0;
    for (const stmt of statements) {
      i++;
      try {
        await client.query(stmt);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log("SKIP:", stmt.slice(0, 50) + "...");
        } else {
          console.log(`\nERROR on statement ${i}:`);
          console.log(stmt.slice(0, 200));
          throw err;
        }
      }
    }
    console.log(`\nBase tables ready! (${i} statements executed)`);
  } finally {
    client.release();
  }

  // ---------- Seed users ----------
  console.log("\nSeeding users...");

  const roleMap = {};
  const roles = await pool.query(`SELECT id, key FROM roles`);
  for (const r of roles.rows) roleMap[r.key] = r.id;

  const roleGroups = {
    DESIGNER: [],
    EDITOR: [],
    WRITER: [],
    SMM: [],
    VIDEOGRAPHER: [],
  };

  // 20 Designers
  for (let i = 0; i < 20; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const email = `designer${i + 1}@advrix.agency`;
    roleGroups.DESIGNER.push({ first, last, email });
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`${first} ${last}`, email, "hashed_password_123", roleMap["DESIGNER"]]
    );
  }

  // 15 Video Editors
  for (let i = 0; i < 15; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const email = `editor${i + 1}@advrix.agency`;
    roleGroups.EDITOR.push({ first, last, email });
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`${first} ${last}`, email, "hashed_password_123", roleMap["EDITOR"]]
    );
  }

  // 15 Content Writers
  for (let i = 0; i < 15; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const email = `writer${i + 1}@advrix.agency`;
    roleGroups.WRITER.push({ first, last, email });
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`${first} ${last}`, email, "hashed_password_123", roleMap["WRITER"]]
    );
  }

  // 5 Social Media Managers
  for (let i = 0; i < 5; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const email = `smm${i + 1}@advrix.agency`;
    roleGroups.SMM.push({ first, last, email });
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`${first} ${last}`, email, "hashed_password_123", roleMap["SMM"]]
    );
  }

  // 5 Videographers
  for (let i = 0; i < 5; i++) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const email = `videographer${i + 1}@advrix.agency`;
    roleGroups.VIDEOGRAPHER.push({ first, last, email });
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [`${first} ${last}`, email, "hashed_password_123", roleMap["VIDEOGRAPHER"]]
    );
  }

  console.log(`  - 20 Designers, 15 Editors, 15 Writers, 5 SMM, 5 Videographers`);

  // ---------- Seed clients (160) ----------
  console.log("\nSeeding 160 clients...");
  const clientIds = [];
  for (let i = 0; i < 160; i++) {
    const name = pick(firstNames) + " " + pick(lastNames);
    const company = pick(companies);
    const email = `contact@${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    const phone = randomPhone();
    const result = await pool.query(
      `INSERT INTO clients (name, company, email, phone) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, company, email, phone]
    );
    clientIds.push(result.rows[0].id);
  }

  // ---------- Seed deliverable types ----------
  console.log("\nChecking deliverable types...");
  const dtCount = await pool.query(`SELECT COUNT(*) FROM deliverable_types`);
  if (parseInt(dtCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO deliverable_types (key, label, content_role, visual_role, default_qty, sort) VALUES
      ('static_post', 'Static Post', 'WRITER', 'DESIGNER', 5, 1),
      ('reel', 'Reel', 'WRITER', 'EDITOR', 3, 2),
      ('story', 'Story', 'WRITER', 'DESIGNER', 5, 3),
      ('video_shoot', 'Video Shoot', NULL, 'VIDEOGRAPHER', 2, 4),
      ('video_edit', 'Video Edit', NULL, 'EDITOR', 2, 5),
      ('banner', 'Banner', 'WRITER', 'DESIGNER', 3, 6),
      ('content_piece', 'Content Piece', 'WRITER', NULL, 4, 7)
    `);
    console.log("  - Inserted 7 deliverable types");
  }

  // ---------- Seed projects (175) ----------
  console.log("\nSeeding 175 projects...");
  const projectStatuses = ["in_progress", "in_progress", "in_progress", "in_progress", "completed", "completed", "rejected"];
  const projectIds = [];

  for (let i = 0; i < 175; i++) {
    const name = `${pick(companies)} — ${pick(projectNames)}`;
    const status = pick(projectStatuses);
    const clientId = pick(clientIds);
    const deadline = randomDate(60);
    const brief = `Campaign for ${pick(cities)} market. Focus on brand awareness and engagement.`;

    const result = await pool.query(
      `INSERT INTO projects (client_id, name, status, brief, deadline, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [clientId, name, status, brief, deadline, randomDate(90)]
    );
    projectIds.push(result.rows[0].id);

    // Add project deliverables for some projects
    if (Math.random() > 0.4) {
      const numDeliveries = rand(1, 3);
      for (let d = 0; d < numDeliveries; d++) {
        const dt = pick([
          { key: "static_post", label: "Static Post" },
          { key: "reel", label: "Reel" },
          { key: "story", label: "Story" },
          { key: "banner", label: "Banner" },
        ]);
        await pool.query(
          `INSERT INTO project_deliverables (project_id, category_key, category_label, quantity) VALUES ($1, $2, $3, $4)`,
          [result.rows[0].id, dt.key, dt.label, rand(2, 8)]
        );
      }
    }
  }

  // ---------- Seed tasks for in_progress projects ----------
  console.log("\nSeeding tasks for active projects...");
  const taskStatuses = ["pending", "in_progress", "review", "completed"];
  let totalTasks = 0;

  for (const pid of projectIds) {
    const pResult = await pool.query(`SELECT status FROM projects WHERE id = $1`, [pid]);
    if (pResult.rows[0].status !== "in_progress") continue;

    const numTasks = rand(3, 8);
    for (let t = 0; t < numTasks; t++) {
      const roleKey = pick(["WRITER", "DESIGNER", "EDITOR", "SMM"]);
      const status = pick(taskStatuses);
      const title = `${pick(["Static Post", "Reel", "Story", "Banner", "Video", "Content"])} ${rand(1, 20)} — ${pick(["Content & Copy", "Visual", "Edit", "Post"])}`;

      await pool.query(
        `INSERT INTO tasks (project_id, step_key, group_key, role_key, title, status, priority, due_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pid, "content_pipeline", "Content Pipeline", roleKey, title, status, pick(["low", "medium", "high"]), randomDate(30), randomDate(45)]
      );
      totalTasks++;
    }
  }
  console.log(`  - Created ${totalTasks} tasks`);

  // ---------- Seed attendance (last 30 days for all staff) ----------
  console.log("\nSeeding attendance data (last 30 days)...");
  const staffUsers = await pool.query(`SELECT id FROM users WHERE role_id IN ($1, $2, $3, $4)`,
    [roleMap["DESIGNER"], roleMap["EDITOR"], roleMap["WRITER"], roleMap["SMM"]]
  );

  let attendanceCount = 0;
  for (const user of staffUsers.rows) {
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);

      // Skip weekends occasionally
      if (date.getDay() === 0) continue;

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

      await pool.query(
        `INSERT INTO attendance (user_id, date, punch_in, punch_out, status, hours_worked) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [user.id, dateStr, punchIn, punchOut, status, hours]
      );
      attendanceCount++;
    }
  }
  console.log(`  - Created ${attendanceCount} attendance records`);

  // ---------- Seed leaves (sample applications) ----------
  console.log("\nSeeding leave applications...");
  const leaveTypes = ["sick", "casual", "earned", "unpaid", "emergency"];
  const leaveStatuses = ["pending", "approved", "approved", "approved", "rejected"];
  const adminId = await pool.query(`SELECT id FROM users WHERE email = 'admin@advrix.agency'`);

  let leaveCount = 0;
  for (const user of staffUsers.rows) {
    const numLeaves = rand(0, 3);
    for (let l = 0; l < numLeaves; l++) {
      const status = pick(leaveStatuses);
      const startDate = randomDate(30);
      const days = rand(1, 4);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);

      await pool.query(
        `INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason, status, approved_by, approved_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          pick(leaveTypes),
          startDate,
          endDate.toISOString().slice(0, 10),
          days,
          pick(leaveReasons),
          status,
          status !== "pending" && adminId.rows[0] ? adminId.rows[0].id : null,
          status !== "pending" ? new Date().toISOString() : null,
        ]
      );
      leaveCount++;
    }
  }
  console.log(`  - Created ${leaveCount} leave applications`);

  // ---------- Summary ----------
  console.log("\n========================================");
  console.log("SEED COMPLETE!");
  console.log("========================================");
  const counts = await pool.query(`
    SELECT 'clients' as tbl, COUNT(*) as cnt FROM clients
    UNION ALL SELECT 'projects', COUNT(*) FROM projects
    UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
    UNION ALL SELECT 'users', COUNT(*) FROM users
    UNION ALL SELECT 'attendance', COUNT(*) FROM attendance
    UNION ALL SELECT 'leaves', COUNT(*) FROM leaves
    UNION ALL SELECT 'project_deliverables', COUNT(*) FROM project_deliverables
  `);
  for (const row of counts.rows) {
    console.log(`  ${row.tbl}: ${row.cnt}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
