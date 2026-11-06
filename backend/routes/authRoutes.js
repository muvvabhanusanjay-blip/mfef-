const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public Authentication Endpoints
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// Protected Authentication & Profile Endpoints
router.get('/me', requireAuth, getMe);
router.get('/profile', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.put('/profile/password', requireAuth, updatePassword);

module.exports = router;
