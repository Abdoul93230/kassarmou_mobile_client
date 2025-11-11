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
import useNetworkStatus from '../hooks/useNetworkStatus';
import LoadingButton from '../components/LoadingButton';
import CountryCodePicker from '../components/CountryCodePicker';
import { COLORS } from '../config/constants';
import Toast from 'react-native-toast-message';
import apiClient from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import ImageEditorModal from '../components/ImageEditorModal';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { isConnected } = useNetworkStatus();
  
  // États
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  
  // Données utilisateur
  const [userData, setUserData] = useState({
    nom: '',
    email: '',
    telephone: '',
    photo: null,
  });
  const [countryCode, setCountryCode] = useState('+227');
  const [whatsapp, setWhatsapp] = useState(true);

  // Extraction de l'indicatif et du numéro
  const extractPhoneInfo = (fullPhoneNumber) => {
    if (!fullPhoneNumber) return { code: '+227', number: '' };

    // Liste des indicatifs à vérifier (du plus long au plus court)
    const codes = ['+1242', '+1809', '+93', '+355', '+213', '+376', '+244', '+54', '+374', '+61', '+43', '+994', '+973', '+880', '+32', '+229', '+975', '+591', '+387', '+267', '+55', '+673', '+359', '+226', '+257', '+855', '+237', '+1', '+238', '+236', '+235', '+56', '+86', '+57', '+242', '+243', '+506', '+225', '+385', '+53', '+357', '+420', '+45', '+253', '+593', '+20', '+503', '+240', '+291', '+372', '+251', '+679', '+358', '+33', '+241', '+220', '+995', '+49', '+233', '+30', '+502', '+224', '+245', '+592', '+509', '+504', '+852', '+36', '+354', '+91', '+62', '+98', '+964', '+353', '+972', '+39', '+81', '+962', '+7', '+254', '+686', '+850', '+82', '+383', '+965', '+996', '+856', '+371', '+961', '+266', '+231', '+218', '+423', '+370', '+352', '+261', '+265', '+60', '+960', '+223', '+356', '+692', '+222', '+230', '+52', '+691', '+373', '+377', '+976', '+382', '+212', '+258', '+95', '+264', '+674', '+977', '+31', '+64', '+505', '+227', '+234', '+47', '+968', '+92', '+680', '+970', '+507', '+675', '+595', '+51', '+63', '+48', '+351', '+974', '+40', '+250', '+685', '+378', '+966', '+221', '+381', '+248', '+232', '+65', '+421', '+386', '+677', '+252', '+27', '+211', '+34', '+94', '+249', '+597', '+268', '+46', '+41', '+963', '+886', '+992', '+255', '+66', '+228', '+676', '+216', '+90', '+993', '+688', '+256', '+380', '+971', '+44', '+598', '+998', '+678', '+58', '+84', '+967', '+260', '+263'];
    
    for (const code of codes) {
      if (fullPhoneNumber.startsWith(code)) {
        return {
          code: code,
          number: fullPhoneNumber.substring(code.length),
        };
      }
    }

    return { code: '+227', number: fullPhoneNumber };
  };

  // Chargement des données utilisateur
  const fetchUserData = useCallback(async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Récupérer les données utilisateur
      const userResponse = await apiClient.get('/api/user/getUser', {
        params: { id: user.id },
      });

      if (!userResponse.data.user) {
        throw new Error('Données utilisateur non trouvées');
      }

      // Initialiser avec les données utilisateur
      setUserData({
        nom: userResponse.data.user.name || '',
        email: userResponse.data.user.email || '',
        telephone: '',
        photo: null,
      });

      // Récupérer le profil (peut ne pas exister)
      try {
        const profileResponse = await apiClient.get('/api/profilesRoutes/me');

        const profileData = profileResponse.data?.data;

        if (profileData) {
          const { code, number } = extractPhoneInfo(profileData?.numero || '');

          setUserData((prev) => ({
            ...prev,
            telephone: number,
            photo: profileData?.image || null,
          }));
          
          setCountryCode(code);
          setWhatsapp(profileData?.whatsapp !== false);
        }
      } catch (profileError) {
        // Si le profil n'existe pas encore (404), ce n'est pas une erreur
        if (profileError.response?.status !== 404) {
          throw profileError;
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Profil chargé',
      });
    } catch (error) {
      console.error('Erreur chargement profil:', error);

      // Si l'erreur est 401, interceptor gère la déconnexion/navigation => éviter les toasts doublons
      if (error.response?.status === 401) {
        setLoading(false);
        return;
      }

      let errorMessage = 'Impossible de charger le profil';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Le serveur met trop de temps à répondre';
      } else if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
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
      const response = await apiClient.get(`/api/ordersRoutes/user/${user.id}`);
      
      if (response.data?.commandes) {
        setOrdersCount(response.data.commandes.length);
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      if (error.response?.status === 401) return; // interceptor will handle logout
    }
  }, [user]);

  // Charger le nombre de favoris
  const fetchFavoritesCount = useCallback(async () => {
    if (!user || !user.id) return;
    
    try {
  const response = await apiClient.get(`/likes/user/${user.id}`);
      
      console.log('📊 Données favoris brutes:', response.data);
      console.log('📊 Nombre total de likes:', response.data.length);
      
      // Le backend retourne directement un tableau de likes
      if (Array.isArray(response.data)) {
        // Filtrer les likes avec des produits valides (non null)
        const validLikes = response.data.filter(like => like.produit !== null);
        console.log('✅ Likes avec produits valides:', validLikes.length);
        setFavoritesCount(validLikes.length);
      }
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
      // Si l'endpoint retourne 404, c'est que l'utilisateur n'a pas de favoris
        if (error.response?.status === 404) {
        setFavoritesCount(0);
        }
      if (error.response?.status === 401) return; // interceptor will handle logout
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
    fetchOrdersCount();
    fetchFavoritesCount();
  }, [fetchUserData, fetchOrdersCount, fetchFavoritesCount]);

  // Recharger les données quand on revient sur cet écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Recharger les données du profil
      fetchUserData();
      fetchOrdersCount();
      fetchFavoritesCount();
    });

    return unsubscribe;
  }, [navigation, fetchUserData, fetchOrdersCount, fetchFavoritesCount]);

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

    if (userData.telephone && userData.telephone.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Numéro invalide (min 8 chiffres)',
      });
      return false;
    }

    return true;
  };

  // Sauvegarde du profil
  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', userData.nom);
      formData.append('email', userData.email);
      formData.append('phone', `${countryCode}${userData.telephone}`);
      formData.append('whatsapp', whatsapp);
      formData.append('id', user.id);

      await apiClient.post('/api/profilesRoutes/create', formData, {
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
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.response?.data?.message || 'Impossible de sauvegarder',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sélection et upload de photo
  const handleSelectPhoto = async () => {
    try {
      // Demander à l'utilisateur de choisir entre galerie et caméra
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

  // Handle take photo with camera
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
        // Ouvrir l'éditeur d'image
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

  // Handle pick from gallery
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder aux photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // On désactive l'édition native
        quality: 1, // Qualité maximale pour l'éditeur
      });

      if (!result.canceled) {
        // Ouvrir l'éditeur d'image
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

  // Handle save edited image
  const handleSaveEditedImage = async (editedUri) => {
    setShowImageEditor(false);
    setSelectedImageUri(null);
    await uploadPhoto(editedUri);
  };

  // Handle cancel image editing
  const handleCancelImageEditing = () => {
    setShowImageEditor(false);
    setSelectedImageUri(null);
  };

  const uploadPhoto = async (imageUri) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('name', userData.nom);
      formData.append('email', userData.email);
      formData.append('phone', `${countryCode}${userData.telephone}`);
      formData.append('whatsapp', whatsapp);
      formData.append('id', user.id);

      await apiClient.post('/api/profilesRoutes/create', formData, {
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
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de télécharger la photo',
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

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Informations personnelles',
      subtitle: 'Modifier votre profil',
      onPress: () => navigation.navigate('EditProfile'),
      badge: null,
    },
    {
      icon: 'cart-outline',
      title: 'Mes commandes',
      subtitle: 'Historique des achats',
      onPress: () => navigation.navigate('Orders'),
      badge: null,
    },
    {
      icon: 'heart-outline',
      title: 'Mes favoris',
      subtitle: 'Produits sauvegardés',
      onPress: () => navigation.navigate('MainTabs', { screen: 'Favorites' }),
      badge: null,
    },
    {
      icon: 'help-circle-outline',
      title: 'Aide et support',
      subtitle: 'FAQ et contact',
      onPress: () => navigation.navigate('Faq'),
      badge: null,
    },
  ];

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      {!user && <View style={styles.statusBarBackground} />}
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {!user ? (
          // Utilisateur non connecté
          <ScrollView style={styles.notLoggedInContainer} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#30A08B', '#2D9175', '#26805F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.notLoggedInHeader}
          >
            <View style={styles.notLoggedInAvatarContainer}>
              <View style={styles.notLoggedInAvatar}>
                <Ionicons name="person-outline" size={60} color={COLORS.white} />
              </View>
            </View>
            <Text style={styles.notLoggedInTitle}>Bienvenue sur Kassarmou</Text>
            <Text style={styles.notLoggedInSubtitle}>
              Connectez-vous pour accéder à votre profil et vos commandes
            </Text>
          </LinearGradient>

          <View style={styles.notLoggedInContent}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#30A08B', '#26805F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Ionicons name="log-in-outline" size={24} color={COLORS.white} />
                <Text style={styles.loginButtonText}>Se connecter</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Créer un compte</Text>
            </TouchableOpacity>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Profitez de tous les avantages :</Text>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>Suivre vos commandes en temps réel</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>Sauvegarder vos produits favoris</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>Accéder à l'historique de vos achats</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.featureText}>Gérer vos adresses de livraison</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header avec gradient */}
          <LinearGradient
            colors={['#30A08B', '#2D9175', '#26805F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Indicateur hors ligne */}
            {!isConnected && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline" size={14} color={COLORS.white} />
                <Text style={styles.offlineText}>Hors ligne</Text>
              </View>
            )}

            {/* Photo de profil */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                {userData.photo ? (
                  <Image 
                    source={{ uri: userData.photo }} 
                    style={styles.avatar}
                    defaultSource={require('../../assets/icon.png')}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {userData.nom?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handleSelectPhoto}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="camera" size={18} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Informations utilisateur */}
            <Text style={styles.userName}>{userData.nom || user?.name || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{userData.email || user?.email || 'email@example.com'}</Text>
            
            {/* Téléphone avec WhatsApp */}
            {userData.telephone && (
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={16} color={COLORS.white} />
                <Text style={styles.phoneText}>
                  {countryCode} {userData.telephone}
                </Text>
                {whatsapp && (
                  <Ionicons name="logo-whatsapp" size={16} color="#25D366" style={styles.whatsappIcon} />
                )}
              </View>
            )}
            
            {/* Badges/Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{ordersCount}</Text>
                <Text style={styles.statLabel}>Commandes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{favoritesCount}</Text>
                <Text style={styles.statLabel}>Favoris</Text>
              </View>
            </View>
          </LinearGradient>

        {/* Menu items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton de déconnexion */}
        <View style={styles.logoutContainer}>
          <LoadingButton
            title="Se déconnecter"
            onPress={handleLogout}
            loading={loggingOut}
            variant="outline"
            leftIcon={<Ionicons name="log-out-outline" size={20} color={COLORS.error} />}
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2025 Kassarmoumarket</Text>
        </View>
      </ScrollView>
      )}

      {/* Image Editor Modal */}
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

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  offlineText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginTop: 17,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  phoneText: {
    color: COLORS.white,
    fontSize: 14,
    marginLeft: 6,
  },
  whatsappIcon: {
    marginLeft: 8,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutButton: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Styles pour utilisateur non connecté
  notLoggedInContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  notLoggedInHeader: {
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  notLoggedInAvatarContainer: {
    marginBottom: 24,
  },
  notLoggedInAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  notLoggedInTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  notLoggedInSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  notLoggedInContent: {
    padding: 24,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  registerButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  featuresContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 22,
  },
});
