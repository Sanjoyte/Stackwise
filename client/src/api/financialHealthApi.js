import api from "./axios";

export const fetchFinancialHealth = async () => {
  const response = await api.get("/financial-health");

  return response.data.data;
};
