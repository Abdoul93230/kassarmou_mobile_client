import apiClient from '../config/api';

/**
 * Fonctionnalités sociales (abonnements, j'aime boutique, avis vendeur).
 * Passe par apiClient : URL centralisée, token ajouté automatiquement, session expirée gérée.
 * Les lectures non critiques renvoient une valeur vide plutôt que d'échouer.
 */
const socialService = {
  followSeller: (sellerId) => apiClient.post(`/api/sellers/${sellerId}/follow`),
  unfollowSeller: (sellerId) => apiClient.delete(`/api/sellers/${sellerId}/follow`),

  getSellerFollowers: (sellerId) =>
    apiClient.get(`/api/sellers/${sellerId}/followers`).catch(() => ({ data: { followers: [] } })),

  createReview: (sellerId, reviewData) => apiClient.post(`/api/sellers/${sellerId}/reviews`, reviewData),
  updateReview: (reviewId, reviewData) => apiClient.put(`/api/reviews/${reviewId}`, reviewData),
  deleteReview: (reviewId) => apiClient.delete(`/api/reviews/${reviewId}`),

  getSellerReviews: (sellerId, page = 1, limit = 10) =>
    apiClient
      .get(`/api/sellers/${sellerId}/reviews`, { params: { page, limit } })
      .catch(() => ({ data: { reviews: [], totalPages: 0 } })),

  likeReview: (reviewId) => apiClient.post(`/api/reviews/${reviewId}/like`),
  unlikeReview: (reviewId) => apiClient.delete(`/api/reviews/${reviewId}/like`),

  likeStore: (sellerId) => apiClient.post(`/api/sellers/${sellerId}/like`),
  unlikeStore: (sellerId) => apiClient.delete(`/api/sellers/${sellerId}/like`),

  checkStoreLike: (sellerId) =>
    apiClient.get(`/api/sellers/${sellerId}/like`).catch(() => ({ data: { hasLiked: false, liked: false } })),

  getSellerSocialStats: (sellerId) => apiClient.get(`/api/sellers/${sellerId}/stats`),
};

export default socialService;
