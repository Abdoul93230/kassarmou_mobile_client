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
      
      // Valider et convertir la structure du panier
      if (Array.isArray(cart) && cart.length > 0) {
        // Vérifier si c'est le format Redux (avec product)
        const isReduxFormat = cart.every(item => 
          item.product && 
          typeof item.product === 'object' &&
          item.product._id
        );
        
        if (isReduxFormat) {
          // Format Redux normal
          dispatch(setCart(cart));
        } else {
          // Format order.prod (format web) - convertir vers format Redux
          const isOrderProdFormat = cart.every(item => 
            item._id && 
            item.name &&
            typeof item.price !== 'undefined'
          );
          
          if (isOrderProdFormat) {
            console.log('Conversion du panier depuis order.prod vers format Redux');
            // Convertir chaque item de order.prod vers le format Redux
            const convertedCart = cart.map(item => ({
              product: {
                _id: item._id || '',
                nom: item.name || 'Produit',
                images: item.imageUrl ? [item.imageUrl] : [],
                prix: item.price || 0,
                prixPromo: 0, // Pas de promo dans order.prod
                poid: item.weight || 0,
                description: item.description || '',
                categorie: item.category || '',
                tailles: item.size ? [item.size] : [],
                couleurs: item.color ? [item.color] : [],
                stock: 999, // Stock par défaut
                marque: item.brand || '',
                dateAjout: item.dateAdded || new Date().toISOString(),
              },
              quantity: item.quantity || 1,
              selectedColor: item.color || '',
              selectedSize: item.size || '',
              colorImage: item.imageUrl || '',
              addedAt: item.addedAt || new Date().toISOString(),
            }));
            
            dispatch(setCart(convertedCart));
          } else {
            // Format invalide
            console.warn('Format de panier invalide, nettoyage...');
            await AsyncStorage.removeItem('panier');
            dispatch(clearCart());
          }
        }
      } else {
        dispatch(setCart(cart));
      }
    }
  } catch (error) {
    console.error('Erreur chargement panier:', error);
    // En cas d'erreur, nettoyer le panier corrompu
    try {
      await AsyncStorage.removeItem('panier');
      dispatch(clearCart());
    } catch (e) {
      console.error('Erreur nettoyage panier:', e);
    }
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
