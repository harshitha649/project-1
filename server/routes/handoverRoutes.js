const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/handovers
 * Submit a Pre-Rental or Post-Return Inspection Checklist
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      booking_id,
      checklist_type,
      operator_or_inspector_name,
      meter_engine_hours,
      fuel_level_pct,
      hydraulic_fluid_ok,
      engine_oil_ok,
      tires_tracks_ok,
      safety_shields_pto_ok,
      lights_signals_ok,
      cleanliness_ok,
      condition_notes,
      excess_hours_billed,
      fuel_charge_billed,
      signoff_initials
    } = req.body;

    if (!booking_id || !checklist_type || meter_engine_hours === undefined || fuel_level_pct === undefined || !signoff_initials) {
      return res.status(400).json({
        success: false,
        error: 'Missing required checklist fields: booking_id, checklist_type, meter_engine_hours, fuel_level_pct, and signoff_initials are required.'
      });
    }

    const booking = await db.getBookingById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Associated booking record not found.' });
    }

    // Role check: Only operator, owner, renter involved, or admin
    const isOwner = booking.listing?.owner_id === req.user.id;
    const isRenter = booking.renter_id === req.user.id;
    const isOperator = req.userRole === 'operator';
    const isAdmin = req.userRole === 'admin';

    if (!isOwner && !isRenter && !isOperator && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized to sign handover checklists for this booking.' });
    }

    // Prevent duplicate checklist type for the same booking
    const existingChecklists = await db.getStore().handover_checklists.filter(c => c.booking_id === booking_id && c.checklist_type === checklist_type);
    if (existingChecklists.length > 0) {
      return res.status(409).json({
        success: false,
        error: `A ${checklist_type === 'pre_rental' ? 'pre-rental handover' : 'post-rental return'} checklist has already been recorded for this booking.`
      });
    }

    const checklist = await db.createChecklist({
      booking_id,
      checklist_type,
      operator_or_inspector_name: operator_or_inspector_name || req.user.full_name,
      meter_engine_hours: Number(meter_engine_hours),
      fuel_level_pct: parseInt(fuel_level_pct, 10),
      hydraulic_fluid_ok: Boolean(hydraulic_fluid_ok),
      engine_oil_ok: Boolean(engine_oil_ok),
      tires_tracks_ok: Boolean(tires_tracks_ok),
      safety_shields_pto_ok: Boolean(safety_shields_pto_ok),
      lights_signals_ok: Boolean(lights_signals_ok),
      cleanliness_ok: Boolean(cleanliness_ok),
      condition_notes: condition_notes ? condition_notes.trim() : '',
      excess_hours_billed: Number(excess_hours_billed || 0),
      fuel_charge_billed: Number(fuel_charge_billed || 0),
      signoff_initials: signoff_initials.trim().toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: `${checklist_type === 'pre_rental' ? 'Pre-rental handover' : 'Post-rental return'} checklist submitted successfully.`,
      data: checklist
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/handovers/:bookingId
 * Retrieve all checklists for a booking
 */
router.get('/:bookingId', async (req, res) => {
  try {
    const checklists = db.getStore().handover_checklists.filter(c => c.booking_id === req.params.bookingId);
    res.json({
      success: true,
      data: checklists
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
