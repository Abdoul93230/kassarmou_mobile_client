import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../config/api";

const CACHE_DURATION = 3600 * 1000; // 1 heure en millisecondes

// Fonction utilitaire pour gérer le cache
const fetchDataWithCache = async (endpoint, cacheKey, dispatch, actionCreator, setLoading) => {
  try {
    console.log(`[ProductsActions] Fetching ${cacheKey} from ${endpoint}`);
    
    const cachedData = await AsyncStorage.getItem(cacheKey);
    const cacheTimestamp = await AsyncStorage.getItem(`${cacheKey}_timestamp`);

    // Vérifier si le cache est valide
    const isCacheValid = cachedData && cacheTimestamp && 
      new Date().getTime() < parseInt(cacheTimestamp) + CACHE_DURATION;

    if (isCacheValid) {
      console.log(`[ProductsActions] Using cached ${cacheKey}`);
      dispatch(actionCreator(JSON.parse(cachedData)));
      if (setLoading) setLoading(false);
    } else {
      // Requête API pour données fraîches
      console.log(`[ProductsActions] Fetching fresh ${cacheKey} from API`);
      const response = await apiClient.get(endpoint);
      const data = response.data?.data || response.data;

      if (data) {
        console.log(`[ProductsActions] Successfully fetched ${cacheKey}, storing in cache`);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        await AsyncStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
        dispatch(actionCreator(data));
      } else {
        console.log(`[ProductsActions] No data available for ${cacheKey}`);
      }
      
      if (setLoading) setLoading(false);
    }
  } catch (error) {
    console.log(`[ProductsActions] ERROR fetching ${cacheKey}:`, error.message);
    console.log(`[ProductsActions] ERROR details:`, error.response?.data || error);
    
    // En cas d'erreur, essayer de charger depuis le cache même expiré
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      console.log(`[ProductsActions] Using expired cache as fallback for ${cacheKey}`);
      dispatch(actionCreator(JSON.parse(cachedData)));
    }
    
    if (setLoading) setLoading(false);
    dispatch(setError(error.response?.data?.message || error.message));
  }
};

// Thunks avec logique de cache intégrée - ENDPOINTS DE L'ANCIEN SYSTÈME
export const getProducts = (setLoading) => async (dispatch) => {
  await fetchDataWithCache(
    // '/ProductsClients',
    '/Products',
    'products_cache',
    dispatch,
    setProducts,
    setLoading
  );
};

export const getTypes = () => async (dispatch) => {
  await fetchDataWithCache(
    '/getAllType',
    'types_cache',
    dispatch,
    setTypes
  );
};

export const getCategories = (setLoading) => async (dispatch) => {
  await fetchDataWithCache(
    '/getAllCategories',
    'categories_cache',
    dispatch,
    setCategories,
    setLoading
  );
};

export const getProducts_Pubs = () => async (dispatch) => {
  await fetchDataWithCache(
    '/productPubget',
    'products_pubs_cache',
    dispatch,
    setProducts_Pubs
  );
};

export const getProducts_Commentes = () => async (dispatch) => {
  await fetchDataWithCache(
    '/getAllCommenteProduit',
    'products_commentes_cache',
    dispatch,
    setProducts_Commentes
  );
};

// Fonction pour forcer le rafraîchissement (ignorer le cache)
export const forceRefreshProducts = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem('products_cache');
    await AsyncStorage.removeItem('products_cache_timestamp');
    await dispatch(getProducts());
  } catch (error) {
    console.log('[ProductsActions] Error force refreshing products:', error);
  }
};

// Fonction pour vider tout le cache
export const clearAllCache = () => async () => {
  try {
    const cacheKeys = [
      'products_cache',
      'types_cache',
      'categories_cache',
      'products_pubs_cache',
      'products_commentes_cache'
    ];
    
    for (const key of cacheKeys) {
      await AsyncStorage.removeItem(key);
      await AsyncStorage.removeItem(`${key}_timestamp`);
    }
    
    console.log('[ProductsActions] All cache cleared successfully');
  } catch (error) {
    console.log('[ProductsActions] Error clearing cache:', error);
  }
};

// Slice Redux Toolkit
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
      state.error = null;
    },
    setTypes: (state, action) => {
      state.types = action.payload;
      state.error = null;
    },
    setCategories: (state, action) => {
      state.categories = action.payload;
      state.loading = false;
      state.error = null;
    },
    setProducts_Pubs: (state, action) => {
      state.products_Pubs = action.payload;
      state.error = null;
    },
    setProducts_Commentes: (state, action) => {
      state.products_Commentes = action.payload;
      state.error = null;
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