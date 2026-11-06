const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Savings goal title is required'],
      trim: true,
      maxlength: [80, 'Title cannot exceed 80 characters']
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1']
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative']
    },
    targetDate: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property to calculate progress percentage
savingsGoalSchema.virtual('progressPercentage').get(function () {
  if (!this.targetAmount || this.targetAmount <= 0) return 0;
  const pct = (this.currentAmount / this.targetAmount) * 100;
  return Math.min(100, Math.round(pct * 10) / 10);
});

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
