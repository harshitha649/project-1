const express = require('express');
const router = express.Router();
const db = require('../db');
const { switchPersona, getCurrentActiveUserId } = require('../middleware/auth');

/**
 * GET /api/auth/me
 * Returns current authenticated user and persona
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        user: {
          id: 'visitor',
          role: 'visitor',
          full_name: 'Visitor / Public Farm Guest',
          county: 'Midwest Rural Network'
        }
      });
    }
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/personas
 * Returns available personas for demonstration and role evaluation
 */
router.get('/personas', async (req, res) => {
  try {
    const users = await db.getUsers();
    const personas = [
      {
        id: 'visitor',
        role: 'visitor',
        full_name: 'Public Visitor',
        farm_name: 'Browsing Guest',
        county: 'All Counties',
        description: 'Explore public listings, rates, and search without account privileges'
      },
      ...users.map(u => ({
        id: u.id,
        role: u.role,
        full_name: u.full_name,
        farm_name: u.farm_name,
        county: u.county,
        description: u.bio || `${u.role.toUpperCase()} persona in ${u.county} County`
      }))
    ];

    res.json({
      success: true,
      currentActiveId: getCurrentActiveUserId(),
      personas
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/switch-persona
 * Allows instant role switching in browser for testing
 */
router.post('/switch-persona', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const updatedUser = await switchPersona(userId);
    res.json({
      success: true,
      message: `Switched active persona to ${updatedUser.full_name} (${updatedUser.role})`,
      user: updatedUser
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
