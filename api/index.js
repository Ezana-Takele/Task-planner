// api/index.js - High Performance Vercel Serverless Handler
const app = require("../backend/server");

module.exports = (req, res) => {
  return app(req, res);
};
