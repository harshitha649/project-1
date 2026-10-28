const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * GET /api/metrics
 * System-wide operational and financial metrics
 */
router.get('/', async (req, res) => {
  try {
    const metrics = await db.getPlatformMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
