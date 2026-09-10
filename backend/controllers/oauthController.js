// backend/controllers/oauthController.js
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "production_super_secret_jwt_key_98124";

// Google Sign-In verification via Google Tokeninfo API
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({
        message: "Google credential token is required",
        error: "Missing credential"
      });
    }

    // Verify token with Google's official tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) {
      const errData = await googleRes.json().catch(() => ({}));
      return res.status(401).json({
        message: "Failed to verify Google token",
        error: errData.error_description || "Invalid Google token"
      });
    }

    const payload = await googleRes.json();
    const email = payload.email ? payload.email.trim().toLowerCase() : null;
    const name = payload.name || payload.given_name || (email ? email.split("@")[0] : "GoogleUser");
    const sub = payload.sub; // Google Unique ID
    const picture = payload.picture || null;

    if (!email) {
      return res.status(400).json({
        message: "Could not retrieve email from Google account",
        error: "No email in Google profile"
      });
    }

    // Check if user exists by email
    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

    let user;
    if (existing.length > 0) {
      user = existing[0];
      // Update verified status and avatar
      await db.execute(
        "UPDATE users SET is_verified = 1, auth_provider = IFNULL(auth_provider, 'google'), provider_id = IFNULL(provider_id, ?), avatar_url = IFNULL(avatar_url, ?) WHERE id = ?",
        [sub, picture, user.id]
      );
    } else {
      // Generate clean unique username
      let baseUsername = name.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "user";
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (true) {
        const [conflict] = await db.execute("SELECT id FROM users WHERE username = ?", [uniqueUsername]);
        if (conflict.length === 0) break;
        uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        counter++;
        if (counter > 10) break;
      }

      const [insertResult] = await db.execute(
        `INSERT INTO users (username, email, password_hash, is_verified, auth_provider, provider_id, avatar_url)
         VALUES (?, ?, NULL, 1, 'google', ?, ?)`,
        [uniqueUsername, email, sub, picture]
      );

      user = {
        id: insertResult.insertId,
        username: uniqueUsername,
        email,
        is_verified: 1,
        avatar_url: picture
      };
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_verified: true,
      avatar_url: user.avatar_url || picture
    };

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email, username: safeUser.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Google sign-in successful",
      token,
      user: safeUser
    });
  } catch (err) {
    console.error("[OAUTH ERROR] Google authentication error:", err);
    return res.status(500).json({
      message: "Server error during Google sign-in",
      error: err.message
    });
  }
};

// GitHub OAuth authorization redirect URL generator
const getGithubAuthUrl = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      message: "GitHub authentication is not configured yet. Please set GITHUB_CLIENT_ID.",
      error: "GITHUB_CLIENT_ID missing"
    });
  }

  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  return res.json({ url });
};

// GitHub OAuth callback endpoint
const githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code) {
      return res.redirect("/?oauth_error=Missing_GitHub_code");
    }

    if (!clientId || !clientSecret) {
      return res.redirect("/?oauth_error=GitHub_OAuth_not_configured");
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[GITHUB OAUTH] Access token exchange failed:", tokenData);
      return res.redirect(`/?oauth_error=${encodeURIComponent(tokenData.error_description || "Token exchange failed")}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch GitHub User Profile
    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "TaskPlanner-OAuth"
      }
    });
    const profile = await profileRes.json();

    // 3. Fetch primary verified email
    let primaryEmail = profile.email;
    if (!primaryEmail) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "TaskPlanner-OAuth"
        }
      });
      const emails = await emailsRes.json().catch(() => []);
      if (Array.isArray(emails)) {
        const verifiedPrimary = emails.find((e) => e.primary && e.verified);
        if (verifiedPrimary) {
          primaryEmail = verifiedPrimary.email;
        } else if (emails.length > 0) {
          primaryEmail = emails[0].email;
        }
      }
    }

    if (!primaryEmail) {
      return res.redirect("/?oauth_error=No_verified_email_in_GitHub_account");
    }

    const email = primaryEmail.trim().toLowerCase();
    const githubId = String(profile.id);
    const avatarUrl = profile.avatar_url || null;
    const name = profile.name || profile.login || email.split("@")[0];

    // 4. Find or create user
    const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

    let user;
    if (existing.length > 0) {
      user = existing[0];
      await db.execute(
        "UPDATE users SET is_verified = 1, auth_provider = IFNULL(auth_provider, 'github'), provider_id = IFNULL(provider_id, ?), avatar_url = IFNULL(avatar_url, ?) WHERE id = ?",
        [githubId, avatarUrl, user.id]
      );
    } else {
      let baseUsername = (profile.login || name).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "gh_user";
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (true) {
        const [conflict] = await db.execute("SELECT id FROM users WHERE username = ?", [uniqueUsername]);
        if (conflict.length === 0) break;
        uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        counter++;
        if (counter > 10) break;
      }

      const [insertResult] = await db.execute(
        `INSERT INTO users (username, email, password_hash, is_verified, auth_provider, provider_id, avatar_url)
         VALUES (?, ?, NULL, 1, 'github', ?, ?)`,
        [uniqueUsername, email, githubId, avatarUrl]
      );

      user = {
        id: insertResult.insertId,
        username: uniqueUsername,
        email,
        is_verified: 1,
        avatar_url: avatarUrl
      };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend root with the session token
    return res.redirect(`/?token=${encodeURIComponent(token)}&oauth=github`);
  } catch (err) {
    console.error("[GITHUB OAUTH ERROR]:", err);
    return res.redirect(`/?oauth_error=${encodeURIComponent(err.message)}`);
  }
};

module.exports = {
  googleAuth,
  getGithubAuthUrl,
  githubCallback
};
