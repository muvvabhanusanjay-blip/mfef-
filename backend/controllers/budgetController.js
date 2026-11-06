const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

/**
 * Get all budgets for a given month and year with calculated spent & remaining amounts
 * GET /api/budgets?month=11&year=2026
 */
const getBudgets = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    // 1. Fetch user budgets for specified month and year
    const budgets = await Budget.find({ userId: userObjectId, month, year }).lean();

    // 2. Compute date boundaries for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. Aggregate user's actual expenses for that month by category
    const expenseAgg = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    // Create lookup map: { [category]: totalSpent }
    const spendingMap = {};
    let totalMonthlyExpenses = 0;
    expenseAgg.forEach((item) => {
      spendingMap[item._id] = item.totalSpent;
      totalMonthlyExpenses += item.totalSpent;
    });

    // 4. Enrich budgets with real-time financial stats
    const enrichedBudgets = budgets.map((b) => {
      const spent = b.category === 'Overall' ? totalMonthlyExpenses : spendingMap[b.category] || 0;
      const remaining = Math.max(0, b.amount - spent);
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const isExceeded = spent > b.amount;

      return {
        ...b,
        spent,
        remaining,
        percentage,
        isExceeded
      };
    });

    res.status(200).json({
      success: true,
      month,
      year,
      totalExpensesInMonth: totalMonthlyExpenses,
      data: enrichedBudgets
    });
  } catch (error) {
    console.error('[Get Budgets Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budgets.'
    });
  }
};

/**
 * Create or Upsert a budget
 * POST /api/budgets
 */
const createBudget = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { month, year, category, amount } = req.body;

    const numMonth = parseInt(month, 10);
    const numYear = parseInt(year, 10);
    const numAmount = parseFloat(amount);

    if (!numMonth || numMonth < 1 || numMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) is required.'
      });
    }

    if (!numYear || numYear < 2000) {
      return res.status(400).json({
        success: false,
        message: 'Valid year is required.'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required (e.g. "Overall", "Food & Dining").'
      });
    }

    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be 0 or greater.'
      });
    }

    // Upsert budget to avoid duplicate errors
    const budget = await Budget.findOneAndUpdate(
      { userId, month: numMonth, year: numYear, category: category.trim() },
      { amount: numAmount },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      message: 'Budget saved successfully.',
      data: budget
    });
  } catch (error) {
    console.error('[Create Budget Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save budget.'
    });
  }
};

/**
 * Update budget
 * PUT /api/budgets/:id
 */
const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { amount, category } = req.body;

    const budget = await Budget.findOne({ _id: id, userId });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found.'
      });
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a valid positive number.'
        });
      }
      budget.amount = numAmount;
    }

    if (category && category.trim()) {
      budget.category = category.trim();
    }

    await budget.save();

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully.',
      data: budget
    });
  } catch (error) {
    console.error('[Update Budget Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update budget.'
    });
  }
};

/**
 * Delete budget
 * DELETE /api/budgets/:id
 */
const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const budget = await Budget.findOneAndDelete({ _id: id, userId });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully.',
      data: { id: budget._id }
    });
  } catch (error) {
    console.error('[Delete Budget Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget.'
    });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
