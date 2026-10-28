const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * GET /api/listings
 * Search, filter and list equipment
 */
router.get('/', async (req, res) => {
  try {
    const { category, county, search, maxPrice, hireType, owner_id } = req.query;
    const listings = await db.getListings({
      category,
      county,
      search,
      maxPrice,
      hireType,
      owner_id
    });

    res.json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/listings/:id
 * Retrieve single listing with owner info, idle windows and booked calendar
 */
router.get('/:id', async (req, res) => {
  try {
    const listing = await db.getListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Equipment listing not found' });
    }
    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/listings
 * Create new equipment listing (Owner or Admin)
 */
router.post('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const {
      title,
      category,
      make,
      model,
      year,
      horsepower,
      condition,
      description,
      image_url,
      county,
      service_radius_miles,
      hourly_rate,
      daily_rate,
      weekly_rate,
      security_deposit,
      min_rental_days,
      fuel_policy,
      operator_option,
      max_hours_per_day,
      excess_hour_fee,
      idle_discount_pct
    } = req.body;

    // Validation
    if (!title || !category || !make || !model || !daily_rate || !county) {
      return res.status(400).json({
        success: false,
        error: 'Missing required listing fields: title, category, make, model, daily_rate, and county are mandatory.'
      });
    }

    if (Number(daily_rate) <= 0) {
      return res.status(400).json({ success: false, error: 'Daily rate must be greater than zero.' });
    }

    const newListing = await db.createListing({
      owner_id: req.user.id,
      title: title.trim(),
      category,
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || new Date().getFullYear(),
      horsepower: parseInt(horsepower, 10) || 0,
      condition: condition || 'Good',
      description: description ? description.trim() : '',
      image_url: image_url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=80',
      county: county.trim(),
      service_radius_miles: parseInt(service_radius_miles, 10) || 30,
      hourly_rate: Number(hourly_rate) || Math.round(Number(daily_rate) / 8),
      daily_rate: Number(daily_rate),
      weekly_rate: weekly_rate ? Number(weekly_rate) : Math.round(Number(daily_rate) * 5.5),
      security_deposit: security_deposit !== undefined ? Number(security_deposit) : Math.round(Number(daily_rate) * 2),
      min_rental_days: parseInt(min_rental_days, 10) || 1,
      fuel_policy: fuel_policy || 'Full-to-Full',
      operator_option: operator_option || 'Dry Hire (Machine Only)',
      max_hours_per_day: Number(max_hours_per_day) || 8.0,
      excess_hour_fee: Number(excess_hour_fee) || 45.00,
      idle_discount_pct: parseInt(idle_discount_pct, 10) || 0
    });

    res.status(201).json({
      success: true,
      message: 'Equipment listing created successfully',
      data: newListing
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/listings/:id
 * Update listing details
 */
router.put('/:id', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const existing = await db.getListingById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    // Role check: Only owner or admin can update
    if (req.userRole !== 'admin' && existing.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify another owners listing.' });
    }

    const updated = await db.updateListing(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Listing updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
