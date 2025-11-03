import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import axios from 'axios';

import CustomInput from '../components/CustomInput';
import LoadingButton from '../components/LoadingButton';
import { COLORS } from '../config/constants';
import { BackendUrl } from '../config/api';
import useNetworkStatus from '../hooks/useNetworkStatus';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isConnected } = useNetworkStatus();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async () => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion Internet',
        text2: 'Veuillez vérifier votre connexion',
      });
      return;
    }

    if (!email) {
      setError('L\'adresse email est requise');
      return;
    }

    if (!regexMail.test(email)) {
      setError('Adresse email invalide');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${BackendUrl}/api/user/forgotPassword`, {
        email,
      });

      Toast.show({
        type: 'success',
        text1: 'Email envoyé',
        text2: response.data.message || 'Vérifiez votre boîte de réception',
      });

      // Naviguer vers la page de réinitialisation
      navigation.navigate('ResetPassword', { email });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Une erreur est survenue. Veuillez réessayer.';

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: message,
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header avec dégradé */}
          <LinearGradient
            colors={['#30A08B', '#2D9175', '#26805F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#FFF', '#F0FFF4']}
                style={styles.iconCircle}
              >
                <Ionicons name="mail" size={50} color={COLORS.primary} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Mot de passe oublié ?</Text>
            <Text style={styles.subtitle}>
              Saisissez votre adresse email pour recevoir un code de réinitialisation
            </Text>
          </LinearGradient>

          {/* Indicateur hors ligne */}
          {!isConnected && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={16} color={COLORS.white} />
              <Text style={styles.offlineText}>Mode hors ligne</Text>
            </View>
          )}

          {/* Formulaire */}
          <View style={styles.formContainer}>
            <CustomInput
              label="Adresse email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder="vous@exemple.com"
              icon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
              required
            />

            <LoadingButton
              title="Envoyer le code"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
              rightIcon={<Ionicons name="send" size={18} color="#FFF" />}
            />

            <LoadingButton
              title="Retour à la connexion"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              style={styles.backToLoginButton}
              leftIcon={<Ionicons name="arrow-back" size={18} color={COLORS.primary} />}
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Pensez à vérifier vos spams si vous ne trouvez pas l'email
            </Text>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  animatedContainer: {
    // Removed flex: 1 to fix keyboard closing issue
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 12,
    height: 52,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  backToLoginButton: {
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
});

export default ForgotPasswordScreen;
