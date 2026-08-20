import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { fetchFinancialHealth } from "../api/financialHealthApi";

export const loadFinancialHealth = createAsyncThunk(
  "financialHealth/load",
  async (_arg, { rejectWithValue }) => {
    try {
      return await fetchFinancialHealth();
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Unable to load your financial health score."
      );
    }
  }
);

const initialState = {
  data: null,

  /* idle | loading | succeeded | failed */
  status: "idle",

  error: null,
};

const financialHealthSlice = createSlice({
  name: "financialHealth",

  initialState,

  reducers: {
    resetFinancialHealth: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadFinancialHealth.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadFinancialHealth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.error = null;
      })
      .addCase(loadFinancialHealth.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || null;
      });
  },
});

export const { resetFinancialHealth } = financialHealthSlice.actions;

export default financialHealthSlice.reducer;
