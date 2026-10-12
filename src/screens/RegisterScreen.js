import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

import CustomInput from '../components/CustomInput';
import LoadingButton from '../components/LoadingButton';
import CountryCodePicker from '../components/CountryCodePicker';
import { sendOtp, verifyOtp, registerWithOtp, login, clearError } from '../redux/authSlice';
import { COLORS } from '../config/constants';
import useNetworkStatus from '../hooks/useNetworkStatus';

const { width } = Dimensions.get('window');
const PRIMARY = '#30A08B';
const SECONDARY = '#B2905F';

// Liste des indicatifs avec drapeaux
const COUNTRY_CODES = [
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+229', country: 'Bénin', flag: '🇧🇯' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+223', country: 'Mali', flag: '🇲🇱' },
  { code: '+221', country: 'Sénégal', flag: '🇸🇳' },
  { code: '+228', country: 'Togo', flag: '🇹🇬' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+237', country: 'Cameroun', flag: '🇨🇲' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+1', country: 'États-Unis/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+213', country: 'Algérie', flag: '🇩🇿' },
  { code: '+212', country: 'Maroc', flag: '🇲🇦' },
  { code: '+216', country: 'Tunisie', flag: '🇹🇳' },
  { code: '+20', country: 'Égypte', flag: '🇪🇬' },
];

const getErrorMessage = (value) => {
  if (typeof value === 'string') return value;
  return value?.message || value?.error || 'Une erreur est survenue';
};

// ─── Petit composant champ avec icône ───────────────────────────────────────
function Field({
  label,
  required,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  showToggle,
  showValue,
  onToggle,
  error,
  helpText,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.block}>
      {label ? (
        <Text style={fieldStyles.label}>
          {label}
          {required ? <Text style={fieldStyles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          fieldStyles.row,
          focused && fieldStyles.rowFocused,
          error && fieldStyles.rowError,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? PRIMARY : '#A0AEC0'}
            style={fieldStyles.icon}
          />
        ) : null}
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E0"
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          secureTextEntry={showToggle ? !showValue : !!secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showToggle ? (
          <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={showValue ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#A0AEC0"
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
      {helpText && !error ? <Text style={fieldStyles.help}>{helpText}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  block: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  required: { color: '#E53E3E' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  rowFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#F0FAF8',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  rowError: { borderColor: '#FC8181', backgroundColor: '#FFF5F5' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#2D3748' },
  error: { fontSize: 12, color: '#E53E3E', marginTop: 5, marginLeft: 2 },
  help: { fontSize: 12, color: '#718096', marginTop: 5, marginLeft: 2 },
});
// ────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const { isConnected } = useNetworkStatus();

  const [currentStep, setCurrentStep] = useState('form'); // 'form' | 'otp' | 'success'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    countryCode: '+227',
    password: '',
    passwordConf: '',
    whatsapp: true,
    acceptTerms: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const otpRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  // Animation d'entrée à chaque changement d'étape
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [currentStep]);

  // Timer expiration OTP
  useEffect(() => {
    if (currentStep === 'otp' && expiresIn > 0) {
      const timer = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, expiresIn]);

  // Timer cooldown renvoi
  useEffect(() => {
    if (currentStep === 'otp' && resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, resendCooldown]);

  // Erreurs Redux
  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: getErrorMessage(error),
        position: 'top',
        visibilityTime: 4000,
      });
      dispatch(clearError());
    }
  }, [error]);

  // Redirection après inscription réussie
  useEffect(() => {
    if (isAuthenticated && currentStep === 'success') {
      setTimeout(() => navigation.replace('MainTabs'), 3000);
    }
  }, [isAuthenticated, currentStep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) => {
    const errs = [];
    if (!password || password.length < 8) errs.push('Minimum 8 caractères');
    if (!/[A-Z]/.test(password)) errs.push('Au moins une majuscule');
    if (!/[a-z]/.test(password)) errs.push('Au moins une minuscule');
    if (!/[0-9]/.test(password)) errs.push('Au moins un chiffre');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errs.push('Au moins un caractère spécial');
    return errs;
  };

  const validateForm = () => {
    const fe = {};
    const ge = [];
    const { name, email, phoneNumber, password, passwordConf, acceptTerms } = formData;

    if (!name.trim() || name.length < 3) {
      fe.name = 'Le nom doit contenir au moins 3 caractères';
    }
    if (!email) {
      fe.email = "L'adresse email est obligatoire";
    } else if (!validateEmail(email)) {
      fe.email = 'Adresse email invalide';
    }
    if (phoneNumber && phoneNumber.length < 8) {
      fe.phoneNumber = 'Le numéro doit contenir au moins 8 chiffres';
    }

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      fe.password = pwdErrors.join(' · ');
    }
    if (passwordConf !== password) {
      fe.passwordConf = 'Les mots de passe ne correspondent pas';
    }
    if (!acceptTerms) {
      ge.push("Vous devez accepter les conditions d'utilisation");
    }

    setFieldErrors(fe);
    setGlobalErrors(ge);
    return Object.keys(fe).length === 0 && ge.length === 0;
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const getUserFriendlyError = (err) => {
    if (err?.response?.status === 502 || err?.message?.includes('502')) {
      return { title: 'Serveur en cours de redémarrage', message: 'Le serveur se réveille, veuillez patienter…' };
    }
    if (err?.message?.includes('Network Error') || err?.message?.includes('timeout')) {
      return { title: 'Erreur de connexion', message: 'Vérifiez votre connexion Internet' };
    }
    return { title: 'Erreur', message: err?.message || err || 'Une erreur est survenue' };
  };

  const getCountryFlag = (code) => {
    const country = COUNTRY_CODES.find((c) => c.code === code);
    return country ? country.flag : '🌍';
  };

  // ── ÉTAPE 1: Envoyer OTP ──────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isConnected) {
      Toast.show({ type: 'error', text1: 'Pas de connexion', text2: 'Vérifiez votre connexion Internet', position: 'top' });
      return;
    }
    if (!validateForm()) return;

    try {
      const phoneWithCode = formData.phoneNumber
        ? `${formData.countryCode}${formData.phoneNumber}`
        : null;

      const result = await dispatch(
        sendOtp({ phoneNumber: phoneWithCode, email: formData.email, name: formData.name })
      ).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Code envoyé',
        text2: `Un code a été envoyé à ${formData.email}`,
        position: 'top',
      });

      setCurrentStep('otp');
      setExpiresIn(Number(result.expiresInSeconds) || 300);
      setResendCooldown(Number(result.cooldownSeconds) || 0);
      setCanResend((Number(result.cooldownSeconds) || 0) === 0);
    } catch (err) {
      const errorInfo = getUserFriendlyError(err);
      Toast.show({ type: 'error', text1: errorInfo.title, text2: errorInfo.message, position: 'top', visibilityTime: 5000 });
    }
  };

  // ── ÉTAPE 2: Vérifier OTP ─────────────────────────────────────────────────
  const handleVerifyOtp = async (otpCode) => {
    if (!isConnected) {
      Toast.show({ type: 'error', text1: 'Pas de connexion', text2: 'Vérifiez votre connexion Internet', position: 'top' });
      return;
    }
    try {
      const verifyResult = await dispatch(
        verifyOtp({
          phoneNumber: formData.phoneNumber ? `${formData.countryCode}${formData.phoneNumber}` : null,
          email: formData.email,
          otp: otpCode,
        })
      ).unwrap();

      setOtpToken(verifyResult.token);

      const phoneWithCode = formData.phoneNumber
        ? `${formData.countryCode}${formData.phoneNumber}`
        : null;

      await dispatch(
        registerWithOtp({
          name: formData.name,
          email: formData.email,
          phoneNumber: phoneWithCode,
          password: formData.password,
          whatsapp: formData.whatsapp,
          otpToken: verifyResult.token,
        })
      ).unwrap();

      await dispatch(
        login({ email: formData.email, phoneNumber: phoneWithCode, password: formData.password })
      ).unwrap();

      Toast.show({ type: 'success', text1: 'Félicitations !', text2: 'Votre compte a été créé avec succès', position: 'top' });
      setCurrentStep('success');
    } catch (err) {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      const errorInfo = getUserFriendlyError(err);
      Toast.show({ type: 'error', text1: errorInfo.title, text2: errorInfo.message, position: 'top', visibilityTime: 5000 });
    }
  };

  // ── Renvoyer OTP ──────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    try {
      const phoneWithCode = formData.phoneNumber
        ? `${formData.countryCode}${formData.phoneNumber}`
        : null;
      const resendResult = await dispatch(
        sendOtp({ phoneNumber: phoneWithCode, email: formData.email, name: formData.name })
      ).unwrap();

      setExpiresIn(Number(resendResult.expiresInSeconds) || 300);
      setResendCooldown(Number(resendResult.cooldownSeconds) || 0);
      setCanResend((Number(resendResult.cooldownSeconds) || 0) === 0);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      Toast.show({ type: 'success', text1: 'Code renvoyé', text2: 'Un nouveau code a été envoyé', position: 'top' });
    } catch (err) {
      const errorInfo = getUserFriendlyError(err);
      Toast.show({ type: 'error', text1: errorInfo.title, text2: errorInfo.message, position: 'top', visibilityTime: 5000 });
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU ÉTAPE OTP
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'otp') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.otpScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Hero OTP */}
            <LinearGradient
              colors={[PRIMARY, '#26897A', '#1D6E62']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.otpHero}
            >
              <View style={styles.heroBubble1} />
              <View style={styles.heroBubble2} />
              <View style={styles.shieldCircle}>
                <Ionicons name="shield-checkmark" size={38} color={PRIMARY} />
              </View>
              <Text style={styles.otpHeroTitle}>Vérification email</Text>
              <Text style={styles.otpHeroSub}>Code envoyé à</Text>
              <Text style={styles.otpHeroEmail}>{formData.email}</Text>
            </LinearGradient>

            {/* Card OTP */}
            <View style={styles.otpCard}>
              {/* Inputs OTP */}
              <View style={styles.otpInputsRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Timer */}
              <View style={styles.timerRow}>
                {expiresIn > 0 ? (
                  <Text style={styles.timerText}>
                    Expire dans{' '}
                    <Text style={styles.timerValue}>{formatTime(expiresIn)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.timerExpired}>Code expiré</Text>
                )}
              </View>

              {/* Cooldown box */}
              {resendCooldown > 0 && (
                <View style={styles.cooldownBox}>
                  <Text style={styles.cooldownLabel}>Renvoi disponible dans</Text>
                  <Text style={styles.cooldownValue}>{formatTime(resendCooldown)}</Text>
                </View>
              )}

              {/* Bouton Renvoyer */}
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={!canResend || loading}
                style={[styles.resendBtn, (!canResend || loading) && styles.resendBtnDisabled]}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={canResend && !loading ? PRIMARY : '#A0AEC0'}
                />
                <Text
                  style={[
                    styles.resendBtnText,
                    (!canResend || loading) && styles.resendBtnTextDisabled,
                  ]}
                >
                  {loading ? 'Envoi en cours…' : 'Renvoyer le code'}
                </Text>
              </TouchableOpacity>

              {/* Loading */}
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.loadingText}>Vérification…</Text>
                </View>
              )}

              {/* Retour */}
              <TouchableOpacity
                onPress={() => setCurrentStep('form')}
                disabled={loading}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={16} color="#4A5568" />
                <Text style={styles.backBtnText}>Modifier l'email</Text>
              </TouchableOpacity>

              {/* Instructions */}
              <View style={styles.instructionsBox}>
                <Ionicons name="information-circle-outline" size={20} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.instructionsTitle}>Instructions</Text>
                  {[
                    'Vérifiez votre boîte de réception',
                    'Regardez aussi dans les spams',
                    'Le code est valide 5 minutes',
                    'Saisissez les 6 chiffres reçus',
                  ].map((item, i) => (
                    <Text key={i} style={styles.instructionsItem}>
                      · {item}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU ÉTAPE SUCCÈS
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentStep === 'success') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View
          style={[
            styles.successWrapper,
            { opacity: fadeAnim, transform: [{ scale: fadeAnim }] },
          ]}
        >
          <LinearGradient
            colors={[PRIMARY, '#26897A', '#1D6E62']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successHero}
          >
            <View style={styles.heroBubble1} />
            <View style={styles.heroBubble2} />
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconGrad}
            >
              <Ionicons name="checkmark-circle" size={60} color="#fff" />
            </LinearGradient>
            <Text style={styles.successHeroTitle}>Félicitations !</Text>
            <Text style={styles.successHeroSub}>Compte créé avec succès</Text>
          </LinearGradient>

          <View style={styles.successCard}>
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>Bienvenue {formData.name} !</Text>
              <Text style={styles.welcomeText}>
                Un email de bienvenue a été envoyé à{'\n'}
                <Text style={styles.welcomeEmail}>{formData.email}</Text>
              </Text>
            </View>

            <View style={styles.checklist}>
              {[
                'Email vérifié',
                'Compte activé',
                'Connexion automatique',
              ].map((item, i) => (
                <View key={i} style={styles.checklistItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.checklistText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => navigation.replace('MainTabs')}
              style={styles.continueBtnWrapper}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[PRIMARY, '#26897A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>Continuer vers l'app</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.autoRedirect}>
              Redirection automatique dans quelques secondes…
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU ÉTAPE FORMULAIRE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* ── HERO ── */}
          <LinearGradient
            colors={[PRIMARY, '#26897A', '#1D6E62']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBubble1} />
            <View style={styles.heroBubble2} />

            {/* Bannière hors ligne */}
            {!isConnected && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
                <Text style={styles.offlineBannerText}>Hors ligne</Text>
              </View>
            )}

            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/brand/logo-horizontal.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Créer un compte</Text>
            <Text style={styles.heroSubtitle}>Rejoignez Ihambaobab aujourd'hui</Text>
          </LinearGradient>

          {/* ── FORM CARD ── */}
          <View style={styles.card}>
            {/* Erreurs globales */}
            {globalErrors.length > 0 && (
              <View style={styles.globalErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#E53E3E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  {globalErrors.map((err, i) => (
                    <Text key={i} style={styles.globalErrorText}>
                      {err}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Nom complet */}
            <Field
              label="Nom complet"
              required
              icon="person-outline"
              value={formData.name}
              onChangeText={(v) => updateFormData('name', v)}
              placeholder="John Doe"
              autoCapitalize="words"
              error={fieldErrors.name}
            />

            {/* Email */}
            <Field
              label="Adresse email"
              required
              icon="mail-outline"
              value={formData.email}
              onChangeText={(v) => updateFormData('email', v)}
              placeholder="vous@exemple.com"
              keyboardType="email-address"
              error={fieldErrors.email}
              helpText="Un code de vérification sera envoyé à cette adresse"
            />

            {/* Téléphone */}
            <View style={fieldStyles.block}>
              <Text style={fieldStyles.label}>Numéro de téléphone (optionnel)</Text>
              <View
                style={[
                  fieldStyles.row,
                  fieldErrors.phoneNumber && fieldStyles.rowError,
                ]}
              >
                <TouchableOpacity
                  style={styles.flagBtn}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.flagText}>{getCountryFlag(formData.countryCode)}</Text>
                  <Text style={styles.dialCode}>{formData.countryCode}</Text>
                  <Ionicons name="chevron-down" size={14} color="#718096" />
                </TouchableOpacity>
                <View style={styles.phoneSep} />
                <TextInput
                  style={[fieldStyles.input, { paddingLeft: 10 }]}
                  value={formData.phoneNumber}
                  onChangeText={(v) => updateFormData('phoneNumber', v.replace(/\D/g, ''))}
                  placeholder="Numéro sans indicatif"
                  placeholderTextColor="#CBD5E0"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
              {fieldErrors.phoneNumber ? (
                <Text style={fieldStyles.error}>{fieldErrors.phoneNumber}</Text>
              ) : null}
            </View>

            {/* WhatsApp checkbox */}
            {formData.phoneNumber.length > 0 && (
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => updateFormData('whatsapp', !formData.whatsapp)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={formData.whatsapp ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={PRIMARY}
                />
                <Text style={styles.checkLabel}>
                  Ce numéro est également mon WhatsApp
                </Text>
              </TouchableOpacity>
            )}

            {/* Mot de passe */}
            <Field
              label="Mot de passe"
              required
              icon="lock-closed-outline"
              value={formData.password}
              onChangeText={(v) => updateFormData('password', v)}
              placeholder="Votre mot de passe"
              showToggle
              showValue={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              error={fieldErrors.password}
              helpText="Min. 8 car. · Majuscule · Minuscule · Chiffre · Caractère spécial"
            />

            {/* Confirmer mot de passe */}
            <Field
              label="Confirmer le mot de passe"
              required
              icon="lock-closed-outline"
              value={formData.passwordConf}
              onChangeText={(v) => updateFormData('passwordConf', v)}
              placeholder="Confirmez votre mot de passe"
              showToggle
              showValue={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              error={fieldErrors.passwordConf}
            />

            {/* Info OTP */}
            <View style={styles.infoBox}>
              <Ionicons name="mail-outline" size={20} color={PRIMARY} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoTitle}>Vérification par email</Text>
                <Text style={styles.infoText}>
                  Un code sera envoyé à votre adresse pour confirmer votre identité.
                </Text>
              </View>
            </View>

            {/* CGU */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => updateFormData('acceptTerms', !formData.acceptTerms)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={formData.acceptTerms ? 'checkbox' : 'square-outline'}
                size={20}
                color={PRIMARY}
              />
              <Text style={styles.termsText}>
                J'accepte les{' '}
                <Text style={styles.termsLink}>conditions d'utilisation</Text>
                {' '}et la{' '}
                <Text style={styles.termsLink}>politique de confidentialité</Text>
              </Text>
            </TouchableOpacity>

            {/* ── Bouton S'inscrire ── */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={!isConnected || loading}
              activeOpacity={0.88}
              style={[styles.primaryBtnWrapper, { marginTop: 8 }]}
            >
              <LinearGradient
                colors={[PRIMARY, '#26897A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>S'inscrire</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Lien connexion */}
            <View style={styles.loginRow}>
              <Text style={styles.loginRowText}>Déjà un compte ? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('QuickAuth')}
                activeOpacity={0.7}
              >
                <Text style={styles.loginRowLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Modal CountryCodePicker */}
        <CountryCodePicker
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
          selectedCode={formData.countryCode}
          onSelectCode={(code) => {
            updateFormData('countryCode', code);
            setShowCountryPicker(false);
          }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY,
  },

  /* ── HERO ── */
  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  heroBubble1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -50,
  },
  heroBubble2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 10,
    left: -30,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231,76,60,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
    gap: 6,
  },
  offlineBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  logoWrapper: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: { width: 180, height: 46 },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
  },

  /* ── FORM CARD ── */
  formScroll: { flexGrow: 1, paddingBottom: 40, backgroundColor: '#F7FAFC' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },

  /* ── ERREURS GLOBALES ── */
  globalErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#FC8181',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  globalErrorText: { fontSize: 13, color: '#E53E3E', lineHeight: 20 },

  /* ── PHONE ── */
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  flagText: { fontSize: 20 },
  dialCode: { fontSize: 13, fontWeight: '600', color: '#4A5568' },
  phoneSep: { width: 1, height: 24, backgroundColor: '#E2E8F0', marginRight: 8 },

  /* ── CHECKBOX ── */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    marginTop: -4,
  },
  checkLabel: { fontSize: 13, color: '#4A5568', flex: 1 },

  /* ── INFO BOX ── */
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FAF8',
    borderWidth: 1.5,
    borderColor: '#9AE6D5',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1D6E62', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#2D7A6E', lineHeight: 18 },

  /* ── CGU ── */
  termsText: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 20 },
  termsLink: { color: PRIMARY, fontWeight: '600' },

  /* ── BOUTON PRINCIPAL ── */
  primaryBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 20,
  },
  primaryBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },

  /* ── LIEN CONNEXION ── */
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginRowText: { fontSize: 14, color: '#718096' },
  loginRowLink: { fontSize: 14, fontWeight: '700', color: PRIMARY },

  /* ── OTP HERO ── */
  otpScroll: { flexGrow: 1, paddingBottom: 40, backgroundColor: '#F7FAFC' },
  otpHero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 52,
    overflow: 'hidden',
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  otpHeroTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  otpHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 6 },
  otpHeroEmail: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 4 },

  /* ── OTP CARD ── */
  otpCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  otpInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
  },
  otpBoxFilled: {
    borderColor: PRIMARY,
    backgroundColor: '#F0FAF8',
    borderWidth: 2.5,
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  timerRow: { alignItems: 'center', marginBottom: 16 },
  timerText: { fontSize: 13, color: '#718096' },
  timerValue: { fontWeight: 'bold', color: PRIMARY },
  timerExpired: { fontSize: 13, color: '#E53E3E', fontWeight: '600' },
  cooldownBox: {
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  cooldownLabel: { fontSize: 11, color: '#A0AEC0', marginBottom: 2 },
  cooldownValue: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 16,
  },
  resendBtnDisabled: { opacity: 0.45 },
  resendBtnText: { fontSize: 14, fontWeight: '600', color: PRIMARY },
  resendBtnTextDisabled: { color: '#A0AEC0' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 14, color: '#718096' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 20,
  },
  backBtnText: { fontSize: 14, color: '#4A5568' },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FAF8',
    borderWidth: 1.5,
    borderColor: '#9AE6D5',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  instructionsTitle: { fontSize: 13, fontWeight: '700', color: '#1D6E62', marginBottom: 6 },
  instructionsItem: { fontSize: 12, color: '#2D7A6E', marginTop: 3 },

  /* ── SUCCESS ── */
  successWrapper: { flex: 1, backgroundColor: PRIMARY },
  successHero: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 60,
    overflow: 'hidden',
  },
  successIconGrad: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successHeroTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  successHeroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', marginTop: 6 },
  successCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 30,
    flex: 1,
  },
  welcomeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  welcomeTitle: { fontSize: 16, fontWeight: 'bold', color: '#166534', marginBottom: 8 },
  welcomeText: { fontSize: 13, color: '#15803D', textAlign: 'center' },
  welcomeEmail: { fontWeight: '700' },
  checklist: { gap: 12, marginBottom: 32 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checklistText: { fontSize: 14, color: '#2D3748' },
  continueBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  continueBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  autoRedirect: { fontSize: 12, color: '#A0AEC0', textAlign: 'center' },
});
