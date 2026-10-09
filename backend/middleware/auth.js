const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "smartdesk-change-this-secret";

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired or invalid token. Please log in again." });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Administrator access required." });
  }
  next();
}

module.exports = {
  auth,
  adminOnly,
  JWT_SECRET
};
