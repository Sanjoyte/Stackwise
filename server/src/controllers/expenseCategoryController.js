import {
  createExpenseCategory,
  getCategoryOptions,
  getExpenseCategoryDetail,
  getExpenseCategorySpending,
  setCategoryBudget,
} from "../services/expenseCategoryService.js";

const getPeriod = (
  requestedPeriod
) => {
  return requestedPeriod ===
    "yearly"
    ? "yearly"
    : "monthly";
};

/* =========================================
   GET CATEGORY ANALYTICS
   ========================================= */

export const getCategorySpending =
  async (
    req,
    res,
    next
  ) => {
    try {
      const period =
        getPeriod(
          req.query.period
        );

      const data =
        await getExpenseCategorySpending(
          {
            userId:
              req.user._id,

            period,
          }
        );

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================
   GET ALL CATEGORY OPTIONS
   ========================================= */

export const getCategories =
  async (
    req,
    res,
    next
  ) => {
    try {
      const categories =
        await getCategoryOptions(
          req.user._id
        );

      return res
        .status(200)
        .json({
          success: true,
          categories,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================
   GET SINGLE CATEGORY
   ========================================= */

export const getCategoryDetail =
  async (
    req,
    res,
    next
  ) => {
    try {
      const period =
        getPeriod(
          req.query.period
        );

      const data =
        await getExpenseCategoryDetail(
          {
            userId:
              req.user._id,

            slug:
              req.params.slug,

            period,
          }
        );

      if (!data) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Expense category not found.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return next(error);
    }
  };

/* =========================================
   ADD CUSTOM CATEGORY
   ========================================= */

export const addCategory =
  async (
    req,
    res,
    next
  ) => {
    try {
      const category =
        await createExpenseCategory(
          {
            userId:
              req.user._id,

            name:
              req.body.name,

            icon:
              req.body.icon,

            theme:
              req.body.theme,

            monthlyBudget:
              req.body
                .monthlyBudget,
          }
        );

      return res
        .status(201)
        .json({
          success: true,
          category,
        });
    } catch (error) {
      return next(error);
    }
  };

  export const updateCategoryBudget = async (req, res, next) => {
  try {
    const category = await setCategoryBudget({
      userId: req.user._id,
      slug: req.params.slug,
      monthlyBudget: req.body.monthlyBudget,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Expense category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    return next(error);
  }
};