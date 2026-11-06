const express = require('express');
const router = express.Router();
const {
  getMe,
  updateProfile,
  updatePassword
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protected Profile Endpoints
router.use(requireAuth);

router.get('/', getMe);
router.put('/', updateProfile);
router.put('/password', updatePassword);

module.exports = router;
