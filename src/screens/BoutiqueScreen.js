import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Alert,
  Share,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { fetchUserLikes, toggleLike } from '../redux/likesSlice';
import { addArticleToPanier } from '../redux/cartSlice';
import { API_URL } from '../config/api';
import socialService from '../services/socialService';
import { formatPrice } from '../utils/formatPrice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const COLORS = {
  primary: '#30A08B',
  primaryDark: '#1d7a6a',
  primaryDeep: '#0d5c4e',
  secondary: '#B2905F',
  tertiary: '#B17236',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#718096',
  lightGray: '#E2E8F0',
  darkGray: '#4A5568',
  bgLight: '#F8FAFC',
  green: '#008751',
  red: '#EF4444',
  lightRed: '#FFE5E5',
  lightGreen: '#E6FFEA',
  blue: '#3B82F6',
  yellow: '#FBBF24',
  orange: '#F97316',
  cardBorder: 'rgba(48, 160, 139, 0.08)',
};

export default function BoutiqueScreen({ route, navigation }) {
  const routeParams = route?.params || {};
  const { sellerId: initialSellerId = null, storeName = null } = routeParams;
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const likedProducts = useSelector((state) => state.likes.likedProducts || []);

  // États principaux
  const [activeTab, setActiveTab] = useState('home');
  const [sortBy, setSortBy] = useState('best_match');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Données du store
  const [sellerInfo, setSellerInfo] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [socialStats, setSocialStats] = useState({
    followersCount: 0,
    likesCount: 0,
    reviewsCount: 0,
    rating: 0,
  });

  // Produits filtrés
  const [hotDeals, setHotDeals] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [promoProducts, setPromoProducts] = useState([]);

  const [isFollowing, setIsFollowing] = useState(false);
  const [hasLikedStore, setHasLikedStore] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resolvedSellerId, setResolvedSellerId] = useState(initialSellerId);

  const sellerId = resolvedSellerId || initialSellerId;

  useEffect(() => {
    setResolvedSellerId(initialSellerId || null);
    setSellerInfo(null);
  }, [initialSellerId, storeName]);

  const bannerScrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  // Recharger les relations quand l'utilisateur se connecte/déconnecte
  useEffect(() => {
    if (isAuthenticated && sellerId) {
      checkUserRelations();
    }
  }, [isAuthenticated, sellerId]);

  useEffect(() => {
    const resolveSellerByStoreName = async () => {
      if (sellerId || !storeName) return;

      try {
        const response = await axios.get(
          `${API_URL}/getSellerByNameClients/${encodeURIComponent(storeName)}`
        );
        const sellerData = response.data?.data;
        if (sellerData?._id) {
          setResolvedSellerId(sellerData._id);
          setSellerInfo(sellerData);
        }
      } catch (error) {
        console.error('Erreur résolution vendeur via storeName:', error);
      }
    };

    resolveSellerByStoreName();
  }, [sellerId, storeName]);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const userId = user?.id || user?._id;
    if (userId) {
      dispatch(fetchUserLikes(userId));
    }
  }, [user?.id, user?._id, sellerId]);

  // Auto-scroll banner
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          bannerScrollRef.current?.scrollTo({
            x: nextIndex * SCREEN_WIDTH,
            animated: true,
          });
          return nextIndex;
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Vérifier les relations de l'utilisateur avec le vendeur
  const checkUserRelations = async () => {
    const userId = user?.id || user?._id;
    if (!userId || !sellerId) return;

    try {
      // Vérifier le statut de suivi
      const followersResponse = await socialService.getSellerFollowers(sellerId);
      const followersData = followersResponse?.data?.followers || followersResponse?.data?.data || [];
      const isUserFollowing = Array.isArray(followersData) && followersData.some(
        (follower) => follower._id === userId || follower.id === userId
      );
      setIsFollowing(isUserFollowing);

      // Vérifier le statut de like
      const likeResponse = await socialService.checkStoreLike(sellerId);
      const likeData = likeResponse?.data || likeResponse;
      setHasLikedStore(likeData.hasLiked || likeData.liked || false);

      console.log('État initial - Suivre:', isUserFollowing, 'Like:', likeData.hasLiked || likeData.liked);
    } catch (error) {
      console.error('Erreur lors de la vérification des relations:', error);
      setIsFollowing(false);
      setHasLikedStore(false);
    }
  };

  const loadData = async () => {
    if (!sellerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all([
        fetchSellerInfo(),
        fetchProducts(),
        fetchCategories(),
        fetchBanners(),
      ]);

      // Vérifier les relations après avoir chargé les données
      if (isAuthenticated) {
        await checkUserRelations();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du magasin');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSellerInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/getSellerClients/${sellerId}`);
      const sellerData = response.data.data;
      setSellerInfo(sellerData);
      setSocialStats({
        followersCount: sellerData?.followersCount || 0,
        likesCount: sellerData?.likesCount || 0,
        reviewsCount: sellerData?.reviewsCount || 0,
        rating: sellerData?.rating || 4.5,
      });

      // Afficher un avertissement si le vendeur est suspendu
      if (!sellerData?.isvalid || sellerData?.subscriptionStatus === 'suspended') {
        Alert.alert(
          '⚠️ Boutique suspendue',
          'Cette boutique est temporairement suspendue. Certains produits peuvent ne pas être disponibles.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des infos vendeur:', error.response?.data || error.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/searchProductBySupplierClients/${sellerId}`);
      const publishedProducts = response.data.data.filter(
        (product) => product.isPublished === 'Published'
      );

      setProducts(publishedProducts);
      setAllProducts(publishedProducts);
      processProductCategories(publishedProducts);
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
    }
  };

  const processProductCategories = (products) => {
    const sortedBySales = [...products]
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 6);
    setHotDeals(sortedBySales);

    const sortedByDate = [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    setNewArrivals(sortedByDate);

    const promoItems = products.filter(
      (product) => product.prix && product.prixPromo && product.prixPromo < product.prix
    ).slice(0, 6);
    setPromoProducts(promoItems);
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/getAllTypeBySeller/${sellerId}`);
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/marketing/Bannerss/${sellerId}`);
      if (response.data.success) {
        setBanners(response.data.data || []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des bannières:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour suivre ce vendeur',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'boutique-like',
              returnScreen: 'Boutique',
              returnParams: { storeName },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'boutique-like',
              returnScreen: 'Boutique',
              returnParams: { storeName },
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
      } else {
        await socialService.followSeller(sellerId);
        setIsFollowing(true);
        setSocialStats({
          ...socialStats,
          followersCount: socialStats.followersCount + 1,
        });
      }
    } catch (error) {
      console.error('Erreur lors du changement de suivi:', error);
      Alert.alert('Erreur', 'Impossible de modifier le suivi');
      setIsFollowing(!isFollowing);
    }
  };

  const handleStoreLikeToggle = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour liker cette boutique',
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'boutique-follow',
              returnScreen: 'Boutique',
              returnParams: { storeName },
            }),
          },
          {
            text: 'Créer un compte',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'boutique-follow',
              returnScreen: 'Boutique',
              returnParams: { storeName },
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
      console.error('Erreur lors du like de la boutique:', error);
      Alert.alert('Erreur', 'Impossible de modifier le like');
      setHasLikedStore(!hasLikedStore);
    }
  };

  const handleProductClick = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleLikeClick = async (product) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter des favoris');
      return;
    }

    try {
      await dispatch(toggleLike({ userId, product })).unwrap();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleCategoryFilter = async (categoryId, categoryName) => {
    setIsLoading(true);
    try {
      if (categoryName === 'All') {
        setAllProducts(products);
      } else {
        const response = await axios.get(
          `${API_URL}/searchProductByTypeBySeller/${categoryId}/${sellerId}`
        );
        const publishedProducts = response.data.products.filter(
          (product) => product.isPublished === 'Published'
        );
        setAllProducts(publishedProducts);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de filtrer par catégorie');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return allProducts.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.marque?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allProducts, searchTerm]);

  const sortProducts = (products) => {
    switch (sortBy) {
      case 'orders':
        return [...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
      case 'prices':
        return [...products].sort((a, b) => (a.prixPromo || a.prix) - (b.prixPromo || b.prix));
      case 'newest':
        return [...products].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return products;
    }
  };

  const calculateDiscount = (prix, currentPrice) => {
    if (!prix || !currentPrice || prix <= currentPrice) return 0;
    return Math.round(((prix - currentPrice) / prix) * 100);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez la boutique ${sellerInfo?.storeName || ''} sur Iham Baobab !`,
        url: `https://ihambaobab.com/boutique/${encodeURIComponent(sellerInfo?.storeName || '')}`,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // ── ProductCard moderne ──────────────────────────────────────────────────
  const ProductCard = ({ product, showRanking = false }) => {
    const discount = calculateDiscount(product.prix, product.prixPromo);
    const finalPrice = product.prixPromo || product.prix;
    const isLiked = likedProducts.includes(product._id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductClick(product)}
        activeOpacity={0.92}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: product.image1 || product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />

          {/* Badges top-left */}
          <View style={styles.badgeContainer}>
            {showRanking && (
              <LinearGradient
                colors={[COLORS.yellow, COLORS.orange]}
                style={styles.badge}
              >
                <Text style={styles.badgeText}>#{hotDeals.indexOf(product) + 1}</Text>
              </LinearGradient>
            )}
            {discount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>-{discount}%</Text>
              </View>
            )}
          </View>

          {/* Heart button */}
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLikeClick(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? COLORS.red : COLORS.gray}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.productInfo}>
          {product.marque && (
            <View style={styles.brandBadge}>
              <Text style={styles.productBrand} numberOfLines={1}>
                {product.marque}
              </Text>
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatPrice(finalPrice)}{' '}
              <Text style={styles.currency}>F</Text>
            </Text>
            {product.prix && product.prix > finalPrice && (
              <Text style={styles.oldPrice}>{formatPrice(product.prix)}</Text>
            )}
          </View>

          {product.soldCount > 0 && (
            <View style={styles.soldContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={11} color={COLORS.gray} />
              <Text style={styles.soldText}>{product.soldCount} vendus</Text>
            </View>
          )}

          {product.variants && product.variants.length > 0 && (
            <View style={styles.variantsContainer}>
              {product.variants.slice(0, 4).map((variant, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: variant.colorCode?.replace(/`/g, '') || variant.color || '#ccc',
                    },
                  ]}
                />
              ))}
              {product.variants.length > 4 && (
                <Text style={styles.moreVariants}>+{product.variants.length - 4}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── NewArrivalRow (card horizontale pour tab Nouveautés) ─────────────────
  const NewArrivalRow = ({ product }) => {
    const discount = calculateDiscount(product.prix, product.prixPromo);
    const finalPrice = product.prixPromo || product.prix;
    const isLiked = likedProducts.includes(product._id);

    return (
      <TouchableOpacity
        style={styles.newArrivalRow}
        onPress={() => handleProductClick(product)}
        activeOpacity={0.9}
      >
        <View style={styles.newArrivalImageWrap}>
          <Image
            source={{ uri: product.image1 || product.image }}
            style={styles.newArrivalImage}
            resizeMode="cover"
          />
          {discount > 0 && (
            <View style={styles.newArrivalBadge}>
              <Text style={styles.newArrivalBadgeText}>-{discount}%</Text>
            </View>
          )}
        </View>
        <View style={styles.newArrivalInfo}>
          <Text style={styles.newArrivalName} numberOfLines={2}>{product.name}</Text>
          {product.marque && (
            <Text style={styles.newArrivalBrand} numberOfLines={1}>{product.marque}</Text>
          )}
          <View style={styles.newArrivalPriceRow}>
            <View style={styles.newArrivalPrices}>
              <Text style={styles.newArrivalPrice}>
                {formatPrice(finalPrice)} <Text style={styles.currency}>F</Text>
              </Text>
              {discount > 0 && (
                <Text style={styles.newArrivalOldPrice}>{formatPrice(product.prix)}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.newArrivalLike}
              onPress={() => handleLikeClick(product)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? COLORS.red : COLORS.gray}
              />
            </TouchableOpacity>
          </View>
          {product.variants && product.variants.length > 0 && (
            <View style={styles.variantsContainer}>
              {product.variants.slice(0, 5).map((variant, idx) => (
                <View
                  key={idx}
                  style={[styles.colorDot, {
                    backgroundColor: variant.colorCode?.replace(/`/g, '') || variant.color || '#ccc',
                  }]}
                />
              ))}
              {product.variants.length > 5 && (
                <Text style={styles.moreVariants}>+{product.variants.length - 5}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Skeleton loader ──────────────────────────────────────────────────────
  if (isLoading && !refreshing) {
    return (
      <View style={styles.skeletonContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {/* Hero skeleton */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark, COLORS.primaryDeep]}
          style={styles.skeletonHero}
        >
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: 120, marginTop: 6 }]} />
          <View style={styles.skeletonStatsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonStat} />
            ))}
          </View>
          <View style={styles.skeletonActions}>
            <View style={styles.skeletonBtn} />
            <View style={styles.skeletonBtn} />
          </View>
        </LinearGradient>
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement de la boutique…</Text>
        </View>
      </View>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (!sellerInfo) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgLight} />
        <View style={styles.errorIconWrap}>
          <MaterialCommunityIcons name="store-off" size={48} color={COLORS.lightGray} />
        </View>
        <Text style={styles.errorText}>Magasin introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const storeName_ = sellerInfo.storeName || `${sellerInfo.userName2 || ''} ${sellerInfo.name || ''}`.trim();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDeep} translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        stickyHeaderIndices={[2]}
      >
        {/* ── 0: Hero store header ─────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark, COLORS.primaryDeep]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroContainer}
        >
          {/* Cover image overlay */}
          {sellerInfo.coverImage && (
            <Image
              source={{ uri: sellerInfo.coverImage }}
              style={styles.heroCoverImage}
              resizeMode="cover"
            />
          )}
          {/* Overlay */}
          <View style={styles.heroOverlay} />

          {/* Decorative circles */}
          <View style={styles.heroCircleTopRight} />
          <View style={styles.heroCircleBottomLeft} />

          {/* Back button */}
          <TouchableOpacity
            style={styles.heroBackBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Logo + name */}
          <View style={styles.heroContent}>
            {/* Avatar */}
            <View style={styles.heroAvatarWrap}>
              <Image
                source={{
                  uri: sellerInfo.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(storeName_)}&background=30A08B&color=fff&size=120`,
                }}
                style={styles.heroAvatar}
              />
              {sellerInfo.isvalid && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                </View>
              )}
            </View>

            {/* Store name */}
            <Text style={styles.heroStoreName} numberOfLines={2}>{storeName_}</Text>

            {/* Description */}
            {sellerInfo.storeDescription ? (
              <Text style={styles.heroDescription} numberOfLines={2}>
                {sellerInfo.storeDescription}
              </Text>
            ) : null}

            {/* Stats row */}
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{socialStats.followersCount}</Text>
                <Text style={styles.heroStatLabel}>Abonnés</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{products.length}</Text>
                <Text style={styles.heroStatLabel}>Produits</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <View style={styles.heroRatingRow}>
                  <Ionicons name="star" size={14} color={COLORS.yellow} />
                  <Text style={styles.heroStatValue}>{socialStats.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.heroStatLabel}>{socialStats.reviewsCount} avis</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.heroActions}>
              {/* Suivre */}
              <TouchableOpacity
                style={styles.heroFollowBtn}
                onPress={handleFollowToggle}
                activeOpacity={0.85}
              >
                {isFollowing ? (
                  <View style={styles.heroFollowBtnFollowing}>
                    <Ionicons name="checkmark" size={15} color={COLORS.white} />
                    <Text style={styles.heroFollowBtnTextFollowing}>Suivi</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={[COLORS.white, 'rgba(255,255,255,0.9)']}
                    style={styles.heroFollowBtnGradient}
                  >
                    <Text style={styles.heroFollowBtnText}>+ Suivre</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              {/* Contacter */}
              <TouchableOpacity
                style={styles.heroContactBtn}
                onPress={() => navigation.navigate('SellerDetail', { sellerId })}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-outline" size={15} color={COLORS.white} />
                <Text style={styles.heroContactBtnText}>Contacter</Text>
              </TouchableOpacity>

              {/* Partager */}
              <TouchableOpacity
                style={styles.heroShareBtn}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social-outline" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ── 1: Info bar (adresse, tel, horaires) ─────────────────────── */}
        {(sellerInfo.address || sellerInfo.businessPhone || sellerInfo.openingHours) && (
          <View style={styles.infoBar}>
            {sellerInfo.address && (
              <View style={styles.infoBarItem}>
                <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                <Text style={styles.infoBarText} numberOfLines={1}>{sellerInfo.address}</Text>
              </View>
            )}
            {sellerInfo.businessPhone && (
              <View style={styles.infoBarItem}>
                <Ionicons name="call-outline" size={13} color={COLORS.primary} />
                <Text style={styles.infoBarText} numberOfLines={1}>{sellerInfo.businessPhone}</Text>
              </View>
            )}
            {sellerInfo.openingHours && (
              <View style={styles.infoBarItem}>
                <Ionicons name="time-outline" size={13} color={COLORS.primary} />
                <Text style={styles.infoBarText} numberOfLines={1}>{sellerInfo.openingHours}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── 2: Tabs sticky ───────────────────────────────────────────── */}
        <View style={styles.tabsContainer}>
          {[
            { id: 'home', label: 'Accueil', icon: 'home-outline' },
            { id: 'all_items', label: `Tous (${products.length})`, icon: 'grid-outline' },
            { id: 'new_arrivals', label: `Nouveautés (${newArrivals.length})`, icon: 'flash-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={activeTab === tab.id ? COLORS.primary : COLORS.gray}
              />
              <Text
                style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB: Accueil ─────────────────────────────────────────────── */}
        {activeTab === 'home' && (
          <View style={styles.tabContent}>
            {/* Banner carousel */}
            {banners.length > 0 && (
              <View style={styles.bannerSection}>
                <ScrollView
                  ref={bannerScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentBannerIndex(index);
                  }}
                  scrollEventThrottle={16}
                >
                  {banners.map((banner, index) => (
                    <View key={index} style={styles.bannerSlide}>
                      <Image source={{ uri: banner.image }} style={styles.bannerImage} />
                      <LinearGradient
                        colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                  ))}
                </ScrollView>
                {banners.length > 1 && (
                  <View style={styles.bannerIndicators}>
                    {banners.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.bannerDot,
                          currentBannerIndex === index && styles.activeBannerDot,
                        ]}
                        onPress={() => {
                          setCurrentBannerIndex(index);
                          bannerScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Offres Flash */}
            {promoProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <LinearGradient colors={[COLORS.red, '#dc2626']} style={styles.sectionIcon}>
                      <Ionicons name="flash" size={16} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.sectionTitle}>Offres Flash</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('all_items')} style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={promoProducts.slice(0, 4)}
                  renderItem={({ item }) => <ProductCard product={item} />}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Meilleures ventes */}
            {hotDeals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <LinearGradient colors={[COLORS.yellow, COLORS.orange]} style={styles.sectionIcon}>
                      <MaterialCommunityIcons name="trending-up" size={16} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.sectionTitle}>Meilleures ventes</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('all_items')} style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                >
                  {hotDeals.map((item) => (
                    <TouchableOpacity
                      key={item._id}
                      style={styles.horizontalCard}
                      onPress={() => handleProductClick(item)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.horizontalCardImageWrap}>
                        <Image
                          source={{ uri: item.image1 || item.image }}
                          style={styles.horizontalCardImage}
                          resizeMode="cover"
                        />
                        {calculateDiscount(item.prix, item.prixPromo) > 0 && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                              -{calculateDiscount(item.prix, item.prixPromo)}%
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.likeButton}
                          onPress={() => handleLikeClick(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={likedProducts.includes(item._id) ? 'heart' : 'heart-outline'}
                            size={16}
                            color={likedProducts.includes(item._id) ? COLORS.red : COLORS.gray}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.horizontalCardInfo}>
                        <Text style={styles.horizontalCardName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.horizontalCardPrice}>
                          {formatPrice(item.prixPromo || item.prix)}
                          <Text style={styles.currency}> F</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Nouveautés section */}
            {newArrivals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <LinearGradient colors={['#60A5FA', '#8B5CF6']} style={styles.sectionIcon}>
                      <Ionicons name="sparkles" size={16} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.sectionTitle}>Nouveautés</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('new_arrivals')} style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={newArrivals.slice(0, 4)}
                  renderItem={({ item }) => <ProductCard product={item} />}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        )}

        {/* ── TAB: Tous les produits ───────────────────────────────────── */}
        {activeTab === 'all_items' && (
          <View style={styles.tabContent}>
            {/* Search + sort */}
            <View style={styles.filterCard}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.gray} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher dans cette boutique…"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor={COLORS.gray}
                  returnKeyType="search"
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchTerm('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sortRow}
                contentContainerStyle={styles.sortRowContent}
              >
                {[
                  { value: 'best_match', label: 'Pertinence' },
                  { value: 'orders', label: 'Plus vendus' },
                  { value: 'prices', label: 'Prix ↑' },
                  { value: 'newest', label: 'Récents' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sortChip, sortBy === opt.value && styles.activeSortChip]}
                    onPress={() => setSortBy(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.sortChipText, sortBy === opt.value && styles.activeSortChipText]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Categories */}
              {categories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sortRowContent}
                  style={{ marginTop: 4 }}
                >
                  <TouchableOpacity
                    style={styles.categoryChip}
                    onPress={() => handleCategoryFilter(null, 'All')}
                  >
                    <Text style={styles.categoryChipText}>Tous</Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category._id}
                      style={styles.categoryChip}
                      onPress={() => handleCategoryFilter(category._id, category.name)}
                    >
                      <Text style={styles.categoryChipText}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.resultsCount}>
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Grid produits */}
            {filteredProducts.length > 0 ? (
              <FlatList
                data={sortProducts(filteredProducts)}
                renderItem={({ item }) => <ProductCard product={item} />}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons name="package-variant" size={40} color={COLORS.lightGray} />
                </View>
                <Text style={styles.emptyText}>Aucun produit trouvé</Text>
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { setSearchTerm(''); setAllProducts(products); }}
                    style={styles.resetBtn}
                  >
                    <Text style={styles.resetBtnText}>Réinitialiser</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── TAB: Nouveautés ─────────────────────────────────────────── */}
        {activeTab === 'new_arrivals' && (
          <View style={styles.tabContent}>
            {/* En promotion */}
            {promoProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <LinearGradient colors={[COLORS.red, '#dc2626']} style={styles.sectionIcon}>
                      <Ionicons name="flash" size={16} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.sectionTitle}>En promotion</Text>
                  </View>
                </View>

                <FlatList
                  data={promoProducts}
                  renderItem={({ item }) => <ProductCard product={item} />}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Ajoutés récemment — liste horizontale */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <LinearGradient colors={['#60A5FA', '#6366F1']} style={styles.sectionIcon}>
                    <Ionicons name="time-outline" size={16} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.sectionTitle}>Ajoutés récemment</Text>
                </View>
              </View>

              <View style={styles.newArrivalsListContainer}>
                {newArrivals.map((item) => (
                  <NewArrivalRow key={item._id} product={item} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Container
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },

  // ── Skeleton / Loading
  skeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  skeletonHero: {
    paddingTop: STATUS_BAR_HEIGHT + 20,
    paddingBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skeletonAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  skeletonLine: {
    height: 14,
    width: 180,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 20,
  },
  skeletonStat: {
    width: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skeletonBtn: {
    width: 100,
    height: 38,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // ── Error / empty state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    padding: 32,
  },
  errorIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 17,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Hero
  heroContainer: {
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  heroCoverImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroCircleTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroCircleBottomLeft: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBackBtn: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 8,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  heroAvatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
    borderColor: COLORS.white,
    backgroundColor: COLORS.lightGray,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  heroStoreName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 30,
  },
  heroDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: SCREEN_WIDTH - 64,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  heroRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroFollowBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  heroFollowBtnGradient: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFollowBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroFollowBtnFollowing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
  },
  heroFollowBtnTextFollowing: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroContactBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  heroShareBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Info bar
  infoBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    justifyContent: 'center',
  },
  infoBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoBarText: {
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '500',
    maxWidth: 160,
  },

  // ── Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    gap: 5,
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 11.5,
    color: COLORS.gray,
    fontWeight: '600',
    flexShrink: 1,
  },
  activeTabText: {
    color: COLORS.primary,
  },

  // ── Tab content wrapper
  tabContent: {
    paddingBottom: 8,
  },

  // ── Banners
  bannerSection: {
    marginBottom: 4,
    position: 'relative',
  },
  bannerSlide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeBannerDot: {
    backgroundColor: COLORS.white,
    width: 22,
    borderRadius: 3,
  },

  // ── Sections
  section: {
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a202c',
    letterSpacing: -0.2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── Product grid
  productRow: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  gridContent: {
    paddingHorizontal: 0,
  },

  // ── ProductCard
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 156,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  discountBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  discountBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  likeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    padding: 10,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(48,160,139,0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 5,
  },
  productBrand: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 6,
    lineHeight: 17,
    minHeight: 34,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  currency: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.gray,
  },
  oldPrice: {
    fontSize: 12,
    color: '#aaa',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  soldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  soldText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  variantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  moreVariants: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
  },

  // ── Horizontal scroll cards (Meilleures ventes)
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  horizontalCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  horizontalCardImageWrap: {
    position: 'relative',
  },
  horizontalCardImage: {
    width: 140,
    height: 120,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },
  horizontalCardInfo: {
    padding: 8,
  },
  horizontalCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a202c',
    lineHeight: 16,
    marginBottom: 4,
    minHeight: 32,
  },
  horizontalCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a1a',
  },

  // ── Filter card (All items tab)
  filterCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1a202c',
  },
  sortRow: {
    marginBottom: 10,
  },
  sortRowContent: {
    gap: 8,
    paddingRight: 4,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  activeSortChip: {
    backgroundColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  activeSortChipText: {
    color: COLORS.white,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginTop: 8,
  },

  // ── Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 12,
  },
  resetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resetBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ── New arrival row card
  newArrivalsListContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  newArrivalRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 10,
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  newArrivalImageWrap: {
    position: 'relative',
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  newArrivalImage: {
    width: '100%',
    height: '100%',
  },
  newArrivalBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newArrivalBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  newArrivalInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  newArrivalName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a202c',
    lineHeight: 18,
  },
  newArrivalBrand: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  newArrivalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  newArrivalPrices: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  newArrivalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  newArrivalOldPrice: {
    fontSize: 12,
    color: '#aaa',
    textDecorationLine: 'line-through',
  },
  newArrivalLike: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
