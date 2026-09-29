// backend/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const oauthController = require("../controllers/oauthController");
const authenticateToken = require("../middleware/authMiddleware");

// Defensive Rate Limiting: 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    message: "Too many authentication attempts. Please try again in 15 minutes.",
    error: "Too many authentication attempts. Please try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
