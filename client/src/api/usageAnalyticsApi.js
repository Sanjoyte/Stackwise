import api from "./axios";

export const fetchUsageAnalytics = async (months = 8) => (await api.get("/usage-analytics", { params: { months } })).data;
export const createUsageLog = async (payload) => (await api.post("/usage-analytics/logs", payload)).data;
export const deleteUsageLog = async (id) => (await api.delete(`/usage-analytics/logs/${id}`)).data;
