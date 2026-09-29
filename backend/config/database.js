// backend/config/database.js
// High-reliability PostgreSQL client manager for Serverless (Vercel) & Long-lived Node
const { Client } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB FATAL] DATABASE_URL is not set in environment variables!');
}

// Ensure direct non-pooler hostname for instant, non-blocking TLS handshakes
if (connectionString && connectionString.includes("-pooler.")) {
  connectionString = connectionString.replace("-pooler.", ".");
}

function createClient() {
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
}

// Converts MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => '$' + (paramIndex++));
}

// Execute query using dedicated client per call (optimal for serverless & cloud DB)
async function execute(sql, params = []) {
  const client = createClient();
  let pgSql = convertPlaceholders(sql.trim());
  const isInsert = /^INSERT\s+INTO/i.test(pgSql);
  
  if (isInsert && !/RETURNING\s+/i.test(pgSql)) {
    pgSql += ' RETURNING id';
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