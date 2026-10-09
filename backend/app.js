require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const { db } = require("./db"); // initializes DB

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public health check
app.get("/api/health", (_, res) => {
  res.json({ project: "SmartDesk", status: "ok", version: "2.1.0" });
});

// Mount modular route handlers
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint not found." });
  }
  next();
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error." });
});

module.exports = app;
