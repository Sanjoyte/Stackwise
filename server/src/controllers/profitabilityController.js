import { getProfitabilityReport, getClientProfitabilityReport } from "../services/profitabilityService.js";

// @desc    Get profitability analysis per client/project
// @route   GET /api/profitability
// @access  Private
export const getProfitability = async (req, res, next) => {
  try {
    const report = await getProfitabilityReport({
      userId: req.user._id,
      baseCurrency: req.user.baseCurrency || "BDT",
    });

    return res.status(200).json({
      success: true,
      ...report,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get profitability analysis for a specific client/project
// @route   GET /api/profitability/:clientId
// @access  Private
export const getClientProfitability = async (req, res, next) => {
  try {
    const report = await getClientProfitabilityReport({
      userId: req.user._id,
      baseCurrency: req.user.baseCurrency || "BDT",
      clientId: req.params.clientId,
    });

    return res.status(200).json({
      success: true,
      ...report,
    });
  } catch (error) {
    return next(error);
  }
};