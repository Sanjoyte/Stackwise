import {
  getFinancialHealthReport,
} from "../services/financialHealthService.js";

// @desc    Get the user's overall financial health score, sub-scores and insights
// @route   GET /api/financial-health
// @access  Private
export const getFinancialHealth = async (req, res, next) => {
  try {
    const report = await getFinancialHealthReport({
      userId: req.user._id,
      baseCurrency: req.user.baseCurrency || "BDT",
    });

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return next(error);
  }
};
