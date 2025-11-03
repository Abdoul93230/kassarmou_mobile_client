import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper pour trouver un item avec variantes
const findItemIndex = (items, productId, color, size) => {
  return items.findIndex(item => 
    item.product._id === productId &&
    item.selectedColor === color &&
    item.selectedSize === size
  );
};

// Slice pour le panier
const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: [],
    total: 0,
    itemCount: 0,
  },
  reducers: {
    setCart: (state, action) => {
      state.items = action.payload;
      state.itemCount = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      state.total = action.payload.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    addToCart: (state, action) => {
      const { product, quantity, selectedColor, selectedSize, colorImage } = action.payload;
      
      // Chercher si l'item existe déjà avec la même variante
      const existingIndex = findItemIndex(
        state.items,
        product._id,
        selectedColor,
        selectedSize
      );
      
      if (existingIndex !== -1) {
        // Augmenter la quantité
        state.items[existingIndex].quantity += quantity;
      } else {
        // Ajouter nouveau item
        state.items.push({
          product,
          quantity,
          selectedColor,
          selectedSize,
          colorImage,
          addedAt: new Date().toISOString(),
        });
      }
      
      // Recalculer totaux
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.total = state.items.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    removeFromCart: (state, action) => {
      const { productId, color, size } = action.payload;
      
      // Supprimer l'item spécifique
      const index = findItemIndex(state.items, productId, color, size);
      if (index !== -1) {
        state.items.splice(index, 1);
      }
      
      // Recalculer totaux
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.total = state.items.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    updateQuantity: (state, action) => {
      const { productId, color, size, quantity } = action.payload;
      
      const index = findItemIndex(state.items, productId, color, size);
      if (index !== -1) {
        state.items[index].quantity = Math.max(1, quantity);
      }
      
      // Recalculer totaux
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.total = state.items.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
    },
  },
});

export const { 
  setCart, 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  clearCart 
} = cartSlice.actions;

// Actions asynchrones
export const loadCart = () => async (dispatch) => {
  try {
    const cartString = await AsyncStorage.getItem('panier');
    if (cartString) {
      const cart = JSON.parse(cartString);
      dispatch(setCart(cart));
    }
  } catch (error) {
    console.error('Erreur chargement panier:', error);
  }
};

export const saveCart = (cart) => async (dispatch) => {
  try {
    await AsyncStorage.setItem('panier', JSON.stringify(cart));
    dispatch(setCart(cart));
  } catch (error) {
    console.error('Erreur sauvegarde panier:', error);
  }
};

export const addItemToCart = (item) => async (dispatch, getState) => {
  try {
    dispatch(addToCart(item));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur ajout panier:', error);
  }
};

export const removeItemFromCart = (productId, color, size) => async (dispatch, getState) => {
  try {
    dispatch(removeFromCart({ productId, color, size }));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur suppression panier:', error);
  }
};

export const updateCartQuantity = (productId, color, size, quantity) => async (dispatch, getState) => {
  try {
    dispatch(updateQuantity({ productId, color, size, quantity }));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur mise à jour panier:', error);
  }
};

export const clearCartData = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem('panier');
    dispatch(clearCart());
  } catch (error) {
    console.error('Erreur vidage panier:', error);
  }
};

export default cartSlice.reducer;
