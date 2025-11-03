import { configureStore } from "@reduxjs/toolkit";
import productsReducer from "./productsSlice";
import likesReducer from "./likesSlice";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";
import categoriesReducer from "./categoriesSlice";

const store = configureStore({
  reducer: {
    products: productsReducer,
    likes: likesReducer,
    auth: authReducer,
    cart: cartReducer,
    categories: categoriesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorer ces actions pour les vérifications de sérialisation
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;
