// backend/controllers/taskController.js
const db = require("../config/database");

const VALID_STATUSES = ["pending", "in_progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];

// Helper to format task row and safely parse subtasks
function formatTask(row, collaboratorsMap = {}) {
  if (!row) return null;
  let parsedSubtasks = [];
  try {
    parsedSubtasks = row.subtasks ? JSON.parse(row.subtasks) : [];
  } catch (e) {
    parsedSubtasks = [];
  }
  return {
    ...row,
    is_shared: Boolean(row.is_shared),
    subtasks: Array.isArray(parsedSubtasks) ? parsedSubtasks : [],
    collaborators: collaboratorsMap[row.id] || []
  };
}

// GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const { status, priority, category, search, filter } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT DISTINCT
        t.*,
        u.username AS owner_username,
        u.email AS owner_email,
        CASE WHEN t.user_id = ? THEN 0 ELSE 1 END AS is_shared,
        COALESCE(ts.permission, 'owner') AS share_permission
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN task_shares ts ON t.id = ts.task_id AND ts.shared_with_user_id = ?
      WHERE (t.user_id = ? OR ts.shared_with_user_id = ?)
    `;
    const params = [userId, userId, userId, userId];

    if (filter === "shared") {
      query += " AND t.user_id != ?";
      params.push(userId);
    } else if (filter === "mine") {
      query += " AND t.user_id = ?";
      params.push(userId);
    }

    if (status && status !== "all" && VALID_STATUSES.includes(status)) {
      query += " AND t.status = ?";
      params.push(status);
    }

    if (priority && priority !== "all" && VALID_PRIORITIES.includes(priority)) {
      query += " AND t.priority = ?";
      params.push(priority);
    }

    if (category && category !== "all") {
      query += " AND t.category = ?";
      params.push(category);
    }

    if (search && search.trim()) {
      query += " AND (t.title LIKE ? OR t.description LIKE ? OR t.category LIKE ? OR u.username LIKE ?)";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += " ORDER BY t.created_at DESC";

    const [tasks] = await db.execute(query, params);

    // Fetch collaborators for these tasks
    const collaboratorsMap = {};
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      const placeholders = taskIds.map(() => "?").join(",");
      const [collabRows] = await db.execute(
        `SELECT ts.task_id, ts.shared_with_user_id, ts.permission, u.username, u.email
         FROM task_shares ts
         JOIN users u ON ts.shared_with_user_id = u.id
         WHERE ts.task_id IN (${placeholders})`,
        taskIds
      );

      collabRows.forEach(c => {
        if (!collaboratorsMap[c.task_id]) {
          collaboratorsMap[c.task_id] = [];
        }
        collaboratorsMap[c.task_id].push({
          id: c.shared_with_user_id,
          username: c.username,
          email: c.email,
          permission: c.permission
        });
      });
    }

    res.json(tasks.map(t => formatTask(t, collaboratorsMap)));
  } catch (error) {
    console.error("[ERROR] Get tasks error:", error);
    res.status(500).json({
      message: "Server error fetching tasks",
      error: "Server error fetching tasks"
    });
  }
};

// GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.execute(
      `SELECT DISTINCT
        t.*,
        u.username AS owner_username,
        u.email AS owner_email,
        CASE WHEN t.user_id = ? THEN 0 ELSE 1 END AS is_shared,
        COALESCE(ts.permission, 'owner') AS share_permission
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN task_shares ts ON t.id = ts.task_id AND ts.shared_with_user_id = ?
       WHERE t.id = ? AND (t.user_id = ? OR ts.shared_with_user_id = ?)`,
      [userId, userId, req.params.id, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Task not found or access denied",
        error: "Task not found or access denied"
      });
    }

    // Fetch collaborators
    const [collabRows] = await db.execute(
      `SELECT ts.task_id, ts.shared_with_user_id, ts.permission, u.username, u.email
       FROM task_shares ts
       JOIN users u ON ts.shared_with_user_id = u.id
       WHERE ts.task_id = ?`,
      [req.params.id]
    );

    const collaboratorsMap = {
      [req.params.id]: collabRows.map(c => ({
        id: c.shared_with_user_id,
        username: c.username,
        email: c.email,
        permission: c.permission
      }))
    };

    res.json(formatTask(rows[0], collaboratorsMap));
  } catch (error) {
    console.error("[ERROR] Get task error:", error);
    res.status(500).json({
      message: "Server error fetching task",
      error: "Server error fetching task"
    });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, category, subtasks, estimated_minutes, due_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required",
        error: "Task title is required"
      });
    }

    const taskTitle = title.trim();
    const taskDesc = description ? description.trim() : "";
    const taskStatus = VALID_STATUSES.includes(status) ? status : "pending";
    const taskPriority = VALID_PRIORITIES.includes(priority) ? priority : "medium";
    const taskCategory = category ? category.trim() : "General";
    const taskSubtasks = Array.isArray(subtasks) ? JSON.stringify(subtasks) : JSON.stringify([]);
    const taskEstMinutes = Number(estimated_minutes) > 0 ? Number(estimated_minutes) : 30;
    const taskDueDate = due_date ? due_date.trim() : null;

    const [result] = await db.execute(
      `INSERT INTO tasks (user_id, title, description, status, priority, category, subtasks, estimated_minutes, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, taskTitle, taskDesc, taskStatus, taskPriority, taskCategory, taskSubtasks, taskEstMinutes, taskDueDate]
    );

    const [createdRows] = await db.execute(
      `SELECT t.*, u.username AS owner_username, u.email AS owner_email, 0 AS is_shared, 'owner' AS share_permission
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json(formatTask(createdRows[0]));
  } catch (error) {
    console.error("[ERROR] Create task error:", error);
    res.status(500).json({
      message: "Failed to create task",
      error: "Failed to create task"
    });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const [existing] = await db.execute(
      `SELECT t.*, ts.permission AS share_permission
       FROM tasks t
       LEFT JOIN task_shares ts ON t.id = ts.task_id AND ts.shared_with_user_id = ?
       WHERE t.id = ? AND (t.user_id = ? OR ts.shared_with_user_id = ?)`,
      [userId, req.params.id, userId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        message: "Task not found or access denied",
        error: "Task not found or access denied"
      });
    }

    const current = existing[0];
    if (current.share_permission === "view") {
      return res.status(403).json({
        message: "You only have view permission for this shared task",
        error: "Read-only access"
      });
    }

    const { title, description, status, priority, category, subtasks, estimated_minutes, due_date } = req.body;

    const updatedTitle = title !== undefined && title.trim() ? title.trim() : current.title;
    const updatedDesc = description !== undefined ? description.trim() : current.description;
    const updatedStatus = VALID_STATUSES.includes(status) ? status : current.status;
    const updatedPriority = VALID_PRIORITIES.includes(priority) ? priority : current.priority;
    const updatedCategory = category !== undefined ? category.trim() : current.category;
    const updatedSubtasks = Array.isArray(subtasks) ? JSON.stringify(subtasks) : current.subtasks;
    const updatedEstMinutes = estimated_minutes !== undefined && Number(estimated_minutes) > 0
      ? Number(estimated_minutes)
      : current.estimated_minutes;
    const updatedDueDate = due_date !== undefined ? due_date : current.due_date;

    await db.execute(
      `UPDATE tasks 
       SET title = ?, description = ?, status = ?, priority = ?, category = ?, subtasks = ?, estimated_minutes = ?, due_date = ?
       WHERE id = ?`,
      [updatedTitle, updatedDesc, updatedStatus, updatedPriority, updatedCategory, updatedSubtasks, updatedEstMinutes, updatedDueDate, req.params.id]
    );

    const [updatedRows] = await db.execute(
      `SELECT t.*, u.username AS owner_username, u.email AS owner_email,
        CASE WHEN t.user_id = ? THEN 0 ELSE 1 END AS is_shared,
        COALESCE(ts.permission, 'owner') AS share_permission
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN task_shares ts ON t.id = ts.task_id AND ts.shared_with_user_id = ?
       WHERE t.id = ?`,
      [userId, userId, req.params.id]
    );

    res.json({
      message: "Task updated successfully",
      task: formatTask(updatedRows[0])
    });
  } catch (error) {
    console.error("[ERROR] Update task error:", error);
    res.status(500).json({
      message: "Failed to update task",
      error: "Failed to update task"
    });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    // Only the task owner can permanently delete a task
    const [result] = await db.execute(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Task not found or only the owner can delete this task",
        error: "Task not found or access denied"
      });
    }

    res.json({
      message: "Task deleted successfully"
    });
  } catch (error) {
    console.error("[ERROR] Delete task error:", error);
    res.status(500).json({
      message: "Failed to delete task",
      error: "Failed to delete task"
    });
  }
};

// POST /api/tasks/:id/share (Share task with colleague)
const shareTask = async (req, res) => {
  try {
    const { collaborator, permission } = req.body;
    if (!collaborator || !collaborator.trim()) {
      return res.status(400).json({
        message: "Please enter a username or email to share with",
        error: "Collaborator username or email is required"
      });
    }

    const trimmedInput = collaborator.trim();

    // 1. Verify that current user owns this task
    const [taskRows] = await db.execute(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (taskRows.length === 0) {
      return res.status(403).json({
        message: "Only the owner can share this task",
        error: "Permission denied"
      });
    }

    // 2. Find the collaborator user by User ID, username, or email
    let targetUsers = [];

    // If input is purely numeric (e.g. "5"), search by user ID first
    if (/^\d+$/.test(trimmedInput)) {
      const [byId] = await db.execute(
        "SELECT id, username, email FROM users WHERE id = ?",
        [parseInt(trimmedInput, 10)]
      );
      if (byId.length > 0) targetUsers = byId;
    }

    if (targetUsers.length === 0) {
      const [byString] = await db.execute(
        "SELECT id, username, email FROM users WHERE email = ? OR username = ?",
        [trimmedInput.toLowerCase(), trimmedInput]
      );
      targetUsers = byString;
    }

    if (targetUsers.length === 0) {
      return res.status(404).json({
        message: `No user found with User ID / username / email: '${trimmedInput}'`,
        error: `User not found`
      });
    }

    const targetUser = targetUsers[0];

    // 3. Ensure not sharing with oneself
    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot share a task with yourself",
        error: "Invalid collaborator"
      });
    }

    const sharePerm = permission === "view" ? "view" : "edit";

    // 4. Insert or update share record
    await db.execute(
      `INSERT INTO task_shares (task_id, shared_with_user_id, permission)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE permission = ?`,
      [req.params.id, targetUser.id, sharePerm, sharePerm]
    );

    res.json({
      message: `Task successfully shared with ${targetUser.username}`,
      collaborator: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        permission: sharePerm
      }
    });
  } catch (error) {
    console.error("[ERROR] Share task error:", error);
    res.status(500).json({
      message: "Failed to share task",
      error: "Failed to share task"
    });
  }
};

// DELETE /api/tasks/:id/share/:collaboratorId (Revoke access)
const revokeTaskShare = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.collaboratorId, 10);
    const userId = req.user.id;

    // Either owner revoking collaborator, or collaborator leaving shared task
    const [result] = await db.execute(
      `DELETE ts FROM task_shares ts
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.task_id = ? AND ts.shared_with_user_id = ?
       AND (t.user_id = ? OR ts.shared_with_user_id = ?)`,
      [req.params.id, targetUserId, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Collaborator share record not found or access denied",
        error: "Not found"
      });
    }

    res.json({
      message: "Access revoked successfully"
    });
  } catch (error) {
    console.error("[ERROR] Revoke share error:", error);
    res.status(500).json({
      message: "Failed to revoke task access",
      error: "Failed to revoke task access"
    });
  }
};

// GET /api/tasks/export
const exportTasks = async (req, res) => {
  try {
    const [tasks] = await db.execute(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    const formatted = tasks.map(t => formatTask(t));
    res.json({
      exported_at: new Date().toISOString(),
      user_id: req.user.id,
      task_count: formatted.length,
      tasks: formatted
    });
  } catch (error) {
    console.error("[ERROR] Export tasks error:", error);
    res.status(500).json({
      message: "Failed to export tasks",
      error: "Failed to export tasks"
    });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  shareTask,
  revokeTaskShare,
  exportTasks
};
