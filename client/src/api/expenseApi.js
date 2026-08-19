import api from "./axios";

export const fetchExpenses = async (params = {}) => {
  const response = await api.get("/expenses", { params });
  return response.data;
};

export const createExpense = async (payload) => {
  const response = await api.post("/expenses", payload);
  return response.data.expense;
};

export const updateExpense = async (expenseId, payload) => {
  const response = await api.patch(`/expenses/${expenseId}`, payload);
  return response.data.expense;
};

export const deleteExpense = async (expenseId) => {
  const response = await api.delete(`/expenses/${expenseId}`);
  return response.data;
};

export const importExpenses = async (rows) => {
  const response = await api.post("/expenses/import", { rows });
  return response.data;
};

export const uploadExpenseReceipt = async (expenseId, file) => {
  const formData = new FormData();
  formData.append("receipt", file);

  const response = await api.post(`/expenses/${expenseId}/receipt`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
  return response.data.expense;
};

export const removeExpenseReceipt = async (expenseId) => {
  const response = await api.delete(`/expenses/${expenseId}/receipt`);
  return response.data.expense;
};
