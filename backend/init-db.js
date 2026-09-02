// backend/init-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

function getConnectionConfig(withDatabase = true) {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    const useSsl = process.env.DB_SSL === "true" || url.searchParams.get("ssl") !== "false" || !["localhost", "127.0.0.1"].includes(url.hostname);

    return {
      host: url.hostname,
      port: parseInt(url.port || "3306", 10),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ...(withDatabase ? { database: url.pathname.replace(/^\//, "") } : {}),
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
    };
  }

  const host = process.env.DB_HOST || 'localhost';
  const isRemote = host !== 'localhost' && host !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === "true" || (process.env.DB_SSL !== "false" && isRemote);

  return {
    host,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ...(withDatabase ? { database: process.env.DB_NAME || 'task_planner2' } : {}),
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
  };
}

async function ensureColumnExists(connection, table, column, definition) {
  try {
    const [cols] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[DB] Added column '${column}' to table '${table}'`);
    }
  } catch (err) {
    console.warn(`[DB] Column verification notice for '${column}' in '${table}':`, err.message);
  }
}

async function initializeDatabase() {
  const cfg = getConnectionConfig(false);
  const database = process.env.DB_NAME || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "") : 'task_planner2');

  console.log(`[DB] Connecting to MySQL on ${cfg.host}...`);

  let connection;
  try {
    // 1. If not connected with predefined database, verify or create database
    try {
      connection = await mysql.createConnection(cfg);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
      console.log(`[DB] Database '${database}' verified`);
      await connection.end();
    } catch (createDbErr) {
      // Cloud providers (like TiDB or Railway) often restrict CREATE DATABASE permissions and connect directly to an existing database
      console.log(`[DB] Using pre-allocated database '${database}'`);
    }

    // 2. Connect to the database to ensure schema integrity
    const dbConfig = getConnectionConfig(true);
    connection = await mysql.createConnection(dbConfig);

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) DEFAULT 0,
        verification_code VARCHAR(10) DEFAULT NULL,
        reset_code VARCHAR(10) DEFAULT NULL,
        reset_expires BIGINT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await ensureColumnExists(connection, 'users', 'is_verified', 'TINYINT(1) DEFAULT 0');
    await ensureColumnExists(connection, 'users', 'verification_code', 'VARCHAR(10) DEFAULT NULL');
    await ensureColumnExists(connection, 'users', 'reset_code', 'VARCHAR(10) DEFAULT NULL');
    await ensureColumnExists(connection, 'users', 'reset_expires', 'BIGINT DEFAULT NULL');
    await ensureColumnExists(connection, 'users', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log('[DB] Users schema ready');

    // Create tasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(50) DEFAULT 'General',
        subtasks TEXT DEFAULT NULL,
        estimated_minutes INT DEFAULT 30,
        due_date VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await ensureColumnExists(connection, 'tasks', 'category', "VARCHAR(50) DEFAULT 'General'");
    await ensureColumnExists(connection, 'tasks', 'subtasks', 'TEXT DEFAULT NULL');
    await ensureColumnExists(connection, 'tasks', 'estimated_minutes', 'INT DEFAULT 30');
    await ensureColumnExists(connection, 'tasks', 'due_date', 'VARCHAR(50) DEFAULT NULL');
    console.log('[DB] Tasks schema ready');

    // Create task_shares table for multi-user collaboration
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        shared_with_user_id INT NOT NULL,
        permission VARCHAR(20) DEFAULT 'edit',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_task_share (task_id, shared_with_user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('[DB] Task collaboration (task_shares) schema ready');

    await connection.end();
    console.log('[DB] Database initialization complete');
  } catch (err) {
    console.error('[DB ERROR] Database initialization failed:', err.message);
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    throw err;
  }
}

module.exports = initializeDatabase;

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
