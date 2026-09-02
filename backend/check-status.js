// backend/check-status.js
require('dotenv').config();
const db = require('./db');

async function checkDatabaseAndAPI() {
  console.log('====================================================');
  console.log('🔍 LIVE SYSTEM DIAGNOSTIC: DATABASE & API STATUS');
  console.log('====================================================\n');

  // 1. Database connection check
  console.log('📊 1. DATABASE CONNECTION & METRICS:');
  try {
    const [dbInfo] = await db.query('SELECT DATABASE() as current_db, VERSION() as mysql_version, USER() as current_user');
    console.log('   ✅ MySQL Connected Successfully');
    console.log(`   Database Name : ${dbInfo[0].current_db}`);
    console.log(`   MySQL Version : ${dbInfo[0].mysql_version}`);
    console.log(`   Connected User: ${dbInfo[0].current_user}\n`);

    // 2. Users Table
    const [users] = await db.query('SELECT id, username, email, created_at FROM users ORDER BY id ASC');
    console.log(`👥 2. USERS IN DATABASE (${users.length} total users):`);
    if (users.length === 0) {
      console.log('   (No users found in database yet)');
    } else {
      console.table(users);
    }

    // 3. Tasks Table
    const [tasks] = await db.query(`
      SELECT 
        t.id AS task_id,
        u.username AS owner,
        t.title,
        t.status,
        t.priority,
        t.due_date,
        t.created_at
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id ASC
    `);
    console.log(`\n📋 3. TASKS IN DATABASE (${tasks.length} total tasks linked to users):`);
    if (tasks.length === 0) {
      console.log('   (No tasks found in database yet)');
    } else {
      console.table(tasks);
    }

    // 4. Tasks Status Breakdown
    const [statusCount] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `);
    console.log('\n📈 4. TASK STATUS BREAKDOWN:');
    console.table(statusCount);

  } catch (err) {
    console.error('❌ Database error:', err.message);
  }

  // 5. API Server status check
  console.log('\n🌐 5. API SERVER STATUS (http://localhost:3000):');
  try {
    const res = await fetch('http://localhost:3000/api/health');
    if (res.ok) {
      const data = await res.json();
      console.log('   ✅ API Server is LIVE and RUNNING!');
      console.log('   Response:', data);
    } else {
      console.log(`   ⚠️ API Server responded with status: ${res.status}`);
    }
  } catch (err) {
    console.log('   ⚠️ API Server is currently stopped (Run "npm run dev" to start it).');
  }

  console.log('\n====================================================');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('====================================================');
  process.exit(0);
}

checkDatabaseAndAPI();

