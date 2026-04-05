import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../config/api";

const CACHE_DURATION = 3600 * 1000; // 1 heure en millisecondes

// Fonction utilitaire pour gérer le cache
const fetchDataWithCache = async (endpoint, cacheKey, dispatch, actionCreator, setLoading) => {
  try {
    console.log(`[CategoriesActions] Fetching ${cacheKey} from ${endpoint}`);
    
    const cachedData = await AsyncStorage.getItem(cacheKey);
    const cacheTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);

    // Vérifier si le cache est valide
    const isCacheValid = cachedData && cacheTimestamp && 
      new Date().getTime() < parseInt(cacheTimestamp) + CACHE_DURATION;

    if (isCacheValid) {
      console.log(`[CategoriesActions] Using cached ${cacheKey}`);
      dispatch(actionCreator(JSON.parse(cachedData)));
      if (setLoading) setLoading(false);
    } else {
      // Requête API pour données fraîches
      console.log(`[CategoriesActions] Fetching fresh ${cacheKey} from API`);
      const response = await apiClient.get(endpoint);
      const data = response.data?.data || response.data;

      if (data) {
        console.log(`[CategoriesActions] Successfully fetched ${cacheKey}, storing in cache`);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        await AsyncStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        dispatch(actionCreator(data));
      } else {
        console.log(`[CategoriesActions] No data available for ${cacheKey}`);
      }
      
      if (setLoading) setLoading(false);
    }
  } catch (error) {
    console.log(`[CategoriesActions] ERROR fetching ${cacheKey}:`, error.message);
    console.log(`[CategoriesActions] ERROR details:`, error.response?.data || error);
    
    // En cas d'erreur, essayer de charger depuis le cache même expiré
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`[CategoriesActions] Using expired cache as fallback for ${cacheKey}`);
      dispatch(actionCreator(JSON.parse(cachedData)));
    }
    
    if (setLoading) setLoading(false);
    dispatch(setError(error.response?.data?.message || error.message));
  }
};

// Thunk avec logique de cache intégrée - BON ENDPOINT
export const fetchCategories = (setLoading) => async (dispatch) => {
  await fetchDataWithCache(
    '/getAllCategories',
    'categories_cache',
    dispatch,
    setCategories,
    setLoading
  );
};

// Fonction pour forcer le rafraîchissement (ignorer le cache)
export const forceRefreshCategories = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem('categories_cache');
    await AsyncStorage.removeItem('categories_cache_timestamp');
    await dispatch(fetchCategories());
  } catch (error) {
    console.log('[CategoriesActions] Error force refreshing categories:', error);
  }
};

// Slice Redux Toolkit
const categoriesSlice = createSlice({
  name: "categories",
  initialState: {
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {
    setCategories: (state, action) => {
      state.categories = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setCategories,
  setLoading,
  setError,
  clearError,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;