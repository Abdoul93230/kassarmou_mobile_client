import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackendUrl } from "../config/api";

const API = BackendUrl;

const authHeaders = async () => {
  const token = await AsyncStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchWallet = createAsyncThunk(
  "gamification/fetchWallet",
  async (userId, { rejectWithValue }) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/gamification/wallet/${userId}`, { headers });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message);
      return data.wallet;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  "gamification/fetchTransactions",
  async ({ userId, page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API}/api/gamification/transactions/${userId}?page=${page}&limit=${limit}`,
        { headers }
      );
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPublicConfig = createAsyncThunk(
  "gamification/fetchPublicConfig",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API}/api/gamification/config/public`);
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const dailyCheckin = createAsyncThunk(
  "gamification/dailyCheckin",
  async (userId, { rejectWithValue }) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/gamification/checkin`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message);
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const gamificationSlice = createSlice({
  name: "gamification",
  initialState: {
    wallet: null,
    transactions: [],
    totalTransactions: 0,
    config: null,
    checkinResult: null,
    isLoadingWallet: false,
    isLoadingTransactions: false,
    isLoadingCheckin: false,
    error: null,
  },
  reducers: {
    clearCheckinResult: (state) => { state.checkinResult = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => { state.isLoadingWallet = true; state.error = null; })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoadingWallet = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoadingWallet = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchTransactions.pending, (state) => { state.isLoadingTransactions = true; })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoadingTransactions = false;
        state.transactions = action.payload.transactions;
        state.totalTransactions = action.payload.total;
      })
      .addCase(fetchTransactions.rejected, (state) => { state.isLoadingTransactions = false; });

    builder
      .addCase(fetchPublicConfig.fulfilled, (state, action) => {
        state.config = action.payload;
      });

    builder
      .addCase(dailyCheckin.pending, (state) => { state.isLoadingCheckin = true; state.error = null; })
      .addCase(dailyCheckin.fulfilled, (state, action) => {
        state.isLoadingCheckin = false;
        const bonusDelta = action.payload.bonus?.transaction?.[0]?.delta || 0;
        const checkinDelta = action.payload.checkin?.transaction?.delta || 0;
        state.checkinResult = {
          streak: action.payload.streak,
          pointsEarned: checkinDelta + bonusDelta,
        };
        if (state.wallet) {
          state.wallet.balance += checkinDelta + bonusDelta;
          state.wallet.checkinStreak = action.payload.streak;
          state.wallet.lastCheckinDate = new Date().toISOString();
        }
      })
      .addCase(dailyCheckin.rejected, (state, action) => {
        state.isLoadingCheckin = false;
        state.error = action.payload;
      })
      // Déconnexion (manuelle ou session expirée) : on oublie le portefeuille du compte précédent
      .addMatcher(
        (action) => action.type === "auth/logout" || action.type === "auth/logout/fulfilled",
        (state) => {
          state.wallet = null;
          state.transactions = [];
          state.totalTransactions = 0;
          state.checkinResult = null;
        }
      );
  },
});

export const { clearCheckinResult } = gamificationSlice.actions;

export const selectWallet = (state) => state.gamification.wallet;
export const selectTransactions = (state) => state.gamification.transactions;
export const selectConfig = (state) => state.gamification.config;
export const selectCheckinResult = (state) => state.gamification.checkinResult;
export const selectIsLoadingWallet = (state) => state.gamification.isLoadingWallet;
export const selectIsLoadingCheckin = (state) => state.gamification.isLoadingCheckin;
const NO_EVENTS = [];
export const selectActiveEvents = (state) => state.gamification.config?.activeEvents ?? NO_EVENTS;

export default gamificationSlice.reducer;
