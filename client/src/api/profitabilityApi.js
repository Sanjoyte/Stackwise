import api from "./axios";

export const fetchClients = async () => {
  const response = await api.get("/clients");
  return response.data.clients || [];
};

export const createClient = async (name) => {
  const response = await api.post("/clients", { name });
  return response.data.client;
};

export const deleteClient = async (clientId) => {
  const response = await api.delete(`/clients/${clientId}`);
  return response.data;
};

export const fetchProfitability = async () => {
  const response = await api.get("/profitability");
  return response.data;
};

export const fetchClientProfitability = async (clientId) => {
  const response = await api.get(`/profitability/${clientId}`);
  return response.data;
};
