import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "../config/api";

// Actions asynchrones avec createAsyncThunk
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/user/login', credentials, {
        withCredentials: true,
        credentials: "include",
      });
      
      // Le backend renvoie directement { id, name, token, message }
      // On stocke tel quel comme le projet web
      await AsyncStorage.setItem('userEcomme', JSON.stringify(response.data));
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur de connexion. Veuillez réessayer.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/user/register', userData, {
        withCredentials: true,
        credentials: "include",
      });
      
      const user = {
        user: response.data.user,
        token: response.data.token,
      };
      
      await AsyncStorage.setItem('userEcomme', JSON.stringify(user));
      
      return user;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur d\'inscription. Veuillez réessayer.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const verifyAuth = createAsyncThunk(
  'auth/verifyAuth',
  async (_, { rejectWithValue }) => {
    try {
      const userString = await AsyncStorage.getItem('userEcomme');
      
      if (!userString) {
        return null;
      }
      
      const userData = JSON.parse(userString);
      
      // Le format du backend est : { id, name, token, message }
      // On vérifie si on a bien un token et un id
      if (userData.token && userData.id) {
        return userData;
      }
      
      await AsyncStorage.removeItem('userEcomme');
      return null;
    } catch (error) {
      await AsyncStorage.removeItem('userEcomme');
      return rejectWithValue('Session expirée');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('userEcomme');
      return null;
    } catch (error) {
      return rejectWithValue('Erreur lors de la déconnexion');
    }
  }
);

// Actions OTP pour inscription
export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async ({ email, name }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/user/send-otp', {
        email,
        name,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi du code OTP';
      return rejectWithValue(errorMessage);
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/user/verify-otp', {
        email,
        otp,
      });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Code OTP invalide ou expiré';
      return rejectWithValue(errorMessage);
    }
  }
);

export const registerWithOtp = createAsyncThunk(
  'auth/registerWithOtp',
  async ({ name, email, phoneNumber, password, whatsapp, otpToken }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/user/register-with-otp', {
        name,
        email,
        phoneNumber,
        password,
        whatsapp,
        otpToken,
      });
      
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création du compte';
      return rejectWithValue(errorMessage);
    }
  }
);

// Slice pour l'authentification
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
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
        // action.payload contient { id, name, token, message }
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        console.log('✅ [authSlice] Login success, user:', action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // Verify Auth
    builder
      .addCase(verifyAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          // action.payload contient { id, name, token, message }
          state.user = action.payload;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.isAuthenticated = false;
        }
        state.error = null;
      })
      .addCase(verifyAuth.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
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
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      });

    // Send OTP
    builder
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Verify OTP
    builder
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Register With OTP
    builder
      .addCase(registerWithOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerWithOtp.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(registerWithOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
