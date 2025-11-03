import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient, { BackendUrl } from "../config/api";

// Thunks asynchrones
export const fetchUserLikes = createAsyncThunk(
  "likes/fetchUserLikes",
  async (userId) => {
    const response = await apiClient.get(`/likes/user/${userId}`);
    return response.data;
  }
);

export const toggleLike = createAsyncThunk(
  "likes/toggleLike",
  async ({ userId, product }, { getState }) => {
    const state = getState();
    const isLiked = state.likes.likedProducts.includes(product._id);

    if (isLiked) {
      await apiClient.delete(`/likes/${userId}/${product._id}`);
      return { productId: product._id, action: "remove" };
    } else {
      await apiClient.post('/likes', {
        userId,
        produitId: product._id,
      });
      return { productId: product._id, action: "add" };
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserLikes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserLikes.fulfilled, (state, action) => {
        state.loading = false;
        state.likedProducts = action.payload.map((like) => like.produit?._id);
      })
      .addCase(fetchUserLikes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const { productId, action: likeAction } = action.payload;
        if (likeAction === "add") {
          state.likedProducts.push(productId);
        } else {
          state.likedProducts = state.likedProducts.filter(
            (id) => id !== productId
          );
        }
      })
      .addCase(toggleLike.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { clearLikes } = likesSlice.actions;

export default likesSlice.reducer;
