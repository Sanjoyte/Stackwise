import api from "./axios";

export const fetchNotificationSettings = async () => {
  const response = await api.get("/notifications");
  return response.data;
};

export const saveNotificationSettings = async (payload) => {
  const response = await api.put("/notifications", payload);
  return response.data.settings;
};

export const previewNotifications = async () => {
  const response = await api.get("/notifications/preview");
  return response.data;
};

export const runNotifications = async () => {
  const response = await api.post("/notifications/run");
  return response.data;
};
