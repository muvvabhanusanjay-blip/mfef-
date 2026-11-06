const express = require('express');
const router = express.Router();
const {
  getSummary,
  getCashFlow,
  getSpending
} = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/cashflow', getCashFlow);
router.get('/spending', getSpending);

module.exports = router;
