// backend/config/database.js
const mysql = require("mysql2/promise");
require("dotenv").config();

function getPoolConfig() {
  // If a full cloud database URI is provided (Railway, TiDB, Aiven, etc.)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    const useSsl = process.env.DB_SSL === "true" || url.searchParams.get("ssl") !== "false" || !["localhost", "127.0.0.1"].includes(url.hostname);

    return {
      host: url.hostname,
      port: parseInt(url.port || "3306", 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
    };
  }

  // Standard environment variables
  const host = process.env.DB_HOST || "127.0.0.1";
  const isRemote = host !== "localhost" && host !== "127.0.0.1";
  const useSsl = process.env.DB_SSL === "true" || (process.env.DB_SSL !== "false" && isRemote);

  return {
    host: host,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "task_planner2",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
  };
}

const pool = mysql.createPool(getPoolConfig());

module.exports = pool;
