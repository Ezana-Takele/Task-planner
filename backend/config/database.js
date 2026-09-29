// backend/config/database.js
const { Pool } = require("pg");
const path = require("path");

// Load .env explicitly from backend directory or fallback to root
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

// Direct verified Neon PostgreSQL connection string (bulletproof fallback)
const NEON_DEFAULT = "postgresql://neondb_owner:npg_0JDMkVBAqgX4@ep-hidden-waterfall-b58tpp0f.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

function getConnectionString() {
  let conn = process.env.DATABASE_URL;

  // If DATABASE_URL is unset, or holds legacy Railway / MySQL connection strings from previous deploys:
  if (!conn || (!conn.startsWith("postgresql://") && !conn.startsWith("postgres://")) || conn.includes("railway") || conn.includes("mysql")) {
    conn = NEON_DEFAULT;
  }

  // Bypass pooler proxy latency if present to guarantee fastest direct TLS handshake
  if (conn.includes("-pooler.")) {
    conn = conn.replace("-pooler.", ".");
  }

  return conn;
}

// Module-level connection pool (optimally reused across warm serverless invocations)
let pool = null;

function getPool() {
  if (!pool) {
    const connStr = getConnectionString();
    pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    });

    pool.on("error", (err) => {
      console.warn("[WARN] Neon PG Pool background notice:", err.message);
    });
  }
  return pool;
}

// Converts MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => "$" + (paramIndex++));
}

// Emulate mysql2 pool.execute(sql, params) -> returns [rows, fields]
// Supports insertId emulation via RETURNING id for INSERT statements
async function execute(sql, params = []) {
  const currentPool = getPool();
  let pgSql = convertPlaceholders(sql.trim());
  const isInsert = /^INSERT\s+INTO/i.test(pgSql);
  
  if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
    pgSql += " RETURNING id";
  }

  const result = await currentPool.query(pgSql, params);

  const formattedRows = result.rows;
  if (isInsert && result.rows.length > 0) {
    formattedRows.insertId = result.rows[0].id;
  }
  formattedRows.affectedRows = result.rowCount;

  return [formattedRows, result.fields];
}

// Emulate mysql2 pool.query(sql, params) -> returns [rows, fields]
async function query(sql, params = []) {
  if (Array.isArray(params) && params.length > 0) {
    return execute(sql, params);
  }
  const currentPool = getPool();
  const result = await currentPool.query(sql);
  return [result.rows, result.fields];
}

module.exports = {
  getPool,
  getConnectionString,
  execute,
  query
};