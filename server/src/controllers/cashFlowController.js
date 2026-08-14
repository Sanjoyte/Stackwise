import {
  getCashFlowDashboard,
} from "../services/cashFlowService.js";

const ALLOWED_PERIODS =
  new Set([
    "monthly",
    "yearly",
  ]);

export const getCashFlow =
  async (
    req,
    res,
    next
  ) => {
    try {
      const requestedPeriod =
        String(
          req.query.period ||
            "monthly"
        ).toLowerCase();

      const period =
        ALLOWED_PERIODS.has(
          requestedPeriod
        )
          ? requestedPeriod
          : "monthly";

      const dashboard =
        await getCashFlowDashboard(
          {
            userId:
              req.user._id.toString(),

            currency:
              req.user
                .baseCurrency ||
              "USD",

            period,
          }
        );

      return res
        .status(200)
        .json({
          success: true,

          data: dashboard,
        });
    } catch (error) {
      return next(error);
    }
  };