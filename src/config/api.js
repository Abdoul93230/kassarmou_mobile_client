import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { navigationRef, navigate } from '../navigation/RootNavigation';

// URL du backend - API en ligne
export const BackendUrl = 'https://ihambackend.onrender.com';
export const API_URL = BackendUrl; // Alias pour compatibilité


// Configuration Axios
const apiClient = axios.create({
  baseURL: BackendUrl,
  timeout: 45000, // Augmenté pour laisser le temps au serveur de redémarrer
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fonction utilitaire pour delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const userString = await AsyncStorage.getItem('userEcomme');
      if (userString) {
        const user = JSON.parse(userString);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs avec retry pour 502
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '').toLowerCase();
    const authEndpoints = [
      '/login',
      '/adminlogin',
      '/auth/check-phone',
      '/auth/send-otp',
      '/auth/resend-otp',
      '/auth/verify-otp',
      '/auth/quick-register',
      '/auth/request-password-reset-otp',
      '/auth/reset-password-phone',
      '/forgot_password',
      '/forgotpassword',
      '/reset_password',
      '/forgotpassword_seller',
      '/reset_password_seller',
    ];
    const isPublicAuthRequest = authEndpoints.some((endpoint) => requestUrl.includes(endpoint));
    const hasBearerToken = Boolean(originalRequest?.headers?.Authorization);
    
    // Gérer erreur 502 (serveur qui redémarre) avec retry
    if (error.response?.status === 502 && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Retry maximum 3 fois avec délai croissant
      if (originalRequest._retryCount <= 3) {
        const delayTime = originalRequest._retryCount * 3000; // 3s, 6s, 9s
        console.log(`⏳ Serveur en cours de redémarrage. Nouvelle tentative ${originalRequest._retryCount}/3 dans ${delayTime/1000}s...`);
        
        await delay(delayTime);
        return apiClient(originalRequest);
      }
    }
    
    // Gérer erreur 401 uniquement pour les requêtes protégées portant un token
    // Les endpoints publics d'auth/OTP peuvent aussi répondre 401 sans signifier une session expirée.
    if (error.response?.status === 401 && hasBearerToken && !isPublicAuthRequest) {
      try {
        // Supprimer le token du storage
        await AsyncStorage.removeItem('userEcomme');

        // Importer dynamiquement le store et les actions pour éviter les cycles d'import
        try {
          // require à l'exécution pour casser les dépendances circulaires
          // eslint-disable-next-line global-require
          const storeModule = require('../redux/store');
          // eslint-disable-next-line global-require
          const { logoutUser: logoutAction } = require('../redux/authSlice');
          // eslint-disable-next-line global-require
          const { clearPanierData: clearCartAction } = require('../redux/cartSlice');

          const storeLocal = storeModule && storeModule.default ? storeModule.default : storeModule;
          if (storeLocal && storeLocal.dispatch) {
            storeLocal.dispatch(logoutAction());
            storeLocal.dispatch(clearCartAction());
          }
        } catch (reqErr) {
          console.warn('Impossible de dispatcher logout via store dynamique:', reqErr);
        }

        // Afficher un message utilisateur
        try {
          Toast.show({
            type: 'info',
            text1: 'Session expirée',
            text2: 'Veuillez vous reconnecter.',
          });
        } catch (tErr) {
          console.warn('Toast unavailable:', tErr);
        }

        // Naviguer vers le flux QuickAuth si possible
        try {
          if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
            navigate('QuickAuth');
          }
        } catch (navErr) {
          console.warn('Navigation to QuickAuth failed:', navErr);
        }
      } catch (e) {
        console.error('Erreur lors du nettoyage après 401:', e);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
