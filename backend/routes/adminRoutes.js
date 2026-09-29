// backend/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");

// All admin routes require both a valid JWT and role === 'admin'
router.use(authenticateToken);
router.use(requireAdmin);

// System Analytics
router.get("/stats", adminController.getSystemStats);

// User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", adminController.updateUserRole);
router.patch("/users/:id/verify", adminController.toggleUserVerification);
router.delete("/users/:id", adminController.deleteUser);

// System-wide Tasks
router.get("/tasks", adminController.getAllTasks);

module.exports = router;