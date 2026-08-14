import api from "./axios";

export const fetchExpenseCategories =
  async () => {
    const response =
      await api.get(
        "/expense-categories"
      );

    return (
      response.data
        .categories || []
    );
  };

export const fetchCategorySpending =
  async (
    period = "monthly"
  ) => {
    const response =
      await api.get(
        "/expense-categories/spending",
        {
          params: {
            period,
          },
        }
      );

    return response.data.data;
  };

export const fetchCategoryDetail =
  async (
    slug,
    period = "monthly"
  ) => {
    const response =
      await api.get(
        `/expense-categories/${slug}`,
        {
          params: {
            period,
          },
        }
      );

    return response.data.data;
  };

export const addExpenseCategory =
  async (payload) => {
    const response =
      await api.post(
        "/expense-categories",
        payload
      );

    return response.data.category;
  };
  export const updateCategoryBudget = async (
  slug,
  monthlyBudget
) => {
  const response = await api.put(
    `/expense-categories/${slug}/budget`,
    { monthlyBudget }
  );

  return response.data.category;
};