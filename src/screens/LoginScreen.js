import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import CustomInput from '../components/CustomInput';
import LoadingButton from '../components/LoadingButton';
import CountryCodePicker from '../components/CountryCodePicker';
import { login, clearError } from '../redux/authSlice';
import { COLORS } from '../config/constants';
import useNetworkStatus from '../hooks/useNetworkStatus';

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

  // Validation regex
  const regexMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const regexPhone = /^[0-9]{8,}$/;

  // Gérer l'affichage des erreurs du store Redux
  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: error,
        position: 'top',
        visibilityTime: 4000,
      });
      // Clear l'erreur après affichage
      dispatch(clearError());
    }
  }, [error]);

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainTabs');
    }
  }, [isAuthenticated]);

  const validateForm = () => {
    const newErrors = {};

    if (loginMethod === 'email') {
      if (!formData.email) {
        newErrors.email = 'L\'adresse email est requise';
      } else if (!regexMail.test(formData.email)) {
        newErrors.email = 'Adresse email invalide';
      }
    } else {
      if (!formData.phoneNumber) {
        newErrors.phoneNumber = 'Le numéro de téléphone est requis';
      } else if (!regexPhone.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Numéro de téléphone invalide (min 8 chiffres)';
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
    // Vérifier la connexion internet
    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'Pas de connexion',
        text2: 'Veuillez vérifier votre connexion internet',
        position: 'top',
      });
      return;
    }

    // Valider le formulaire
    if (!validateForm()) {
      return;
    }

    const loginData = {
      email: loginMethod === 'email' ? formData.email : null,
      phoneNumber:
        loginMethod === 'phone'
          ? `${formData.countryCode}${formData.phoneNumber}`
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

      // Réinitialiser le formulaire
      setFormData({
        email: '',
        phoneNumber: '',
        countryCode: '+227',
        password: '',
      });
      
      // La navigation sera gérée par useEffect
    } catch (err) {
      // L'erreur sera affichée par le useEffect qui surveille error
      console.log('Erreur de connexion:', err);
    }
  };

  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setErrors({});
    // Réinitialiser les champs
    setFormData({
      ...formData,
      email: '',
      phoneNumber: '',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* Indicateur de connexion */}
        {!isConnected && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color={COLORS.white} />
            <Text style={styles.offlineText}>Hors ligne</Text>
          </View>
        )}

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>KASSARMOU</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
        </View>

        {/* Méthode de connexion */}
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === 'email' && styles.methodButtonActive,
            ]}
            onPress={() => switchLoginMethod('email')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={loginMethod === 'email' ? COLORS.white : COLORS.primary}
            />
            <Text
              style={[
                styles.methodText,
                loginMethod === 'email' && styles.methodTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === 'phone' && styles.methodButtonActive,
            ]}
            onPress={() => switchLoginMethod('phone')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={loginMethod === 'phone' ? COLORS.white : COLORS.primary}
            />
            <Text
              style={[
                styles.methodText,
                loginMethod === 'phone' && styles.methodTextActive,
              ]}
            >
              Téléphone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          {loginMethod === 'email' ? (
            <CustomInput
              label="Adresse email"
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              placeholder="vous@exemple.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              required
            />
          ) : (
            <View>
              <Text style={styles.label}>
                Numéro de téléphone <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneContainer}>
                <CountryCodePicker
                  value={formData.countryCode}
                  onSelect={(code) =>
                    setFormData({ ...formData, countryCode: code })
                  }
                />
                <View style={styles.phoneInputContainer}>
                  <CustomInput
                    value={formData.phoneNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/\D/g, '');
                      setFormData({ ...formData, phoneNumber: cleaned });
                      if (errors.phoneNumber)
                        setErrors({ ...errors, phoneNumber: null });
                    }}
                    placeholder="Numéro sans indicatif"
                    keyboardType="phone-pad"
                    error={errors.phoneNumber}
                  />
                </View>
              </View>
            </View>
          )}

          <CustomInput
            label="Mot de passe"
            value={formData.password}
            onChangeText={(text) => {
              setFormData({ ...formData, password: text });
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            placeholder="Votre mot de passe"
            icon="lock-closed-outline"
            secureTextEntry
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            error={errors.password}
            required
          />

          {/* Mot de passe oublié */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          {/* Bouton de connexion */}
          <LoadingButton
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {/* Séparateur */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continuer sans compte */}
          <LoadingButton
            title="Continuer sans compte"
            onPress={() => navigation.navigate('Home')}
            variant="outline"
            style={styles.guestButton}
          />

          {/* Lien d'inscription */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Pas encore membre ? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
              <Text style={styles.signupLink}>Inscrivez-vous</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: 'center',
  },
  offlineText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  methodContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  methodTextActive: {
    color: COLORS.white,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  required: {
    color: '#FF6B6B',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phoneInputContainer: {
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  guestButton: {
    marginBottom: 20,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  signupLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
