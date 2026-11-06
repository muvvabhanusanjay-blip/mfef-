const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Category color map aligned with the premium dark fintech theme
const CATEGORY_COLORS = {
  'Housing': '#579BFF',       // Chart Blue
  'Food & Dining': '#00E6A0', // Neon Mint Green
  'Transport': '#A78BFA',     // Chart Purple
  'Entertainment': '#FF5B73', // Coral Red
  'Shopping': '#FFB347',      // Amber
  'Education': '#06B6D4',     // Cyan
  'Healthcare': '#F43F5E',    // Rose
  'Utilities': '#38BDF8',     // Sky Blue
  'Salary': '#00E6A0',        // Mint
  'Investment': '#10B981',    // Emerald
  'Other': '#71717A'          // Muted Zinc
};

/**
 * Helper to compute date ranges for current and previous equivalent period
 */
function getPeriodBoundaries(period = '1M') {
  const now = new Date();
  let currentStart, currentEnd, previousStart, previousEnd;

  currentEnd = new Date(now);

  switch (period.toUpperCase()) {
    case '1W': {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);

      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousEnd.getDate() - 7);
      break;
    }
    case '3M': {
      currentStart = new Date(now);
      currentStart.setMonth(now.getMonth() - 3);
      currentStart.setHours(0, 0, 0, 0);

      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setMonth(previousEnd.getMonth() - 3);
      break;
    }
    case '1Y': {
      currentStart = new Date(now);
      currentStart.setFullYear(now.getFullYear() - 1);
      currentStart.setHours(0, 0, 0, 0);

      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setFullYear(previousEnd.getFullYear() - 1);
      break;
    }
    case '1M':
    default: {
      // Current Month to date vs Previous Full Month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Get 4 Top Financial Summary Metrics
 * GET /api/dashboard/summary?period=1M
 */
const getSummary = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { period = '1M' } = req.query;

    const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodBoundaries(period);

    // 1. All-time Net Cash Balance (Total Income - Total Expenses)
    const allTimeAgg = await Transaction.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let allTimeIncome = 0;
    let allTimeExpense = 0;
    allTimeAgg.forEach((item) => {
      if (item._id === 'income') allTimeIncome = item.total;
      if (item._id === 'expense') allTimeExpense = item.total;
    });
    const netCashBalance = allTimeIncome - allTimeExpense;

    // 2. Current Period Metrics
    const currentAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: currentStart, $lte: currentEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let currentIncome = 0;
    let currentExpense = 0;
    currentAgg.forEach((item) => {
      if (item._id === 'income') currentIncome = item.total;
      if (item._id === 'expense') currentExpense = item.total;
    });

    // 3. Previous Period Metrics for Trend Indicator
    const prevAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: previousStart, $lte: previousEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let prevIncome = 0;
    let prevExpense = 0;
    prevAgg.forEach((item) => {
      if (item._id === 'income') prevIncome = item.total;
      if (item._id === 'expense') prevExpense = item.total;
    });

    // Percentage change calculations
    const computeChange = (curr, prev) => {
      if (!prev || prev === 0) {
        return curr > 0 ? 100 : 0;
      }
      return Math.round(((curr - prev) / prev) * 100);
    };

    const incomeChangePercent = computeChange(currentIncome, prevIncome);
    const expenseChangePercent = computeChange(currentExpense, prevExpense);

    // Savings Rate = ((Income - Expense) / Income) * 100
    let savingsRate = 0;
    if (currentIncome > 0) {
      const netSavings = currentIncome - currentExpense;
      savingsRate = Math.round((netSavings / currentIncome) * 100);
    }

    // Get user currency preference
    const user = await User.findById(userId).select('currency name');

    res.status(200).json({
      success: true,
      period,
      currency: user ? user.currency : 'INR',
      userName: user ? user.name : 'User',
      metrics: {
        netCashBalance: {
          value: netCashBalance,
          label: 'Available Balance'
        },
        monthlyIncome: {
          value: currentIncome,
          changePercent: incomeChangePercent,
          isPositive: incomeChangePercent >= 0,
          label: 'Total Income'
        },
        totalSpent: {
          value: currentExpense,
          changePercent: expenseChangePercent,
          isPositive: expenseChangePercent <= 0, // Lower spending is good
          label: 'Total Spent'
        },
        savingsRate: {
          value: savingsRate,
          isPositive: savingsRate >= 0,
          label: 'Savings Rate'
        }
      }
    });
  } catch (error) {
    console.error('[Get Dashboard Summary Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard metrics.'
    });
  }
};

/**
 * Get Cash Flow Overview (Chart.js dual-line chart dataset)
 * GET /api/dashboard/cashflow?period=1M
 */
const getCashFlow = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { period = '1M' } = req.query;

    const { currentStart, currentEnd } = getPeriodBoundaries(period);

    // Fetch transactions in period
    const transactions = await Transaction.find({
      userId: userObjectId,
      date: { $gte: currentStart, $lte: currentEnd }
    }).sort({ date: 1 });

    // Build timeline buckets depending on period
    const labels = [];
    const incomeMap = {};
    const expenseMap = {};

    if (period.toUpperCase() === '1W') {
      // 7 Daily buckets
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        labels.push(dayLabel);
        incomeMap[dayLabel] = 0;
        expenseMap[dayLabel] = 0;
      }
      transactions.forEach((tx) => {
        const dayLabel = new Date(tx.date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (incomeMap[dayLabel] !== undefined && tx.type === 'income') incomeMap[dayLabel] += tx.amount;
        if (expenseMap[dayLabel] !== undefined && tx.type === 'expense') expenseMap[dayLabel] += tx.amount;
      });
    } else if (period.toUpperCase() === '1Y') {
      // 12 Monthly buckets
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        labels.push(mLabel);
        incomeMap[mLabel] = 0;
        expenseMap[mLabel] = 0;
      }
      transactions.forEach((tx) => {
        const d = new Date(tx.date);
        const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        if (incomeMap[mLabel] !== undefined && tx.type === 'income') incomeMap[mLabel] += tx.amount;
        if (expenseMap[mLabel] !== undefined && tx.type === 'expense') expenseMap[mLabel] += tx.amount;
      });
    } else {
      // 1M or 3M: 4 to 6 Weekly buckets
      const bucketCount = period.toUpperCase() === '3M' ? 12 : 4;
      for (let i = 1; i <= bucketCount; i++) {
        const wLabel = `Week ${i}`;
        labels.push(wLabel);
        incomeMap[wLabel] = 0;
        expenseMap[wLabel] = 0;
      }

      const totalTimeSpan = currentEnd.getTime() - currentStart.getTime();
      const bucketDuration = totalTimeSpan / bucketCount;

      transactions.forEach((tx) => {
        const offset = tx.date.getTime() - currentStart.getTime();
        let bucketIdx = Math.floor(offset / bucketDuration);
        if (bucketIdx >= bucketCount) bucketIdx = bucketCount - 1;
        if (bucketIdx < 0) bucketIdx = 0;
        const wLabel = `Week ${bucketIdx + 1}`;
        if (tx.type === 'income') incomeMap[wLabel] = (incomeMap[wLabel] || 0) + tx.amount;
        if (tx.type === 'expense') expenseMap[wLabel] = (expenseMap[wLabel] || 0) + tx.amount;
      });
    }

    const incomeData = labels.map((l) => incomeMap[l] || 0);
    const expenseData = labels.map((l) => expenseMap[l] || 0);

    const totalIncome = incomeData.reduce((acc, v) => acc + v, 0);
    const totalExpense = expenseData.reduce((acc, v) => acc + v, 0);

    res.status(200).json({
      success: true,
      period,
      chartData: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#00E6A0', // Neon Green
            backgroundColor: 'rgba(0, 230, 160, 0.12)'
          },
          {
            label: 'Expense',
            data: expenseData,
            borderColor: '#FF5B73', // Coral Red
            backgroundColor: 'rgba(255, 91, 115, 0.12)'
          }
        ]
      },
      summary: {
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense
      }
    });
  } catch (error) {
    console.error('[Get Cashflow Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cash flow overview.'
    });
  }
};

/**
 * Get Spending by Category (Chart.js doughnut chart dataset)
 * GET /api/dashboard/spending?period=1M
 */
const getSpending = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { period = '1M' } = req.query;

    const { currentStart, currentEnd } = getPeriodBoundaries(period);

    // Aggregate category expenses
    const categoryAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'expense',
          date: { $gte: currentStart, $lte: currentEnd }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const totalSpending = categoryAgg.reduce((acc, c) => acc + c.totalAmount, 0);

    const categories = categoryAgg.map((item) => {
      const percentage = totalSpending > 0 ? Math.round((item.totalAmount / totalSpending) * 100) : 0;
      return {
        category: item._id,
        amount: item.totalAmount,
        count: item.count,
        percentage,
        color: CATEGORY_COLORS[item._id] || '#A0A0B8'
      };
    });

    res.status(200).json({
      success: true,
      period,
      totalSpending,
      categories,
      chartData: {
        labels: categories.map((c) => c.category),
        datasets: [
          {
            data: categories.map((c) => c.amount),
            backgroundColor: categories.map((c) => c.color),
            borderWidth: 2,
            borderColor: '#101024' // Card background border
          }
        ]
      }
    });
  } catch (error) {
    console.error('[Get Spending Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute spending breakdown.'
    });
  }
};

module.exports = {
  getSummary,
  getCashFlow,
  getSpending
};
