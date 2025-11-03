import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      state.itemCount = action.payload.length;
      state.total = action.payload.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    addToCart: (state, action) => {
      const existingItem = state.items.find(
        item => item.product._id === action.payload.product._id
      );
      
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      
      state.itemCount = state.items.length;
      state.total = state.items.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.product._id !== action.payload);
      state.itemCount = state.items.length;
      state.total = state.items.reduce((sum, item) => {
        const price = item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix;
        return sum + (price * item.quantity);
      }, 0);
    },
    updateQuantity: (state, action) => {
      const item = state.items.find(i => i.product._id === action.payload.productId);
      if (item) {
        item.quantity = action.payload.quantity;
      }
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
    console.error('Erreur lors du chargement du panier:', error);
  }
};

export const saveCart = (cart) => async (dispatch) => {
  try {
    await AsyncStorage.setItem('panier', JSON.stringify(cart));
    dispatch(setCart(cart));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du panier:', error);
  }
};

export const addItemToCart = (item) => async (dispatch, getState) => {
  try {
    dispatch(addToCart(item));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur lors de l\'ajout au panier:', error);
  }
};

export const removeItemFromCart = (productId) => async (dispatch, getState) => {
  try {
    dispatch(removeFromCart(productId));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur lors de la suppression du panier:', error);
  }
};

export const updateCartQuantity = (productId, quantity) => async (dispatch, getState) => {
  try {
    dispatch(updateQuantity({ productId, quantity }));
    const { cart } = getState();
    await AsyncStorage.setItem('panier', JSON.stringify(cart.items));
  } catch (error) {
    console.error('Erreur lors de la mise à jour du panier:', error);
  }
};

export const clearCartData = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem('panier');
    dispatch(clearCart());
  } catch (error) {
    console.error('Erreur lors du vidage du panier:', error);
  }
};

export default cartSlice.reducer;
