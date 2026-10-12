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
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useSelector } from 'react-redux';
import socialService from '../services/socialService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 210;
const AVATAR_SIZE = 96;

const COLORS = {
  primary: '#30A08B',
  primaryDark: '#217A6A',
  primaryLight: '#E8F7F4',
  secondary: '#B2905F',
  secondaryLight: '#FDF5EC',
  white: '#FFFFFF',
  black: '#1A1A2E',
  gray: '#718096',
  lightGray: '#EDF2F7',
  midGray: '#CBD5E0',
  darkGray: '#4A5568',
  backgroundAlt: '#F4F7F9',
  border: '#E8EEF3',
  yellow: '#F6C90E',
  red: '#EF4444',
  redLight: 'rgba(239,68,68,0.08)',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.1)',
};

// ─────────────────────────────────────────────
// Mini composants réutilisables
// ─────────────────────────────────────────────

const StatBlock = ({ icon, value, label, iconColor }) => (
  <View style={styles.statBlock}>
    <View style={[styles.statIconBg, { backgroundColor: `${iconColor}18` }]}>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const TabButton = ({ label, active, onPress, badge }) => (
  <TouchableOpacity
    style={[styles.tabBtn, active && styles.tabBtnActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    {badge != null && (
      <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
        <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{badge}</Text>
      </View>
    )}
    {active && <View style={styles.tabUnderline} />}
  </TouchableOpacity>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowIcon}>{icon}</View>
    <View style={styles.infoRowContent}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue}>{value}</Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Écran principal
// ─────────────────────────────────────────────
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
      const response = await axios.get(`${API_URL}/getSellerClients/${sellerId}`);
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
              size={interactive ? 32 : 16}
              color={star <= rating ? COLORS.yellow : COLORS.midGray}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  // ── Erreur / non trouvé ──
  if (!sellerData) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundAlt} />
        <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.errorIconBg}>
          <MaterialCommunityIcons name="store-off" size={56} color={COLORS.primary} />
        </LinearGradient>
        <Text style={styles.errorTitle}>Profil non trouvé</Text>
        <Text style={styles.errorText}>Ce vendeur n'existe pas ou a été supprimé</Text>
        <TouchableOpacity style={styles.errorBackBtn} onPress={() => navigation.goBack()}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.errorBackBtnGrad}>
            <Text style={styles.errorBackBtnText}>Retour</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const storeName = sellerData.storeName || `${sellerData.userName2} ${sellerData.name}`;
  const isActive = sellerData.isvalid === true;
  const subscriptionStatus = sellerData.subscriptionStatus || 'free';
  const followersFormatted =
    socialStats.followersCount >= 1000
      ? `${(socialStats.followersCount / 1000).toFixed(1)}k`
      : socialStats.followersCount || 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══════════════════════════════════════
            HERO : cover + avatar centré
        ══════════════════════════════════════ */}
        <View style={styles.heroSection}>
          {/* Cover image (bannière) */}
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark, '#0E4D42']}
            style={styles.heroCover}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Motif décoratif */}
            <View style={styles.heroPattern1} />
            <View style={styles.heroPattern2} />
            <View style={styles.heroPattern3} />

            {/* Bouton retour flottant */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.heroBackBtn}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Avatar centré chevauchant la cover */}
          <View style={styles.heroAvatarWrapper}>
            <View style={styles.heroAvatarRing}>
              <Image
                source={{
                  uri: sellerData.logo || 'https://ui-avatars.com/api/?name=Shop&background=30A08B&color=fff&size=300',
                }}
                style={styles.heroAvatar}
              />
            </View>
            {isActive && (
              <View style={styles.heroVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════
            INFOS VENDEUR
        ══════════════════════════════════════ */}
        <View style={styles.sellerInfoSection}>
          {/* Nom + badge */}
          <View style={styles.sellerNameRow}>
            <Text style={styles.sellerName}>{storeName}</Text>
            {isActive && (
              <View style={styles.officialBadge}>
                <MaterialCommunityIcons name="shield-check" size={12} color={COLORS.secondary} />
                <Text style={styles.officialBadgeText}>Boutique officielle</Text>
              </View>
            )}
          </View>

          {/* Catégorie */}
          {sellerData.category ? (
            <View style={styles.categoryPill}>
              <MaterialCommunityIcons name="tag" size={12} color={COLORS.primary} />
              <Text style={styles.categoryPillText}>{sellerData.category}</Text>
            </View>
          ) : null}

          {/* Description */}
          {sellerData.storeDescription ? (
            <Text style={styles.sellerDesc}>{sellerData.storeDescription}</Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBlock
              icon={<Ionicons name="star" size={18} color={COLORS.yellow} />}
              value={sellerData.rating?.toFixed(1) || '0.0'}
              label="Note"
              iconColor={COLORS.yellow}
            />
            <View style={styles.statsDivider} />
            <StatBlock
              icon={<MaterialCommunityIcons name="account-group" size={18} color={COLORS.primary} />}
              value={followersFormatted}
              label="Abonnés"
              iconColor={COLORS.primary}
            />
            <View style={styles.statsDivider} />
            <StatBlock
              icon={<MaterialCommunityIcons name="package-variant" size={18} color={COLORS.secondary} />}
              value={sellerData.productsCount || 0}
              label="Produits"
              iconColor={COLORS.secondary}
            />
            <View style={styles.statsDivider} />
            <StatBlock
              icon={<Ionicons name="heart" size={18} color={COLORS.red} />}
              value={socialStats.likesCount >= 1000
                ? `${(socialStats.likesCount / 1000).toFixed(1)}k`
                : socialStats.likesCount || 0}
              label="Likes"
              iconColor={COLORS.red}
            />
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionRow}>
            {/* Suivre */}
            <TouchableOpacity
              style={styles.followBtnWrapper}
              onPress={handleFollowToggle}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isFollowing
                  ? [COLORS.midGray, COLORS.gray]
                  : [COLORS.primary, COLORS.primaryDark]}
                style={styles.followBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons
                  name={isFollowing ? 'account-check' : 'account-plus'}
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.followBtnText}>
                  {isFollowing ? 'Abonné' : 'Suivre'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Like boutique */}
            <TouchableOpacity
              style={[styles.iconActionBtn, hasLikedStore && styles.iconActionBtnActive]}
              onPress={handleStoreLikeToggle}
              activeOpacity={0.8}
            >
              <Ionicons
                name={hasLikedStore ? 'heart' : 'heart-outline'}
                size={22}
                color={hasLikedStore ? COLORS.red : COLORS.primary}
              />
            </TouchableOpacity>

            {/* Visiter la boutique */}
            <TouchableOpacity
              style={[styles.visitStoreBtnWrapper, !isActive && styles.visitStoreBtnDisabled]}
              onPress={() => {
                if (isActive) {
                  navigation.navigate('Boutique', {
                    sellerId: sellerData._id,
                    storeName: storeName,
                  });
                }
              }}
              disabled={!isActive}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="store"
                size={16}
                color={isActive ? COLORS.primary : COLORS.midGray}
              />
              <Text style={[styles.visitStoreBtnText, !isActive && { color: COLORS.midGray }]}>
                Boutique
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alerte suspension */}
        {!isActive && (
          <View style={styles.suspendedBanner}>
            <LinearGradient
              colors={['rgba(239,68,68,0.1)', 'rgba(239,68,68,0.05)']}
              style={styles.suspendedBannerGrad}
            >
              <Ionicons name="warning" size={20} color={COLORS.red} />
              <Text style={styles.suspendedBannerText}>
                Ce compte vendeur est actuellement suspendu et ne peut pas vendre de produits.
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* ══════════════════════════════════════
            ONGLETS
        ══════════════════════════════════════ */}
        <View style={styles.tabsBar}>
          <TabButton
            label="À propos"
            active={activeTab === 'about'}
            onPress={() => setActiveTab('about')}
          />
          <TabButton
            label="Informations"
            active={activeTab === 'info'}
            onPress={() => setActiveTab('info')}
          />
          <TabButton
            label="Avis"
            active={activeTab === 'reviews'}
            onPress={() => setActiveTab('reviews')}
            badge={socialStats.reviewsCount || null}
          />
        </View>

        {/* ══════════════════════════════════════
            CONTENU DES ONGLETS
        ══════════════════════════════════════ */}
        <View style={styles.tabContent}>

          {/* ─── Onglet À propos ─── */}
          {activeTab === 'about' && (
            <View style={styles.aboutSection}>

              {/* Statut compte */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                    <MaterialCommunityIcons name="information" size={18} color={COLORS.primary} />
                  </LinearGradient>
                  <Text style={styles.infoCardTitle}>Statut du compte</Text>
                </View>
                <View style={styles.infoCardBody}>
                  <InfoRow
                    icon={<Ionicons name="ellipse" size={12} color={isActive ? COLORS.green : COLORS.red} />}
                    label="État"
                    value={isActive ? 'Actif' : 'Suspendu'}
                  />
                  <View style={styles.infoRowSep} />
                  <InfoRow
                    icon={<MaterialCommunityIcons name="crown" size={14} color={subscriptionStatus === 'premium' ? COLORS.yellow : COLORS.midGray} />}
                    label="Abonnement"
                    value={subscriptionStatus === 'premium' ? 'Premium' : 'Gratuit'}
                  />
                  <View style={styles.infoRowSep} />
                  <InfoRow
                    icon={<Ionicons name="calendar" size={14} color={COLORS.primary} />}
                    label="Membre depuis"
                    value={sellerData.createdAt
                      ? new Date(sellerData.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                        })
                      : 'N/A'}
                  />
                </View>
              </View>

              {/* Description */}
              {sellerData.storeDescription ? (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                      <MaterialCommunityIcons name="text" size={18} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.infoCardTitle}>Description</Text>
                  </View>
                  <Text style={styles.descText}>{sellerData.storeDescription}</Text>
                </View>
              ) : null}

              {/* Catégorie */}
              {sellerData.category ? (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                      <MaterialCommunityIcons name="tag" size={18} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.infoCardTitle}>Catégorie</Text>
                  </View>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{sellerData.category}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* ─── Onglet Informations ─── */}
          {activeTab === 'info' && (
            <View style={styles.infoSection}>

              {/* Contact */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                    <MaterialCommunityIcons name="card-account-details" size={18} color={COLORS.primary} />
                  </LinearGradient>
                  <Text style={styles.infoCardTitle}>Informations de contact</Text>
                </View>
                <View style={styles.infoCardBody}>
                  {sellerData.email ? (
                    <>
                      <InfoRow
                        icon={<Ionicons name="mail" size={14} color={COLORS.primary} />}
                        label="Email"
                        value={sellerData.email}
                      />
                      <View style={styles.infoRowSep} />
                    </>
                  ) : null}
                  {sellerData.phoneNumber ? (
                    <>
                      <InfoRow
                        icon={<Ionicons name="call" size={14} color={COLORS.primary} />}
                        label="Téléphone"
                        value={sellerData.phoneNumber}
                      />
                      <View style={styles.infoRowSep} />
                    </>
                  ) : null}
                  {sellerData.address ? (
                    <>
                      <InfoRow
                        icon={<Ionicons name="location" size={14} color={COLORS.secondary} />}
                        label="Adresse"
                        value={sellerData.address}
                      />
                      <View style={styles.infoRowSep} />
                    </>
                  ) : null}
                  {sellerData.city ? (
                    <InfoRow
                      icon={<MaterialCommunityIcons name="city" size={14} color={COLORS.secondary} />}
                      label="Ville"
                      value={sellerData.city}
                    />
                  ) : null}
                </View>
              </View>

              {/* Pro */}
              {sellerData.category ? (
                <View style={styles.infoCard}>
                  <View style={styles.infoCardHeader}>
                    <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                      <MaterialCommunityIcons name="briefcase" size={18} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.infoCardTitle}>Informations professionnelles</Text>
                  </View>
                  <View style={styles.infoCardBody}>
                    <InfoRow
                      icon={<MaterialCommunityIcons name="tag" size={14} color={COLORS.primary} />}
                      label="Catégorie"
                      value={sellerData.category}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* ─── Onglet Avis ─── */}
          {activeTab === 'reviews' && (
            <View style={styles.reviewsSection}>

              {/* Résumé de la note */}
              <View style={styles.ratingCard}>
                <LinearGradient
                  colors={[COLORS.primaryLight, '#DCEEFA']}
                  style={styles.ratingCardGrad}
                >
                  <Text style={styles.ratingBigNum}>{socialStats.rating.toFixed(1)}</Text>
                  <View style={styles.ratingStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(socialStats.rating) ? 'star' : 'star-outline'}
                        size={22}
                        color={COLORS.yellow}
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingCountText}>
                    {socialStats.reviewsCount || 0} avis clients
                  </Text>
                </LinearGradient>
              </View>

              {/* Filtres */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedReviewFilter === 'recent' && styles.filterChipActive]}
                  onPress={() => setSelectedReviewFilter('recent')}
                >
                  <Ionicons
                    name="time"
                    size={13}
                    color={selectedReviewFilter === 'recent' ? COLORS.white : COLORS.gray}
                  />
                  <Text style={[styles.filterChipText, selectedReviewFilter === 'recent' && styles.filterChipTextActive]}>
                    Plus récents
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, selectedReviewFilter === 'top' && styles.filterChipActive]}
                  onPress={() => setSelectedReviewFilter('top')}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={13}
                    color={selectedReviewFilter === 'top' ? COLORS.white : COLORS.gray}
                  />
                  <Text style={[styles.filterChipText, selectedReviewFilter === 'top' && styles.filterChipTextActive]}>
                    Les plus likés
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Liste des avis ou empty */}
              {!reviews || reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.emptyReviewsIconBg}>
                    <MaterialCommunityIcons name="comment-text-outline" size={40} color={COLORS.primary} />
                  </LinearGradient>
                  <Text style={styles.emptyReviewsTitle}>Aucun avis pour le moment</Text>
                  <Text style={styles.emptyReviewsText}>
                    Soyez le premier à laisser un avis sur cette boutique
                  </Text>
                </View>
              ) : (
                <View>
                  {filterAndSortReviews().map((review) => {
                    const userId = user?.id || user?._id;
                    const userHasLiked = review.likes?.includes(userId);
                    const isOwnReview = isAuthenticated && userId &&
                      (review.user?._id === userId || review.user?.id === userId);

                    return (
                      <View key={review._id} style={styles.reviewCard}>
                        {/* En-tête avis */}
                        <View style={styles.reviewCardHeader}>
                          <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={styles.reviewAvatar}
                          >
                            <Text style={styles.reviewAvatarLetter}>
                              {(review.user?.name || review.user?.userName2 || 'U')[0].toUpperCase()}
                            </Text>
                          </LinearGradient>
                          <View style={styles.reviewUserInfo}>
                            <Text style={styles.reviewUserName}>
                              {review.user?.name || review.user?.userName2 || 'Utilisateur'}
                            </Text>
                            <View style={styles.reviewMetaRow}>
                              {renderStars(review.rating)}
                              <Text style={styles.reviewDotSep}>•</Text>
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

                        {/* Commentaire */}
                        <Text style={styles.reviewComment}>{review.comment}</Text>

                        {/* Footer avis */}
                        <View style={styles.reviewCardFooter}>
                          <TouchableOpacity
                            style={[styles.reviewLikeBtn, userHasLiked && styles.reviewLikeBtnActive]}
                            onPress={() => handleReviewLike(review._id, userHasLiked)}
                          >
                            <Ionicons
                              name={userHasLiked ? 'thumbs-up' : 'thumbs-up-outline'}
                              size={15}
                              color={userHasLiked ? COLORS.white : COLORS.gray}
                            />
                            <Text style={[styles.reviewLikeBtnText, userHasLiked && styles.reviewLikeBtnTextActive]}>
                              {review.likesCount || 0}
                            </Text>
                          </TouchableOpacity>

                          {isOwnReview && (
                            <TouchableOpacity
                              style={styles.reviewDeleteBtn}
                              onPress={() => handleDeleteReview(review._id)}
                            >
                              <MaterialCommunityIcons name="delete-outline" size={16} color={COLORS.red} />
                              <Text style={styles.reviewDeleteBtnText}>Supprimer</Text>
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
                          style={[styles.pageBtn, currentPage === index + 1 && styles.pageBtnActive]}
                          onPress={() => setCurrentPage(index + 1)}
                        >
                          <Text style={[styles.pageBtnText, currentPage === index + 1 && styles.pageBtnTextActive]}>
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
                <View style={styles.addReviewCard}>
                  <View style={styles.addReviewHeader}>
                    <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.infoCardIconBg}>
                      <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                    </LinearGradient>
                    <Text style={styles.addReviewTitle}>Laissez votre avis</Text>
                  </View>

                  <Text style={styles.ratingInputLabel}>Votre note</Text>
                  {renderStars(newReview.rating, true, (rating) =>
                    setNewReview({ ...newReview, rating })
                  )}

                  <TextInput
                    style={styles.commentInput}
                    placeholder="Partagez votre expérience avec cette boutique..."
                    placeholderTextColor={COLORS.midGray}
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

                  <TouchableOpacity onPress={handleAddReview} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      style={styles.submitReviewBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="send" size={16} color={COLORS.white} />
                      <Text style={styles.submitReviewBtnText}>Publier mon avis</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.loginPromptCard}>
                  <LinearGradient
                    colors={[COLORS.primaryLight, '#E0F2FE']}
                    style={styles.loginPromptGrad}
                  >
                    <View style={styles.loginPromptIconBg}>
                      <MaterialCommunityIcons name="account-lock" size={44} color={COLORS.primary} />
                    </View>
                    <Text style={styles.loginPromptTitle}>Connectez-vous pour interagir</Text>
                    <Text style={styles.loginPromptText}>
                      Créez un compte ou connectez-vous pour laisser des avis et interagir avec les boutiques
                    </Text>

                    <TouchableOpacity
                      onPress={() => navigation.navigate('QuickAuth', {
                        pendingAction: 'seller-review',
                        returnScreen: 'SellerDetail',
                        returnParams: { sellerId },
                      })}
                      activeOpacity={0.85}
                      style={{ width: '100%', marginBottom: 12 }}
                    >
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.loginPromptPrimaryBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <MaterialCommunityIcons name="login" size={18} color={COLORS.white} />
                        <Text style={styles.loginPromptPrimaryBtnText}>Se connecter</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.loginPromptSecondaryBtn}
                      onPress={() => navigation.navigate('QuickAuth', {
                        pendingAction: 'seller-review',
                        returnScreen: 'SellerDetail',
                        returnParams: { sellerId },
                      })}
                    >
                      <MaterialCommunityIcons name="account-plus" size={18} color={COLORS.primary} />
                      <Text style={styles.loginPromptSecondaryBtnText}>Créer un compte</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  scrollView: {
    flex: 1,
  },

  // ── Loading / Error ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.gray,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.backgroundAlt,
  },
  errorIconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  errorBackBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  errorBackBtnGrad: {
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  errorBackBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Hero ──
  heroSection: {
    marginBottom: AVATAR_SIZE / 2,
  },
  heroCover: {
    height: COVER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -60,
    right: -60,
  },
  heroPattern2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -30,
  },
  heroPattern3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 40,
    left: SCREEN_WIDTH / 2 - 40,
  },
  heroBackBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarWrapper: {
    position: 'absolute',
    bottom: -(AVATAR_SIZE / 2),
    alignSelf: 'center',
    left: SCREEN_WIDTH / 2 - AVATAR_SIZE / 2 - 4,
  },
  heroAvatarRing: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  heroAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  heroVerifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // ── Infos vendeur ──
  sellerInfoSection: {
    alignItems: 'center',
    paddingTop: AVATAR_SIZE / 2 + 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.black,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(178,144,95,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginBottom: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  sellerDesc: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.black,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  // Boutons action
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  followBtnWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  followBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  followBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconActionBtnActive: {
    borderColor: COLORS.red,
  },
  visitStoreBtnWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
    gap: 5,
  },
  visitStoreBtnDisabled: {
    borderColor: COLORS.midGray,
    backgroundColor: COLORS.lightGray,
  },
  visitStoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Alerte suspension
  suspendedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  suspendedBannerGrad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  suspendedBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.red,
    fontWeight: '600',
    lineHeight: 19,
  },

  // ── Onglets ──
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabBtnActive: {},
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray,
  },
  tabBadgeTextActive: {
    color: COLORS.primary,
  },

  // ── Contenu onglets ──
  tabContent: {
    padding: 16,
  },
  aboutSection: {
    gap: 14,
  },
  infoSection: {
    gap: 14,
  },

  // Info cards
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  infoCardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.black,
  },
  infoCardBody: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowLabel: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  infoRowValue: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
  infoRowSep: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 38,
  },
  descText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },

  // ── Avis ──
  reviewsSection: {
    gap: 16,
  },
  ratingCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingCardGrad: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  ratingBigNum: {
    fontSize: 52,
    fontWeight: '800',
    color: COLORS.black,
    lineHeight: 58,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingCountText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  emptyReviews: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyReviewsIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyReviewsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyReviewsText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarLetter: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 3,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDotSep: {
    fontSize: 11,
    color: COLORS.midGray,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 21,
    marginBottom: 12,
  },
  reviewCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  reviewLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
  },
  reviewLikeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  reviewLikeBtnText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '700',
  },
  reviewLikeBtnTextActive: {
    color: COLORS.white,
  },
  reviewDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.redLight,
  },
  reviewDeleteBtnText: {
    fontSize: 12,
    color: COLORS.red,
    fontWeight: '700',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  pageBtnTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },

  // Formulaire avis
  addReviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  addReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  addReviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.black,
  },
  ratingInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: COLORS.black,
    minHeight: 100,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 21,
  },
  submitReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitReviewBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },

  // Login prompt
  loginPromptCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loginPromptGrad: {
    padding: 32,
    alignItems: 'center',
  },
  loginPromptIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loginPromptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginPromptText: {
    fontSize: 13,
    color: COLORS.darkGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  loginPromptPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginPromptPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  loginPromptSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    width: '100%',
    gap: 8,
  },
  loginPromptSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },

  bottomSpacing: {
    height: 40,
  },
});
