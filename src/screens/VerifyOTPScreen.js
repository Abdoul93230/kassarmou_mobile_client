import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import LoadingButton from '../components/LoadingButton';
import CustomInput from '../components/CustomInput';
import {
  login,
  registerWithOtp,
  requestPasswordResetOtp,
  resetPasswordWithPhoneOtp,
  sendOtp,
  verifyOtp,
  setQuickAuthContext,
} from '../redux/authSlice';
import { COLORS } from '../config/constants';

const OTP_LENGTH = 6;
const STEP_VERIFY_OTP = 'verify-otp';
const STEP_SET_PASSWORD = 'set-password';
const FLOW_QUICK_REGISTER = 'quick-register';
const FLOW_PASSWORD_RESET = 'password-reset';
const pickDevOtp = (payload = {}) => payload?.devOTP || payload?.devOtp || payload?.otp || null;
const getErrorMessage = (value) => {
  if (typeof value === 'string') return value;
  return value?.message || value?.error || 'Une erreur est survenue';
};
const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function VerifyOTPScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const [step, setStep] = useState(STEP_VERIFY_OTP);
  const [otp, setOtp] = useState('');
  const [devCode, setDevCode] = useState(route?.params?.devCode || null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(route?.params?.attemptsRemaining ?? null);
  const [resendCooldown, setResendCooldown] = useState(route?.params?.cooldownSeconds ?? 0);
  const [expiresIn, setExpiresIn] = useState(route?.params?.expiresInSeconds ?? 0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const formData = route?.params?.formData || {};
  const flowType = route?.params?.type || FLOW_QUICK_REGISTER;
  const pendingAction = route?.params?.pendingAction || null;
  const returnScreen = route?.params?.returnScreen || null;
  const returnParams = route?.params?.returnParams || null;

  const canSubmitOtp = useMemo(() => otp.length === OTP_LENGTH, [otp.length]);

  useEffect(() => {
    if (resendCooldown <= 0 && expiresIn <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
      setExpiresIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown, expiresIn]);

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

  const handleVerifyOtp = async () => {
    if (!canSubmitOtp) {
      Alert.alert('OTP', 'Veuillez saisir les 6 chiffres du code OTP.');
      return;
    }

    try {
      const verifyResult = await dispatch(
        verifyOtp({
          phoneNumber: formData.phoneNumber,
          otp,
        })
      ).unwrap();

      if (typeof verifyResult.attemptsRemaining === 'number') {
        setAttemptsRemaining(verifyResult.attemptsRemaining);
      }

      if (typeof verifyResult.cooldownSeconds === 'number') {
        setResendCooldown(verifyResult.cooldownSeconds);
      }

      if (typeof verifyResult.expiresInSeconds === 'number') {
        setExpiresIn(verifyResult.expiresInSeconds);
      }

      setStep(STEP_SET_PASSWORD);
    } catch (error) {
      const remaining = Number(error?.attemptsRemaining);
      if (!Number.isNaN(remaining)) {
        setAttemptsRemaining(remaining);
      }
      Alert.alert('Verification echouee', getErrorMessage(error) || 'Code OTP invalide');
    }
  };

  const handleFinalizeRegister = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Mot de passe', 'Choisissez un mot de passe de 6 caracteres minimum.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Confirmation', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      if (flowType === FLOW_PASSWORD_RESET) {
        await dispatch(
          resetPasswordWithPhoneOtp({
            phone: formData.phoneNumber,
            code: otp,
            newPassword: password,
          })
        ).unwrap();

        await dispatch(
          login({
            identifier: formData.phoneNumber,
            phoneNumber: formData.phoneNumber,
            password,
          })
        ).unwrap();

        navigateAfterAuth();
      } else {
        await dispatch(
          registerWithOtp({
            phoneNumber: formData.phoneNumber,
            name: formData.name,
            password,
          })
        ).unwrap();

        await dispatch(
          login({
            identifier: formData.phoneNumber,
            phoneNumber: formData.phoneNumber,
            password,
          })
        ).unwrap();

        navigateAfterAuth();
      }
    } catch (error) {
      Alert.alert('Operation echouee', getErrorMessage(error) || 'Echec de finalisation');
    }
  };

  const handleResend = async () => {
    try {
      const resendResult = flowType === FLOW_PASSWORD_RESET
        ? await dispatch(requestPasswordResetOtp(formData.phoneNumber)).unwrap()
        : await dispatch(
            sendOtp({
              phoneNumber: formData.phoneNumber,
              name: formData.name,
            })
          ).unwrap();

      setDevCode(pickDevOtp(resendResult));
      setAttemptsRemaining(resendResult.attemptsRemaining ?? null);
      setResendCooldown(resendResult.cooldownSeconds ?? 0);
      setExpiresIn(resendResult.expiresInSeconds ?? 0);
      setOtp('');
      setStep(STEP_VERIFY_OTP);
      Alert.alert('OTP', 'Un nouveau code a ete envoye.');
    } catch (error) {
      Alert.alert('OTP', getErrorMessage(error) || 'Impossible de renvoyer le code');
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
          <Ionicons name="key-outline" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Verification OTP</Text>
        <Text style={styles.subtitle}>Code envoye a {formData.phoneNumber}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>

        {devCode ? (
          <View style={styles.devBadge}>
            <Text style={styles.devTitle}>Mode developpement</Text>
            <Text style={styles.devCode}>Code test: {devCode}</Text>
          </View>
        ) : null}

        {typeof attemptsRemaining === 'number' ? (
          <Text style={styles.attemptsText}>Tentatives restantes: {attemptsRemaining}</Text>
        ) : null}

        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>Expiration du code</Text>
          <Text style={styles.timerValue}>{formatDuration(expiresIn)}</Text>
          <Text style={styles.timerHint}>
            {expiresIn > 0 ? 'Le code OTP est encore valide.' : 'Le code OTP a expiré.'}
          </Text>
        </View>

        {step === STEP_VERIFY_OTP && (
          <>
            <TextInput
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              keyboardType="number-pad"
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor="#9CA3AF"
              maxLength={OTP_LENGTH}
            />

            <LoadingButton
              title="Verifier le code"
              onPress={handleVerifyOtp}
              loading={loading}
              disabled={!canSubmitOtp}
              style={styles.primaryButton}
            />

            <TouchableOpacity
              style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
              onPress={handleResend}
              disabled={resendCooldown > 0}
            >
              <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                {resendCooldown > 0 ? `Renvoyer dans ${formatDuration(resendCooldown)}` : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === STEP_SET_PASSWORD && (
          <>
            <Text style={styles.stepInfo}>
              {flowType === FLOW_PASSWORD_RESET
                ? 'Code valide. Definissez votre nouveau mot de passe.'
                : 'Code valide. Definissez maintenant votre mot de passe.'}
            </Text>
            <CustomInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="Choisissez un mot de passe"
              secureTextEntry
              icon="lock-closed-outline"
            />
            <CustomInput
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Retapez le mot de passe"
              secureTextEntry
              icon="lock-closed-outline"
            />
            <LoadingButton
              title={flowType === FLOW_PASSWORD_RESET ? 'Reinitialiser le mot de passe' : "Terminer l'inscription"}
              onPress={handleFinalizeRegister}
              loading={loading}
              style={styles.primaryButton}
            />
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
    backgroundColor: '#ECF1F7',
  },
  headerGradient: {
    paddingTop: 24,
    paddingBottom: 26,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 28,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
  },
  devBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  devTitle: {
    color: '#047857',
    fontWeight: '700',
    marginBottom: 2,
  },
  devCode: {
    color: '#065F46',
    fontSize: 14,
  },
  attemptsText: {
    color: COLORS.textLight,
    marginBottom: 10,
    textAlign: 'center',
  },
  timerBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  timerHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: 14,
    color: COLORS.text,
  },
  resendButton: {
    marginTop: 12,
  },
  resendButtonDisabled: {
    opacity: 0.55,
  },
  resendText: {
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: COLORS.textLight,
  },
  stepInfo: {
    color: COLORS.textLight,
    marginBottom: 10,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 10,
  },
});
