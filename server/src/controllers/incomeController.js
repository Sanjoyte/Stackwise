import Income from "../models/Income.js";

// @desc    Create a new income
// @route   POST /api/incomes
// @access  Private
export const createIncome = async (req, res, next) => {
  try {
    const { amount, currency, source, clientName, date, notes, linkedTemplate } = req.body;

    if (amount === undefined || !source || !date) {
      return res.status(400).json({
        success: false,
        message: "Amount, source, and date are required",
      });
    }

    const income = await Income.create({
      user: req.user._id,
      amount,
      currency: currency || req.user.baseCurrency || "USD",
      source,
      clientName,
      date: new Date(date),
      notes,
      linkedTemplate,
    });

    return res.status(201).json({
      success: true,
      income,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get all incomes for the logged-in user
// @route   GET /api/incomes
// @access  Private
export const getIncomes = async (req, res, next) => {
  try {
    const incomes = await Income.find({ user: req.user._id }).sort({
      date: -1,
    });

    return res.status(200).json({
      success: true,
      count: incomes.length,
      incomes,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get income by ID
// @route   GET /api/incomes/:id
// @access  Private
export const getIncomeById = async (req, res, next) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    // Verify ownership
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this income entry",
      });
    }

    return res.status(200).json({
      success: true,
      income,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update income
// @route   PUT /api/incomes/:id
// @access  Private
export const updateIncome = async (req, res, next) => {
  try {
    let income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    // Verify ownership
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this income entry",
      });
    }

    const { amount, currency, source, clientName, date, notes } = req.body;

    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (currency !== undefined) updates.currency = currency;
    if (source !== undefined) updates.source = source;
    if (clientName !== undefined) updates.clientName = clientName;
    if (date !== undefined) updates.date = new Date(date);
    if (notes !== undefined) updates.notes = notes;

    income = await Income.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      income,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Delete income
// @route   DELETE /api/incomes/:id
// @access  Private
export const deleteIncome = async (req, res, next) => {
  try {
    const income = await Income.findById(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    // Verify ownership
    if (income.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this income entry",
      });
    }

    await income.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
