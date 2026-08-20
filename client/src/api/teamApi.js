import api from "./axios";

export const createTeam = async ({ name, monthlyBudget, currency }) => {
  const response = await api.post("/teams", { name, monthlyBudget, currency });
  return response.data;
};

export const joinTeam = async ({ inviteCode }) => {
  const response = await api.post("/teams/join", { inviteCode });
  return response.data;
};

export const getMyTeam = async () => {
  const response = await api.get("/teams/my-team");
  return response.data;
};

export const getMyTeams = async () => {
  const response = await api.get("/teams/my-teams");
  return response.data;
};

export const activateTeam = async (teamId) => {
  const response = await api.post(`/teams/${teamId}/activate`);
  return response.data;
};

export const regenerateInviteCode = async () => {
  const response = await api.post("/teams/regenerate-code");
  return response.data;
};
