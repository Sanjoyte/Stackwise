import api from "./axios";

export const fetchCashFlowDashboard =
  async (
    period = "monthly"
  ) => {
    const response =
      await api.get(
        "/cash-flow",
        {
          params: {
            period,
          },
        }
      );

    return response.data.data;
  };