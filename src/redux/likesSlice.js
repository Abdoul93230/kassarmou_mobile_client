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

export const toggleLike = createAsyncThunk(
  "likes/toggleLike",
  async ({ userId, product }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const isLiked = state.likes.likedProducts.includes(product._id);

      console.log(`[LikesActions] Toggling like for product ${product._id}, isLiked: ${isLiked}`);

      if (isLiked) {
        await apiClient.delete(`/likes/${userId}/${product._id}`);
        console.log('[LikesActions] Like removed successfully');
        return { productId: product._id, action: "remove" };
      } else {
        await apiClient.post('/likes', {
          userId,
          produitId: product._id,
        });
        console.log('[LikesActions] Like added successfully');
        return { productId: product._id, action: "add" };
      }
    } catch (error) {
      console.log('[LikesActions] Error toggling like:', error.message);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Slice
const likesSlice = createSlice({
  name: "likes",
  initialState: {
    likedProducts: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearLikes: (state) => {
      state.likedProducts = [];
      state.error = null;
      console.log('[LikesActions] Likes cleared');
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
      
      // Toggle Like
      .addCase(toggleLike.pending, (state) => {
        // Optionnel: afficher un loader pendant le toggle
        state.error = null;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const { productId, action: likeAction } = action.payload;
        if (likeAction === "add") {
          // Éviter les doublons
          if (!state.likedProducts.includes(productId)) {
            state.likedProducts.push(productId);
          }
        } else {
          state.likedProducts = state.likedProducts.filter(
            (id) => id !== productId
          );
        }
        state.error = null;
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearLikes } = likesSlice.actions;

export default likesSlice.reducer;