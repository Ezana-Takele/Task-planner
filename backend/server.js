// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const initializeDatabase = require("./init-db");

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Core Middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(helmet());
app.use(cors());

// HTTP Request Logging
app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

// Root Welcome Route
app.get("/", (req, res) => {
  res.json({
    message: "Task Planner backend is running",
    version: "2.1.0"
  });
});

// Health Check with environment diagnostics
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      has_db_url: Boolean(process.env.DATABASE_URL),
      has_jwt_secret: Boolean(process.env.JWT_SECRET),
      has_smtp_user: Boolean(process.env.SMTP_USER),
      has_smtp_pass: Boolean(process.env.SMTP_PASS),
      has_smtp_host: Boolean(process.env.SMTP_HOST),
      smtp_user_len: process.env.SMTP_USER ? process.env.SMTP_USER.length : 0,
      smtp_port: process.env.SMTP_PORT || "default-587"
    }
  });
});

// Modular Routes (Handles both direct and serverless rewrites)
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/tasks", taskRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found", error: "Resource not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[ERROR] Unhandled server exception:", err.stack || err.message);
  res.status(500).json({ message: "Internal server error", error: "Internal server error" });
});

// Start Server & Auto-Initialize Database
async function startServer() {
  try {
    await initializeDatabase();
  } catch (err) {
    console.warn("[WARN] Database initialization notice:", err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Task Planner backend running on port ${PORT}`);
  });

  const shutdown = () => {
    console.log("[INFO] Gracefully stopping server...");
    server.close(() => {
      console.log("[INFO] Server stopped.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (require.main === module) {
  startServer();
}

module.exports = app;
