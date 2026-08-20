import { configureStore } from "@reduxjs/toolkit";

import financialHealthReducer from "./financialHealthSlice";

export const store = configureStore({
  reducer: {
    financialHealth: financialHealthReducer,
  },
});

export default store;
