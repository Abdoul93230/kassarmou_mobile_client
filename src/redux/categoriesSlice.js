import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../config/api';

// Thunk pour récupérer toutes les catégories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📂 [categoriesSlice] Fetching categories from API...');
      const response = await apiClient.get('/api/categoriesRoutes');
      console.log('📂 [categoriesSlice] API Response:', response.data);
      console.log('📂 [categoriesSlice] Categories fetched:', response.data.data?.length || 0);
      return response.data.data || [];
    } catch (error) {
      console.error('❌ [categoriesSlice] Error fetching categories:', error);
      return rejectWithValue(error.response?.data || 'Erreur lors du chargement des catégories');
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: {
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
        console.log('✅ [categoriesSlice] Categories loaded in state:', state.categories.length);
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('❌ [categoriesSlice] Failed to load categories:', action.payload);
      });
  },
});

export const { clearError } = categoriesSlice.actions;
export default categoriesSlice.reducer;
