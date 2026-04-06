import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useSelector } from 'react-redux';
import socialService from '../services/socialService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_WIDTH = Dimensions.get('window').width;

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#718096',
  lightGray: '#E2E8F0',
  darkGray: '#4A5568',
  backgroundAlt: '#F7FAFC',
  border: '#E2E8F0',
  yellow: '#FCD34D',
  red: '#EF4444',
  green: '#10B981',
};

export default function SellerDetailScreen({ route, navigation }) {
  const { sellerId } = route.params;
  const user = useSelector((state) => state.auth.user);
  const scrollViewRef = useRef(null);
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasLikedStore, setHasLikedStore] = useState(false);
  const [socialStats, setSocialStats] = useState({
    followersCount: 0,
    likesCount: 0,
    reviewsCount: 0,
    rating: 0,
  });
  const [reviews, setReviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReviewFilter, setSelectedReviewFilter] = useState('recent');
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userEcomme');
        setIsAuthenticated(!!userDataString && !!user);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      }
    };
    checkAuth();
  }, [user]);

  useEffect(() => {
    fetchSellerDetails();
  }, [sellerId]);

  // Recharger quand l'utilisateur se connecte/déconnecte
  useEffect(() => {
    if (sellerData && isAuthenticated) {
      checkUserRelations();
    }
  }, [isAuthenticated, user, sellerData]);

  // Récupérer les avis quand on change de page ou qu'on va dans la section avis
  useEffect(() => {
    if (sellerId && activeTab === 'reviews') {
      fetchReviews();
    }
  }, [sellerId, activeTab, currentPage]);

  const fetchSellerDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/getSeller/${sellerId}`);
      const seller = response.data.data;
      setSellerData(seller);
      
      // Récupérer les statistiques sociales
      try {
        const statsResponse = await socialService.getSellerSocialStats(sellerId);
        setSocialStats(statsResponse.data.stats);
      } catch (error) {
        console.log('Stats non disponibles, utilisation des données par défaut');
        setSocialStats({
          followersCount: seller.followersCount || 0,
          likesCount: seller.likesCount || 0,
          reviewsCount: seller.reviewsCount || 0,
          rating: seller.rating || 0,
        });
      }

      // Vérifier si l'utilisateur suit ce vendeur et a liké la boutique (seulement si connecté)
      if (isAuthenticated && user) {
        await checkUserRelations();
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil du vendeur');
    } finally {
      setLoading(false);
    }
  };

  const checkUserRelations = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const userId = user?.id || user?._id;
      
      // Vérifier le follow
      const followersResponse = await socialService.getSellerFollowers(sellerId);
      const followersData = followersResponse?.data?.followers || followersResponse?.data?.data || [];
      const isUserFollowing = Array.isArray(followersData) && followersData.some(
        (follower) => follower._id === userId || follower.id === userId
      );
      setIsFollowing(isUserFollowing);

      // Vérifier le like
      const likeResponse = await socialService.checkStoreLike(sellerId);
      const likeData = likeResponse?.data || likeResponse;
      setHasLikedStore(likeData.hasLiked || likeData.liked || false);
      
      console.log('État initial - Following:', isUserFollowing, 'Liked:', likeData.hasLiked || likeData.liked);
    } catch (error) {
      console.log('Erreur lors de la vérification des relations sociales:', error);
      setIsFollowing(false);
      setHasLikedStore(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const reviewsResponse = await socialService.getSellerReviews(
        sellerId,
        currentPage,
        10
      );
      setReviews(reviewsResponse.data.reviews || []);
      setTotalPages(reviewsResponse.data.totalPages || 1);
    } catch (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      setReviews([]);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour suivre ce vendeur',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-follow',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-follow',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
        ]
      );
      return;
    }

    try {
      if (isFollowing) {
        await socialService.unfollowSeller(sellerId);
        setIsFollowing(false);
        setSocialStats({
          ...socialStats,
          followersCount: Math.max(0, socialStats.followersCount - 1),
        });
        Alert.alert('Succès', 'Vous ne suivez plus ce vendeur');
      } else {
        await socialService.followSeller(sellerId);
        setIsFollowing(true);
        setSocialStats({
          ...socialStats,
          followersCount: socialStats.followersCount + 1,
        });
        Alert.alert('Succès', 'Vous suivez maintenant ce vendeur');
      }
    } catch (error) {
      console.error('Erreur lors du changement de suivi:', error);
      Alert.alert('Erreur', 'Impossible de modifier le suivi');
      setIsFollowing(!isFollowing); // Revert on error
    }
  };

  const handleStoreLikeToggle = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour liker cette boutique',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-like',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-like',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
        ]
      );
      return;
    }

    try {
      if (hasLikedStore) {
        await socialService.unlikeStore(sellerId);
        setHasLikedStore(false);
        setSocialStats({
          ...socialStats,
          likesCount: Math.max(0, socialStats.likesCount - 1),
        });
      } else {
        await socialService.likeStore(sellerId);
        setHasLikedStore(true);
        setSocialStats({
          ...socialStats,
          likesCount: socialStats.likesCount + 1,
        });
      }
    } catch (error) {
      console.error('Erreur lors du like de la boutique:', error.response?.data || error.message);
      Alert.alert('Erreur', 'Impossible de modifier le like');
    }
  };

  const handleReviewLike = async (reviewId, isCurrentlyLiked) => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour liker cet avis',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-review-like',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-review-like',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
        ]
      );
      return;
    }

    try {
      if (isCurrentlyLiked) {
        await socialService.unlikeReview(reviewId);
      } else {
        await socialService.likeReview(reviewId);
      }
      // Rafraîchir la liste des avis
      await fetchReviews();
    } catch (error) {
      console.error('Erreur lors du like de l\'avis:', error);
      Alert.alert('Erreur', 'Impossible de liker cet avis');
    }
  };

  const handleAddReview = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour laisser un avis',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-review-create',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'seller-review-create',
              returnScreen: 'SellerDetail',
              returnParams: { sellerId },
            }),
          },
        ]
      );
      return;
    }

    if (newReview.rating === 0 || !newReview.comment.trim()) {
      Alert.alert('Attention', 'Veuillez donner une note et écrire un commentaire');
      return;
    }

    try {
      await socialService.createReview(sellerId, {
        rating: newReview.rating,
        comment: newReview.comment,
      });

      // Réinitialiser le formulaire
      setNewReview({ rating: 0, comment: '' });

      // Rafraîchir les avis et les stats
      await fetchReviews();
      setCurrentPage(1);

      const statsResponse = await socialService.getSellerSocialStats(sellerId);
      setSocialStats(statsResponse.data.stats);

      Alert.alert('Succès', 'Votre avis a été publié avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'avis:', error);
      Alert.alert('Erreur', 'Impossible de publier votre avis');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!isAuthenticated || !user) {
      return;
    }

    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cet avis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await socialService.deleteReview(reviewId);
              await fetchReviews();
              
              const statsResponse = await socialService.getSellerSocialStats(sellerId);
              setSocialStats(statsResponse.data.stats);

              Alert.alert('Succès', 'Avis supprimé avec succès');
            } catch (error) {
              console.error('Erreur lors de la suppression de l\'avis:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cet avis');
            }
          },
        },
      ]
    );
  };

  const filterAndSortReviews = () => {
    const filteredReviews = [...reviews];

    switch (selectedReviewFilter) {
      case 'top':
        filteredReviews.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        break;
      case 'recent':
      default:
        // Les avis sont déjà triés par date de création par l'API
        break;
    }

    return filteredReviews;
  };

  const renderStars = (rating, interactive = false, onPress = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && onPress && onPress(star)}
            disabled={!interactive}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={interactive ? 32 : 20}
              color={star <= rating ? COLORS.yellow : COLORS.lightGray}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!sellerData) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="store-off" size={80} color={COLORS.gray} />
        <Text style={styles.errorTitle}>Profil non trouvé</Text>
        <Text style={styles.errorText}>
          Ce vendeur n'existe pas ou a été supprimé
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const storeName = sellerData.storeName || `${sellerData.userName2} ${sellerData.name}`;
  const isActive = sellerData.isvalid === true;
  const subscriptionStatus = sellerData.subscriptionStatus || 'free';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, '#62aca2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil du vendeur</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Header */}
        <LinearGradient
          colors={['#F8F9FA', '#FFFFFF']}
          style={styles.profileHeader}
        >
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: sellerData.logo || 'https://via.placeholder.com/150' }}
              style={styles.profileImage}
            />
            {isActive && (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.verifiedBadgeLarge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="check-decagram" size={24} color={COLORS.white} />
              </LinearGradient>
            )}
          </View>

          <Text style={styles.storeName}>{storeName}</Text>
          
          {sellerData.storeDescription && (
            <Text style={styles.storeDescription}>{sellerData.storeDescription}</Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Ionicons name="star" size={20} color={COLORS.yellow} />
              </View>
              <Text style={styles.statValue}>{sellerData.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Note</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <MaterialCommunityIcons name="account-group" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>
                {sellerData.followersCount >= 1000 
                  ? `${(sellerData.followersCount / 1000).toFixed(1)}k` 
                  : sellerData.followersCount || 0}
              </Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <MaterialCommunityIcons name="package-variant" size={20} color={COLORS.secondary} />
              </View>
              <Text style={styles.statValue}>{sellerData.productsCount || 0}</Text>
              <Text style={styles.statLabel}>Produits</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.followButton}
              onPress={handleFollowToggle}
            >
              <LinearGradient
                colors={isFollowing ? [COLORS.gray, COLORS.darkGray] : [COLORS.primary, COLORS.secondary]}
                style={styles.followButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons 
                  name={isFollowing ? 'account-check' : 'account-plus'} 
                  size={20} 
                  color={COLORS.white} 
                />
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Abonné' : 'Suivre'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleStoreLikeToggle}
            >
              <Ionicons 
                name={hasLikedStore ? 'heart' : 'heart-outline'} 
                size={24} 
                color={hasLikedStore ? COLORS.red : COLORS.primary} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.visitStoreButton}
              onPress={() => {
                if (isActive) {
                  navigation.navigate('Boutique', {
                    sellerId: sellerData._id,
                    storeName: storeName,
                  });
                }
              }}
              disabled={!isActive}
            >
              <MaterialCommunityIcons 
                name="store" 
                size={18} 
                color={isActive ? COLORS.primary : COLORS.gray} 
              />
              <Text 
                style={[
                  styles.visitStoreButtonText,
                  !isActive && styles.disabledText
                ]}
                numberOfLines={1}
              >
                Boutique
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              À propos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Informations
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Avis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'about' ? (
            <View style={styles.aboutSection}>
              {/* Status Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <MaterialCommunityIcons name="information" size={22} color={COLORS.primary} />
                  <Text style={styles.infoCardTitle}>Statut du compte</Text>
                </View>
                <View style={styles.infoCardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>État</Text>
                    <View style={[
                      styles.statusBadge,
                      isActive ? styles.activeBadge : styles.suspendedBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isActive ? styles.activeText : styles.suspendedText
                      ]}>
                        {isActive ? 'Actif' : 'Suspendu'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Abonnement</Text>
                    <Text style={styles.infoValue}>
                      {subscriptionStatus === 'premium' ? 'Premium' : 'Gratuit'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Membre depuis</Text>
                    <Text style={styles.infoValue}>
                      {sellerData.createdAt 
                        ? new Date(sellerData.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long'
                          })
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              {sellerData.storeDescription && (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <MaterialCommunityIcons name="text" size={22} color={COLORS.primary} />
                    <Text style={styles.infoCardTitle}>Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{sellerData.storeDescription}</Text>
                </View>
              )}

              {/* Category */}
              {sellerData.category && (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <MaterialCommunityIcons name="tag" size={22} color={COLORS.primary} />
                    <Text style={styles.infoCardTitle}>Catégorie</Text>
                  </View>
                  <Text style={styles.descriptionText}>{sellerData.category}</Text>
                </View>
              )}
            </View>
          ) : activeTab === 'info' ? (
            <View style={styles.infoSection}>
              {/* Contact Information */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <MaterialCommunityIcons name="card-account-details" size={22} color={COLORS.primary} />
                  <Text style={styles.infoCardTitle}>Informations de contact</Text>
                </View>
                <View style={styles.infoCardContent}>
                  {sellerData.email && (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail" size={18} color={COLORS.gray} />
                      <Text style={styles.contactInfo}>{sellerData.email}</Text>
                    </View>
                  )}
                  {sellerData.phoneNumber && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call" size={18} color={COLORS.gray} />
                      <Text style={styles.contactInfo}>{sellerData.phoneNumber}</Text>
                    </View>
                  )}
                  {sellerData.address && (
                    <View style={styles.infoRow}>
                      <Ionicons name="location" size={18} color={COLORS.gray} />
                      <Text style={styles.contactInfo}>{sellerData.address}</Text>
                    </View>
                  )}
                  {sellerData.city && (
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="city" size={18} color={COLORS.gray} />
                      <Text style={styles.contactInfo}>{sellerData.city}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Business Information */}
              {sellerData.category && (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <MaterialCommunityIcons name="briefcase" size={22} color={COLORS.primary} />
                    <Text style={styles.infoCardTitle}>Informations professionnelles</Text>
                  </View>
                  <View style={styles.infoCardContent}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Catégorie</Text>
                      <Text style={styles.infoValue}>{sellerData.category}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.reviewsSection}>
              {/* Reviews Header */}
              <View style={styles.reviewsHeader}>
                <View style={styles.reviewsSummary}>
                  <View style={styles.ratingBig}>
                    <Text style={styles.ratingBigNumber}>{socialStats.rating.toFixed(1)}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= Math.round(socialStats.rating) ? 'star' : 'star-outline'}
                          size={20}
                          color={COLORS.yellow}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewsCount}>
                      {socialStats.reviewsCount || 0}
                      {' '}
                      {socialStats.reviewsCount > 1 ? 'avis' : 'avis'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Filtres */}
              <View style={styles.reviewsFilters}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedReviewFilter === 'recent' && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedReviewFilter('recent')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedReviewFilter === 'recent' && styles.filterButtonTextActive
                  ]}>
                    Plus récents
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedReviewFilter === 'top' && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedReviewFilter('top')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedReviewFilter === 'top' && styles.filterButtonTextActive
                  ]}>
                    Les plus likés
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reviews List or Empty State */}
              {!reviews || reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <MaterialCommunityIcons name="comment-text-outline" size={64} color={COLORS.lightGray} />
                  <Text style={styles.emptyReviewsTitle}>Aucun avis pour le moment</Text>
                  <Text style={styles.emptyReviewsText}>
                    Soyez le premier à laisser un avis sur cette boutique
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {filterAndSortReviews().map((review) => {
                    const userId = user?.id || user?._id;
                    const userHasLiked = review.likes?.includes(userId);
                    const isOwnReview = isAuthenticated && userId && 
                                       (review.user?._id === userId || review.user?.id === userId);

                    return (
                      <View key={review._id} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewUserInfo}>
                            <LinearGradient
                              colors={[COLORS.primary, COLORS.secondary]}
                              style={styles.reviewAvatar}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.reviewAvatarText}>
                                {(review.user?.name || review.user?.userName2 || 'U')[0].toUpperCase()}
                              </Text>
                            </LinearGradient>
                            <View style={styles.reviewUserDetails}>
                              <Text style={styles.reviewUserName}>
                                {review.user?.name || review.user?.userName2 || 'Utilisateur'}
                              </Text>
                              <View style={styles.reviewMetaRow}>
                                {renderStars(review.rating)}
                                <Text style={styles.reviewDateSeparator}>•</Text>
                                <Text style={styles.reviewDate}>
                                  {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <Text style={styles.reviewComment}>{review.comment}</Text>

                        <View style={styles.reviewFooter}>
                          <TouchableOpacity
                            style={[
                              styles.reviewLikeButton,
                              userHasLiked && styles.reviewLikeButtonActive
                            ]}
                            onPress={() => handleReviewLike(review._id, userHasLiked)}
                          >
                            <Ionicons
                              name={userHasLiked ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={18}
                              color={userHasLiked ? COLORS.white : COLORS.gray}
                            />
                            <Text style={[
                              styles.reviewLikeText,
                              userHasLiked && styles.reviewLikeTextActive
                            ]}>
                              {review.likesCount || 0}
                            </Text>
                          </TouchableOpacity>

                          {isOwnReview && (
                            <TouchableOpacity
                              style={styles.reviewDeleteButton}
                              onPress={() => handleDeleteReview(review._id)}
                            >
                              <MaterialCommunityIcons name="delete-outline" size={18} color={COLORS.red} />
                              <Text style={styles.reviewDeleteText}>Supprimer</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <View style={styles.pagination}>
                      {[...Array(totalPages)].map((_, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.pageButton,
                            currentPage === index + 1 && styles.pageButtonActive
                          ]}
                          onPress={() => setCurrentPage(index + 1)}
                        >
                          <Text style={[
                            styles.pageButtonText,
                            currentPage === index + 1 && styles.pageButtonTextActive
                          ]}>
                            {index + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Formulaire d'ajout d'avis */}
              {isAuthenticated ? (
                <View style={styles.addReviewForm}>
                  <Text style={styles.addReviewTitle}>Laissez votre avis</Text>
                  
                  <View style={styles.ratingInput}>
                    <Text style={styles.ratingInputLabel}>Votre note :</Text>
                    {renderStars(newReview.rating, true, (rating) => 
                      setNewReview({ ...newReview, rating })
                    )}
                  </View>

                  <TextInput
                    style={styles.commentInput}
                    placeholder="Votre commentaire"
                    placeholderTextColor={COLORS.gray}
                    value={newReview.comment}
                    onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    style={styles.submitReviewButton}
                    onPress={handleAddReview}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.secondary]}
                      style={styles.submitReviewButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.submitReviewButtonText}>Publier mon avis</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.loginPrompt}>
                  <LinearGradient
                    colors={['#F0F9FF', '#E0F2FE']}
                    style={styles.loginPromptGradient}
                  >
                    <View style={styles.loginPromptIconContainer}>
                      <MaterialCommunityIcons name="account-lock" size={56} color={COLORS.primary} />
                    </View>
                    <Text style={styles.loginPromptTitle}>
                      Connectez-vous pour interagir
                    </Text>
                    <Text style={styles.loginPromptText}>
                      Créez un compte ou connectez-vous pour laisser des avis et interagir avec les boutiques
                    </Text>
                    
                    <View style={styles.loginPromptButtons}>
                      <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('QuickAuth', {
                          pendingAction: 'seller-review',
                          returnScreen: 'SellerDetail',
                          returnParams: { sellerId },
                        })}
                      >
                        <LinearGradient
                          colors={[COLORS.primary, COLORS.secondary]}
                          style={styles.loginButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <MaterialCommunityIcons name="login" size={20} color={COLORS.white} />
                          <Text style={styles.loginButtonText}>Se connecter</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.signupButton}
                        onPress={() => navigation.navigate('QuickAuth', {
                          pendingAction: 'seller-review',
                          returnScreen: 'SellerDetail',
                          returnParams: { sellerId },
                        })}
                      >
                        <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.primary} />
                        <Text style={styles.signupButtonText}>Créer un compte</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </View>
          )}
        </View>

        {!isActive && (
          <View style={styles.suspendedNotice}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.red} />
            <Text style={styles.suspendedNoticeText}>
              Ce compte vendeur est actuellement suspendu et ne peut pas vendre de produits.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.backgroundAlt,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  verifiedBadgeLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  storeDescription: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.border,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  followButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  likeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  followButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  visitStoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 3,
    minWidth: 0,
  },
  visitStoreButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  disabledText: {
    color: COLORS.gray,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabContent: {
    padding: 16,
  },
  aboutSection: {
    gap: 16,
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  infoCardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  suspendedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeText: {
    color: COLORS.green,
  },
  suspendedText: {
    color: COLORS.red,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  contactInfo: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
    marginLeft: 12,
  },
  suspendedNotice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
    gap: 12,
    alignItems: 'flex-start',
  },
  suspendedNoticeText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.red,
    fontWeight: '600',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 32,
  },
  reviewsSection: {
    gap: 16,
  },
  reviewsHeader: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewsSummary: {
    alignItems: 'center',
  },
  ratingBig: {
    alignItems: 'center',
  },
  ratingBigNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  reviewsCount: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  emptyReviews: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyReviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewsList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewsListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
  },
  reviewsPlaceholder: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewsFilters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  reviewHeader: {
    marginBottom: 14,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewAvatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDateSeparator: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 22,
    marginBottom: 14,
    paddingLeft: 2,
  },
  reviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  reviewLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
  },
  reviewLikeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  reviewLikeText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '700',
  },
  reviewLikeTextActive: {
    color: COLORS.white,
  },
  reviewDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightRed,
  },
  reviewDeleteText: {
    fontSize: 13,
    color: COLORS.red,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonActive: {
    backgroundColor: COLORS.primary,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  pageButtonTextActive: {
    color: COLORS.white,
  },
  addReviewForm: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addReviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },
  ratingInput: {
    marginBottom: 16,
  },
  ratingInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.black,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitReviewButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitReviewButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitReviewButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  loginPrompt: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  loginPromptGradient: {
    padding: 32,
    alignItems: 'center',
  },
  loginPromptIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginPromptText: {
    fontSize: 14,
    color: COLORS.darkGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  loginPromptButtons: {
    width: '100%',
    gap: 12,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  signupButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
