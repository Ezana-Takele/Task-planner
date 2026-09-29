// backend/controllers/oauthController.js
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Google OAuth Endpoint
const googleAuth = async (req, res) => {
  try {
    const { email, name, sub, picture } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Google profile email is required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const username = (name || email.split("@")[0]).replace(/\s+/g, "_").toLowerCase().slice(0, 30);

    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [trimmedEmail]);
    let user;

    if (existing.length > 0) {
      user = existing[0];
      // Sync Google provider data if needed
      await db.execute(
        "UPDATE users SET auth_provider = 'google', provider_id = COALESCE(provider_id, ?), avatar_url = COALESCE(avatar_url, ?), is_verified = 1 WHERE id = ?",
        [sub || null, picture || null, user.id]
      );
    } else {
      const [result] = await db.execute(
        "INSERT INTO users (username, email, password_hash, is_verified, auth_provider, provider_id, avatar_url, role) VALUES (?, ?, 'oauth_account', 1, 'google', ?, ?, 'user')",
        [username + "_" + Math.floor(Math.random() * 1000), trimmedEmail, sub || null, picture || null]
      );
      const [newUsers] = await db.execute("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = newUsers[0];
    }

    const role = user.role || (trimmedEmail === "drtakeleezana@gmail.com" ? "admin" : "user");
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Google authentication successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
        avatar_url: user.avatar_url,
        is_verified: true
      }
    });
  } catch (error) {
    console.error("[ERROR] Google auth error:", error);
    res.status(500).json({ message: "Google authentication failed", error: error.message });
  }
};

const socialInstantAuth = async (req, res) => {
  return googleAuth(req, res);
};

const getGithubAuthUrl = (req, res) => {
  res.status(501).json({ message: "GitHub OAuth not configured" });
};

const githubCallback = (req, res) => {
  res.status(501).json({ message: "GitHub OAuth callback not configured" });
};

module.exports = {
  googleAuth,
  socialInstantAuth,
  getGithubAuthUrl,
  githubCallback
};