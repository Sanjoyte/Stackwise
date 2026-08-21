import api from "./axios";

export const previewTaxReport = async (payload) => {
  const { data } = await api.post("/tax-reports/preview", payload);
  return data;
};

export const generateTaxReport = async (payload) => {
  const { data } = await api.post("/tax-reports/generate", payload);
  return data;
};

export const getTaxReports = async (params) => {
  const { data } = await api.get("/tax-reports", { params });
  return data;
};

export const getTaxReportById = async (id) => {
  const { data } = await api.get(`/tax-reports/${id}`);
  return data;
};

export const getTaxJurisdictions = async () => {
  const { data } = await api.get("/tax-reports/jurisdictions");
  return data;
};

export const getDownloadUrl = (id) => {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return `${baseURL}/tax-reports/${id}/download`;
};

// AI Deduction Scan API (Phase 4)
export const runAiDeductionScan = async (payload = {}) => {
  const { data } = await api.post("/tax-reports/ai-scan/run", payload);
  return data;
};

export const getAiScanStatus = async () => {
  const { data } = await api.get("/tax-reports/ai-scan/status");
  return data;
};

export const getAiDeductionFlags = async () => {
  const { data } = await api.get("/tax-reports/ai-scan/flags");
  return data;
};

export const getMissedDeductionSuggestions = async () => {
  const { data } = await api.get("/tax-reports/ai-scan/suggestions");
  return data;
};

export const acceptAiFlag = async (id) => {
  const { data } = await api.post(`/tax-reports/ai-scan/flags/${id}/accept`);
  return data;
};

export const dismissAiFlag = async (id) => {
  const { data } = await api.post(`/tax-reports/ai-scan/flags/${id}/dismiss`);
  return data;
};

export const acceptMissedSuggestion = async (id) => {
  const { data } = await api.post(`/tax-reports/ai-scan/suggestions/${id}/accept`);
  return data;
};

export const dismissMissedSuggestion = async (id) => {
  const { data } = await api.post(`/tax-reports/ai-scan/suggestions/${id}/dismiss`);
  return data;
};
