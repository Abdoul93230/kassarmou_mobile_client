import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../config/api";

// Thunks asynchrones
export const fetchUserLikes = createAsyncThunk(
  "likes/fetchUserLikes",
  async (userId, { rejectWithValue }) => {
    try {
      console.log('[LikesActions] Fetching likes for user:', userId);
      const response = await apiClient.get(`/likes/user/${userId}`);
      const data = response.data?.data || response.data;
      console.log('[LikesActions] Likes fetched successfully:', data.length);
      return data;
    } catch (error) {
      console.log('[LikesActions] Error fetching likes:', error.message);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

/**
 * Like optimiste : l'UI change immédiatement (reducer pending), l'API suit,
 * et on revient en arrière seulement si l'appel échoue.
 */
export const toggleLike = createAsyncThunk(
  "likes/toggleLike",
  async ({ userId, product }, { getState, rejectWithValue }) => {
    // État AVANT le clic, mémorisé par le reducer pending
    const wasLiked = getState().likes.toggling[product._id];
    try {
      if (wasLiked) {
        await apiClient.delete(`/likes/${userId}/${product._id}`);
        return { productId: product._id, action: "remove" };
      }
      await apiClient.post('/likes', { userId, produitId: product._id });
      return { productId: product._id, action: "add" };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
  {
    // Ignore les doubles taps pendant qu'un toggle est en cours
    condition: ({ product }, { getState }) => !(product?._id in getState().likes.toggling),
  }
);

// Slice
const likesSlice = createSlice({
  name: "likes",
  initialState: {
    likedProducts: [],
    toggling: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearLikes: (state) => {
      state.likedProducts = [];
      state.toggling = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Likes
      .addCase(fetchUserLikes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserLikes.fulfilled, (state, action) => {
        state.loading = false;
        state.likedProducts = action.payload
          .map((like) => like.produit?._id)
          .filter(Boolean); // Filtre les valeurs undefined
        state.error = null;
      })
      .addCase(fetchUserLikes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      
      // Toggle Like (optimiste)
      .addCase(toggleLike.pending, (state, action) => {
        const id = action.meta.arg.product._id;
        const wasLiked = state.likedProducts.includes(id);
        state.toggling[id] = wasLiked;
        state.likedProducts = wasLiked
          ? state.likedProducts.filter((x) => x !== id)
          : [...state.likedProducts, id];
        state.error = null;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        delete state.toggling[action.payload.productId];
      })
      .addCase(toggleLike.rejected, (state, action) => {
        const id = action.meta.arg.product._id;
        const wasLiked = state.toggling[id];
        delete state.toggling[id];
        const isLiked = state.likedProducts.includes(id);
        if (wasLiked && !isLiked) state.likedProducts.push(id);
        if (!wasLiked && isLiked) state.likedProducts = state.likedProducts.filter((x) => x !== id);
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearLikes } = likesSlice.actions;

export default likesSlice.reducer;