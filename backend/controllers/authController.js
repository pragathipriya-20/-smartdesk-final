const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

exports.register = (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name.trim(), normalizedEmail, hash, "user");

  const user = { id: result.lastInsertRowid, name: name.trim(), email: normalizedEmail, role: "user" };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({ token, user });
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ?").get(normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: safeUser });
};

exports.getMe = (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(401).json({ message: "User account no longer exists." });
  }
  res.json({ user });
};

exports.updateProfile = (req, res) => {
  const { name, email } = req.body || {};
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(normalizedEmail, req.user.id);
  if (existing) {
    return res.status(409).json({ message: "Another account is already using that email address." });
  }

  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?")
    .run(name.trim(), normalizedEmail, req.user.id);

  const updatedUser = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);
  const token = jwt.sign({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    message: "Profile updated successfully.",
    user: updatedUser,
    token
  });
};

exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current password and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long." });
  }

  const user = db.prepare("SELECT id, password_hash FROM users WHERE id = ?").get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ message: "Incorrect current password." });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.id);

  res.json({ message: "Password updated successfully." });
};
