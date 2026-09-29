// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB FATAL] DATABASE_URL is not set in environment variables!');
}

// Optimization for Neon on local node: remove pooler domain suffix if present to bypass proxy timeouts
if (connectionString && connectionString.includes("-pooler.")) {
  connectionString = connectionString.replace("-pooler.", ".");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR]', err.message);
});

// Converts MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => '$' + (paramIndex++));
}

// Emulate mysql2 pool.execute(sql, params) -> returns [rows, fields]
// Supports insertId emulation via RETURNING id for INSERT statements
async function execute(sql, params = []) {
  let pgSql = convertPlaceholders(sql.trim());
  const isInsert = /^INSERT\s+INTO/i.test(pgSql);
  
  if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
    pgSql += ' RETURNING id';
  }

  const result = await pool.query(pgSql, params);

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
  const result = await pool.query(sql);
  return [result.rows, result.fields];
}

module.exports = {
  pool,
  execute,
  query
};