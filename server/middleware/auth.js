const db = require('../db');

// State for active demo user if session header not provided
let currentActiveUserId = 'u_renter_joe'; // Default active persona: Joe Higgins (Renter)

/**
 * Authentication & Persona Resolution Middleware
 */
const authenticateUser = async (req, res, next) => {
  try {
    // 1. Check custom header (for API clients, tests, or UI role switcher)
    const headerUserId = req.headers['x-user-id'] || req.headers['authorization']?.replace('Bearer ', '');
    
    let targetUserId = headerUserId || currentActiveUserId;

    if (targetUserId === 'visitor' || targetUserId === 'public') {
      req.user = null;
      req.userRole = 'visitor';
      return next();
    }

    const user = await db.getUserById(targetUserId);
    if (user) {
      req.user = user;
      req.userRole = user.role;
    } else {
      req.user = null;
      req.userRole = 'visitor';
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.user = null;
    req.userRole = 'visitor';
    next();
  }
};

/**
 * Require at least a registered user (renter, owner, operator, or admin)
 */
const requireAuth = (req, res, next) => {
  if (!req.user || req.userRole === 'visitor') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please select or log in with an active user account.'
    });
  }
  next();
};

/**
 * Require specific roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Admin always has supervisory access
    if (req.userRole === 'admin' || allowedRoles.includes(req.userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied. Requires role: [${allowedRoles.join(', ')}]. Current role: ${req.userRole}`
    });
  };
};

/**
 * Switch the active persona (for testing and evaluator convenience)
 */
const switchPersona = async (userId) => {
  if (userId === 'visitor') {
    currentActiveUserId = 'visitor';
    return { id: 'visitor', role: 'visitor', full_name: 'Visitor / Public Guest' };
  }
  const user = await db.getUserById(userId);
  if (!user) throw new Error('User not found');
  currentActiveUserId = user.id;
  return user;
};

const getCurrentActiveUserId = () => currentActiveUserId;

module.exports = {
  authenticateUser,
  requireAuth,
  requireRole,
  switchPersona,
  getCurrentActiveUserId
};
