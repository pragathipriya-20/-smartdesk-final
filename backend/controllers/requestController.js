const { db } = require("../db");

exports.getRequests = (req, res) => {
  const isAdmin = req.user.role === "admin";
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    category,
    search
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  // Role scoping: regular users only see their tickets
  if (!isAdmin) {
    conditions.push("(user_id = ? OR email = ?)");
    params.push(req.user.id, req.user.email);
  }

  // Filter by status
  if (status && status !== "All") {
    conditions.push("LOWER(status) = LOWER(?)");
    params.push(status);
  }

  // Filter by priority
  if (priority && priority !== "All") {
    conditions.push("LOWER(priority) = LOWER(?)");
    params.push(priority);
  }

  // Filter by category
  if (category && category !== "All") {
    conditions.push("LOWER(category) = LOWER(?)");
    params.push(category);
  }

  // Search across multiple fields
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      "(CAST(id AS TEXT) LIKE ? OR LOWER(customer) LIKE ? OR LOWER(email) LIKE ? OR LOWER(subject) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)"
    );
    params.push(q, q, q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Get total count
  const countRow = db.prepare(`SELECT COUNT(*) AS total FROM requests ${whereClause}`).get(...params);
  const total = countRow ? countRow.total : 0;
  const totalPages = Math.ceil(total / limitNum) || 1;

  // Query records
  const querySql = `
    SELECT id, user_id, customer, email, subject, description, category, priority, status, ai_summary, ai_suggestions, created_at
    FROM requests
    ${whereClause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(querySql).all(...params, limitNum, offset);

  res.json({
    requests: rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  });
};

exports.getRequestById = (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID." });

  const request = db.prepare(`
    SELECT id, user_id, customer, email, subject, description, category, priority, status, ai_summary, ai_suggestions, created_at
    FROM requests WHERE id = ?
  `).get(id);

  if (!request) {
    return res.status(404).json({ message: "Request not found." });
  }

  if (req.user.role !== "admin" && request.user_id !== req.user.id && request.email !== req.user.email) {
    return res.status(403).json({ message: "Access denied to this ticket." });
  }

  res.json({ request });
};

exports.createRequest = (req, res) => {
  const { customer, email, subject, description, category, priority } = req.body || {};

  if (!subject?.trim() || !description?.trim()) {
    return res.status(400).json({ message: "Subject and description are required." });
  }

  const finalCustomer = customer?.trim() || req.user.name;
  const finalEmail = email?.trim().toLowerCase() || req.user.email;
  const finalCategory = category?.trim() || "Technical Issue";
  const finalPriority = ["Low", "Medium", "High"].includes(priority) ? priority : "Medium";

  const result = db.prepare(`
    INSERT INTO requests (user_id, customer, email, subject, description, category, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')
  `).run(
    req.user.id,
    finalCustomer,
    finalEmail,
    subject.trim(),
    description.trim(),
    finalCategory,
    finalPriority
  );

  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ request });
};

exports.updateStatus = (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID." });

  const { status } = req.body || {};
  if (!["Open", "In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Allowed values: Open, In Progress, Resolved." });
  }

  const result = db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, id);
  if (!result.changes) {
    return res.status(404).json({ message: "Request not found." });
  }

  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
  res.json({ request });
};

exports.deleteRequest = (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID." });

  const result = db.prepare("DELETE FROM requests WHERE id = ?").run(id);
  if (!result.changes) {
    return res.status(404).json({ message: "Request not found." });
  }

  res.json({ message: "Request deleted successfully." });
};

exports.getStats = (req, res) => {
  const isAdmin = req.user.role === "admin";
  const rows = isAdmin
    ? db.prepare("SELECT status FROM requests").all()
    : db.prepare("SELECT status FROM requests WHERE user_id = ? OR email = ?").all(req.user.id, req.user.email);

  let open = 0;
  let inprogress = 0;
  let resolved = 0;

  for (const r of rows) {
    const s = (r.status || "").toLowerCase().trim();
    if (s === "open") open++;
    else if (s === "in progress" || s === "inprogress") inprogress++;
    else if (s === "resolved") resolved++;
  }

  res.json({ total: rows.length, open, inprogress, resolved });
};
