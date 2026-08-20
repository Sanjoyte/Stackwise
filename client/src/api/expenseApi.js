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

// Scan-and-discard: the server extracts text from the image and destroys its own upload before
// responding, so this never returns a url or publicId — only parsed field candidates. No
// expense id is needed or created. Returns the full envelope (not just response.data.expense)
// because `scanned`, `fields`, and `message` are all load-bearing for the drawer UI.
export const scanReceipt = async (file, { signal } = {}) => {
  const formData = new FormData();
  formData.append("receipt", file); // MUST match multer's .single("receipt") on the server

  const response = await api.post("/expenses/receipt-scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 45000,
    signal,
  });
  return response.data;
};
