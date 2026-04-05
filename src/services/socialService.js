import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Créer une instance axios avec la base URL
const API = axios.create({
  baseURL: API_URL,
});

// Intercepteur pour ajouter le token JWT à chaque requête
API.interceptors.request.use(async (config) => {
  try {
    const userDataString = await AsyncStorage.getItem('userEcomme');
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error);
  }
  return config;
});

// Services pour les fonctionnalités sociales
const socialService = {
  // Suivre un vendeur
  followSeller: async (sellerId) => {
    try {
      return await API.post(`/api/sellers/${sellerId}/follow`);
    } catch (error) {
      console.error('Follow seller error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Ne plus suivre un vendeur
  unfollowSeller: async (sellerId) => {
    try {
      return await API.delete(`/api/sellers/${sellerId}/follow`);
    } catch (error) {
      console.error('Unfollow seller error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtenir les followers d'un vendeur
  getSellerFollowers: async (sellerId) => {
    try {
      return await API.get(`/api/sellers/${sellerId}/followers`);
    } catch (error) {
      console.error('Get followers error:', error.response?.data || error.message);
      // Retourner des données vides en cas d'erreur
      return { data: { followers: [] } };
    }
  },

  // Créer un avis
  createReview: async (sellerId, reviewData) => {
    try {
      return await API.post(`/api/sellers/${sellerId}/reviews`, reviewData);
    } catch (error) {
      console.error('Create review error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Mettre à jour un avis
  updateReview: async (reviewId, reviewData) => {
    try {
      return await API.put(`/api/reviews/${reviewId}`, reviewData);
    } catch (error) {
      console.error('Update review error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Supprimer un avis
  deleteReview: async (reviewId) => {
    try {
      return await API.delete(`/api/reviews/${reviewId}`);
    } catch (error) {
      console.error('Delete review error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtenir tous les avis d'un vendeur
  getSellerReviews: async (sellerId, page = 1, limit = 10) => {
    try {
      return await API.get(
        `/api/sellers/${sellerId}/reviews?page=${page}&limit=${limit}`
      );
    } catch (error) {
      console.error('Get reviews error:', error.response?.data || error.message);
      // Retourner des données vides en cas d'erreur
      return { data: { reviews: [], totalPages: 0 } };
    }
  },

  // Liker un avis
  likeReview: async (reviewId) => {
    try {
      return await API.post(`/api/reviews/${reviewId}/like`);
    } catch (error) {
      console.error('Like review error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Enlever un like d'un avis
  unlikeReview: async (reviewId) => {
    try {
      return await API.delete(`/api/reviews/${reviewId}/like`);
    } catch (error) {
      console.error('Unlike review error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Liker une boutique
  likeStore: async (sellerId) => {
    try {
      console.log('📍 Tentative de like store - sellerId:', sellerId);
      const response = await API.post(`/api/sellers/${sellerId}/like`);
      console.log('✅ Like store réussi:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Like store error:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      console.error('📋 URL appelée:', error.config?.url);
      console.error('🔑 Headers:', error.config?.headers);
      throw error;
    }
  },

  // Enlever un like d'une boutique
  unlikeStore: async (sellerId) => {
    try {
      console.log('📍 Tentative de unlike store - sellerId:', sellerId);
      const response = await API.delete(`/api/sellers/${sellerId}/like`);
      console.log('✅ Unlike store réussi:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Unlike store error:', error.response?.data || error.message);
      console.error('📊 Status:', error.response?.status);
      console.error('📋 URL appelée:', error.config?.url);
      throw error;
    }
  },

  // Vérifier si un utilisateur a liké une boutique
  checkStoreLike: async (sellerId) => {
    try {
      console.log('🔍 Vérification du like store - sellerId:', sellerId);
      const response = await API.get(`/api/sellers/${sellerId}/like`);
      console.log('✅ Check store like réponse complète:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Check store like error:', error.response?.data || error.message);
      // Retourner false en cas d'erreur
      return { data: { hasLiked: false, liked: false } };
    }
  },

  // Obtenir les stats sociales d'un vendeur
  getSellerSocialStats: async (sellerId) => {
    try {
      return await API.get(`/api/sellers/${sellerId}/stats`);
    } catch (error) {
      console.error('Get stats error:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default socialService;
