import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../config/api';
import ImageEditorModal from '../components/ImageEditorModal';

const COLORS = {
  primary: '#E87E04', // Orange du drapeau Niger
  primaryLight: '#FFE0B2',
  secondary: '#008751', // Vert du drapeau Niger
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#718096',
  textMuted: '#BDC3C7',
  background: '#F5F5F5',
  error: '#E74C3C',
  success: '#27AE60',
  border: '#E2E8F0',
};

const countryCodes = [
  { name: 'Niger', code: '+227', flag: '🇳🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Mali', code: '+223', flag: '🇲🇱' },
  { name: 'Burkina Faso', code: '+226', flag: '🇧🇫' },
  { name: 'Sénégal', code: '+221', flag: '🇸🇳' },
  { name: 'Côte d\'Ivoire', code: '+225', flag: '🇨🇮' },
  { name: 'Bénin', code: '+229', flag: '🇧🇯' },
  { name: 'Togo', code: '+228', flag: '🇹🇬' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
];

const EditProfileScreen = ({ navigation }) => {
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  const [userData, setUserData] = useState({
    nom: '',
    email: '',
    telephone: '',
    photo: null,
  });
  const [countryCode, setCountryCode] = useState('+227');
  const [whatsapp, setWhatsapp] = useState(true);

  // Extract phone info from full number
  const extractPhoneInfo = (fullPhoneNumber) => {
    if (!fullPhoneNumber) {
      return { code: '+227', number: '' };
    }

    const phoneStr = String(fullPhoneNumber).trim();
    const sortedCodes = countryCodes
      .map((c) => c.code)
      .sort((a, b) => b.length - a.length);

    for (const code of sortedCodes) {
      if (phoneStr.startsWith(code)) {
        return {
          code: code,
          number: phoneStr.substring(code.length),
        };
      }
    }

    return { code: '+227', number: phoneStr };
  };

  // Fetch user data
  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Vérifier si l'utilisateur est connecté
      if (!user || !user.token || !user.id) {
        Alert.alert('Erreur', 'Veuillez vous connecter');
        navigation.navigate('Login');
        return;
      }

      // Fetch user info avec ID en query params
      const userResponse = await axios.get(`${API_URL}/api/user/getUser`, {
        params: { id: user.id },
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!userResponse.data || !userResponse.data.user) {
        throw new Error('Données utilisateur non trouvées');
      }

      // Initialize with user data
      setUserData({
        nom: userResponse.data.user.name || '',
        email: userResponse.data.user.email || '',
        telephone: '',
        photo: null,
      });

      // Try to fetch profile info (might not exist yet)
      try {
        const profileResponse = await axios.get(`${API_URL}/api/profilesRoutes/me`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const profileData = profileResponse.data?.data;

        if (profileData) {
          // Extract country code and phone number
          const { code, number } = extractPhoneInfo(profileData?.numero);

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
        if (profileError.response?.status === 404) {
          console.log('No profile yet, will create on save');
        } else {
          throw profileError;
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      let errorMessage = 'Impossible de charger les données du profil';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Le serveur met trop de temps à répondre';
      } else if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Aucune réponse du serveur';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Validate form
  const validateForm = () => {
    if (!userData.nom || userData.nom.trim().length < 3) {
      Alert.alert('Erreur', 'Le nom doit contenir au moins 3 caractères');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userData.email || !emailRegex.test(userData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return false;
    }

    if (!userData.telephone || userData.telephone.length < 8) {
      Alert.alert('Erreur', 'Le numéro de téléphone doit contenir au moins 8 chiffres');
      return false;
    }

    return true;
  };

  // Handle photo selection
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
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  // Handle take photo with camera
  const handleTakePhoto = async () => {
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la caméra pour prendre une photo'
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Ouvrir l'éditeur d'image
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo');
    }
  };

  // Handle pick from gallery
  const handlePickFromGallery = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Veuillez autoriser l\'accès à la galerie pour sélectionner une photo'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // On désactive l'édition native
        quality: 1, // Qualité maximale pour l'éditeur
      });

      if (!result.canceled && result.assets[0]) {
        // Ouvrir l'éditeur d'image
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  // Handle save edited image
  const handleSaveEditedImage = (editedUri) => {
    setUserData({ ...userData, photo: editedUri });
    setShowImageEditor(false);
    setSelectedImageUri(null);
  };

  // Handle cancel image editing
  const handleCancelImageEditing = () => {
    setShowImageEditor(false);
    setSelectedImageUri(null);
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('name', userData.nom);
      formData.append('email', userData.email);
      formData.append('phone', `${countryCode}${userData.telephone}`);
      formData.append('whatsapp', whatsapp);
      formData.append('id', user.id); // Ajouter l'ID utilisateur

      // Add photo if it's a local URI (new photo selected)
      if (userData.photo && userData.photo.startsWith('file://')) {
        const photoUri = userData.photo;
        const filename = photoUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: photoUri,
          type: type,
          name: filename || 'profile.jpg',
        });
      }

      const response = await axios.post(
        `${API_URL}/api/profilesRoutes/create`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data) {
        Alert.alert('Succès', 'Profil mis à jour avec succès', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible de sauvegarder le profil'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={handleSelectPhoto}
            disabled={isSubmitting}
          >
            {userData.photo ? (
              <Image source={{ uri: userData.photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={60} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoLabel}>Toucher pour changer la photo</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={userData.nom}
                onChangeText={(text) => setUserData({ ...userData, nom: text })}
                placeholder="Entrez votre nom complet"
                placeholderTextColor={COLORS.textMuted}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={userData.email}
                onChangeText={(text) => setUserData({ ...userData, email: text })}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de téléphone</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
                disabled={isSubmitting}
              >
                <Text style={styles.countryCodeText}>
                  {countryCodes.find((c) => c.code === countryCode)?.flag || '🇳🇪'}{' '}
                  {countryCode}
                </Text>
                <Ionicons
                  name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>

              <View style={[styles.inputContainer, styles.phoneInput]}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={userData.telephone}
                  onChangeText={(text) =>
                    setUserData({ ...userData, telephone: text.replace(/[^0-9]/g, '') })
                  }
                  placeholder="XX XX XX XX"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Country Code Picker */}
            {showCountryPicker && (
              <View style={styles.countryPickerContainer}>
                <ScrollView style={styles.countryList} nestedScrollEnabled>
                  {countryCodes.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryItem,
                        countryCode === country.code && styles.countryItemSelected,
                      ]}
                      onPress={() => {
                        setCountryCode(country.code);
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={styles.countryFlag}>{country.flag}</Text>
                      <Text style={styles.countryName}>{country.name}</Text>
                      <Text style={styles.countryCodeInList}>{country.code}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* WhatsApp Toggle */}
          <View style={styles.inputGroup}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleLabelRow}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.toggleLabel}>Numéro WhatsApp</Text>
                </View>
                <Text style={styles.toggleDescription}>
                  Ce numéro peut être utilisé pour WhatsApp
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  whatsapp && styles.toggleButtonActive,
                ]}
                onPress={() => setWhatsapp(!whatsapp)}
                disabled={isSubmitting}
              >
                <View
                  style={[
                    styles.toggleCircle,
                    whatsapp && styles.toggleCircleActive,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Image Editor Modal */}
      <ImageEditorModal
        visible={showImageEditor}
        imageUri={selectedImageUri}
        onSave={handleSaveEditedImage}
        onCancel={handleCancelImageEditing}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#30A08B',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  photoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  formSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 50,
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 15,
    color: COLORS.text,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
  },
  countryPickerContainer: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  countryList: {
    maxHeight: 200,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  countryItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  countryCodeInList: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  toggleDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#25D366',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
});

export default EditProfileScreen;
