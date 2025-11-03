import { createSlice } from "@reduxjs/toolkit";
import apiClient, { BackendUrl } from "../config/api";

// Actions asynchrones
export const getProducts = (setLoading) => async (dispatch) => {
  try {
    const response = await apiClient.get('/api/productsRoutes');
    dispatch(setProducts(response.data.data));
    if (setLoading) setLoading(false);
  } catch (error) {
    console.log('Erreur getProducts:', error.response?.data?.message || error.message);
    if (setLoading) setLoading(false);
  }
};

export const getTypes = () => async (dispatch) => {
  try {
    const response = await apiClient.get('/getAllType');
    dispatch(setTypes(response.data.data));
  } catch (error) {
    console.log('Erreur getTypes:', error);
  }
};

export const getCategories = (setLoading) => async (dispatch) => {
  try {
    const response = await apiClient.get('/api/categoriesRoutes');
    dispatch(setCategories(response.data.data));
    if (setLoading) setLoading(false);
  } catch (error) {
    console.log('Erreur getCategories:', error);
    if (setLoading) setLoading(false);
  }
};

export const getProducts_Pubs = () => async (dispatch) => {
  try {
    const response = await apiClient.get('/api/bannersRoutes');
    dispatch(setProducts_Pubs(response.data));
  } catch (error) {
    console.log('Erreur getProducts_Pubs:', error);
  }
};

export const getProducts_Commentes = () => async (dispatch) => {
  try {
    const response = await apiClient.get('/getAllCommenteProduit');
    dispatch(setProducts_Commentes(response.data));
  } catch (error) {
    console.log('Erreur getProducts_Commentes:', error);
  }
};

// Slice
const productsSlice = createSlice({
  name: "products",
  initialState: {
    data: [],
    types: [],
    categories: [],
    products_Pubs: [],
    products_Commentes: [],
    loading: false,
    error: null,
  },
  reducers: {
    setProducts: (state, action) => {
      state.data = action.payload;
      state.loading = false;
    },
    setTypes: (state, action) => {
      state.types = action.payload;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
      state.loading = false;
    },
    setProducts_Pubs: (state, action) => {
      state.products_Pubs = action.payload;
    },
    setProducts_Commentes: (state, action) => {
      state.products_Commentes = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setProducts,
  setTypes,
  setCategories,
  setProducts_Pubs,
  setProducts_Commentes,
  setLoading,
  setError,
} = productsSlice.actions;

export default productsSlice.reducer;
