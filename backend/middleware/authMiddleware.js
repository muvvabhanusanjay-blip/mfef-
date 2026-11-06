const User = require('../models/User');

/**
 * Middleware to require authentication on protected routes
 */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in to continue.'
      });
    }

    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'User session invalid or user no longer exists.'
      });
    }

    // Attach user to request object for easy downstream access
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication check.'
    });
  }
};

module.exports = { requireAuth };
