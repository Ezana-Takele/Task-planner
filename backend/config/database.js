// backend/config/database.js
const { Client } = require("pg");
const path = require("path");

// Load .env explicitly from backend directory or fallback to root
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

// Fallback direct connection string if process.env is unpopulated in serverless
const NEON_DEFAULT = "postgresql://neondb_owner:npg_0JDMkVBAqgX4@ep-hidden-waterfall-b58tpp0f.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

function getConnectionString() {
  let conn = process.env.DATABASE_URL || NEON_DEFAULT;
  if (conn.includes("-pooler.")) {
    conn = conn.replace("-pooler.", ".");
  }
  return conn;
}

function createClient() {
  return new Client({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
}

// Converts MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => "$" + (paramIndex++));
}

// Emulate mysql2 pool.execute(sql, params) -> returns [rows, fields]
// Supports insertId emulation via RETURNING id for INSERT statements
async function execute(sql, params = []) {
  const client = createClient();
  let pgSql = convertPlaceholders(sql.trim());
  const isInsert = /^INSERT\s+INTO/i.test(pgSql);
  
  if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
    pgSql += " RETURNING id";
  }

  try {
    await client.connect();
    const result = await client.query(pgSql, params);

    const formattedRows = result.rows;
    if (isInsert && result.rows.length > 0) {
      formattedRows.insertId = result.rows[0].id;
    }
    formattedRows.affectedRows = result.rowCount;

    return [formattedRows, result.fields];
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

// Emulate mysql2 pool.query(sql, params) -> returns [rows, fields]
async function query(sql, params = []) {
  if (Array.isArray(params) && params.length > 0) {
    return execute(sql, params);
  }
  const client = createClient();
  try {
    await client.connect();
    const result = await client.query(sql);
    return [result.rows, result.fields];
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

module.exports = {
  execute,
  query
};