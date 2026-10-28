const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/ledger
 * View deposit escrow ledger entries
 */
router.get('/', async (req, res) => {
  try {
    const { booking_id, user_id } = req.query;
    let targetBookingId = booking_id;
    let targetUserId = user_id;

    // Filter to user scope if not admin
    if (req.user && req.userRole !== 'admin' && !targetBookingId) {
      targetUserId = req.user.id;
    }

    const ledger = await db.getDepositLedger(targetBookingId, targetUserId);

    // Calculate escrow aggregates
    const totalHolds = ledger
      .filter(l => l.entry_type === 'HOLD')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const totalReleased = ledger
      .filter(l => ['RELEASE_FULL', 'RELEASE_PARTIAL'].includes(l.entry_type))
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const totalDeductions = ledger
      .filter(l => ['DAMAGE_DEDUCTION', 'FUEL_PENALTY', 'EXCESS_HOURS_FEE', 'FORFEITURE'].includes(l.entry_type))
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const activeEscrowBalance = Math.max(0, totalHolds - totalReleased - totalDeductions);

    res.json({
      success: true,
      summary: {
        totalHolds: Number(totalHolds.toFixed(2)),
        totalReleased: Number(totalReleased.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        activeEscrowBalance: Number(activeEscrowBalance.toFixed(2))
      },
      count: ledger.length,
      data: ledger
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
