const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * POST /api/bookings/check-conflict
 * Pre-flight check for date overlap before booking
 */
router.post('/check-conflict', async (req, res) => {
  try {
    const { listing_id, start_date, end_date, exclude_booking_id } = req.body;
    if (!listing_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'listing_id, start_date, and end_date are required.' });
    }

    const conflictResult = await db.checkBookingConflict(listing_id, start_date, end_date, exclude_booking_id);
    res.json({
      success: true,
      hasConflict: conflictResult.hasConflict,
      conflictingBooking: conflictResult.conflictingBooking || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bookings
 * Create overlap-safe booking request
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      listing_id,
      start_date,
      end_date,
      delivery_mode,
      crop_task_description,
      hire_type,
      insurance_confirmed
    } = req.body;

    // Basic Validation
    if (!listing_id || !start_date || !end_date || !crop_task_description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide listing ID, start date, end date, and intended crop/field task.'
      });
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format.' });
    }

    if (endDateObj < startDateObj) {
      return res.status(400).json({ success: false, error: 'End date cannot precede start date.' });
    }

    // Retrieve equipment details
    const listing = await db.getListingById(listing_id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Target equipment listing not found.' });
    }

    // Prevent owner from booking their own equipment
    if (listing.owner_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You are the registered owner of this equipment and cannot rent it from yourself.'
      });
    }

    // Overlap Safety Conflict Check
    const conflict = await db.checkBookingConflict(listing_id, start_date, end_date);
    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        error: `Schedule Conflict: This machinery is already reserved from ${conflict.conflictingBooking.start_date} to ${conflict.conflictingBooking.end_date} (Ref: ${conflict.conflictingBooking.ref}). Please select another date window.`,
        conflictDetails: conflict.conflictingBooking
      });
    }

    // Calculate duration in days (inclusive)
    const diffTime = Math.abs(endDateObj - startDateObj);
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    if (totalDays < (listing.min_rental_days || 1)) {
      return res.status(400).json({
        success: false,
        error: `Rental duration of ${totalDays} days is below the required minimum of ${listing.min_rental_days} day(s) for this machinery.`
      });
    }

    // Pricing calculation with idle discount
    const baseDailyRate = Number(listing.daily_rate);
    const discountPct = Number(listing.idle_discount_pct || 0);
    const dailyRateApplied = discountPct > 0
      ? Number((baseDailyRate * (1 - discountPct / 100)).toFixed(2))
      : baseDailyRate;

    const rentalTotal = Number((dailyRateApplied * totalDays).toFixed(2));
    const securityDepositHeld = Number(listing.security_deposit || 0);

    let deliveryFee = 0.00;
    if (delivery_mode === 'Owner Delivery') {
      deliveryFee = 85.00; // Flat local mobilization rate
    } else if (delivery_mode === 'Commercial Hauling') {
      deliveryFee = 220.00;
    }

    const grandTotal = Number((rentalTotal + deliveryFee + securityDepositHeld).toFixed(2));

    const newBooking = await db.createBooking({
      listing_id,
      renter_id: req.user.id,
      start_date,
      end_date,
      total_days: totalDays,
      daily_rate_applied: dailyRateApplied,
      rental_total: rentalTotal,
      security_deposit_held: securityDepositHeld,
      delivery_mode: delivery_mode || 'Self Pickup',
      delivery_fee: deliveryFee,
      grand_total: grandTotal,
      crop_task_description: crop_task_description.trim(),
      hire_type: hire_type || 'Dry Hire',
      insurance_confirmed: Boolean(insurance_confirmed)
    });

    res.status(201).json({
      success: true,
      message: `Booking request ${newBooking.booking_ref} created and deposit held in simulated escrow.`,
      data: newBooking
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookings
 * List bookings based on role / filter
 */
router.get('/', async (req, res) => {
  try {
    const { status, role_filter } = req.query;
    let filters = {};
    if (status) filters.status = status;

    // Filter by authenticated user context
    if (req.user && req.userRole === 'renter') {
      filters.renter_id = req.user.id;
    } else if (req.user && req.userRole === 'owner') {
      filters.owner_id = req.user.id;
    }

    if (role_filter === 'renter' && req.user) filters.renter_id = req.user.id;
    if (role_filter === 'owner' && req.user) filters.owner_id = req.user.id;

    const bookings = await db.getBookings(filters);
    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve single booking by ID or Reference
 */
router.get('/:id', async (req, res) => {
  try {
    const booking = await db.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Handle state transitions: approve, decline, cancel, confirm, complete
 */
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status: newStatus, notes } = req.body;
    const booking = await db.getBookingById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const validTransitions = {
      pending: ['approved', 'declined', 'cancelled'],
      approved: ['confirmed', 'cancelled'],
      confirmed: ['in_field', 'cancelled'],
      in_field: ['returned'],
      returned: ['completed'],
      completed: [],
      declined: [],
      cancelled: []
    };

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from '${booking.status}' to '${newStatus}'. Allowed transitions: [${allowed.join(', ')}]`
      });
    }

    // Role boundary checks
    if (['approved', 'declined'].includes(newStatus)) {
      // Must be listing owner or admin
      if (req.userRole !== 'admin' && booking.listing?.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Only the equipment owner or platform administrator can approve or decline this booking request.'
        });
      }
    }

    if (newStatus === 'cancelled') {
      // Either renter, owner, or admin
      const isRenter = booking.renter_id === req.user.id;
      const isOwner = booking.listing?.owner_id === req.user.id;
      const isAdmin = req.userRole === 'admin';
      if (!isRenter && !isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Unauthorized to cancel this booking.' });
      }
    }

    const updated = await db.updateBookingStatus(booking.id, newStatus, notes, req.user.id);
    res.json({
      success: true,
      message: `Booking ${booking.booking_ref} status transitioned to '${newStatus}'.`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
