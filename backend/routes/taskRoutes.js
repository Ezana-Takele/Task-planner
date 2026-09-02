// backend/routes/taskRoutes.js
const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const authenticateToken = require("../middleware/authMiddleware");

// All task routes require authentication
router.use(authenticateToken);

router.get("/export", taskController.exportTasks);
router.get("/", taskController.getTasks);
router.get("/:id", taskController.getTaskById);
router.post("/", taskController.createTask);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

// Multi-User Collaboration Sharing Routes
router.post("/:id/share", taskController.shareTask);
router.delete("/:id/share/:collaboratorId", taskController.revokeTaskShare);

module.exports = router;
