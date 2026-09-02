// api/index.js - Vercel Serverless Handler
const app = require("../backend/server");
const initializeDatabase = require("../backend/init-db");

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await initializeDatabase();
      isInitialized = true;
    } catch (err) {
      console.warn("[WARN] Cloud database initialization notice:", err.message);
    }
  }
  return app(req, res);
};

