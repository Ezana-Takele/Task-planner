// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/mailer");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1: Register Account -> Sends 6-digit OTP to Email
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
        error: "Username, email and password are required"
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
        error: "Please enter a valid email address"
      });
    }

    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        message: "Username must be at least 3 characters long",
        error: "Username must be at least 3 characters long"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
        error: "Password must be at least 6 characters long"
      });
    }

    const [existingUsers] = await db.execute(
      "SELECT id, email, username FROM users WHERE email = ? OR username = ?",
      [trimmedEmail, trimmedUsername]
    );

    if (existingUsers.length > 0) {
      const conflict = existingUsers[0].email.toLowerCase() === trimmedEmail ? "Email" : "Username";
      return res.status(409).json({
        message: `${conflict} is already registered`,
        error: `${conflict} is already registered`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.execute(
      `INSERT INTO users (username, email, password_hash, is_verified, verification_code)
       VALUES (?, ?, ?, 0, ?)`,
      [trimmedUsername, trimmedEmail, hashedPassword, verifyCode]
    );

    // Send real verification email via SMTP
    const emailResult = await sendVerificationEmail(trimmedEmail, verifyCode);
    if (!emailResult.success) {
      console.warn(`[WARN] Email dispatch notice for ${trimmedEmail}:`, emailResult.error);
    }

    res.status(201).json({
      requiresOtp: true,
      email: trimmedEmail,
      message: `Account created. A 6-digit verification code has been sent to ${trimmedEmail}. Please check your inbox.`
    });
  } catch (error) {
    console.error("[ERROR] Register error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: "Server error during registration"
    });
  }
};

// Step 1: Login Check -> Sends 6-digit OTP to Email
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        error: "Email and password are required"
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [trimmedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
        error: "Invalid email or password"
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
        error: "Invalid email or password"
      });
    }

    // Generate fresh 6-digit OTP code for 2-step email verification
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.execute("UPDATE users SET verification_code = ? WHERE id = ?", [code, user.id]);

    // Send real verification email via SMTP
    const emailResult = await sendVerificationEmail(trimmedEmail, code);
    if (!emailResult.success) {
      console.warn(`[WARN] Email dispatch notice for ${trimmedEmail}:`, emailResult.error);
    }

    res.json({
      requiresOtp: true,
      email: trimmedEmail,
      message: `A 6-digit verification code has been sent to ${trimmedEmail}. Please check your inbox.`
    });
  } catch (error) {
    console.error("[ERROR] Login error:", error);
    res.status(500).json({
      message: "Server error during sign in",
      error: "Server error during sign in"
    });
  }
};

// Step 2: Verify OTP -> Authenticate & Issue JWT Token
const verifyLoginOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required",
        error: "Email and verification code are required"
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [trimmedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({
        message: "Account not found",
        error: "Account not found"
      });
    }

    const user = rows[0];
    if (!user.verification_code || user.verification_code !== trimmedCode) {
      return res.status(400).json({
        message: "Invalid verification code",
        error: "Invalid verification code"
      });
    }

    // Mark user as verified and clear temporary OTP code
    await db.execute(
      "UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?",
      [user.id]
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_verified: true
    };

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email, username: safeUser.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Verification successful. Signed in.",
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("[ERROR] Verify login OTP error:", error);
    res.status(500).json({
      message: "Failed to verify login code",
      error: "Failed to verify login code"
    });
  }
};

// Resend OTP code
const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        error: "Email is required"
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [rows] = await db.execute("SELECT id, email FROM users WHERE email = ?", [trimmedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({
        message: "Account not found",
        error: "Account not found"
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.execute("UPDATE users SET verification_code = ? WHERE id = ?", [code, rows[0].id]);

    await sendVerificationEmail(trimmedEmail, code);

    res.json({
      message: `A new verification code has been dispatched to ${trimmedEmail}. Please check your inbox.`
    });
  } catch (error) {
    console.error("[ERROR] Resend login OTP error:", error);
    res.status(500).json({
      message: "Failed to resend code",
      error: "Failed to resend code"
    });
  }
};

const getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, username, email, is_verified, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
        error: "User not found"
      });
    }

    const user = rows[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_verified: Boolean(user.is_verified),
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("[ERROR] GetMe error:", error);
    res.status(500).json({
      message: "Failed to retrieve profile",
      error: "Failed to retrieve profile"
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "Email address is required",
        error: "Email address is required"
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [rows] = await db.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No account registered with this email address",
        error: "No account registered with this email address"
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;

    await db.execute(
      "UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?",
      [code, expires, rows[0].id]
    );

    await sendPasswordResetEmail(trimmedEmail, code);

    res.json({
      message: `Password reset code sent to ${trimmedEmail}. Please check your inbox.`
    });
  } catch (error) {
    console.error("[ERROR] Forgot password error:", error);
    res.status(500).json({
      message: "Unable to process reset request",
      error: "Unable to process reset request"
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, verification code, and new password are required",
        error: "Email, verification code, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
        error: "New password must be at least 6 characters long"
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Account not found",
        error: "Account not found"
      });
    }

    const user = rows[0];
    if (!user.reset_code || user.reset_code !== code.trim()) {
      return res.status(400).json({
        message: "Invalid verification code",
        error: "Invalid verification code"
      });
    }

    if (!user.reset_expires || Date.now() > Number(user.reset_expires)) {
      return res.status(400).json({
        message: "Verification code has expired",
        error: "Verification code has expired"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      "UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.json({
      message: "Password updated successfully. You can now sign in."
    });
  } catch (error) {
    console.error("[ERROR] Reset password error:", error);
    res.status(500).json({
      message: "Failed to update password",
      error: "Failed to update password"
    });
  }
};

const sendVerification = async (req, res) => {
  try {
    const [userRows] = await db.execute("SELECT email FROM users WHERE id = ?", [req.user.id]);
    const userEmail = userRows.length > 0 ? userRows[0].email : req.user.email;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.execute(
      "UPDATE users SET verification_code = ? WHERE id = ?",
      [code, req.user.id]
    );

    await sendVerificationEmail(userEmail, code);

    res.json({
      message: `Verification code dispatched to ${userEmail}. Please check your inbox.`
    });
  } catch (error) {
    console.error("[ERROR] Send verification error:", error);
    res.status(500).json({
      message: "Failed to generate verification code",
      error: "Failed to generate verification code"
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({
        message: "Verification code is required",
        error: "Verification code is required"
      });
    }

    const [rows] = await db.execute(
      "SELECT verification_code FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
        error: "User not found"
      });
    }

    if (rows[0].verification_code !== code.trim()) {
      return res.status(400).json({
        message: "Invalid verification code",
        error: "Invalid verification code"
      });
    }

    await db.execute(
      "UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?",
      [req.user.id]
    );

    res.json({
      message: "Email verified successfully",
      is_verified: true
    });
  } catch (error) {
    console.error("[ERROR] Verify email error:", error);
    res.status(500).json({
      message: "Failed to verify email",
      error: "Failed to verify email"
    });
  }
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  getMe,
  forgotPassword,
  resetPassword,
  sendVerification,
  verifyEmail
};
