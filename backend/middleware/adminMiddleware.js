// backend/middleware/adminMiddleware.js
// Verifies user is logged in AND has role === 'admin'

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required",
      error: "Authentication required"
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access forbidden: Administrator privileges required",
      error: "Administrator privileges required"
    });
  }

  next();
};

module.exports = requireAdmin;