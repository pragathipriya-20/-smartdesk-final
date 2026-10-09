const { db } = require("../db");

exports.getComments = (req, res) => {
  const requestId = Number(req.params.id);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid request ID." });

  // Verify ticket exists and access control
  const ticket = db.prepare("SELECT id, user_id, email FROM requests WHERE id = ?").get(requestId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  const isAdmin = req.user.role === "admin";
  if (!isAdmin && ticket.user_id !== req.user.id && ticket.email !== req.user.email) {
    return res.status(403).json({ message: "Access denied to this ticket." });
  }

  // Fetch comments; filter internal notes if not admin
  const sql = isAdmin
    ? `
      SELECT c.id, c.request_id, c.user_id, c.body, c.is_internal, c.created_at,
             u.name AS author_name, u.email AS author_email, u.role AS author_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ?
      ORDER BY c.id ASC
    `
    : `
      SELECT c.id, c.request_id, c.user_id, c.body, c.is_internal, c.created_at,
             u.name AS author_name, u.email AS author_email, u.role AS author_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.request_id = ? AND c.is_internal = 0
      ORDER BY c.id ASC
    `;

  const comments = db.prepare(sql).all(requestId);
  res.json({ comments });
};

exports.addComment = (req, res) => {
  const requestId = Number(req.params.id);
  if (isNaN(requestId)) return res.status(400).json({ message: "Invalid request ID." });

  const { body, is_internal } = req.body || {};
  if (!body || !body.trim()) {
    return res.status(400).json({ message: "Comment body cannot be empty." });
  }

  // Verify ticket exists and access permissions
  const ticket = db.prepare("SELECT id, user_id, email FROM requests WHERE id = ?").get(requestId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found." });
  }

  const isAdmin = req.user.role === "admin";
  if (!isAdmin && ticket.user_id !== req.user.id && ticket.email !== req.user.email) {
    return res.status(403).json({ message: "Access denied to this ticket." });
  }

  // Only admins can create internal notes
  const internalFlag = isAdmin && (is_internal === true || is_internal === 1 || is_internal === "1") ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO comments (request_id, user_id, body, is_internal)
    VALUES (?, ?, ?, ?)
  `).run(requestId, req.user.id, body.trim(), internalFlag);

  const newComment = db.prepare(`
    SELECT c.id, c.request_id, c.user_id, c.body, c.is_internal, c.created_at,
           u.name AS author_name, u.email AS author_email, u.role AS author_role
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment: newComment });
};
