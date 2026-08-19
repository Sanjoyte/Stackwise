import api from "./axios";

export const getPayments = async () => {
  const response = await api.get("/payments");
  return response.data;
};

export const initiateTeamRequestPayment = async (requestId) => {
  const response = await api.post(`/payments/team-requests/${requestId}/initiate`);
  return response.data;
};

export const initiateSubscriptionPayment = async (subscriptionId) => {
  const response = await api.post(`/payments/subscriptions/${subscriptionId}/initiate`);
  return response.data;
};
