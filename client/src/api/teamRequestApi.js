import api from "./axios";

export const createTeamRequest = async (payload) => {
  const response = await api.post("/team-requests", payload);
  return response.data;
};

export const listTeamRequests = async (status) => {
  const response = await api.get("/team-requests", {
    params: status ? { status } : {},
  });

  return response.data;
};

export const getTeamRequestById = async (id) => {
  const response = await api.get(`/team-requests/${id}`);
  return response.data;
};

export const getBudgetImpact = async (id) => {
  const response = await api.get(`/team-requests/${id}/budget-impact`);
  return response.data;
};

export const updateTeamRequest = async (id, payload) => {
  const response = await api.patch(`/team-requests/${id}`, payload);
  return response.data;
};

export const approveTeamRequest = async (id, message) => {
  const response = await api.post(`/team-requests/${id}/approve`, {
    message,
  });
  return response.data;
};

export const rejectTeamRequest = async (id, message) => {
  const response = await api.post(`/team-requests/${id}/reject`, {
    message,
  });
  return response.data;
};

export const requestTeamRequestModification = async (id, message) => {
  const response = await api.post(
    `/team-requests/${id}/request-modification`,
    { message }
  );
  return response.data;
};
