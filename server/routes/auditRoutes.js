const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/audit-logs
 * System state transitions and audit trail
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await db.getAuditLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
