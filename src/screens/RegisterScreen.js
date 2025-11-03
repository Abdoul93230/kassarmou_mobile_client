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

// Liste des indicatifs avec drapeaux
const COUNTRY_CODES = [
  { code: '+227', country: 'Niger', flag: '🇳🇪' },
  { code: '+229', country: 'Bénin', flag: '🇧🇯' },
  { code: '+226', country: 'Burkina Faso', flag: '🇧🇫' },
  { code: '+225', country: 'Côte d\'Ivoire', flag: '🇨🇮' },
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

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(state => state.auth);
  const { isConnected } = useNetworkStatus();

  // États pour les 3 étapes
  const [currentStep, setCurrentStep] = useState('form'); // 'form' | 'otp' | 'success'
  
  // Formulaire d'inscription
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

  // État OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errors, setErrors] = useState([]);

  const otpRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animation d'entrée
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
  }, [currentStep]);

  // Timer OTP
  useEffect(() => {
    if (currentStep === 'otp' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, timeLeft]);

  // Afficher les erreurs Redux
  useEffect(() => {
    if (error) {
      console.error('❌ ERREUR REDUX:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error,
        position: 'top',
        visibilityTime: 4000,
      });
      dispatch(clearError());
    }
  }, [error]);

  // Redirection après authentification
  useEffect(() => {
    if (isAuthenticated && currentStep === 'success') {
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 3000);
    }
  }, [isAuthenticated, currentStep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Validation Email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation mot de passe
  const validatePassword = (password) => {
    const minLength = 8;
    const regexUpperCase = /[A-Z]/;
    const regexLowerCase = /[a-z]/;
    const regexNumber = /[0-9]/;
    const regexSpecialChar = /[!@#$%^&*(),.?":{}|<>]/;

    const errors = [];

    if (!password || password.length < minLength) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (!regexUpperCase.test(password)) {
      errors.push('Au moins une lettre majuscule requise.');
    }
    if (!regexLowerCase.test(password)) {
      errors.push('Au moins une lettre minuscule requise.');
    }
    if (!regexNumber.test(password)) {
      errors.push('Au moins un chiffre requis.');
    }
    if (!regexSpecialChar.test(password)) {
      errors.push('Au moins un caractère spécial requis.');
    }

    return errors;
  };

  // Validation formulaire
  const validateForm = () => {
    const newErrors = [];
    const { name, email, phoneNumber, password, passwordConf, acceptTerms } = formData;

    // Nom
    if (!name.trim() || name.length < 3) {
      newErrors.push('Le nom doit contenir au moins 3 caractères.');
    }

    // Email obligatoire pour OTP
    if (!email) {
      newErrors.push("L'adresse email est obligatoire pour la vérification.");
    } else if (!validateEmail(email)) {
      newErrors.push('Adresse email invalide.');
    }

    // Téléphone (optionnel mais si renseigné, doit être valide)
    if (phoneNumber && phoneNumber.length < 8) {
      newErrors.push('Le numéro de téléphone doit contenir au moins 8 chiffres.');
    }

    // Mot de passe
    const passwordErrors = validatePassword(password);
    newErrors.push(...passwordErrors);

    // Confirmation mot de passe
    if (passwordConf !== password) {
      newErrors.push('Les mots de passe ne correspondent pas.');
    }

    // Conditions
    if (!acceptTerms) {
      newErrors.push('Vous devez accepter les conditions d\'utilisation.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ÉTAPE 1: Envoyer OTP
  const handleSendOtp = async () => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion',
        text2: 'Vérifiez votre connexion Internet',
        position: 'top',
      });
      return;
    }

    if (!validateForm()) {
      console.error('❌ Validation formulaire échouée:', errors);
      Toast.show({
        type: 'error',
        text1: 'Formulaire invalide',
        text2: errors[0] || 'Veuillez corriger les erreurs',
        position: 'top',
      });
      return;
    }

    try {
      console.log('📤 Envoi de la requête sendOtp...');
      const result = await dispatch(sendOtp({
        email: formData.email,
        name: formData.name,
      })).unwrap();

      console.log('✅ OTP envoyé avec succès:', result);
      Toast.show({
        type: 'success',
        text1: 'Code envoyé',
        text2: `Un code de vérification a été envoyé à ${formData.email}`,
        position: 'top',
      });

      setCurrentStep('otp');
      setTimeLeft(300);
      setCanResend(false);
    } catch (err) {
      const errorInfo = getUserFriendlyError(err);
      Toast.show({
        type: 'error',
        text1: errorInfo.title,
        text2: errorInfo.message,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  };

  // ÉTAPE 2: Vérifier OTP et créer compte
  const handleVerifyOtp = async (otpCode) => {
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion',
        text2: 'Vérifiez votre connexion Internet',
        position: 'top',
      });
      return;
    }

    try {
      // 1. Vérifier l'OTP
      const verifyResult = await dispatch(verifyOtp({
        email: formData.email,
        otp: otpCode,
      })).unwrap();

      setOtpToken(verifyResult.token);

      // 2. Créer l'utilisateur
      const phoneWithCode = formData.phoneNumber 
        ? `${formData.countryCode}${formData.phoneNumber}` 
        : null;

      await dispatch(registerWithOtp({
        name: formData.name,
        email: formData.email,
        phoneNumber: phoneWithCode,
        password: formData.password,
        whatsapp: formData.whatsapp,
        otpToken: verifyResult.token,
      })).unwrap();

      // 3. Connexion automatique
      await dispatch(login({
        email: formData.email,
        phoneNumber: phoneWithCode,
        password: formData.password,
      })).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Félicitations !',
        text2: 'Votre compte a été créé avec succès',
        position: 'top',
      });

      setCurrentStep('success');

    } catch (err) {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      
      const errorInfo = getUserFriendlyError(err);
      Toast.show({
        type: 'error',
        text1: errorInfo.title,
        text2: errorInfo.message,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  };

  // Renvoyer OTP
  const handleResendOtp = async () => {
    try {
      await dispatch(sendOtp({
        email: formData.email,
        name: formData.name,
      })).unwrap();

      setTimeLeft(300);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();

      Toast.show({
        type: 'success',
        text1: 'Code renvoyé',
        text2: 'Un nouveau code a été envoyé',
        position: 'top',
      });
    } catch (err) {
      const errorInfo = getUserFriendlyError(err);
      Toast.show({
        type: 'error',
        text1: errorInfo.title,
        text2: errorInfo.message,
        position: 'top',
        visibilityTime: 5000,
      });
    }
  };

  // Gestion OTP Input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus suivant
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-vérifier quand tous les champs sont remplis
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Fonction pour obtenir un message d'erreur convivial
  const getUserFriendlyError = (err) => {
    // Erreur 502 - Serveur qui redémarre
    if (err?.response?.status === 502 || err?.message?.includes('502')) {
      return {
        title: 'Serveur en cours de redémarrage',
        message: 'Le serveur se réveille, veuillez patienter quelques secondes...',
      };
    }
    
    // Erreur réseau
    if (err?.message?.includes('Network Error') || err?.message?.includes('timeout')) {
      return {
        title: 'Erreur de connexion',
        message: 'Vérifiez votre connexion Internet',
      };
    }
    
    // Autres erreurs
    return {
      title: 'Erreur',
      message: err?.message || err || 'Une erreur est survenue',
    };
  };

  // Trouver le drapeau correspondant à l'indicatif sélectionné
  const getCountryFlag = (code) => {
    const country = COUNTRY_CODES.find(c => c.code === code);
    return country ? country.flag : '🌍';
  };

  // ==================== RENDU DES 3 ÉTAPES ====================

  // ÉTAPE 2: Vérification OTP
  if (currentStep === 'otp') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            <View style={styles.otpContainer}>
              {/* Header avec animation */}
              <View style={styles.otpHeader}>
                <LinearGradient
                  colors={['#E0F2FE', '#BAE6FD']}
                  style={styles.shieldIcon}
                >
                  <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
                </LinearGradient>
                <Text style={styles.otpTitle}>Vérification de votre email</Text>
                <Text style={styles.otpSubtitle}>
                  Un code de vérification a été envoyé à
                </Text>
                <Text style={styles.emailText}>{formData.email}</Text>
              </View>

            {/* OTP Inputs */}
            <View style={styles.otpInputsContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              {!canResend ? (
                <Text style={styles.timerText}>
                  Code expire dans: <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                </Text>
              ) : (
                <Text style={styles.expiredText}>Vous n'avez pas reçu le code ?</Text>
              )}
            </View>

            {/* Bouton Renvoyer */}
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={!canResend || loading}
              style={[styles.resendButton, (!canResend || loading) && styles.resendButtonDisabled]}
            >
              <Ionicons 
                name="refresh" 
                size={16} 
                color={canResend && !loading ? COLORS.primary : COLORS.textLight} 
              />
              <Text style={[
                styles.resendText,
                (!canResend || loading) && styles.resendTextDisabled
              ]}>
                {loading ? 'Envoi en cours...' : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Vérification...</Text>
              </View>
            )}

            {/* Bouton retour */}
            <TouchableOpacity
              onPress={() => setCurrentStep('form')}
              disabled={loading}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.text} />
              <Text style={styles.backButtonText}>Modifier l'email</Text>
            </TouchableOpacity>

            {/* Instructions */}
            <View style={styles.instructionsBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsTitle}>Instructions:</Text>
                <Text style={styles.instructionsItem}>• Vérifiez votre boîte de réception</Text>
                <Text style={styles.instructionsItem}>• Regardez aussi dans les spams</Text>
                <Text style={styles.instructionsItem}>• Le code est valide pendant 5 minutes</Text>
                <Text style={styles.instructionsItem}>• Saisissez les 6 chiffres reçus</Text>
              </View>
              </View>
            </View>
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }  // ÉTAPE 3: Message de succès
  if (currentStep === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: fadeAnim }],
            },
          ]}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.successIconGradient}
              >
                <Ionicons name="checkmark-circle" size={80} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successTitle}>Félicitations ! 🎉</Text>
            <Text style={styles.successSubtitle}>Votre compte a été créé avec succès</Text>

          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeTitle}>Bienvenue {formData.name} !</Text>
            <Text style={styles.welcomeText}>
              Un email de bienvenue a été envoyé à{'\n'}
              <Text style={styles.welcomeEmail}>{formData.email}</Text>
            </Text>
          </View>

          <View style={styles.checklistContainer}>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.checklistText}>Email vérifié</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.checklistText}>Compte activé</Text>
            </View>
            <View style={styles.checklistItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.checklistText}>Connexion automatique</Text>
            </View>
          </View>

          <LoadingButton
            title="Continuer vers l'application"
            onPress={() => navigation.replace('MainTabs')}
            variant="primary"
            style={styles.continueButton}
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFF" />}
          />

          <Text style={styles.autoRedirectText}>
            Vous serez redirigé automatiquement dans quelques secondes...
          </Text>
        </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ÉTAPE 1: Formulaire d'inscription
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#FFF', '#F0FFF4']}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>K</Text>
                </LinearGradient>
              </View>
              <Text style={styles.title}>CRÉER UN COMPTE</Text>
              <Text style={styles.subtitle}>Rejoignez Kassarmoumarket aujourd'hui</Text>
            </View>
          </LinearGradient>

        {/* Indicateur hors ligne */}
        {!isConnected && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline" size={16} color="#FFF" />
            <Text style={styles.offlineText}>Pas de connexion Internet</Text>
          </View>
        )}

        {/* Affichage des erreurs */}
        {errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <View style={styles.errorsContent}>
              <Text style={styles.errorsTitle}>Veuillez corriger les erreurs :</Text>
              {errors.map((err, index) => (
                <Text key={index} style={styles.errorText}>• {err}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Nom complet */}
          <CustomInput
            label="Nom complet"
            required
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            icon="person"
            autoCapitalize="words"
          />

          {/* Email */}
          <CustomInput
            label="Adresse email"
            required
            placeholder="vous@exemple.com"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.helpText}>
            Un code de vérification sera envoyé à cette adresse
          </Text>

          {/* Téléphone avec indicatif */}
          <Text style={styles.label}>Numéro de téléphone (optionnel)</Text>
          <View style={styles.phoneContainer}>
            <TouchableOpacity
              style={styles.countryCodeButton}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryFlag}>{getCountryFlag(formData.countryCode)}</Text>
              <Text style={styles.countryCodeText}>{formData.countryCode}</Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.phoneInputContainer}>
              <Ionicons name="call" size={20} color={COLORS.textLight} style={styles.phoneIcon} />
              <TextInput
                style={styles.phoneInput}
                placeholder="Numéro sans indicatif"
                value={formData.phoneNumber}
                onChangeText={(value) => updateFormData('phoneNumber', value.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
          </View>

          {/* WhatsApp */}
          {formData.phoneNumber.length > 0 && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => updateFormData('whatsapp', !formData.whatsapp)}
            >
              <Ionicons
                name={formData.whatsapp ? 'checkbox' : 'square-outline'}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxLabel}>
                Ce numéro est également mon WhatsApp
              </Text>
            </TouchableOpacity>
          )}

          {/* Mot de passe */}
          <CustomInput
            label="Mot de passe"
            required
            placeholder="Votre mot de passe"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            icon="lock-closed"
            secureTextEntry={true}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
          <Text style={styles.helpText}>
            Minimum 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
          </Text>

          {/* Confirmer mot de passe */}
          <CustomInput
            label="Confirmer le mot de passe"
            required
            placeholder="Confirmez votre mot de passe"
            value={formData.passwordConf}
            onChangeText={(value) => updateFormData('passwordConf', value)}
            icon="lock-closed"
            secureTextEntry={true}
            showPassword={showConfirmPassword}
            onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          {/* Info OTP */}
          <View style={styles.infoBox}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Vérification par email</Text>
              <Text style={styles.infoText}>
                Un code de vérification sera envoyé à votre adresse email pour confirmer 
                votre identité avant la création de votre compte.
              </Text>
            </View>
          </View>

          {/* Conditions */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => updateFormData('acceptTerms', !formData.acceptTerms)}
          >
            <Ionicons
              name={formData.acceptTerms ? 'checkbox' : 'square-outline'}
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>conditions d'utilisation</Text>
              {' '}et la{' '}
              <Text style={styles.termsLink}>politique de confidentialité</Text>
            </Text>
          </TouchableOpacity>

          {/* Bouton Inscription */}
          <LoadingButton
            title="Continuer"
            onPress={handleSendOtp}
            loading={loading}
            disabled={!isConnected || loading}
            variant="primary"
            style={styles.submitButton}
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#FFF" />}
          />

          {/* Lien Connexion */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà membre ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Connectez-vous</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  animatedContainer: {
    // Removed flex: 1 to fix keyboard closing issue
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0F2FE',
    marginTop: 8,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  offlineText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  errorsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorsContent: {
    flex: 1,
    marginLeft: 12,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 4,
  },
  form: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: -8,
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  phoneIcon: {
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
  },
  checkboxLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
    height: 52,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Étape OTP
  otpContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  otpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
    borderWidth: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  timerValue: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  expiredText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: COLORS.textLight,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  instructionsContent: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  instructionsItem: {
    fontSize: 12,
    color: '#1E3A8A',
    marginTop: 4,
  },

  // Étape Succès
  successContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 20,
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  successIcon: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  welcomeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13,
    color: '#15803D',
    textAlign: 'center',
  },
  welcomeEmail: {
    fontWeight: '600',
  },
  checklistContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checklistText: {
    fontSize: 14,
    color: COLORS.text,
  },
  continueButton: {
    width: '100%',
    marginBottom: 16,
    height: 52,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  autoRedirectText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
