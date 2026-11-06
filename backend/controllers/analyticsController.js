const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const CATEGORY_COLORS = {
  'Housing': '#579BFF',
  'Food & Dining': '#00E6A0',
  'Transport': '#A78BFA',
  'Entertainment': '#FF5B73',
  'Shopping': '#FFB347',
  'Education': '#06B6D4',
  'Healthcare': '#F43F5E',
  'Utilities': '#38BDF8',
  'Other': '#71717A'
};

/**
 * Get comprehensive overview analytics
 * GET /api/analytics/overview?timeframe=monthly
 */
const getOverview = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { timeframe = 'monthly' } = req.query;

    const now = new Date();
    // Default: past 6 months
    const pastMonthsCount = 6;
    const startDate = new Date(now.getFullYear(), now.getMonth() - (pastMonthsCount - 1), 1);

    // 1. All-time aggregate
    const allTotals = await Transaction.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransactions = 0;
    allTotals.forEach((t) => {
      totalTransactions += t.count;
      if (t._id === 'income') totalIncome = t.total;
      if (t._id === 'expense') totalExpense = t.total;
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // 2. Monthly Trend (Past 6 months)
    const monthlyAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Build timeline array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timelineLabels = [];
    const monthlyIncomeData = [];
    const monthlyExpenseData = [];

    for (let i = pastMonthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = `${monthNames[m - 1]} ${y.toString().slice(-2)}`;
      timelineLabels.push(label);

      const inc = monthlyAgg.find(
        (item) => item._id.year === y && item._id.month === m && item._id.type === 'income'
      );
      const exp = monthlyAgg.find(
        (item) => item._id.year === y && item._id.month === m && item._id.type === 'expense'
      );

      monthlyIncomeData.push(inc ? inc.total : 0);
      monthlyExpenseData.push(exp ? exp.total : 0);
    }

    // 3. Highest spending category
    const topCategoryAgg = await Transaction.aggregate([
      { $match: { userId: userObjectId, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 1 }
    ]);

    const highestCategory =
      topCategoryAgg.length > 0
        ? {
            name: topCategoryAgg[0]._id,
            amount: topCategoryAgg[0].totalAmount,
            percentage: totalExpense > 0 ? Math.round((topCategoryAgg[0].totalAmount / totalExpense) * 100) : 0
          }
        : null;

    res.status(200).json({
      success: true,
      timeframe,
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        totalTransactions,
        highestSpendingCategory: highestCategory
      },
      monthlyTrends: {
        labels: timelineLabels,
        income: monthlyIncomeData,
        expenses: monthlyExpenseData
      }
    });
  } catch (error) {
    console.error('[Get Analytics Overview Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics overview.'
    });
  }
};

/**
 * Get detailed category breakdown
 * GET /api/analytics/categories
 */
const getCategoryAnalytics = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const categoryAgg = await Transaction.aggregate([
      { $match: { userId: userObjectId, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalExpense = categoryAgg.reduce((acc, c) => acc + c.totalAmount, 0);

    const categories = categoryAgg.map((c) => ({
      category: c._id,
      totalAmount: c.totalAmount,
      count: c.count,
      avgAmount: Math.round(c.avgAmount),
      maxAmount: c.maxAmount,
      percentage: totalExpense > 0 ? Math.round((c.totalAmount / totalExpense) * 100) : 0,
      color: CATEGORY_COLORS[c._id] || '#A0A0B8'
    }));

    res.status(200).json({
      success: true,
      totalExpense,
      categories
    });
  } catch (error) {
    console.error('[Get Category Analytics Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category analytics.'
    });
  }
};

module.exports = {
  getOverview,
  getCategoryAnalytics
};
