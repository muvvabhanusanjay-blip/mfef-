const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    month: {
      type: Number,
      required: [true, 'Month is required (1-12)'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2000, 'Year must be 2000 or later']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [0, 'Budget amount cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate budgets for the same category in the same month for a user
budgetSchema.index({ userId: 1, month: 1, year: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
