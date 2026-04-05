import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @typedef {object} PanierArticle
 * @property {string} _id
 * @property {string} id
 * @property {string} name
 * @property {number} prix
 * @property {number} [prixPromo]
 * @property {number} [price]
 * @property {string[]} [images]
 * @property {string} [image1]
 * @property {string} [imageUrl]
 * @property {number} quantite
 * @property {number} [quantity] // Alias pour compatibilité
 * @property {string} [color]
 * @property {string} [couleur]
 * @property {string} [taille]
 * @property {number} [poids]
 * @property {string} [ClefType]
 * @property {{_id: string, storeName?: string, name?: string}} [Clefournisseur]
 * @property {{zones: Array<{name: string, price: number, transporteurName?: string, transporteurContact?: string}>, weight: number, dimensions?: {length: number, width: number, height: number}}} [shipping]
 */

const initialState = {
  articles: [],
  isLoaded: false,
};

// Helpers pour AsyncStorage (équivalent localStorage web)
const loadFromAsyncStorage = async () => {
  try {
    const panier = await AsyncStorage.getItem("panier");
    return panier ? JSON.parse(panier) : [];
  } catch (error) {
    console.error("Erreur lors du chargement du panier:", error);
    return [];
  }
};

const saveToAsyncStorage = async (articles) => {
  try {
    await AsyncStorage.setItem("panier", JSON.stringify(articles));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du panier:", error);
  }
};

const panierSlice = createSlice({
  name: "panier",
  initialState,
  reducers: {
    // Charger le panier depuis AsyncStorage
    loadPanier: (state) => {
      // Note: Cette action est un marqueur. Le chargement effectif est fait par l'action async.
      state.isLoaded = true;
    },

    // Initialiser le panier après chargement asynchrone
    setPanier: (state, action) => {
      // Normaliser les articles lors du chargement
      state.articles = action.payload.map((article) => {
        // Pour les articles en AsyncStorage, quantity représente la quantité dans le panier
        const panierQuantity = article.quantity || 1;
        
        return {
          ...article,
          quantite: panierQuantity, // Utiliser la quantité du panier
          quantity: panierQuantity  // Maintenir l'alias
        };
      });
      state.isLoaded = true;
    },

    // Ajouter un article au panier
    addToPanier: (state, action) => {
      const article = action.payload;
      
      // S'assurer d'utiliser quantity si disponible, sinon quantite
      const quantiteToAdd = article.quantity || article.quantite || 1;
      
      const existingIndex = state.articles.findIndex(
        (item) =>
          item.id === article.id &&
          item.color === article.color &&
          item.taille === article.taille
      );

      if (existingIndex >= 0) {
        // Si l'article existe déjà, augmenter la quantité
        state.articles[existingIndex].quantite += quantiteToAdd;
      } else {
        // Normaliser l'article avant ajout
        const normalizedArticle = {
          ...article,
          quantite: quantiteToAdd, // Utiliser la quantité à ajouter
          quantity: quantiteToAdd  // Maintenir l'alias pour compatibilité
        };
        state.articles.push(normalizedArticle);
      }
    },

    // Mettre à jour un article du panier
    updatePanier: (state, action) => {
      const updatedArticle = action.payload;
      const index = state.articles.findIndex(
        (item) =>
          item.id === updatedArticle.id &&
          item.color === updatedArticle.color &&
          item.taille === updatedArticle.taille
      );

      if (index >= 0) {
        state.articles[index] = updatedArticle;
      }
    },

    // Supprimer un article du panier
    deletePanier: (state, action) => {
      const { id, color, taille } = action.payload;
      state.articles = state.articles.filter(
        (item) =>
          !(item.id === id && item.color === color && item.taille === taille)
      );
    },

    // Vider le panier
    clearPanier: (state) => {
      state.articles = [];
    },

    // Mettre à jour seulement la quantité
    updateQuantity: (state, action) => {
      const { id, color, taille, quantite } = action.payload;
      const index = state.articles.findIndex(
        (item) =>
          item.id === id && item.color === color && item.taille === taille
      );

      if (index >= 0 && quantite > 0) {
        state.articles[index].quantite = quantite;
      }
    },
  },
});

export const {
  loadPanier,
  setPanier,
  addToPanier,
  updatePanier,
  deletePanier,
  clearPanier,
  updateQuantity,
} = panierSlice.actions;

// ==================== ACTIONS ASYNCHRONES ====================

// Charger le panier depuis AsyncStorage au démarrage de l'app
export const loadPanierFromStorage = () => async (dispatch) => {
  try {
    const articles = await loadFromAsyncStorage();
    dispatch(setPanier(articles));
  } catch (error) {
    console.error("Erreur lors du chargement du panier depuis AsyncStorage:", error);
    dispatch(setPanier([]));
  }
};

export const loadCart = loadPanierFromStorage;

// Ajouter un article et sauvegarder
export const addArticleToPanier = (article) => async (dispatch, getState) => {
  try {
    dispatch(addToPanier(article));
    const { panier } = getState();
    await saveToAsyncStorage(panier.articles);
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un article au panier:", error);
  }
};

// Mettre à jour un article et sauvegarder
export const updateArticlePanier = (article) => async (dispatch, getState) => {
  try {
    dispatch(updatePanier(article));
    const { panier } = getState();
    await saveToAsyncStorage(panier.articles);
  } catch (error) {
    console.error("Erreur lors de la mise à jour d'un article du panier:", error);
  }
};

// Supprimer un article et sauvegarder
export const deleteArticlePanier = (id, color, taille) => async (dispatch, getState) => {
  try {
    dispatch(deletePanier({ id, color, taille }));
    const { panier } = getState();
    await saveToAsyncStorage(panier.articles);
  } catch (error) {
    console.error("Erreur lors de la suppression d'un article du panier:", error);
  }
};

// Mettre à jour la quantité et sauvegarder
export const updateArticleQuantity = (id, color, taille, quantite) => async (dispatch, getState) => {
  try {
    dispatch(updateQuantity({ id, color, taille, quantite }));
    const { panier } = getState();
    await saveToAsyncStorage(panier.articles);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la quantité d'un article:", error);
  }
};

// Vider le panier et sauvegarder
export const clearPanierData = () => async (dispatch) => {
  try {
    await AsyncStorage.removeItem('panier');
    dispatch(clearPanier());
  } catch (error) {
    console.error("Erreur lors du vidage du panier:", error);
  }
};


// Aliases pour compatibilité
export const clearCartData = clearPanierData;
export const clearCart = clearPanier;

// Selectors (identiques à la version web)
export const selectPanierArticles = (state) => state.panier.articles;

export const selectPanierCount = (state) =>
  state.panier.articles.reduce((total, article) => total + article.quantite, 0);

export const selectPanierTotal = (state) =>
  state.panier.articles.reduce(
    (total, article) => total + article.prix * article.quantite,
    0
  );

export const selectPanierIsLoaded = (state) => state.panier.isLoaded;

export default panierSlice.reducer;