// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const oauthController = require("../controllers/oauthController");
const authenticateToken = require("../middleware/authMiddleware");

// Safe Serverless Pass-through for Rate Limiter (avoids proxy IP header crashes)
const authLimiter = (req, res, next) => next();

// Authentication Routes
router.post("/signup", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/verify-login-otp", authLimiter, authController.verifyLoginOtp);
router.post("/resend-login-otp", authLimiter, authController.resendLoginOtp);

// Social OAuth Routes
router.post("/google", oauthController.googleAuth);
router.post("/social-instant", oauthController.socialInstantAuth);
router.get("/github", oauthController.getGithubAuthUrl);
router.get("/github/callback", oauthController.githubCallback);

router.get("/me", authenticateToken, authController.getMe);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.post("/send-verification", authenticateToken, authController.sendVerification);
router.post("/verify-email", authenticateToken, authController.verifyEmail);

module.exports = router;
