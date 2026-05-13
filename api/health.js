/* ════════════════════════════════════════════════════════════
   api/health.js  —  Simple health check endpoint
   GET /api/health → { ok: true, project: "pigeons" }
   ════════════════════════════════════════════════════════════ */
module.exports = function handler(req, res) {
  res.status(200).json({ ok: true, project: "pigeons" });
};
