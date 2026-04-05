import { createSelector } from '@reduxjs/toolkit';

// Sélecteurs de base
const selectProductsState = state => state.products;
const selectAuthState = state => state.auth;
const selectPanierState = state => state.panier;
const selectLikesState = state => state.likes;

// Sélecteurs mémoïsés pour éviter les re-renders inutiles
export const selectProducts = createSelector(
  [selectProductsState],
  (products) => products.data || []
);

export const selectTypes = createSelector(
  [selectProductsState],
  (products) => products.types || []
);

export const selectCategories = createSelector(
  [selectProductsState],
  (products) => products.categories || []
);

export const selectBanners = createSelector(
  [selectProductsState],
  (products) => products.products_Pubs || []
);

export const selectUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectCartItems = createSelector(
  [selectPanierState],
  (panier) => panier.articles || []
);

export const selectLikedProducts = createSelector(
  [selectLikesState],
  (likes) => likes.likedProducts || []
);

// Sélecteurs dérivés
export const selectCartCount = createSelector(
  [selectCartItems],
  (articles) => articles.reduce((total, article) => total + (article.quantite || 0), 0)
);

export const selectCartTotal = createSelector(
  [selectCartItems],
  (articles) => articles.reduce(
    (total, article) => total + (article.prix || 0) * (article.quantite || 0),
    0
  )
);
