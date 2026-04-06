import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CustomInput from '../components/CustomInput';
import LoadingButton from '../components/LoadingButton';
import {
  checkPhoneAvailability,
  login,
  sendOtp,
  requestPasswordResetOtp,
  clearError,
  setQuickAuthContext,
} from '../redux/authSlice';
import { COLORS } from '../config/constants';
import useNetworkStatus from '../hooks/useNetworkStatus';

const STEP_PHONE = 'phone';
const STEP_LOGIN = 'login';
const STEP_REGISTER = 'register';

const normalizePhoneDigits = (value = '') => value.replace(/\D/g, '');
const pickDevOtp = (payload = {}) => payload?.devOTP || payload?.devOtp || payload?.otp || null;
const getErrorMessage = (value) => {
  if (typeof value === 'string') return value;
  return value?.message || value?.error || 'Une erreur est survenue';
};

export default function QuickAuthScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const { isConnected } = useNetworkStatus();

  const [step, setStep] = useState(STEP_PHONE);
  const [countryCode, setCountryCode] = useState('+227');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const pendingAction = route?.params?.pendingAction || null;
  const returnScreen = route?.params?.returnScreen || null;
  const returnParams = route?.params?.returnParams || null;

  const fullPhone = useMemo(() => {
    const cleaned = normalizePhoneDigits(phoneDigits);
    return cleaned ? `${countryCode}${cleaned}` : '';
  }, [countryCode, phoneDigits]);

  const navigateAfterAuth = () => {
    dispatch(
      setQuickAuthContext({
        pendingAction,
        returnScreen,
        returnParams,
      })
    );

    if (returnScreen) {
      navigation.reset({
        index: 0,
        routes: [{ name: returnScreen, params: returnParams || {} }],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const validatePhone = () => {
    if (!fullPhone) {
      Alert.alert('Champ requis', 'Veuillez saisir votre numero de telephone.');
      return false;
    }

    const valid = /^\+[1-9]\d{7,14}$/.test(fullPhone);
    if (!valid) {
      Alert.alert('Numero invalide', 'Utilisez un numero international valide.');
      return false;
    }

    return true;
  };

  const handleCheckPhone = async () => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Verifiez votre connexion internet.');
      return;
    }

    if (!validatePhone()) return;

    try {
      dispatch(clearError());
      const result = await dispatch(checkPhoneAvailability(fullPhone)).unwrap();

      if (result.exists) {
        setStep(STEP_LOGIN);
      } else {
        setStep(STEP_REGISTER);
      }
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Impossible de verifier ce numero');
    }
  };

  const handleLogin = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Mot de passe', 'Veuillez saisir votre mot de passe (6 caracteres min).');
      return;
    }

    try {
      await dispatch(
        login({
          identifier: fullPhone,
          phoneNumber: fullPhone,
          password,
        })
      ).unwrap();

      navigateAfterAuth();
    } catch (error) {
      Alert.alert('Connexion echouee', getErrorMessage(error) || 'Impossible de se connecter');
    }
  };

  const handleForgotPassword = async () => {
    if (!validatePhone()) return;

    try {
      const resetOtp = await dispatch(requestPasswordResetOtp(fullPhone)).unwrap();

      navigation.navigate('VerifyOTP', {
        type: 'password-reset',
        devCode: pickDevOtp(resetOtp),
        attemptsRemaining: resetOtp.attemptsRemaining,
        cooldownSeconds: resetOtp.cooldownSeconds,
        expiresInSeconds: resetOtp.expiresInSeconds,
        pendingAction,
        returnScreen,
        returnParams,
        formData: {
          phoneNumber: fullPhone,
          name: null,
        },
      });
    } catch (error) {
      Alert.alert('Mot de passe oublie', getErrorMessage(error) || 'Impossible de lancer la reinitialisation');
    }
  };

  const handleSendOtp = async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('Nom requis', 'Veuillez saisir votre nom complet.');
      return;
    }

    try {
      const otpResult = await dispatch(
        sendOtp({
          phoneNumber: fullPhone,
          name: name.trim(),
        })
      ).unwrap();

      navigation.navigate('VerifyOTP', {
        type: 'quick-register',
        devCode: pickDevOtp(otpResult),
        attemptsRemaining: otpResult.attemptsRemaining,
        cooldownSeconds: otpResult.cooldownSeconds,
        expiresInSeconds: otpResult.expiresInSeconds,
        pendingAction,
        returnScreen,
        returnParams,
        formData: {
          phoneNumber: fullPhone,
          name: name.trim(),
        },
      });
    } catch (error) {
      Alert.alert('OTP', getErrorMessage(error) || 'Impossible d\'envoyer le code OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#30A08B', '#2D9175', '#1F6E58']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerIconWrap}>
          <Ionicons name="shield-checkmark" size={34} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>QuickAuth</Text>
        <Text style={styles.subtitle}>Connexion simple, rapide et securisee</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        {step === STEP_PHONE && (
          <>
            <Text style={styles.stepTitle}>Etape 1: Votre numero</Text>
            <Text style={styles.stepHint}>Entrez votre numero pour verifier si vous avez deja un compte.</Text>
            <View style={styles.phoneRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{countryCode}</Text>
              </View>
              <View style={styles.phoneInputWrap}>
                <CustomInput
                  value={phoneDigits}
                  onChangeText={(v) => setPhoneDigits(normalizePhoneDigits(v))}
                  placeholder="90123456"
                  keyboardType="phone-pad"
                  icon="call-outline"
                />
              </View>
            </View>
            <LoadingButton
              title="Continuer"
              onPress={handleCheckPhone}
              loading={loading}
              style={styles.primaryButton}
            />
          </>
        )}

        {step === STEP_LOGIN && (
          <>
            <Text style={styles.stepTitle}>Etape 2: Connexion</Text>
            <Text style={styles.infoText}>Numero detecte: {fullPhone}</Text>
            <CustomInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="Votre mot de passe"
              secureTextEntry
              icon="lock-closed-outline"
            />
            <LoadingButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              style={styles.primaryButton}
            />
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotLink}>Mot de passe oublie ?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep(STEP_PHONE)}>
              <Text style={styles.backLink}>Changer de numero</Text>
            </TouchableOpacity>
          </>
        )}

        {step === STEP_REGISTER && (
          <>
            <Text style={styles.stepTitle}>Etape 2: Inscription rapide</Text>
            <Text style={styles.infoText}>Nouveau numero: {fullPhone}</Text>
            <CustomInput
              label="Nom complet"
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
              icon="person-outline"
            />
            <LoadingButton
              title="Envoyer le code OTP"
              onPress={handleSendOtp}
              loading={loading}
              style={styles.primaryButton}
            />
            <TouchableOpacity onPress={() => setStep(STEP_PHONE)}>
              <Text style={styles.backLink}>Changer de numero</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF2F7',
  },
  headerGradient: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 26,
  },
  title: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepHint: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codeBox: {
    height: 48,
    minWidth: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  codeText: {
    fontWeight: '600',
    color: COLORS.text,
  },
  phoneInputWrap: {
    flex: 1,
  },
  backLink: {
    marginTop: 14,
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '600',
  },
  forgotLink: {
    marginTop: 12,
    textAlign: 'center',
    color: '#B17236',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 10,
  },
});
