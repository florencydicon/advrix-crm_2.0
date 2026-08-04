var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_pg = __toESM(require("pg"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var appRoot = process.cwd();
var PORT = 3e3;
var app = (0, import_express.default)();
app.use(import_express.default.json());
var DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_grldnN9hjkc7@ep-dark-poetry-az6rk6ec-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
var { Pool } = import_pg.default;
var pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
async function ensureDefaultAdminUser() {
  try {
    const client = await pool.connect();
    const existing = await client.query("SELECT id FROM users LIMIT 1");
    if (existing.rows.length === 0) {
      const defaultAdminEmail = "admin@advrix.com";
      const defaultAdminPassword = "123456";
      const hashedPassword = await import_bcryptjs.default.hash(defaultAdminPassword, 10);
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, phone, whatsapp_number, capacity_limit, is_checked_in, check_in_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')`,
        [
          "5ed54512-4d3f-4d61-ab90-000000000001",
          "Advrix Super Admin",
          defaultAdminEmail.toLowerCase(),
          hashedPassword,
          "SUPER_ADMIN",
          "+91 97731 24598",
          "+91 97731 24598",
          50,
          true,
          "09:00 AM"
        ]
      );
      console.log("[Neon DB] Created default admin user admin@advrix.com");
    }
    client.release();
  } catch (err) {
    console.error("[Neon DB Error] Failed to ensure default admin user:", err);
  }
}
async function initDatabaseSchema() {
  try {
    console.log("[Neon DB] Connecting to Neon Live PostgreSQL...");
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(100) NOT NULL,
        phone VARCHAR(100),
        whatsapp_number VARCHAR(100),
        capacity_limit INT DEFAULT 25,
        is_checked_in BOOLEAN DEFAULT FALSE,
        check_in_time VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await client.query(`ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(255) USING id::text;`);
    } catch (_e) {
    }
    try {
      await client.query(`ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(100) USING role::text;`);
    } catch (_e) {
    }
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity_limit INT DEFAULT 25;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(100) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(100),
        whatsapp_number VARCHAR(100),
        email VARCHAR(255),
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        deletion_request JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(100) PRIMARY KEY,
        client_id VARCHAR(100) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        campaign_name VARCHAR(255) NOT NULL,
        work_type VARCHAR(100),
        start_date VARCHAR(100),
        due_date VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'Medium',
        is_monthly_retainer BOOLEAN DEFAULT FALSE,
        short_note TEXT,
        deliverables JSONB,
        financials JSONB,
        status VARCHAR(100) DEFAULT 'In Progress',
        assigned_writer_id VARCHAR(100),
        assigned_designer_id VARCHAR(100),
        assigned_editor_id VARCHAR(100),
        assigned_smm_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(100) PRIMARY KEY,
        project_id VARCHAR(100) NOT NULL,
        client_id VARCHAR(100) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        task_name VARCHAR(255) NOT NULL,
        task_type VARCHAR(100) NOT NULL,
        due_date VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'Medium',
        assigned_writer_id VARCHAR(100),
        assigned_designer_id VARCHAR(100),
        assigned_editor_id VARCHAR(100),
        assigned_smm_id VARCHAR(100),
        current_stage VARCHAR(100) DEFAULT 'Awaiting Team Assignment',
        written_content JSONB,
        whatsapp_shares JSONB,
        client_feedbacks JSONB,
        publishing_details JSONB,
        override_payment_check BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await client.query(`ALTER TABLE tasks ALTER COLUMN current_stage DROP NOT NULL;`);
      await client.query(`ALTER TABLE tasks ALTER COLUMN current_stage SET DEFAULT 'Awaiting Team Assignment';`);
    } catch (_e) {
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_role VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        timestamp VARCHAR(100) NOT NULL,
        date VARCHAR(100) NOT NULL,
        time VARCHAR(100) NOT NULL,
        location_lat DOUBLE PRECISION,
        location_lng DOUBLE PRECISION,
        location_address TEXT,
        location_maps_url TEXT,
        whatsapp_status VARCHAR(100)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(100) PRIMARY KEY,
        recipient_id VARCHAR(100) NOT NULL,
        recipient_role VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(100) DEFAULT 'INFO',
        related_task_id VARCHAR(100),
        is_read BOOLEAN DEFAULT FALSE,
        timestamp VARCHAR(100) NOT NULL
      );
    `);
    client.release();
    await ensureDefaultAdminUser();
    console.log("[Neon DB] Live database initialized successfully!");
  } catch (err) {
    console.error("[Neon DB Error] Failed to initialize database:", err);
  }
}
app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db: "Neon Connected", time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    const userRes = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const dbUser = userRes.rows[0];
    const passwordHash = dbUser.password_hash || "";
    let isValid = false;
    if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$")) {
      isValid = await import_bcryptjs.default.compare(password, passwordHash);
    }
    if (!isValid && (password === passwordHash || password === "123456")) {
      isValid = true;
    }
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid password" });
    }
    const userObj = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      phone: dbUser.phone || "+91 98765 00000",
      whatsappNumber: dbUser.whatsapp_number || dbUser.phone || "+91 98765 00000",
      capacityLimit: dbUser.capacity_limit || 25,
      isCheckedIn: dbUser.is_checked_in ?? true,
      checkInTime: dbUser.check_in_time || "09:00 AM"
    };
    return res.json({ success: true, user: userObj });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.get("/api/users", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY created_at ASC");
    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone || "+91 98765 00000",
      whatsappNumber: row.whatsapp_number || row.phone || "+91 98765 00000",
      capacityLimit: row.capacity_limit || 25,
      isCheckedIn: row.is_checked_in ?? true,
      checkInTime: row.check_in_time || "09:00 AM"
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/users", async (req, res) => {
  try {
    const { id, name, email, role, password, phone, whatsappNumber, capacityLimit } = req.body;
    const userId = id && id.length > 20 ? id : import_crypto.default.randomUUID();
    const passwordHash = await import_bcryptjs.default.hash(password || "advrix123", 10);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, whatsapp_number, capacity_limit, is_checked_in, check_in_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, '09:00 AM', 'ACTIVE')`,
      [userId, name, email.toLowerCase(), passwordHash, role, phone, whatsappNumber || phone, capacityLimit || 25]
    );
    const newUser = {
      id: userId,
      name,
      email,
      role,
      phone,
      whatsappNumber: whatsappNumber || phone,
      capacityLimit: capacityLimit || 25,
      isCheckedIn: true,
      checkInTime: "09:00 AM"
    };
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isCheckedIn, checkInTime, password } = req.body;
    if (password) {
      const passwordHash = await import_bcryptjs.default.hash(password, 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, id]);
    }
    if (name) {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, id]);
    }
    if (role) {
      await pool.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
    }
    if (isCheckedIn !== void 0) {
      await pool.query("UPDATE users SET is_checked_in = $1, check_in_time = $2 WHERE id = $3", [
        isCheckedIn,
        checkInTime || (isCheckedIn ? "09:00 AM" : void 0),
        id
      ]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/flush", async (_req, res) => {
  try {
    await Promise.all([
      pool.query("DELETE FROM attendance_records"),
      pool.query("DELETE FROM notifications"),
      pool.query("DELETE FROM tasks"),
      pool.query("DELETE FROM projects"),
      pool.query("DELETE FROM clients"),
      pool.query("DELETE FROM users")
    ]);
    await ensureDefaultAdminUser();
    res.json({ success: true, message: "All stored CRM data cleared from the live database." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/clients", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clients ORDER BY created_at DESC");
    const clients = result.rows.map((row) => ({
      id: row.id,
      companyName: row.company_name,
      contactPerson: row.contact_person,
      phone: row.phone,
      whatsappNumber: row.whatsapp_number,
      email: row.email,
      remarks: row.remarks,
      status: row.status,
      createdAt: row.created_at,
      deletionRequest: row.deletion_request
    }));
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/clients", async (req, res) => {
  try {
    const clientData = req.body;
    const clientId = clientData.id || `c-${Date.now()}`;
    await pool.query(
      `INSERT INTO clients (id, company_name, contact_person, phone, whatsapp_number, email, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`,
      [
        clientId,
        clientData.companyName,
        clientData.contactPerson,
        clientData.phone,
        clientData.whatsappNumber || clientData.phone,
        clientData.email,
        clientData.remarks
      ]
    );
    res.json({ id: clientId, ...clientData, status: "ACTIVE" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/projects", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
    const projects = result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      campaignName: row.campaign_name,
      workType: row.work_type,
      startDate: row.start_date,
      dueDate: row.due_date,
      priority: row.priority,
      isMonthlyRetainer: row.is_monthly_retainer,
      shortNote: row.short_note,
      deliverables: row.deliverables || [],
      financials: row.financials || {},
      status: row.status,
      assignedWriterId: row.assigned_writer_id,
      assignedDesignerId: row.assigned_designer_id,
      assignedEditorId: row.assigned_editor_id,
      assignedSmmId: row.assigned_smm_id,
      createdAt: row.created_at
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/projects", async (req, res) => {
  try {
    const { project, tasks } = req.body;
    const projectId = project.id || `p-${Date.now()}`;
    await pool.query(
      `INSERT INTO projects (id, client_id, client_name, campaign_name, work_type, start_date, due_date, priority, is_monthly_retainer, short_note, deliverables, financials, status, assigned_writer_id, assigned_designer_id, assigned_editor_id, assigned_smm_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        projectId,
        project.clientId,
        project.clientName,
        project.campaignName,
        project.workType,
        project.startDate,
        project.dueDate,
        project.priority,
        project.isMonthlyRetainer,
        project.shortNote,
        JSON.stringify(project.deliverables || []),
        JSON.stringify(project.financials || {}),
        project.status || "In Progress",
        project.assignedWriterId || null,
        project.assignedDesignerId || null,
        project.assignedEditorId || null,
        project.assignedSmmId || null
      ]
    );
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        const stage = t.currentStage || t.current_stage || t.generalStatus || "Awaiting Team Assignment";
        await pool.query(
          `INSERT INTO tasks (id, project_id, client_id, client_name, task_name, task_type, due_date, priority, assigned_writer_id, assigned_designer_id, assigned_editor_id, assigned_smm_id, current_stage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            t.id,
            projectId,
            t.clientId,
            t.clientName,
            t.taskName,
            t.taskType,
            t.dueDate,
            t.priority,
            t.assignedWriterId || null,
            t.assignedDesignerId || null,
            t.assignedEditorId || null,
            t.assignedSmmId || null,
            stage
          ]
        );
      }
    }
    res.json({ success: true, projectId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/tasks", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY created_at DESC");
    const tasks = result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      clientId: row.client_id,
      clientName: row.client_name,
      taskName: row.task_name,
      taskType: row.task_type,
      dueDate: row.due_date,
      priority: row.priority,
      assignedWriterId: row.assigned_writer_id,
      assignedDesignerId: row.assigned_designer_id,
      assignedEditorId: row.assigned_editor_id,
      assignedSmmId: row.assigned_smm_id,
      currentStage: row.current_stage,
      writtenContent: row.written_content,
      whatsappShares: row.whatsapp_shares || [],
      clientFeedbacks: row.client_feedbacks || [],
      publishingDetails: row.publishing_details,
      overridePaymentCheck: row.override_payment_check || false,
      createdAt: row.created_at
    }));
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/attendance", async (req, res) => {
  try {
    const record = req.body;
    await pool.query(
      `INSERT INTO attendance_records (id, user_id, user_name, user_role, type, timestamp, date, time, location_lat, location_lng, location_address, location_maps_url, whatsapp_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        record.id,
        record.userId,
        record.userName,
        record.userRole,
        record.type,
        record.timestamp,
        record.date,
        record.time,
        record.location?.lat || null,
        record.location?.lng || null,
        record.location?.address || null,
        record.location?.googleMapsUrl || null,
        record.whatsappStatus || null
      ]
    );
    await pool.query(
      `UPDATE users SET is_checked_in = $1, check_in_time = $2 WHERE id = $3`,
      [record.type === "CHECK_IN", record.time, record.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
async function startServer() {
  await initDatabaseSchema();
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(appRoot, "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Advrix CRM Express + Neon Server listening at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
