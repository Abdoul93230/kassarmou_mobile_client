import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./productsSlice";
import likesReducer from "./likesSlice";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";
import categoriesReducer from "./categoriesSlice";
import gamificationReducer from "./gamificationSlice";
import { catalogApi } from "./catalogApi";

const store = configureStore({
  reducer: {
    products: productsReducer,
    likes: likesReducer,
    auth: authReducer,
    panier: cartReducer,
    categories: categoriesReducer,
    gamification: gamificationReducer,
    [catalogApi.reducerPath]: catalogApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Vérifications de dev désactivées : trop lentes sur les gros payloads catalogue
      serializableCheck: false,
      immutableCheck: false,
    }).concat(catalogApi.middleware),
});

export default store;
