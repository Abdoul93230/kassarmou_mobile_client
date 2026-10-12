import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  Switch,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/authSlice';
import { fetchUserLikes } from '../redux/likesSlice';
import useNetworkStatus from '../hooks/useNetworkStatus';
import LoadingButton from '../components/LoadingButton';
import CountryCodePicker from '../components/CountryCodePicker';
import { COLORS } from '../config/constants';
import Toast from 'react-native-toast-message';
import apiClient from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import ImageEditorModal from '../components/ImageEditorModal';

// Liste des indicatifs pays
const countryCodes = [
  { code: "+227", country: "Niger", flag: "🇳🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+1", country: "États-Unis", flag: "🇺🇸" },
  { code: "+221", country: "Sénégal", flag: "🇸🇳" },
  { code: "+225", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+229", country: "Bénin", flag: "🇧🇯" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
];

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { likedProducts } = useSelector(state => state.likes);
  const { isConnected } = useNetworkStatus();

  // États
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Données utilisateur
  const [userData, setUserData] = useState({
    nom: '',
    email: '',
    photo: null,
  });
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0]);
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);

  // Fonction pour séparer le numéro de téléphone complet
  const parsePhoneNumber = (fullPhoneNumber) => {
    if (!fullPhoneNumber) {
      return { countryCode: countryCodes[0], phoneOnly: '' };
    }

    // Rechercher l'indicatif correspondant
    const foundCountry = countryCodes.find(country =>
      fullPhoneNumber.startsWith(country.code)
    );

    if (foundCountry) {
      const phoneOnly = fullPhoneNumber.substring(foundCountry.code.length);
      return { countryCode: foundCountry, phoneOnly };
    }

    // Si aucun indicatif trouvé, utiliser le premier par défaut
    return { countryCode: countryCodes[0], phoneOnly: fullPhoneNumber };
  };

  // Fonction pour construire le numéro complet
  const buildFullPhoneNumber = () => {
    return phoneNumberOnly.trim()
      ? `${selectedCountryCode.code}${phoneNumberOnly.trim()}`
      : '';
  };

  // Chargement des données utilisateur
  const fetchUserData = useCallback(async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Utiliser EXACTEMENT les mêmes endpoints que la version web
      const [userResponse, profileResponse] = await Promise.all([
        apiClient.get('https://ihambackend.onrender.com/user', {
          params: { id: user.id },
        }),
        apiClient.get('https://ihambackend.onrender.com/getUserProfile', {
          params: { id: user.id },
        }).catch(error => {
          // Si le profil n'existe pas (404), ce n'est pas une erreur
          if (error.response?.status === 404) {
            return { data: { data: null } };
          }
          throw error;
        })
      ]);

      if (!userResponse.data.user) {
        throw new Error('Données utilisateur non trouvées');
      }

      // Initialiser avec les données utilisateur
      setUserData({
        nom: userResponse.data.user.name || '',
        email: userResponse.data.user.email || '',
        photo: null,
      });

      // Traiter les données du profil si elles existent
      const profileData = profileResponse.data?.data;

      if (profileData) {
        const fullPhoneNumber = profileData?.numero || userResponse.data.user.phoneNumber || '';
        const { countryCode, phoneOnly } = parsePhoneNumber(fullPhoneNumber);

        setSelectedCountryCode(countryCode);
        setPhoneNumberOnly(phoneOnly);

        setUserData(prev => ({
          ...prev,
          photo: profileData?.image &&
                 profileData.image !== "https://chagona.onrender.com/images/image-1688253105925-0.jpeg"
            ? profileData.image
            : null,
        }));

        setWhatsapp(profileData?.whatsapp !== false);
      }

      Toast.show({
        type: 'success',
        text1: 'Profil chargé',
      });
    } catch (error) {
      console.error('Erreur chargement profil:', error);

      // Si l'erreur est 401, interceptor gère la déconnexion/navigation
      if (error.response?.status === 401) {
        setLoading(false);
        return;
      }

      let errorMessage = 'Impossible de charger le profil';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Le serveur met trop de temps à répondre';
      } else if (error.request) {
        errorMessage = 'Aucune réponse du serveur';
      }

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger le nombre de commandes
  const fetchOrdersCount = useCallback(async () => {
    if (!user || !user.id) return;

    try {
      const response = await apiClient.get(`/getCommandesByClefUser/${user.id}`);

      if (response.data?.commandes) {
        setOrdersCount(response.data.commandes.length);
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      if (error.response?.status === 401) return;
    }
  }, [user]);


  useEffect(() => {
    fetchUserData();
    fetchOrdersCount();

  }, [fetchUserData, fetchOrdersCount,]);

  // Recharger les données quand on revient sur cet écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
      fetchOrdersCount();
    });

    return unsubscribe;
  }, [navigation, fetchUserData, fetchOrdersCount]);

  // Validation du formulaire
  const validateForm = () => {
    if (userData.nom.trim().length < 3) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Le nom doit contenir au moins 3 caractères',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Email invalide',
      });
      return false;
    }

    const fullPhoneNumber = buildFullPhoneNumber();
    if (!fullPhoneNumber || phoneNumberOnly.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Numéro invalide (min 8 chiffres)',
      });
      return false;
    }

    return true;
  };

  // Sauvegarde du profil - Utiliser EXACTEMENT le même endpoint que la version web
  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const fullPhoneNumber = buildFullPhoneNumber();
      const formData = new FormData();
      formData.append('name', userData.nom);
      formData.append('email', userData.email);
      formData.append('phone', fullPhoneNumber);
      formData.append('whatsapp', whatsapp);
      formData.append('id', user.id);

      // Utiliser EXACTEMENT le même endpoint que la version web
      await apiClient.post('https://ihambackend.onrender.com/createProfile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Profil mis à jour',
      });

      setIsEditing(false);
      await fetchUserData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);

      let errorMessage = 'Impossible de sauvegarder';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sélection et upload de photo
  const handleSelectPhoto = async () => {
    try {
      Alert.alert(
        'Photo de profil',
        'Choisissez une option',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Prendre une photo',
            onPress: () => handleTakePhoto(),
          },
          {
            text: 'Choisir dans la galerie',
            onPress: () => handlePickFromGallery(),
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error selecting photo option:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Une erreur est survenue',
      });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de prendre une photo',
      });
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder aux photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de sélectionner la photo',
      });
    }
  };

  const handleSaveEditedImage = async (editedUri) => {
    setShowImageEditor(false);
    setSelectedImageUri(null);
    await uploadPhoto(editedUri);
  };

  const handleCancelImageEditing = () => {
    setShowImageEditor(false);
    setSelectedImageUri(null);
  };

  const uploadPhoto = async (imageUri) => {
    setIsSubmitting(true);
    try {
      const fullPhoneNumber = buildFullPhoneNumber();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('name', userData.nom);
      formData.append('email', userData.email);
      formData.append('phone', fullPhoneNumber);
      formData.append('whatsapp', whatsapp);
      formData.append('id', user.id);

      // Utiliser EXACTEMENT le même endpoint que la version web
      await apiClient.post('https://ihambackend.onrender.com/createProfile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Photo mise à jour',
      });

      await fetchUserData();
    } catch (error) {
      console.error('Erreur upload:', error);

      let errorMessage = 'Impossible de télécharger la photo';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await dispatch(logoutUser()).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Déconnexion réussie',
                text2: 'À bientôt !',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Impossible de se déconnecter',
              });
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // ─── Définition des sections du menu ────────────────────────────────────────

  const menuSections = [
    {
      title: 'Mon compte',
      items: [
        {
          icon: 'person',
          iconColor: '#30A08B',
          iconBg: 'rgba(48, 160, 139, 0.12)',
          title: 'Informations personnelles',
          subtitle: 'Modifier votre profil',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'bag-handle',
          iconColor: '#B2905F',
          iconBg: 'rgba(178, 144, 95, 0.12)',
          title: 'Mes commandes',
          subtitle: `${ordersCount} commande${ordersCount !== 1 ? 's' : ''}`,
          onPress: () => navigation.navigate('Orders'),
          badge: ordersCount > 0 ? ordersCount : null,
        },
        {
          icon: 'heart',
          iconColor: '#E74C3C',
          iconBg: 'rgba(231, 76, 60, 0.10)',
          title: 'Mes favoris',
          subtitle: `${likedProducts.length} produit${likedProducts.length !== 1 ? 's' : ''} sauvegardé${likedProducts.length !== 1 ? 's' : ''}`,
          onPress: () => navigation.navigate('MainTabs', { screen: 'Favorites' }),
          badge: likedProducts.length > 0 ? likedProducts.length : null,
        },
        {
          icon: 'location',
          iconColor: '#8E6BBF',
          iconBg: 'rgba(142, 107, 191, 0.12)',
          title: 'Mes adresses',
          subtitle: 'Gérer vos adresses de livraison',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'leaf',
          iconColor: '#30A08B',
          iconBg: 'rgba(48, 160, 139, 0.12)',
          title: 'Baobab Points',
          subtitle: 'Mes points de fidélité',
          onPress: () => navigation.navigate('Wallet'),
        },
      ],
    },
    {
      title: 'Communauté',
      items: [
        {
          icon: 'people',
          iconColor: '#F39C12',
          iconBg: 'rgba(243, 156, 18, 0.12)',
          title: 'Inviter un ami',
          subtitle: 'Partagez Ihambaobab',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Informations',
      items: [
        {
          icon: 'help-circle',
          iconColor: '#30A08B',
          iconBg: 'rgba(48, 160, 139, 0.12)',
          title: 'FAQ & Aide',
          subtitle: 'Questions fréquentes et support',
          onPress: () => navigation.navigate('Faq'),
        },
        {
          icon: 'settings',
          iconColor: '#718096',
          iconBg: 'rgba(113, 128, 150, 0.12)',
          title: 'Paramètres',
          subtitle: 'Notifications, langue, thème',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'shield-checkmark',
          iconColor: '#2980B9',
          iconBg: 'rgba(41, 128, 185, 0.12)',
          title: 'Confidentialité',
          subtitle: 'Politique de confidentialité',
          onPress: () => navigation.navigate('Faq'),
        },
      ],
    },
  ];

  // ─── Rendu des initiales de l'avatar ────────────────────────────────────────
  const getInitials = () => {
    const name = userData.nom || user?.name || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase() || 'U';
  };

  // ─── RENDU PRINCIPAL ─────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      {!user && <View style={styles.statusBarBackground} />}
      <SafeAreaView style={styles.container} edges={['bottom']}>

        {/* ── CAS 1 : Non connecté ── */}
        {!user ? (
          <ScrollView
            style={styles.guestScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.guestScrollContent}
          >
            {/* Hero gradient */}
            <LinearGradient
              colors={['#30A08B', '#2D9175', '#1E6B5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.guestHero}
            >
              {/* Cercles décoratifs */}
              <View style={styles.guestDecorCircle1} />
              <View style={styles.guestDecorCircle2} />

              <View style={styles.guestAvatarRing}>
                <View style={styles.guestAvatarInner}>
                  <Ionicons name="person" size={52} color="#30A08B" />
                </View>
              </View>
              <Text style={styles.guestHeroTitle}>Bienvenue sur{'\n'}Ihambaobab</Text>
              <Text style={styles.guestHeroSubtitle}>
                Connectez-vous pour profiter de{'\n'}toute l'expérience shopping
              </Text>
            </LinearGradient>

            {/* Boutons d'authentification */}
            <View style={styles.guestActions}>
              <TouchableOpacity
                style={styles.guestLoginBtn}
                onPress={() => navigation.navigate('QuickAuth', {
                  pendingAction: 'open-profile',
                  returnScreen: 'MainTabs',
                  returnParams: { screen: 'Profile' },
                })}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#30A08B', '#26805F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.guestLoginGradient}
                >
                  <Ionicons name="log-in-outline" size={22} color="#fff" />
                  <Text style={styles.guestLoginText}>Se connecter</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestRegisterBtn}
                onPress={() => navigation.navigate('QuickAuth', {
                  pendingAction: 'open-profile',
                  returnScreen: 'MainTabs',
                  returnParams: { screen: 'Profile' },
                })}
                activeOpacity={0.85}
              >
                <Text style={styles.guestRegisterText}>Créer un compte</Text>
              </TouchableOpacity>
            </View>

            {/* Avantages */}
            <View style={styles.guestBenefitsCard}>
              <Text style={styles.guestBenefitsTitle}>Vos avantages membres</Text>
              {[
                { icon: 'cube-outline', text: 'Suivez vos commandes en temps réel' },
                { icon: 'heart-outline', text: 'Sauvegardez vos produits favoris' },
                { icon: 'receipt-outline', text: 'Accédez à l\'historique de vos achats' },
                { icon: 'location-outline', text: 'Gérez vos adresses de livraison' },
                { icon: 'gift-outline', text: 'Accédez aux offres exclusives membres' },
              ].map((benefit, i) => (
                <View key={i} style={styles.guestBenefitRow}>
                  <View style={styles.guestBenefitIconWrap}>
                    <Ionicons name={benefit.icon} size={18} color="#30A08B" />
                  </View>
                  <Text style={styles.guestBenefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            {/* Footer version */}
            <View style={styles.footer}>
              <Text style={styles.footerVersion}>Version 1.0.0</Text>
              <Text style={styles.footerCopy}>© 2025 Ihambaobab</Text>
            </View>
          </ScrollView>

        ) : loading ? (
          /* ── CAS 2 : Chargement ── */
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Chargement du profil...</Text>
          </View>

        ) : (
          /* ── CAS 3 : Connecté ── */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* ── HERO HEADER ── */}
            <LinearGradient
              colors={['#30A08B', '#2D9175', '#1E6B5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroHeader}
            >
              {/* Cercles décoratifs arrière-plan */}
              <View style={styles.heroDecorCircle1} />
              <View style={styles.heroDecorCircle2} />

              {/* Indicateur hors ligne */}
              {!isConnected && (
                <View style={styles.offlinePill}>
                  <Ionicons name="cloud-offline" size={13} color="#fff" />
                  <Text style={styles.offlinePillText}>Hors ligne</Text>
                </View>
              )}

              {/* Badge "Connecté" */}
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedBadgeText}>Connecté</Text>
              </View>

              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarRing}>
                  {userData.photo ? (
                    <Image
                      source={{ uri: userData.photo }}
                      style={styles.avatarImage}
                      defaultSource={require('../../assets/icon.png')}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#B2905F', '#8C6A3F']}
                      style={styles.avatarInitialsBg}
                    >
                      <Text style={styles.avatarInitials}>{getInitials()}</Text>
                    </LinearGradient>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={handleSelectPhoto}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={15} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Nom & email */}
              <Text style={styles.heroName}>
                {userData.nom || user?.name || 'Utilisateur'}
              </Text>
              <Text style={styles.heroEmail}>
                {userData.email || user?.email || ''}
              </Text>

              {/* Numéro whatsapp si présent */}
              {phoneNumberOnly ? (
                <View style={styles.heroPhonenRow}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroPhoneText}>
                    {selectedCountryCode.code} {phoneNumberOnly}
                  </Text>
                  {whatsapp && (
                    <Ionicons name="logo-whatsapp" size={15} color="#25D366" style={{ marginLeft: 6 }} />
                  )}
                </View>
              ) : null}

              {/* ── STATS ROW ── */}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statNum}>{ordersCount}</Text>
                  <Text style={styles.statLbl}>Commandes</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statCell}>
                  <Text style={styles.statNum}>{likedProducts.length}</Text>
                  <Text style={styles.statLbl}>Favoris</Text>
                </View>
                <View style={styles.statSep} />
                <View style={styles.statCell}>
                  <Text style={styles.statNum}>0</Text>
                  <Text style={styles.statLbl}>Points</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── SECTIONS MENU ── */}
            {menuSections.map((section, sIdx) => (
              <View key={sIdx} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.sectionCard}>
                  {section.items.map((item, iIdx) => (
                    <React.Fragment key={iIdx}>
                      <TouchableOpacity
                        style={styles.menuRow}
                        onPress={item.onPress}
                        activeOpacity={0.7}
                      >
                        {/* Icône colorée */}
                        <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
                          <Ionicons name={item.icon} size={20} color={item.iconColor} />
                        </View>

                        {/* Texte */}
                        <View style={styles.menuTextBlock}>
                          <Text style={styles.menuRowTitle}>{item.title}</Text>
                          <Text style={styles.menuRowSub}>{item.subtitle}</Text>
                        </View>

                        {/* Badge optionnel */}
                        {item.badge ? (
                          <View style={styles.badgePill}>
                            <Text style={styles.badgePillText}>{item.badge}</Text>
                          </View>
                        ) : null}

                        <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                      </TouchableOpacity>

                      {/* Séparateur (sauf dernier) */}
                      {iIdx < section.items.length - 1 && (
                        <View style={styles.rowDivider} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            ))}

            {/* ── SECTION COMPTE : DÉCONNEXION ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compte</Text>
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.logoutRow}
                  onPress={handleLogout}
                  disabled={loggingOut}
                  activeOpacity={0.7}
                >
                  <View style={styles.logoutIconBox}>
                    {loggingOut ? (
                      <ActivityIndicator size="small" color="#E74C3C" />
                    ) : (
                      <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
                    )}
                  </View>
                  <View style={styles.menuTextBlock}>
                    <Text style={styles.logoutTitle}>
                      {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                    </Text>
                    <Text style={styles.logoutSub}>Fermer votre session</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E0" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── FOOTER ── */}
            <View style={styles.footer}>
              <View style={styles.footerLogoRow}>
                <View style={styles.footerLogoDot} />
                <Text style={styles.footerBrand}>Ihambaobab</Text>
              </View>
              <Text style={styles.footerVersion}>Version 1.0.0</Text>
              <Text style={styles.footerCopy}>© 2025 Ihambaobab. Tous droits réservés.</Text>
            </View>

          </ScrollView>
        )}

        {/* ── Image Editor Modal ── */}
        <ImageEditorModal
          visible={showImageEditor}
          imageUri={selectedImageUri}
          onSave={handleSaveEditedImage}
          onCancel={handleCancelImageEditing}
        />
      </SafeAreaView>
    </>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // Layout de base
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: '#30A08B',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // ── Hero Header (connecté) ──
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroDecorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -50,
  },
  heroDecorCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: -30,
  },

  // Pill hors ligne
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
    gap: 5,
  },
  offlinePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Badge Connecté
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 18,
    gap: 6,
  },
  connectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  connectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarInitialsBg: {
    width: 104,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 38,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#B2905F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Nom & email
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroPhonenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 5,
  },
  heroPhoneText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    width: '100%',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ── Sections menu ──
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0AEC0',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextBlock: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 2,
  },
  menuRowSub: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '400',
  },
  badgePill: {
    backgroundColor: '#30A08B',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  badgePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 70,
    marginRight: 16,
  },

  // ── Déconnexion ──
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E74C3C',
    marginBottom: 2,
  },
  logoutSub: {
    fontSize: 12,
    color: '#A0AEC0',
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 7,
  },
  footerLogoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30A08B',
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30A08B',
    letterSpacing: 0.5,
  },
  footerVersion: {
    fontSize: 12,
    color: '#CBD5E0',
    marginBottom: 2,
  },
  footerCopy: {
    fontSize: 11,
    color: '#CBD5E0',
  },

  // ── Écran invité (non connecté) ──
  guestScroll: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  guestScrollContent: {
    paddingBottom: 40,
  },
  guestHero: {
    paddingTop: Platform.OS === 'ios' ? 64 : 52,
    paddingBottom: 52,
    paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  guestDecorCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -60,
  },
  guestDecorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30,
    left: -40,
  },
  guestAvatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  guestAvatarInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestHeroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  guestHeroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Boutons auth
  guestActions: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  guestLoginBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  guestLoginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  guestLoginText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  guestRegisterBtn: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#30A08B',
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  guestRegisterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#30A08B',
    letterSpacing: 0.3,
  },

  // Avantages membres
  guestBenefitsCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  guestBenefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  guestBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  guestBenefitIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(48, 160, 139, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBenefitText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    fontWeight: '400',
  },
});
