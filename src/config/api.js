import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL du backend - API en ligne
export const BackendUrl = 'https://kassarmou-backend.onrender.com';
export const API_URL = BackendUrl; // Alias pour compatibilité

// Pour développement local, décommenter la ligne ci-dessous :
// export const BackendUrl = 'http://10.0.2.2:5000'; // Émulateur Android
// export const BackendUrl = 'http://192.168.1.X:5000'; // Téléphone physique (remplacer X par votre IP)

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
    
    // Gérer erreur 401 (token expiré)
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('userEcomme');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
