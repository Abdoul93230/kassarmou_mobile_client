import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import CountryCodePicker from '../components/CountryCodePicker';
import { login, clearError } from '../redux/authSlice';
import { COLORS } from '../config/constants';
import useNetworkStatus from '../hooks/useNetworkStatus';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  applyPhoneInputChange,
  getPhonePlaceholder,
  toBackendPhone,
  validatePhone,
} from '../utils/phoneRules';

const { width } = Dimensions.get('window');
const PRIMARY = '#30A08B';
const SECONDARY = '#B2905F';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(state => state.auth);
  const { isConnected } = useNetworkStatus();

  const [loginMethod, setLoginMethod] = useState('email'); // 'email' ou 'phone'
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    countryCode: '+227',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const getErrorMessage = (value) => {
    if (typeof value === 'string') return value;
    return value?.message || value?.error || 'Une erreur est survenue';
  };

  const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const selectedCountry =
    PHONE_COUNTRIES.find((entry) => entry.dialCode === formData.countryCode) ||
    DEFAULT_PHONE_COUNTRY;

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: getErrorMessage(error),
        position: 'top',
        visibilityTime: 4000,
      });
      dispatch(clearError());
    }
  }, [error]);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainTabs');
    }
  }, [isAuthenticated]);

  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === 'email') {
      if (!formData.email) {
        newErrors.email = "L'adresse email est requise";
      } else if (!regexMail.test(formData.email)) {
        newErrors.email = 'Adresse email invalide';
      }
    } else {
      const phoneValidation = validatePhone(selectedCountry, formData.phoneNumber, true);
      if (!phoneValidation.isValid) {
        newErrors.phoneNumber = phoneValidation.message;
      }
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion',
        text2: 'Veuillez vérifier votre connexion internet',
        position: 'top',
      });
      return;
    }

    if (!validateForm()) return;

    const loginData = {
      email: loginMethod === 'email' ? formData.email : null,
      phoneNumber:
        loginMethod === 'phone'
          ? toBackendPhone(selectedCountry, formData.phoneNumber)
          : null,
      password: formData.password,
    };

    try {
      const result = await dispatch(login(loginData)).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: `Bienvenue ${result.user?.name || ''}!`,
        position: 'top',
        visibilityTime: 2000,
      });

      setFormData({
        email: '',
        phoneNumber: '',
        countryCode: '+227',
        password: '',
      });
    } catch (err) {
      console.log('Erreur de connexion:', err);
    }
  };

  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setErrors({});
    setFormData({ ...formData, email: '', phoneNumber: '' });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO SECTION ── */}
        <LinearGradient
          colors={[PRIMARY, '#26897A', '#1D6E62']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Bannière hors ligne */}
          {!isConnected && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
              <Text style={styles.offlineBannerText}>Hors ligne</Text>
            </View>
          )}

          {/* Décorations cercles */}
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/brand/logo-horizontal.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.heroTitle}>Bienvenue</Text>
          <Text style={styles.heroSubtitle}>Connectez-vous pour continuer</Text>
        </LinearGradient>

        {/* ── FORM CARD ── */}
        <View style={styles.card}>
          {/* Onglets Email / Téléphone */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
              onPress={() => switchLoginMethod('email')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={17}
                color={loginMethod === 'email' ? '#fff' : PRIMARY}
              />
              <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, loginMethod === 'phone' && styles.tabActive]}
              onPress={() => switchLoginMethod('phone')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="call-outline"
                size={17}
                color={loginMethod === 'phone' ? '#fff' : PRIMARY}
              />
              <Text style={[styles.tabText, loginMethod === 'phone' && styles.tabTextActive]}>
                Téléphone
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Champ Email ou Téléphone ── */}
          {loginMethod === 'email' ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Adresse email</Text>
              <View
                style={[
                  styles.inputRow,
                  emailFocused && styles.inputRowFocused,
                  errors.email && styles.inputRowError,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailFocused ? PRIMARY : '#A0AEC0'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  placeholder="vous@exemple.com"
                  placeholderTextColor="#CBD5E0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
              {errors.email ? (
                <Text style={styles.fieldError}>{errors.email}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
              <View
                style={[
                  styles.inputRow,
                  phoneFocused && styles.inputRowFocused,
                  errors.phoneNumber && styles.inputRowError,
                ]}
              >
                <CountryCodePicker
                  value={formData.countryCode}
                  onSelect={(code) => {
                    const nextCountry =
                      PHONE_COUNTRIES.find((entry) => entry.dialCode === code) ||
                      DEFAULT_PHONE_COUNTRY;
                    const normalized = applyPhoneInputChange(
                      nextCountry,
                      formData.phoneNumber
                    );
                    setFormData({
                      ...formData,
                      countryCode: code,
                      phoneNumber: normalized.display,
                    });
                  }}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={formData.phoneNumber}
                  onChangeText={(text) => {
                    const next = applyPhoneInputChange(selectedCountry, text);
                    setFormData({ ...formData, phoneNumber: next.display });
                    if (errors.phoneNumber)
                      setErrors({ ...errors, phoneNumber: null });
                  }}
                  placeholder={getPhonePlaceholder(selectedCountry)}
                  placeholderTextColor="#CBD5E0"
                  keyboardType="phone-pad"
                  maxLength={
                    selectedCountry.nationalLength +
                    selectedCountry.groups.length -
                    1
                  }
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
              </View>
              {errors.phoneNumber ? (
                <Text style={styles.fieldError}>{errors.phoneNumber}</Text>
              ) : null}
            </View>
          )}

          {/* ── Champ Mot de passe ── */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Mot de passe</Text>
            <View
              style={[
                styles.inputRow,
                passwordFocused && styles.inputRowFocused,
                errors.password && styles.inputRowError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? PRIMARY : '#A0AEC0'}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => {
                  setFormData({ ...formData, password: text });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                placeholder="Votre mot de passe"
                placeholderTextColor="#CBD5E0"
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#A0AEC0"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.fieldError}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Mot de passe oublié */}
          <TouchableOpacity
            onPress={() => navigation.navigate('QuickAuth')}
            style={styles.forgotRow}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* ── Bouton Se connecter ── */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            style={styles.primaryBtnWrapper}
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
                <Text style={styles.primaryBtnText}>Se connecter</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Bouton Créer un compte ── */}
          <TouchableOpacity
            onPress={() => navigation.navigate('QuickAuth')}
            style={styles.outlineBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineBtnText}>Créer un compte</Text>
          </TouchableOpacity>

          {/* ── Continuer sans compte ── */}
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs')}
            style={styles.ghostRow}
            activeOpacity={0.7}
          >
            <Text style={styles.ghostText}>
              Continuer sans compte{' '}
              <Text style={styles.ghostLink}>→</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  /* ── HERO ── */
  hero: {
    alignItems: 'center',
    paddingTop: 40,
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
    marginBottom: 16,
    gap: 6,
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoWrapper: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 180,
    height: 46,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
  },

  /* ── CARD ── */
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },

  /* ── TABS ── */
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#EEF9F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY,
  },
  tabTextActive: {
    color: '#fff',
  },

  /* ── FIELDS ── */
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowFocused: {
    borderColor: PRIMARY,
    backgroundColor: '#F0FAF8',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputRowError: {
    borderColor: '#FC8181',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  fieldError: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 5,
    marginLeft: 2,
  },

  /* ── FORGOT ── */
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 22,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY,
  },

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },

  /* ── DIVIDER ── */
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDF2F7',
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#A0AEC0',
    fontWeight: '500',
  },

  /* ── BOUTON OUTLINE ── */
  outlineBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY,
  },

  /* ── GHOST ── */
  ghostRow: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  ghostText: {
    fontSize: 13,
    color: '#718096',
  },
  ghostLink: {
    color: PRIMARY,
    fontWeight: '700',
  },
});
