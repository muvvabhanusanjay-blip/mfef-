const SavingsGoal = require('../models/SavingsGoal');

/**
 * Get all savings goals for the authenticated user
 * GET /api/goals
 */
const getGoals = async (req, res) => {
  try {
    const userId = req.session.userId;
    const goals = await SavingsGoal.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('[Get Goals Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve savings goals.'
    });
  }
};

/**
 * Create a new savings goal
 * POST /api/goals
 */
const createGoal = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, targetAmount, currentAmount, targetDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Goal title is required.'
      });
    }

    const numTarget = parseFloat(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Target amount must be a number greater than 0.'
      });
    }

    const numCurrent = currentAmount !== undefined ? parseFloat(currentAmount) : 0;
    if (isNaN(numCurrent) || numCurrent < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current amount cannot be negative.'
      });
    }

    const goal = await SavingsGoal.create({
      userId,
      title: title.trim(),
      targetAmount: numTarget,
      currentAmount: numCurrent,
      targetDate: targetDate ? new Date(targetDate) : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Savings goal created successfully.',
      data: goal
    });
  } catch (error) {
    console.error('[Create Goal Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create savings goal.'
    });
  }
};

/**
 * Update a savings goal or add a contribution
 * PUT /api/goals/:id
 */
const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { title, targetAmount, currentAmount, depositAmount, targetDate } = req.body;

    const goal = await SavingsGoal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found.'
      });
    }

    if (title && title.trim()) goal.title = title.trim();

    if (targetAmount !== undefined) {
      const numTarget = parseFloat(targetAmount);
      if (isNaN(numTarget) || numTarget <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Target amount must be greater than 0.'
        });
      }
      goal.targetAmount = numTarget;
    }

    // Support incremental deposits (e.g. adding ₹5,000 to goal)
    if (depositAmount !== undefined) {
      const numDeposit = parseFloat(depositAmount);
      if (isNaN(numDeposit)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deposit amount.'
        });
      }
      goal.currentAmount = Math.max(0, goal.currentAmount + numDeposit);
    } else if (currentAmount !== undefined) {
      const numCurrent = parseFloat(currentAmount);
      if (isNaN(numCurrent) || numCurrent < 0) {
        return res.status(400).json({
          success: false,
          message: 'Current amount cannot be negative.'
        });
      }
      goal.currentAmount = numCurrent;
    }

    if (targetDate !== undefined) {
      goal.targetDate = targetDate ? new Date(targetDate) : undefined;
    }

    await goal.save();

    res.status(200).json({
      success: true,
      message: 'Savings goal updated successfully.',
      data: goal
    });
  } catch (error) {
    console.error('[Update Goal Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update savings goal.'
    });
  }
};

/**
 * Delete a savings goal
 * DELETE /api/goals/:id
 */
const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const goal = await SavingsGoal.findOneAndDelete({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Savings goal not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Savings goal deleted successfully.',
      data: { id: goal._id }
    });
  } catch (error) {
    console.error('[Delete Goal Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete savings goal.'
    });
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal
};
