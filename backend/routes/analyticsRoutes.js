const express = require('express');
const router = express.Router();
const {
  getOverview,
  getCategoryAnalytics
} = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/categories', getCategoryAnalytics);

module.exports = router;
