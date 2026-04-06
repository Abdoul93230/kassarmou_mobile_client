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
const BANNER_HEIGHT = 200;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#718096',
  lightGray: '#E2E8F0',
  darkGray: '#4A5568',
  green: '#008751',
  red: '#FF6B6B',
  lightRed: '#FFE5E5',
  lightGreen: '#E6FFEA',
  blue: '#3B82F6',
  yellow: '#FCD34D',
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
      const response = await axios.get(`${API_URL}/getSeller/${sellerId}`);
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

  const ProductCard = ({ product, showRanking = false }) => {
    const discount = calculateDiscount(product.prix, product.prixPromo);
    const finalPrice = product.prixPromo || product.prix;
    const isLiked = likedProducts.includes(product._id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductClick(product)}
        activeOpacity={0.9}
      >
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: product.image1 || product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {showRanking && (
              <LinearGradient
                colors={['#FCD34D', '#F59E0B']}
                style={styles.badge}
              >
                <Text style={styles.badgeText}>#{hotDeals.indexOf(product) + 1}</Text>
              </LinearGradient>
            )}
            {discount > 0 && (
              <LinearGradient colors={['#10B981', '#059669']} style={styles.badge}>
                <Text style={styles.badgeText}>-{discount}%</Text>
              </LinearGradient>
            )}
          </View>

          {/* Heart button */}
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLikeClick(product)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? COLORS.red : COLORS.gray}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.productInfo}>
          {product.marque && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {product.marque}
            </Text>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>
              {formatPrice(finalPrice)} <Text style={styles.currency}>XOF</Text>
            </Text>
            {product.prix && product.prix > finalPrice && (
              <Text style={styles.oldPrice}>{formatPrice(product.prix)} XOF</Text>
            )}
          </View>

          {product.soldCount > 0 && (
            <View style={styles.soldContainer}>
              <MaterialCommunityIcons name="account-group" size={12} color={COLORS.gray} />
              <Text style={styles.soldText}>{product.soldCount} vendus</Text>
            </View>
          )}

          {product.variants && product.variants.length > 0 && (
            <View style={styles.variantsContainer}>
              {product.variants.slice(0, 3).map((variant, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.colorDot,
                    {
                      backgroundColor: variant.colorCode?.replace(/`/g, '') || variant.color,
                    },
                  ]}
                />
              ))}
              {product.variants.length > 3 && (
                <Text style={styles.moreVariants}>+{product.variants.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du magasin...</Text>
      </View>
    );
  }

  if (!sellerInfo) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="store-off" size={64} color={COLORS.lightGray} />
        <Text style={styles.errorText}>Magasin introuvable</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, '#62aca2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sellerInfo.storeName || `${sellerInfo.userName2} ${sellerInfo.name}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => {
                navigation.navigate('SellerDetail', {
                  sellerId: sellerId,
                });
              }}
            >
              <Ionicons name="information-circle" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleStoreLikeToggle}
            >
              <Ionicons 
                name={hasLikedStore ? 'heart' : 'heart-outline'} 
                size={24} 
                color={COLORS.white} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="share-social" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[COLORS.primary]} />
        }
      >
        {/* Store Info */}
        <View style={styles.storeInfoCard}>
          <View style={styles.storeHeader}>
            <Image
              source={{ uri: sellerInfo.logo || 'https://via.placeholder.com/100' }}
              style={styles.storeLogo}
            />
            <View style={styles.storeDetails}>
              <Text style={styles.storeName} numberOfLines={2}>
                {sellerInfo.storeName || `${sellerInfo.userName2} ${sellerInfo.name}`}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <MaterialCommunityIcons name="account-group" size={16} color={COLORS.gray} />
                  <Text style={styles.statText}>{socialStats.followersCount}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="star" size={16} color={COLORS.yellow} />
                  <Text style={styles.statText}>
                    {socialStats.rating.toFixed(1)}<Text> (</Text>{socialStats.reviewsCount}<Text>)</Text>
                  </Text>
                </View>
              </View>

              {sellerInfo.storeDescription && (
                <Text style={styles.storeDescription} numberOfLines={3}>
                  {sellerInfo.storeDescription}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.followButton}
            onPress={handleFollowToggle}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isFollowing ? ['#E0F2FE', '#BAE6FD'] : [COLORS.primary, '#2D8B7C']}
              style={styles.followButtonGradient}
            >
              <View style={styles.followButtonContent}>
                <Ionicons 
                  name={isFollowing ? "checkmark-circle" : "add-circle-outline"} 
                  size={20} 
                  color={isFollowing ? COLORS.primary : COLORS.white} 
                />
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Abonné' : 'Suivre'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Trust indicator */}
          <View style={styles.trustContainer}>
            <View style={styles.trustHeader}>
              <Text style={styles.trustLabel}>Niveau de confiance</Text>
              <Text style={styles.trustPercent}>{Math.round(socialStats.rating * 20)}<Text>%</Text></Text>
            </View>
            <View style={styles.trustBar}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={[styles.trustFill, { width: `${Math.round(socialStats.rating * 20)}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.activeTab]}
            onPress={() => setActiveTab('home')}
          >
            <Ionicons
              name="home"
              size={20}
              color={activeTab === 'home' ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              Accueil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'all_items' && styles.activeTab]}
            onPress={() => setActiveTab('all_items')}
          >
            <MaterialCommunityIcons
              name="grid"
              size={20}
              color={activeTab === 'all_items' ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === 'all_items' && styles.activeTabText]}>
              <Text>Tous (</Text>{products.length}<Text>)</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'new_arrivals' && styles.activeTab]}
            onPress={() => setActiveTab('new_arrivals')}
          >
            <Ionicons
              name="flash"
              size={20}
              color={activeTab === 'new_arrivals' ? COLORS.primary : COLORS.gray}
            />
            <Text style={[styles.tabText, activeTab === 'new_arrivals' && styles.activeTabText]}>
              <Text>Nouveautés (</Text>{newArrivals.length}<Text>)</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Home Tab Content */}
        {activeTab === 'home' && (
          <View style={styles.contentContainer}>
            {/* Banners */}
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
                        colors={['transparent', 'rgba(0,0,0,0.3)']}
                        style={styles.bannerGradient}
                      />
                    </View>
                  ))}
                </ScrollView>

                {banners.length > 1 && (
                  <View style={styles.bannerIndicators}>
                    {banners.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.bannerDot,
                          currentBannerIndex === index && styles.activeBannerDot,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Promo Products */}
            {promoProducts.length > 0 && (
              <View style={styles.section}>
                <LinearGradient
                  colors={['#FEF3C7', '#FDE68A']}
                  style={styles.sectionHeaderGradient}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <MaterialCommunityIcons name="fire" size={24} color={COLORS.secondary} />
                      <Text style={styles.sectionTitle}>Offres Flash</Text>
                    </View>
                    <TouchableOpacity onPress={() => setActiveTab('all_items')}>
                      <Text style={styles.viewAllText}>Voir tout</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

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

            {/* Hot Deals */}
            {hotDeals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialCommunityIcons name="trending-up" size={24} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Meilleures ventes</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('all_items')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={hotDeals.slice(0, 6)}
                  renderItem={({ item }) => <ProductCard product={item} showRanking />}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* New Arrivals */}
            {newArrivals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <Ionicons name="flash" size={24} color={COLORS.blue} />
                    <Text style={styles.sectionTitle}>Nouveautés</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveTab('new_arrivals')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={newArrivals.slice(0, 6)}
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

        {/* All Items Tab Content */}
        {activeTab === 'all_items' && (
          <View style={styles.contentContainer}>
            {/* Search and Sort */}
            <View style={styles.filterSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher des produits..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortButtons}>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'best_match' && styles.activeSortButton]}
                  onPress={() => setSortBy('best_match')}
                >
                  <Text
                    style={[styles.sortButtonText, sortBy === 'best_match' && styles.activeSortButtonText]}
                  >
                    Pertinence
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'orders' && styles.activeSortButton]}
                  onPress={() => setSortBy('orders')}
                >
                  <Text
                    style={[styles.sortButtonText, sortBy === 'orders' && styles.activeSortButtonText]}
                  >
                    Plus vendus
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'prices' && styles.activeSortButton]}
                  onPress={() => setSortBy('prices')}
                >
                  <Text
                    style={[styles.sortButtonText, sortBy === 'prices' && styles.activeSortButtonText]}
                  >
                    Prix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'newest' && styles.activeSortButton]}
                  onPress={() => setSortBy('newest')}
                >
                  <Text
                    style={[styles.sortButtonText, sortBy === 'newest' && styles.activeSortButtonText]}
                  >
                    Récents
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Categories */}
              {categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
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
            </View>

            {/* Products Grid */}
            <View style={styles.productsContainer}>
              <Text style={styles.resultsCount}>{filteredProducts.length} produits</Text>
              {filteredProducts.length > 0 ? (
                <FlatList
                  data={sortProducts(filteredProducts)}
                  renderItem={({ item }) => <ProductCard product={item} />}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="package-variant" size={64} color={COLORS.lightGray} />
                  <Text style={styles.emptyText}>Aucun produit trouvé</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* New Arrivals Tab Content */}
        {activeTab === 'new_arrivals' && (
          <View style={styles.contentContainer}>
            {promoProducts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <MaterialCommunityIcons name="fire" size={24} color={COLORS.red} />
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

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="time" size={24} color={COLORS.blue} />
                  <Text style={styles.sectionTitle}>Ajoutés récemment</Text>
                </View>
              </View>

              <FlatList
                data={newArrivals}
                renderItem={({ item }) => <ProductCard product={item} />}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                scrollEnabled={false}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.gray,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  storeInfoCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  storeLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  storeDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 6,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  storeDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
    marginTop: 4,
  },
  followButton: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  followButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  trustContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  trustPercent: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '700',
  },
  trustBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  trustFill: {
    height: '100%',
    borderRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
    flexShrink: 1,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  bannerSection: {
    marginBottom: 16,
  },
  bannerSlide: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bannerIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  activeBannerDot: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  section: {
    marginBottom: 32,
    marginTop: 8,
  },
  sectionHeaderGradient: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  productRow: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(48, 160, 139, 0.06)',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  likeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productBrand: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 6,
    lineHeight: 17,
    minHeight: 34,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 8,
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  currency: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  oldPrice: {
    fontSize: 13,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  soldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  soldText: {
    marginLeft: 4,
    fontSize: 11,
    color: COLORS.gray,
  },
  variantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  moreVariants: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: 4,
  },
  filterSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: COLORS.black,
  },
  sortButtons: {
    marginBottom: 12,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeSortButtonText: {
    color: COLORS.white,
  },
  categoriesScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  productsContainer: {
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
});
