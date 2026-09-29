// backend/init-db.js
require('dotenv').config();
const { Pool } = require('pg');

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('[DB] Connecting to PostgreSQL on Neon...');

  try {
    const client = await pool.connect();

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_verified SMALLINT DEFAULT 0,
        verification_code VARCHAR(10) DEFAULT NULL,
        reset_code VARCHAR(10) DEFAULT NULL,
        reset_expires BIGINT DEFAULT NULL,
        auth_provider VARCHAR(50) DEFAULT 'local',
        provider_id VARCHAR(100) DEFAULT NULL,
        avatar_url VARCHAR(255) DEFAULT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] Users table verified');

    // 2. Ensure role column exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
        END IF;
      END $$;
    `);

    // 3. Guarantee Ezana Takele is Super Admin
    await client.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email = 'drtakeleezana@gmail.com';
    `);
    console.log('[DB] Super Admin role verified for drtakeleezana@gmail.com');

    // 4. Tasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(50) DEFAULT 'General',
        subtasks TEXT DEFAULT NULL,
        estimated_minutes INT DEFAULT 30,
        due_date VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    `);
    console.log('[DB] Tasks table verified');

    // 5. Task Shares Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_shares (
        id SERIAL PRIMARY KEY,
        task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        shared_with_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(20) DEFAULT 'edit',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uniq_task_share UNIQUE (task_id, shared_with_user_id)
      );
    `);
    console.log('[DB] Task collaboration (task_shares) table verified');

    client.release();
    await pool.end();
    console.log('[DB] PostgreSQL Database initialization complete!');
  } catch (err) {
    console.error('[DB ERROR] Database initialization failed:', err);
    await pool.end();
    throw err;
  }
}

module.exports = initializeDatabase;

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}