import mongoose from "mongoose";

import ExpenseCategory from "../models/ExpenseCategory.js";

import {
  DEFAULT_EXPENSE_CATEGORIES,
} from "../data/defaultExpenseCategories.js";

/* =========================================
   HELPERS
   ========================================= */

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const roundMoney = (value) =>
  Math.round(
    (Number(value || 0) + Number.EPSILON) *
      100
  ) / 100;

const getExpenseAmount = (expense) => {
  const rawAmount =
    expense.amount ??
    expense.total ??
    expense.value ??
    expense.cost ??
    0;

  const amount = Number(rawAmount);

  return Number.isFinite(amount)
    ? amount
    : 0;
};

const getExpenseDate = (expense) => {
  const rawDate =
    expense.date ??
    expense.expenseDate ??
    expense.paidAt ??
    expense.createdAt;

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

/* =========================================
   PERIOD RANGE
   ========================================= */

const getPeriodRange = (period) => {
  const now = new Date();

  if (period === "yearly") {
    return {
      start: new Date(
        now.getFullYear(),
        0,
        1
      ),

      end: new Date(
        now.getFullYear() + 1,
        0,
        1
      ),
    };
  }

  return {
    start: new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ),

    end: new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ),
  };
};

const getPreviousPeriodRange = (
  period
) => {
  const now = new Date();

  if (period === "yearly") {
    return {
      start: new Date(
        now.getFullYear() - 1,
        0,
        1
      ),

      end: new Date(
        now.getFullYear(),
        0,
        1
      ),
    };
  }

  return {
    start: new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ),

    end: new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ),
  };
};

const isWithinRange = (
  date,
  range
) =>
  date &&
  date >= range.start &&
  date < range.end;

/* =========================================
   USER EXPENSES
   ========================================= */

/*
 * Reads directly from MongoDB's
 * "expenses" collection.
 *
 * This makes the category analytics
 * independent from the exact Expense
 * model implementation.
 */

const getUserExpenses = async (
  userId
) => {
  const database =
    mongoose.connection.db;

  if (!database) {
    return [];
  }

  const objectId =
    new mongoose.Types.ObjectId(
      userId
    );

  const stringId =
    String(userId);

  try {
    return await database
      .collection("expenses")
      .find({
        $or: [
          {
            user: objectId,
          },
          {
            userId: objectId,
          },
          {
            owner: objectId,
          },
          {
            user: stringId,
          },
          {
            userId: stringId,
          },
          {
            owner: stringId,
          },
        ],
      })
      .toArray();
  } catch (error) {
    console.error(
      "Expense category source error:",
      error
    );

    return [];
  }
};

/* =========================================
   GET ALL CATEGORY OPTIONS
   ========================================= */

export const getCategoryOptions =
  async (userId) => {
    const customCategories =
      await ExpenseCategory.find({
        user: userId,
      })
        .sort({
          createdAt: 1,
        })
        .lean();

    const defaults =
      DEFAULT_EXPENSE_CATEGORIES.map(
        (category) => ({
          ...category,

          monthlyBudget: null,

          isCustom: false,
        })
      );

    const custom =
      customCategories.map(
        (category) => ({
          id: category._id,

          name: category.name,

          slug: category.slug,

          icon: category.icon,

          theme: category.theme,

          monthlyBudget:
            category.monthlyBudget,

          isCustom: true,
        })
      );

    return [
      ...defaults,
      ...custom,
    ];
  };

/* =========================================
   NORMALIZE CATEGORY NAME
   ========================================= */

const getExpenseCategoryName = (
  expense,
  customCategoryMap
) => {
  /*
   * Supports:
   *
   * category: "Food & Groceries"
   *
   * categoryName: "Food & Groceries"
   *
   * category: {
   *   name: "Food & Groceries"
   * }
   *
   * categoryId: ObjectId(...)
   */

  if (
    expense.category &&
    typeof expense.category ===
      "object" &&
    expense.category.name
  ) {
    return expense.category.name;
  }

  if (
    typeof expense.category ===
    "string"
  ) {
    return expense.category;
  }

  if (expense.categoryName) {
    return expense.categoryName;
  }

  const categoryId =
    expense.categoryId ??
    expense.category;

  if (categoryId) {
    const mappedCategory =
      customCategoryMap.get(
        String(categoryId)
      );

    if (mappedCategory) {
      return mappedCategory;
    }
  }

  return "Other";
};

/* =========================================
   GET CATEGORY SPENDING
   ========================================= */

export const getExpenseCategorySpending =
  async ({
    userId,
    period = "monthly",
  }) => {
    const [
      categories,
      expenses,
    ] = await Promise.all([
      getCategoryOptions(userId),

      getUserExpenses(userId),
    ]);

    const range =
      getPeriodRange(period);

    /*
     * Maps custom category ObjectId
     * to its category name.
     */

    const customCategoryMap =
      new Map();

    categories.forEach(
      (category) => {
        if (category.id) {
          customCategoryMap.set(
            String(category.id),
            category.name
          );
        }
      }
    );

    /*
     * Stores totals like:
     *
     * entertainment => {
     *   amount: 1200,
     *   transactionCount: 1
     * }
     */

    const categoryTotals =
      new Map();

    expenses.forEach(
      (expense) => {
        const date =
          getExpenseDate(
            expense
          );

        /*
         * Ignore records outside
         * selected month/year.
         */

        if (
          !isWithinRange(
            date,
            range
          )
        ) {
          return;
        }

        const categoryName =
          getExpenseCategoryName(
            expense,
            customCategoryMap
          );

        /*
         * Important:
         *
         * "Food & Groceries"
         * becomes
         * "food-groceries"
         *
         * This matches our default
         * category slug.
         */

        const key =
          slugify(
            categoryName
          );

        const amount =
          getExpenseAmount(
            expense
          );

        const existing =
          categoryTotals.get(
            key
          ) || {
            amount: 0,
            transactionCount: 0,
          };

        existing.amount +=
          amount;

        existing.transactionCount +=
          1;

        categoryTotals.set(
          key,
          existing
        );
      }
    );

    /*
     * Merge category definitions
     * with calculated spending.
     */

    const result =
      categories.map(
        (category) => {
          const totals =
            categoryTotals.get(
              category.slug
            ) || {
              amount: 0,
              transactionCount: 0,
            };

          /*
           * Monthly budget remains
           * monthly in monthly mode.
           *
           * In yearly mode:
           * monthlyBudget × 12
           */

          const periodBudget =
            category.monthlyBudget
              ? period ===
                "yearly"
                ? category.monthlyBudget *
                  12
                : category.monthlyBudget
              : null;

          const percentageUsed =
            periodBudget &&
            periodBudget > 0
              ? Math.min(
                  100,
                  (totals.amount /
                    periodBudget) *
                    100
                )
              : null;

          return {
            ...category,

            amount:
              roundMoney(
                totals.amount
              ),

            transactionCount:
              totals.transactionCount,

            budget:
              periodBudget,

            percentageUsed:
              percentageUsed ===
              null
                ? null
                : Math.round(
                    percentageUsed
                  ),
          };
        }
      );

    /*
     * Categories with larger spending
     * appear first.
     */

    result.sort(
      (a, b) =>
        b.amount -
        a.amount
    );

    const totalSpent =
      roundMoney(
        result.reduce(
          (
            total,
            category
          ) =>
            total +
            category.amount,
          0
        )
      );

    return {
      period,

      totalSpent,

      categories: result,
    };
  };

/* =========================================
   GET SINGLE CATEGORY DETAILS
   ========================================= */

export const getExpenseCategoryDetail =
  async ({
    userId,
    slug,
    period = "monthly",
  }) => {
    const [
      categories,
      expenses,
    ] = await Promise.all([
      getCategoryOptions(userId),

      getUserExpenses(userId),
    ]);

    const category =
      categories.find(
        (item) =>
          item.slug === slug
      );

    if (!category) {
      return null;
    }

    const customCategoryMap =
      new Map();

    categories.forEach(
      (item) => {
        if (item.id) {
          customCategoryMap.set(
            String(item.id),
            item.name
          );
        }
      }
    );

    const currentRange =
      getPeriodRange(period);

    const previousRange =
      getPreviousPeriodRange(
        period
      );

    /*
     * Find all expenses that
     * belong to this category.
     */

    const matchingExpenses =
      expenses.filter(
        (expense) => {
          const categoryName =
            getExpenseCategoryName(
              expense,
              customCategoryMap
            );

          return (
            slugify(
              categoryName
            ) === slug
          );
        }
      );

    /*
     * Current month/year expenses.
     */

    const currentExpenses =
      matchingExpenses.filter(
        (expense) =>
          isWithinRange(
            getExpenseDate(
              expense
            ),
            currentRange
          )
      );

    /*
     * Previous month/year expenses.
     */

    const previousExpenses =
      matchingExpenses.filter(
        (expense) =>
          isWithinRange(
            getExpenseDate(
              expense
            ),
            previousRange
          )
      );

    /*
     * Current period total.
     */

    const currentTotal =
      roundMoney(
        currentExpenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            getExpenseAmount(
              expense
            ),
          0
        )
      );

    /*
     * Previous period total.
     */

    const previousTotal =
      roundMoney(
        previousExpenses.reduce(
          (
            total,
            expense
          ) =>
            total +
            getExpenseAmount(
              expense
            ),
          0
        )
      );

    /*
     * Example:
     *
     * Previous month = 5000
     * Current month  = 4000
     *
     * Savings = 20%
     */

    const savingsPercentage =
      previousTotal > 0
        ? Math.round(
            ((previousTotal -
              currentTotal) /
              previousTotal) *
              100
          )
        : 0;

    const now = new Date();

    let elapsedDays;

    /*
     * Used to calculate
     * average spending per day.
     */

    if (period === "yearly") {
      const start =
        new Date(
          now.getFullYear(),
          0,
          1
        );

      elapsedDays =
        Math.max(
          1,
          Math.ceil(
            (now - start) /
              (1000 *
                60 *
                60 *
                24)
          )
        );
    } else {
      elapsedDays =
        Math.max(
          1,
          now.getDate()
        );
    }

    const averagePerDay =
      roundMoney(
        currentTotal /
          elapsedDays
      );

    /*
     * Budget calculation.
     */

    const periodBudget =
      category.monthlyBudget
        ? period === "yearly"
          ? category.monthlyBudget *
            12
          : category.monthlyBudget
        : null;

    const remaining =
      periodBudget !== null
        ? roundMoney(
            periodBudget -
              currentTotal
          )
        : null;

    const percentageUsed =
      periodBudget &&
      periodBudget > 0
        ? Math.round(
            Math.min(
              100,
              (currentTotal /
                periodBudget) *
                100
            )
          )
        : null;

    /*
     * Recent transactions
     * belonging only to
     * this selected category.
     */

    const recentTransactions =
      currentExpenses
        .sort(
          (a, b) =>
            getExpenseDate(b) -
            getExpenseDate(a)
        )
        .slice(0, 10)
        .map(
          (expense) => ({
            id:
              expense._id,

            title:
              expense.title ??
              expense.name ??
              expense.merchant ??
              expense.description ??
              category.name,

            amount:
              getExpenseAmount(
                expense
              ),

            currency:
              expense.currency ??
              "BDT",

            date:
              getExpenseDate(
                expense
              ),

            notes:
              expense.notes ??
              "",
          })
        );

    return {
      category,

      period,

      summary: {
        totalSpent:
          currentTotal,

        previousPeriodSpent:
          previousTotal,

        savingsPercentage,

        averagePerDay,

        transactionCount:
          currentExpenses.length,

        budget:
          periodBudget,

        remaining,

        percentageUsed,
      },

      recentTransactions,
    };
  };

/* =========================================
   CREATE CUSTOM CATEGORY
   ========================================= */

export const createExpenseCategory =
  async ({
    userId,
    name,
    icon,
    theme,
    monthlyBudget,
  }) => {
    const cleanName =
      String(name || "")
        .trim();

    if (!cleanName) {
      const error =
        new Error(
          "Category name is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const slug =
      slugify(cleanName);

    /*
     * Prevent user from creating
     * a custom category with the
     * same name as a built-in one.
     */

    const defaultExists =
      DEFAULT_EXPENSE_CATEGORIES.some(
        (category) =>
          category.slug ===
          slug
      );

    if (defaultExists) {
      const error =
        new Error(
          "This category already exists."
        );

      error.statusCode = 409;

      throw error;
    }

    /*
     * Prevent duplicate
     * custom categories.
     */

    const existing =
      await ExpenseCategory.findOne({
        user: userId,
        slug,
      });

    if (existing) {
      const error =
        new Error(
          "You already created this category."
        );

      error.statusCode = 409;

      throw error;
    }

    /*
     * Validate optional budget.
     */

    let normalizedBudget =
      null;

    if (
      monthlyBudget !== "" &&
      monthlyBudget !== undefined &&
      monthlyBudget !== null
    ) {
      normalizedBudget =
        Number(
          monthlyBudget
        );

      if (
        !Number.isFinite(
          normalizedBudget
        ) ||
        normalizedBudget < 0
      ) {
        const error =
          new Error(
            "Monthly budget must be a valid positive number."
          );

        error.statusCode =
          400;

        throw error;
      }
    }

    const category =
      await ExpenseCategory.create({
        user: userId,

        name: cleanName,

        slug,

        icon:
          icon ||
          "wallet",

        theme:
          theme ||
          "indigo",

        monthlyBudget:
          normalizedBudget,
      });

    return category;
  };