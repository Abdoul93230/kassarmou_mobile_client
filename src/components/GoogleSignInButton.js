import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { COLORS } from '../config/constants';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton({ 
  navigation, 
  text = "Continuer avec Google",
}) {
  const [loading, setLoading] = React.useState(false);

  // Configuration Google OAuth pour EAS Build Android
  // Utiliser UNIQUEMENT androidClientId (pas de Web Client)
  // Le client Android utilise package name + SHA-1, pas de redirect URI
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '108047326596-em97i4brktcg232797lmv1c7hmifnk3j.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSuccess(response.authentication);
    } else if (response?.type === 'error') {
      Toast.show({
        type: 'error',
        text1: 'Erreur Google',
        text2: 'La connexion a échoué',
        position: 'top',
      });
      setLoading(false);
    } else if (response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSuccess = async (authentication) => {
    try {
      setLoading(true);

      // Envoyer l'idToken au backend
      const result = await apiClient.post('/api/auth/google/mobile', {
        idToken: authentication.idToken,
      });

      if (result.data.token) {
        await AsyncStorage.setItem('userEcomme', JSON.stringify(result.data));
        await AsyncStorage.setItem('tokenEcomme', result.data.token);

        Toast.show({
          type: 'success',
          text1: 'Connexion réussie',
          text2: `Bienvenue ${result.data.name}!`,
          position: 'top',
          visibilityTime: 2000,
        });

        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Erreur Google Auth:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error.response?.data?.message || 'Une erreur est survenue',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    setLoading(true);
    await promptAsync();
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, loading && styles.disabled]}
      onPress={handlePress}
      disabled={!request || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#DB4437" />
      ) : (
        <Ionicons name="logo-google" size={24} color="#DB4437" />
      )}
      <Text style={styles.googleButtonText}>
        {loading ? 'Connexion...' : text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  disabled: {
    opacity: 0.6,
  },
});
