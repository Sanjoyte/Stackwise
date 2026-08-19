import api from "./axios";

export async function fetchAlternativeRecommendations() {
  const response = await api.get("/recommendations/alternatives");
  return response.data;
}

export async function updateSubscriptionUsage(subscriptionId, usagePercentage) {
  const response = await api.put(`/recommendations/usage/${subscriptionId}`, {
    usagePercentage: Number(usagePercentage),
  });
  return response.data.subscription;
}
