const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/damages
 * Retrieve all damage incident reports
 */
router.get('/', async (req, res) => {
  try {
    const reports = await db.getDamageReports();
    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/damages
 * File a new damage report
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      booking_id,
      listing_id,
      severity,
      incident_description,
      estimated_cost,
      photo_evidence_url
    } = req.body;

    if (!booking_id || !listing_id || !severity || !incident_description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required damage report fields: booking_id, listing_id, severity, and incident description are required.'
      });
    }

    const booking = await db.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Associated booking not found.' });
    }

    const report = await db.createDamageReport({
      booking_id,
      listing_id,
      reported_by_user_id: req.user.id,
      reported_by_role: req.userRole,
      severity,
      incident_description: incident_description.trim(),
      estimated_cost: Number(estimated_cost || 0),
      actual_cost: 0.00,
      deducted_from_deposit: 0.00,
      photo_evidence_url: photo_evidence_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    });

    res.status(201).json({
      success: true,
      message: 'Damage report logged successfully. Placed under assessment.',
      data: report
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/damages/:id/resolve
 * Arbitrate and resolve damage incident, deduct from deposit if applicable
 */
router.patch('/:id/resolve', requireAuth, requireRole('owner', 'operator', 'admin'), async (req, res) => {
  try {
    const { actual_cost, deducted_from_deposit, resolution_notes, status } = req.body;
    
    if (deducted_from_deposit === undefined || !resolution_notes) {
      return res.status(400).json({
        success: false,
        error: 'Please provide deducted_from_deposit amount and resolution_notes.'
      });
    }

    const resolved = await db.resolveDamageReport(req.params.id, {
      actual_cost: Number(actual_cost || deducted_from_deposit),
      deducted_from_deposit: Number(deducted_from_deposit),
      resolution_notes: resolution_notes.trim(),
      status: status || 'resolved'
    }, req.user.id);

    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Damage report not found.' });
    }

    res.json({
      success: true,
      message: `Damage report #${resolved.id} resolved. Deducted $${resolved.deducted_from_deposit} from deposit escrow.`,
      data: resolved
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
