const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "smartdesk.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

function initDatabase() {
  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Open',
      ai_summary TEXT,
      ai_suggestions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
    CREATE INDEX IF NOT EXISTS idx_comments_request_id ON comments(request_id);
  `);

  // Migration check: verify if ai_summary & ai_suggestions columns exist in requests table
  const columns = db.prepare("PRAGMA table_info(requests)").all();
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has("ai_summary")) {
    db.exec("ALTER TABLE requests ADD COLUMN ai_summary TEXT");
  }
  if (!columnNames.has("ai_suggestions")) {
    db.exec("ALTER TABLE requests ADD COLUMN ai_suggestions TEXT");
  }

  // Seed default admin if missing
  ensureAdmin();

  // Seed demo data if requests empty
  ensureDemoData();
}

function ensureAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@smartdesk.com");
  if (!existing) {
    const hash = bcrypt.hashSync("Admin@123", 10);
    db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run("SmartDesk Admin", "admin@smartdesk.com", hash, "admin");
  }
}

function ensureDemoData() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM requests").get().count;
  if (count === 0) {
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@smartdesk.com");
    if (!admin) return;

    const insertRequest = db.prepare(`
      INSERT INTO requests (user_id, customer, email, subject, description, category, priority, status, ai_summary, ai_suggestions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const r1 = insertRequest.run(
      admin.id,
      "Ananya Sharma",
      "ananya@example.com",
      "Unable to login to customer portal",
      "Receiving a 403 Forbidden error immediately after entering valid credentials.",
      "Account Issue",
      "High",
      "Open",
      "Customer cannot log in due to persistent 403 Forbidden error post-credential entry.",
      "1. Check if user account is locked or pending 2FA verification.\n2. Invalidate stale session tokens in Redis/DB.\n3. Send one-time secure password reset link to customer."
    );

    const r2 = insertRequest.run(
      admin.id,
      "Rahul Kumar",
      "rahul@example.com",
      "Payment confirmation not received",
      "Payment was deducted from bank account via UPI but invoice status is still pending.",
      "Payment Issue",
      "Medium",
      "In Progress",
      "Payment deducted via UPI gateway but order invoice remains pending reconciliation.",
      "1. Verify transaction status on payment gateway dashboard.\n2. Confirm webhook receipt for payment ID.\n3. Re-trigger invoice generation manually if payment cleared."
    );

    const r3 = insertRequest.run(
      admin.id,
      "Meera N",
      "meera@example.com",
      "Delivery tracking link broken",
      "The tracking link sent in email leads to a 404 page.",
      "Delivery Issue",
      "Low",
      "Resolved",
      "Carrier tracking hyperlink redirected to 404 error page.",
      "1. Regenerate tracking URL with correct carrier API prefix.\n2. Resend shipping confirmation to customer email."
    );

    // Seed sample comments
    const insertComment = db.prepare(`
      INSERT INTO comments (request_id, user_id, body, is_internal)
      VALUES (?, ?, ?, ?)
    `);

    insertComment.run(
      r1.lastInsertRowid,
      admin.id,
      "Investigating account status. Security logs show multiple failed attempts before lockout.",
      1 // Internal note
    );

    insertComment.run(
      r1.lastInsertRowid,
      admin.id,
      "Hello Ananya, we are reviewing your account status and will reset your session shortly.",
      0 // Public response
    );

    insertComment.run(
      r2.lastInsertRowid,
      admin.id,
      "Transaction ID has been forwarded to the finance team for UPI reconciliation.",
      0
    );
  }
}

// Auto-initialize when module is loaded
initDatabase();

module.exports = {
  db,
  initDatabase,
  ensureAdmin,
  ensureDemoData
};
