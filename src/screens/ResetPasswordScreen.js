import React, { useState, useEffect, useRef } from 'react';
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
import OTPInput from '../components/OTPInput';
import { COLORS } from '../config/constants';
import { BackendUrl } from '../config/api';
import useNetworkStatus from '../hooks/useNetworkStatus';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
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

  // Timer pour OTP
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validatePassword = (password) => {
    const errors = [];
    const minLength = 8;
    const regexUpperCase = /[A-Z]/;
    const regexLowerCase = /[a-z]/;
    const regexNumber = /[0-9]/;
    const regexSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

    if (!password || password.length < minLength) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (!regexUpperCase.test(password)) {
      errors.push('Au moins une lettre majuscule');
    }
    if (!regexLowerCase.test(password)) {
      errors.push('Au moins une lettre minuscule');
    }
    if (!regexNumber.test(password)) {
      errors.push('Au moins un chiffre');
    }
    if (!regexSpecialChar.test(password)) {
      errors.push('Au moins un caractère spécial');
    }

    return errors;
  };

  const validateForm = () => {
    const newErrors = {};

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      newErrors.otp = 'Veuillez entrer le code OTP complet';
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors[0];
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion Internet',
        text2: 'Veuillez vérifier votre connexion',
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${BackendUrl}/api/user/reset_password`, {
        email,
        otp: otp.join(''),
        newPassword,
      });

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: response.data.message || 'Mot de passe réinitialisé avec succès',
      });

      // Redirection vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 2000);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Erreur lors de la réinitialisation du mot de passe';

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      await axios.post(`${BackendUrl}/api/user/forgotPassword`, { email });
      
      Toast.show({
        type: 'success',
        text1: 'Code renvoyé',
        text2: 'Un nouveau code a été envoyé à votre email',
      });

      setTimeLeft(300);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de renvoyer le code',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
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
                <Ionicons name="lock-closed" size={50} color={COLORS.primary} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Code envoyé à <Text style={styles.emailText}>{email}</Text>
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
            {/* Section OTP */}
            <View style={styles.otpSection}>
              <View style={styles.otpHeader}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
                <Text style={styles.otpLabel}>Code de vérification</Text>
              </View>
              
              <OTPInput otp={otp} setOtp={setOtp} />
              
              {errors.otp && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{errors.otp}</Text>
                </View>
              )}

              <View style={styles.timerContainer}>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={timeLeft < 60 ? COLORS.error : COLORS.textLight} 
                />
                <Text style={[
                  styles.timerText,
                  timeLeft < 60 && styles.timerTextDanger
                ]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>

              {canResend && (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  style={styles.resendButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={16} color={COLORS.primary} />
                  <Text style={styles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Nouveau mot de passe */}
            <CustomInput
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              placeholder="Minimum 8 caractères"
              icon="lock-closed"
              secureTextEntry
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              error={errors.password}
              required
            />

            {/* Confirmer mot de passe */}
            <CustomInput
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: null });
              }}
              placeholder="Retapez votre mot de passe"
              icon="lock-closed"
              secureTextEntry
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              error={errors.confirmPassword}
              required
            />

            {/* Boutons */}
            <LoadingButton
              title="Réinitialiser le mot de passe"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
              rightIcon={<Ionicons name="checkmark-circle" size={20} color="#FFF" />}
            />

            <LoadingButton
              title="Annuler"
              onPress={() => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>

          {/* Exigences du mot de passe */}
          <View style={styles.requirementsBox}>
            <View style={styles.requirementHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.requirementsTitle}>
                Le mot de passe doit contenir :
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.requirementText}>
                Au moins 8 caractères
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.requirementText}>
                Une lettre majuscule et une minuscule
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.requirementText}>
                Un chiffre et un caractère spécial
              </Text>
            </View>
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontWeight: '700',
    color: COLORS.white,
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
  },
  otpSection: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginLeft: 6,
    fontWeight: '500',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  timerText: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '600',
    marginLeft: 6,
  },
  timerTextDanger: {
    color: COLORS.error,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
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
  cancelButton: {
    marginBottom: 20,
  },
  requirementsBox: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 28,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 8,
  },
});

export default ResetPasswordScreen;
