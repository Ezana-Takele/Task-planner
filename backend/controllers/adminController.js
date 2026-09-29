// backend/controllers/adminController.js
const db = require("../config/database");

// GET /api/admin/stats - System Overview Metrics
const getSystemStats = async (req, res) => {
  try {
    const [userCountRows] = await db.query("SELECT COUNT(*) AS total_users FROM users");
    const [verifiedUserRows] = await db.query("SELECT COUNT(*) AS verified_users FROM users WHERE is_verified = 1");
    const [taskCountRows] = await db.query("SELECT COUNT(*) AS total_tasks FROM tasks");
    const [completedTaskRows] = await db.query("SELECT COUNT(*) AS completed_tasks FROM tasks WHERE status = 'done'");
    const [pendingTaskRows] = await db.query("SELECT COUNT(*) AS pending_tasks FROM tasks WHERE status != 'done'");
    const [recentUsers] = await db.query("SELECT id, username, email, role, is_verified, created_at FROM users ORDER BY id DESC LIMIT 5");

    const totalUsers = parseInt(userCountRows[0].total_users, 10) || 0;
    const verifiedUsers = parseInt(verifiedUserRows[0].verified_users, 10) || 0;
    const totalTasks = parseInt(taskCountRows[0].total_tasks, 10) || 0;
    const completedTasks = parseInt(completedTaskRows[0].completed_tasks, 10) || 0;
    const pendingTasks = parseInt(pendingTaskRows[0].pending_tasks, 10) || 0;

    res.json({
      stats: {
        totalUsers,
        verifiedUsers,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      recentUsers
    });
  } catch (error) {
    console.error("[ERROR] getSystemStats error:", error);
    res.status(500).json({ message: "Failed to load system statistics", error: error.message });
  }
};

// GET /api/admin/users - Search and Paginate All Users
const getAllUsers = async (req, res) => {
  try {
    const { search = "", role = "all", status = "all" } = req.query;

    let sql = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.is_verified, 
        u.auth_provider, 
        u.created_at,
        COUNT(t.id) AS task_count,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_task_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      sql += " AND (u.username ILIKE ? OR u.email ILIKE ?)";
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (role !== "all") {
      sql += " AND u.role = ?";
      params.push(role);
    }

    if (status === "verified") {
      sql += " AND u.is_verified = 1";
    } else if (status === "unverified") {
      sql += " AND u.is_verified = 0";
    }

    sql += " GROUP BY u.id ORDER BY u.id DESC LIMIT 100";

    const [users] = await db.execute(sql, params);

    res.json({
      users: users.map(u => ({
        ...u,
        is_verified: Boolean(u.is_verified),
        task_count: parseInt(u.task_count, 10) || 0,
        completed_task_count: parseInt(u.completed_task_count, 10) || 0
      }))
    });
  } catch (error) {
    console.error("[ERROR] getAllUsers error:", error);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

// PATCH /api/admin/users/:id/role - Promote/Demote User Role
const updateUserRole = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role must be 'admin' or 'user'" });
    }

    // Safety: prevent demoting the primary admin account
    const [target] = await db.execute("SELECT email FROM users WHERE id = ?", [userId]);
    if (target.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target[0].email === "drtakeleezana@gmail.com" && role !== "admin") {
      return res.status(403).json({ message: "The primary Super Admin role cannot be demoted" });
    }

    await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);

    res.json({ message: `User role successfully updated to ${role}`, userId, role });
  } catch (error) {
    console.error("[ERROR] updateUserRole error:", error);
    res.status(500).json({ message: "Failed to update role", error: error.message });
  }
};

// PATCH /api/admin/users/:id/verify - Force Verify or Unverify User
const toggleUserVerification = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_verified } = req.body;

    const val = is_verified ? 1 : 0;
    await db.execute("UPDATE users SET is_verified = ? WHERE id = ?", [val, userId]);

    res.json({ message: `Verification status updated`, userId, is_verified: Boolean(val) });
  } catch (error) {
    console.error("[ERROR] toggleUserVerification error:", error);
    res.status(500).json({ message: "Failed to update verification", error: error.message });
  }
};

// DELETE /api/admin/users/:id - Delete User Account & All Associated Tasks
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const [target] = await db.execute("SELECT email FROM users WHERE id = ?", [userId]);
    if (target.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (target[0].email === "drtakeleezana@gmail.com") {
      return res.status(403).json({ message: "Cannot delete the primary Super Admin account" });
    }

    // Cascades to tasks and task_shares automatically
    await db.execute("DELETE FROM users WHERE id = ?", [userId]);

    res.json({ message: `User account #${userId} and associated data deleted successfully` });
  } catch (error) {
    console.error("[ERROR] deleteUser error:", error);
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};

// GET /api/admin/tasks - System-wide Task Monitoring
const getAllTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT 
        t.id, t.title, t.status, t.priority, t.category, t.due_date, t.created_at,
        u.username AS owner_username, u.email AS owner_email
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
      LIMIT 100
    `);

    res.json({ tasks });
  } catch (error) {
    console.error("[ERROR] getAllTasks error:", error);
    res.status(500).json({ message: "Failed to fetch system tasks", error: error.message });
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  updateUserRole,
  toggleUserVerification,
  deleteUser,
  getAllTasks
};