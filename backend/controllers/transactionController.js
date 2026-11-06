const Transaction = require('../models/Transaction');

/**
 * Get all transactions with search, filter, sort, and pagination
 * GET /api/transactions
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.session.userId;
    const {
      search,
      type,
      category,
      startDate,
      endDate,
      sortBy = 'date_desc',
      page = 1,
      limit = 20
    } = req.query;

    // Strict user scoping
    const query = { userId };

    // Search query by title or description
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Filter by type (income / expense)
    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    // Filter by category
    if (category && category.trim()) {
      query.category = category.trim();
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        // Include the entire end day
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Sorting
    let sortOptions = { date: -1, _id: -1 };
    switch (sortBy) {
      case 'date_asc':
        sortOptions = { date: 1, _id: 1 };
        break;
      case 'amount_desc':
        sortOptions = { amount: -1, date: -1 };
        break;
      case 'amount_asc':
        sortOptions = { amount: 1, date: -1 };
        break;
      case 'date_desc':
      default:
        sortOptions = { date: -1, _id: -1 };
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Transaction.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('[Get Transactions Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions.'
    });
  }
};

/**
 * Get single transaction by ID (Scoped to User)
 * GET /api/transactions/:id
 */
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('[Get Transaction By ID Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction.'
    });
  }
};

/**
 * Create a new transaction
 * POST /api/transactions
 */
const createTransaction = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, amount, type, category, paymentMethod, date, description } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction title is required.'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number.'
      });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "income" or "expense".'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required.'
      });
    }

    const transaction = await Transaction.create({
      userId,
      title: title.trim(),
      amount: numAmount,
      type,
      category: category.trim(),
      paymentMethod: paymentMethod && paymentMethod.trim() ? paymentMethod.trim() : 'Cash',
      date: date ? new Date(date) : new Date(),
      description: description ? description.trim() : ''
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully.',
      data: transaction
    });
  } catch (error) {
    console.error('[Create Transaction Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create transaction.'
    });
  }
};

/**
 * Update an existing transaction (Scoped to User)
 * PUT /api/transactions/:id
 */
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;
    const { title, amount, type, category, paymentMethod, date, description } = req.body;

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    // Apply validated updates
    if (title && title.trim()) transaction.title = title.trim();
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number.'
        });
      }
      transaction.amount = numAmount;
    }
    if (type) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "income" or "expense".'
        });
      }
      transaction.type = type;
    }
    if (category && category.trim()) transaction.category = category.trim();
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod.trim() || 'Cash';
    if (date) transaction.date = new Date(date);
    if (description !== undefined) transaction.description = description.trim();

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      data: transaction
    });
  } catch (error) {
    console.error('[Update Transaction Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transaction.'
    });
  }
};

/**
 * Delete a transaction (Scoped to User)
 * DELETE /api/transactions/:id
 */
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
      data: { id: transaction._id }
    });
  } catch (error) {
    console.error('[Delete Transaction Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transaction.'
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
