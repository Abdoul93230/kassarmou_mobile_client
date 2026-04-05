import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { BackendUrl } from "../config/api";
import axios from "axios";

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  authChecked: false,
};

// Variable globale pour éviter les appels parallèles
let isCheckingAuth = false;

// Helpers pour AsyncStorage (équivalent de localStorage web)
const loadUserFromStorage = async () => {
  try {
    console.log("🔍 Chargement utilisateur depuis AsyncStorage...");
    
    const userString = await AsyncStorage.getItem('userEcomme');
    if (!userString) {
      console.log("ℹ️ Aucune donnée utilisateur trouvée");
      return null;
    }

    const userData = JSON.parse(userString);
    
    if (!userData.token) {
      console.log("❌ Token non trouvé");
      await AsyncStorage.removeItem('userEcomme');
      return null;
    }
    
    console.log("✅ Utilisateur chargé depuis AsyncStorage:", userData.user?.name || userData.name);
    return userData;
  } catch (error) {
    console.error("❌ Erreur lors du chargement utilisateur:", error);
    return null;
  }
};

const saveUserToStorage = async (userData) => {
  try {
    // Sauvegarder le token et les données utilisateur
    if (userData.token) {
      await AsyncStorage.setItem('token', userData.token);
    }
    await AsyncStorage.setItem('userEcomme', JSON.stringify(userData));
    console.log("✅ Utilisateur sauvegardé dans AsyncStorage");
  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde utilisateur:", error);
  }
};

const removeUserFromStorage = async () => {
  try {
    await AsyncStorage.removeItem('userEcomme');
    await AsyncStorage.removeItem('token');
    console.log("✅ Utilisateur supprimé d'AsyncStorage");
  } catch (error) {
    console.error("❌ Erreur lors de la suppression utilisateur:", error);
  }
};

// ==================== ASYNC THUNKS (MÊMES ENDPOINTS QUE LE WEB) ====================

// Login (même endpoint que le web: /login)
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log("🔐 Tentative de connexion...");
      
      const response = await apiClient.post('/login', {
        identifier: credentials.identifier || null,
        email: credentials.email || null,
        phoneNumber: credentials.phoneNumber || null,
        password: credentials.password,
      });
      
      const data = response.data;
      console.log("✅ Connexion réussie:", data.user?.name || data.name);
      console.log({data:response.data});
      
      
      await saveUserToStorage(data);
      return data;
    } catch (error) {
      console.log("❌ Erreur de connexion:", error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Erreur de connexion');
    }
  }
);

// Register (même endpoint que le web: /user)
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      console.log("📝 Tentative d'inscription...");
      
      // Étape 1: Inscription (même endpoint que le web)
      const registerResponse = await apiClient.post('/user', userData);
      
      console.log("✅ Inscription réussie, connexion automatique...");
      
      // Étape 2: Connexion automatique après inscription
      const loginResponse = await apiClient.post('/login', {
        email: userData.email || null,
        phoneNumber: userData.phoneNumber || null,
        password: userData.password,
      });

      const data = loginResponse.data;
      console.log("✅ Connexion automatique réussie:", data.user?.name || data.name);
      
      await saveUserToStorage(data);

      // Envoyer email de notification en arrière-plan (même endpoint que le web)
      try {
        const dateActuelle = new Date();
        const dateInscription = dateActuelle.toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const message = `<h1>Nouvel Utilisateur Inscrit sur IhamBaobab</h1>
          <p>Cher(e) IhamBaobab,</p>
          <p>Nous avons le plaisir de vous informer qu'un nouvel utilisateur s'est inscrit. Voici les détails :</p>
          <ul>
            <li>Nom : ${userData.name}</li>
            <li>Contact : ${userData.email || userData.phoneNumber}</li>
            <li>Date d'inscription : ${dateInscription}</li>
          </ul>
          <p>Cordialement,<br>L'équipe IhamBaobab</p>`;

        apiClient.post('/sendMail', {
          senderEmail: userData.email,
          subject: "Nouveau utilisateur",
          message: `<div>${message}</div>`,
          titel: "<br/><br/><h3>Nouveau utilisateur sur IhamBaobab</h3>",
        }).catch(console.error);
      } catch (emailError) {
        console.error("⚠️ Erreur email (non bloquant):", emailError);
      }

      return data;
    } catch (error) {
      console.log("❌ Erreur d'inscription:", error.response?.data?.message || error.message);
      return rejectWithValue(error.response?.data?.message || 'Erreur d\'inscription');
    }
  }
);

// Vérifier l'authentification avec l'endpoint /verify
export const verifyAuth = createAsyncThunk(
  'auth/verifyAuth',
  async (_, { rejectWithValue, getState }) => {

    
    
    // Éviter les appels parallèles
    if (isCheckingAuth) {
      console.log("⏳ Vérification d'auth déjà en cours, abandon...");
      return rejectWithValue("Vérification déjà en cours");
    }

    const state = getState();
    
    // Si déjà vérifié et authentifié, pas besoin de re-vérifier
    if (state.auth.authChecked && state.auth.isAuthenticated) {
      console.log("✅ Auth déjà vérifiée, réutilisation des données existantes");
      return state.auth.user;
    }

    isCheckingAuth = true;

    try {
      console.log("🔍 Début de la vérification d'authentification...");
      
      const userData = await loadUserFromStorage();
      if (!userData || !userData.token) {
        console.log("❌ Pas de données utilisateur ou token manquant");
        return rejectWithValue("Token non trouvé");
      }
      
      console.log("✅ Token trouvé côté client, vérification serveur...");
      console.log(userData.token);

      // Vérification serveur avec l'endpoint /verify
      try {
       const verifyResponse = await axios.get(
    `${BackendUrl}/verify`,
    {
      headers: {
        Authorization: `Bearer ${userData.token}`,
      },
    }
  );
        // console.log({verifyResponse});
        
        console.log("✅ Token validé côté serveur");
        
        // Si le serveur renvoie des données utilisateur mises à jour, les utiliser
        if (verifyResponse.data?.user) {
          const updatedUserData = {
            ...userData,
            user: verifyResponse.data.user
          };
          await saveUserToStorage(updatedUserData);
          return updatedUserData;
        }
        
        return userData;
      } catch (verifyError) {
        console.log(verifyError);
        
        console.log("❌ Token invalide côté serveur:", verifyError.response?.data?.message || verifyError.message);
        // Token invalide, supprimer les données locales
        await removeUserFromStorage();
        return rejectWithValue("Token invalide ou expiré");
      }
    } catch (error) {
      console.log("❌ Erreur lors de la vérification:", error.message);
      await removeUserFromStorage();
      return rejectWithValue(error.message || 'Erreur de vérification');
    } finally {
      isCheckingAuth = false;
    }
  }
);

// Déconnexion
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log("🚪 Déconnexion en cours...");
      await removeUserFromStorage();
      isCheckingAuth = false;
      console.log("✅ Déconnexion réussie");
      return null;
    } catch (error) {
      console.log("❌ Erreur lors de la déconnexion:", error);
      return rejectWithValue('Erreur lors de la déconnexion');
    }
  }
);

// Forgot Password (même endpoint que le web: /forgotPassword)
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      console.log("📧 Envoi demande de réinitialisation...");
      const response = await apiClient.post('/forgotPassword', { email });
      console.log("✅ Email de réinitialisation envoyé");
      return response.data.message;
    } catch (error) {
      console.log("❌ Erreur forgot password:", error.message);
      return rejectWithValue(error.response?.data?.message || 'Erreur de réinitialisation');
    }
  }
);

// Reset Password (même endpoint que le web: /reset_password)
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (resetData, { rejectWithValue }) => {
    try {
      console.log("🔑 Réinitialisation du mot de passe...");
      const response = await apiClient.post('/reset_password', resetData);
      console.log("✅ Mot de passe réinitialisé");
      return response.data.message;
    } catch (error) {
      console.log("❌ Erreur reset password:", error.message);
      return rejectWithValue(error.response?.data?.message || 'Erreur de réinitialisation');
    }
  }
);

// ==================== SLICE ====================

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Charger l'utilisateur depuis AsyncStorage
    loadUser: (state) => {
      console.log("📲 Action loadUser déclenchée");
    },

    // Déconnexion synchrone
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.authChecked = false;
      isCheckingAuth = false;
      removeUserFromStorage();
    },

    // Effacer les erreurs
    clearError: (state) => {
      state.error = null;
    },

    // Mettre à jour le profil utilisateur
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        loadUserFromStorage().then(data => {
          if (data) {
            saveUserToStorage({ ...data, user: state.user });
          }
        });
      }
    },

    // Marquer comme vérifié
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.authChecked = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.authChecked = true;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.authChecked = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.authChecked = true;
      });

    // Verify Auth
    builder
      .addCase(verifyAuth.pending, (state) => {
        if (!state.authChecked) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload?.user || action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.authChecked = true;
      })
      .addCase(verifyAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.authChecked = true;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.authChecked = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  loadUser, 
  logout,
  clearError, 
  updateUserProfile, 
  setAuthChecked 
} = authSlice.actions;

// Selectors (comme sur le web)
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthChecked = (state) => state.auth.authChecked;

export default authSlice.reducer;