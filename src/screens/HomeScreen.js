import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getProducts, getCategories, getProducts_Pubs,getTypes } from '../redux/productsSlice';
import { formatPrice } from '../utils/formatPrice';
import { fetchUserLikes, toggleLike } from '../redux/likesSlice';
import { COLORS } from '../config/constants';
import {
  selectProducts,
  selectTypes,
  selectCategories,
  selectBanners,
  selectUser,
  selectCartItems,
  selectLikedProducts,
} from '../redux/selectors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 180;

// Responsive product card dimensions
const CARD_MARGIN = 8;
const GRID_PADDING = 16;
const getCardWidth = () => {
  const availableWidth = SCREEN_WIDTH - (GRID_PADDING * 2);
  if (SCREEN_WIDTH < 360) {
    // Small screens: 2 columns
    return (availableWidth - CARD_MARGIN) / 2;
  } else if (SCREEN_WIDTH < 768) {
    // Medium screens: 2 columns with more space
    return (availableWidth - CARD_MARGIN) / 2;
  } else {
    // Large screens/tablets: 3 columns
    return (availableWidth - (CARD_MARGIN * 2)) / 3;
  }
};

const CARD_WIDTH = getCardWidth();
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH < 360 ? 160 : 180;

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [popularStores, setPopularStores] = useState([]);
  const bannerScrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Utiliser les sélecteurs mémoïsés pour éviter les re-renders inutiles
  const products = useSelector(selectProducts);
  const types = useSelector(selectTypes);
  const categories = useSelector(selectCategories);
  const banners = useSelector(selectBanners);
  const user = useSelector(selectUser);
  const cartItems = useSelector(selectCartItems);
  const likedProducts = useSelector(selectLikedProducts);


  useEffect(() => {
    loadData();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Load user likes if logged in
    const userId = user?.id || user?._id;
    if (userId) {
      dispatch(fetchUserLikes(userId));
    }
  }, [user?.id, user?._id]);

  // Auto-scroll banner carousel
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          bannerScrollRef.current?.scrollTo({
            x: nextIndex * (BANNER_WIDTH + 16),
            animated: true,
          });
          return nextIndex;
        });
      }, 5000); // Change banner every 5 seconds

      return () => clearInterval(interval);
    }
  }, [banners]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      dispatch(getProducts(setLoading)),
      dispatch(getCategories(setLoading)),
      dispatch(getTypes(setLoading)),
      dispatch(getProducts_Pubs()),
      fetchPopularStores(),
    ]);
    setLoading(false);
  };

  const fetchPopularStores = async () => {
    try {
      const response = await axios.get(`${API_URL}/getSellers`);
      const activeStores = response.data.data
        .filter(store => store.isvalid === true)
        .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
        .slice(0, 6);
      setPopularStores(activeStores);
    } catch (error) {
      console.error('Erreur lors de la récupération des boutiques populaires:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBannerScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_WIDTH + 16));
    setCurrentBannerIndex(index);
  };

  const renderBannerDots = useCallback(() => {
    if (banners.length <= 1) return null;
    
    return (
      <View style={styles.dotsContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentBannerIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>
    );
  }, [banners.length, currentBannerIndex]);

  const renderCategoryCard = useCallback((category) => {
    return (
      <TouchableOpacity
        key={category._id}
        style={styles.categoryCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductListScreen', { categoryId: category._id })}
      >
        <LinearGradient
          colors={['rgba(48, 160, 139, 0.1)', 'rgba(98, 172, 162, 0.2)']}
          style={styles.categoryGradient}
        >
          <Image source={{ uri: category.image }} style={styles.categoryImage} />
          <View style={styles.categoryOverlay}>
            <Text style={styles.categoryName} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [navigation]);

  // Get products for a specific category
 const getProductsByCategory = useCallback((categoryId) => {
    // Create a map of type IDs to their category IDs
    const typeToCategory = {};
    types.forEach(type => {
      typeToCategory[type._id] = type.clefCategories;
    });
    
    // Filter products whose type belongs to this category
    return products.filter(product => {
      const productCategoryId = typeToCategory[product.ClefType];
      return productCategoryId === categoryId;
    });
  }, [products, types]);

  // Check if product is liked
  const isProductLiked = useCallback((productId) => {
    return likedProducts.includes(productId);
  }, [likedProducts]);

  // Handle like toggle
  const handleToggleLike = useCallback(async (product, e) => {
    if (e) e.stopPropagation();
    
    // Le backend renvoie user.id (pas user._id)
    const userId = user?.id || user?._id;
    
    // Check if user is authenticated
    if (!user || !userId) {
      alert('Veuillez vous connecter pour ajouter des favoris');
      return;
    }

    try {
      await dispatch(toggleLike({ userId, product })).unwrap();
    } catch (error) {
      alert('Erreur lors de l\'ajout aux favoris');
    }
  }, [user, dispatch]);

  // Render category section with products
  const renderCategorySection = useCallback((category, index) => {
    const categoryProducts = getProductsByCategory(category._id);
    
    if (categoryProducts.length === 0) return null;

    const displayProducts = categoryProducts.slice(0, 6); // Show only 6 products

    return (
      <View key={category._id} style={styles.categorySection}>
        <TouchableOpacity
          style={styles.categorySectionHeader}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ProductListScreen', { 
            categoryId: category._id,
            categoryName: category.name
          })}
        >
          <LinearGradient
            colors={[
              index % 2 === 0 ? COLORS.primary : COLORS.secondary,
              index % 2 === 0 ? COLORS.tertiary : '#FF8C5A'
            ]}
            style={styles.categoryHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.categoryHeaderContent}>
              <View style={styles.categoryHeaderLeft}>
                <Image 
                  source={{ uri: category.image }} 
                  style={styles.categoryHeaderImage} 
                />
                <View style={styles.categoryHeaderText}>
                  <Text style={styles.categoryHeaderTitle}>{category.name}</Text>
                  <Text style={styles.categoryHeaderCount}>
                    {categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.seeAllButton}>
                <Text style={styles.seeAllButtonText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryProductsScroll}
        >
          {displayProducts.map(product => renderHorizontalProduct(product))}
        </ScrollView>
      </View>
    );
  }, [getProductsByCategory, renderHorizontalProduct, navigation]);

  // Separate render function for horizontal scroll products
  const renderHorizontalProduct = useCallback((product) => {
    const price = product.prixPromo > 0 ? product.prixPromo : product.prix;
    const hasPromo = product.prixPromo > 0;
    const discount = hasPromo 
      ? Math.round(((product.prix - product.prixPromo) / product.prix) * 100)
      : 0;

    // Format prices (already in EUR)
    const priceEUR = formatPrice(price);
    const originalPriceEUR = hasPromo ? formatPrice(product.prix) : null;
    const isLiked = isProductLiked(product._id);

    return (
      <TouchableOpacity
        key={product._id}
        style={[styles.productCard, styles.horizontalProductCard, { width: HORIZONTAL_CARD_WIDTH }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { product })}
      >
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: product.image1 }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.05)']}
            style={styles.imageOverlay}
          />
          
          {hasPromo && (
            <LinearGradient
              colors={['#FF6B6B', '#EE5A6F', '#C44569']}
              style={styles.promoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.promoText}>-{discount}%</Text>
            </LinearGradient>
          )}
          
          {/* Heart Icon with Dynamic State */}
          <TouchableOpacity 
            style={[styles.heartButton, isLiked && styles.heartButtonLiked]} 
            activeOpacity={0.8}
            onPress={(e) => handleToggleLike(product, e)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={18} 
              color={isLiked ? COLORS.white : "#FF6B6B"} 
            />
          </TouchableOpacity>

          {product.quantite < 5 && product.quantite > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Stock limité</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          
          {product.marque && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {product.marque}
            </Text>
          )}
          
          <View style={styles.productFooter}>
            <View style={styles.priceContainer}>
              {hasPromo && (
                <Text style={styles.oldPrice}>{originalPriceEUR} CFA</Text>
              )}
              <View style={styles.currentPriceRow}>
                <Text style={[styles.price, hasPromo && styles.promoPrice]}>
                  {priceEUR} CFA
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.addToCartButton}
              activeOpacity={0.8}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.tertiary]}
                style={styles.addToCartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cart-outline" size={16} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [isProductLiked, handleToggleLike, navigation]);

  const renderProduct = useCallback((product) => {
    const price = product.prixPromo > 0 ? product.prixPromo : product.prix;
    const hasPromo = product.prixPromo > 0;
    const discount = hasPromo 
      ? Math.round(((product.prix - product.prixPromo) / product.prix) * 100)
      : 0;

    // Format prices (already in EUR)
    const priceEUR = formatPrice(price);
    const originalPriceEUR = hasPromo ? formatPrice(product.prix) : null;
    const isLiked = isProductLiked(product._id);

    return (
      <TouchableOpacity
        key={product._id}
        style={[styles.productCard, { width: CARD_WIDTH }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetail', { product })}
      >
        {/* Image Container with Gradient Overlay */}
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: product.image1 }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Gradient Overlay for better text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.05)']}
            style={styles.imageOverlay}
          />
          
          {/* Promo Badge with Animation */}
          {hasPromo && (
            <LinearGradient
              colors={['#FF6B6B', '#EE5A6F', '#C44569']}
              style={styles.promoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.promoText}>-{discount}%</Text>
            </LinearGradient>
          )}
          
          {/* Heart Icon - Favorite Button with Dynamic State */}
          <TouchableOpacity 
            style={[styles.heartButton, isLiked && styles.heartButtonLiked]} 
            activeOpacity={0.8}
            onPress={(e) => handleToggleLike(product, e)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={18} 
              color={isLiked ? COLORS.white : "#FF6B6B"} 
            />
          </TouchableOpacity>

          {/* Stock Indicator */}
          {product.quantite < 5 && product.quantite > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Stock limité</Text>
            </View>
          )}
          {product.quantite === 0 && (
            <View style={[styles.stockBadge, styles.outOfStockBadge]}>
              <Text style={styles.stockText}>Rupture</Text>
            </View>
          )}
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          
          {/* Brand if available */}
          {product.marque && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {product.marque}
            </Text>
          )}
          
          {/* Price Section */}
          <View style={styles.productFooter}>
            <View style={styles.priceContainer}>
              {hasPromo && (
                <Text style={styles.oldPrice}>{originalPriceEUR} CFA</Text>
              )}
              <View style={styles.currentPriceRow}>
                <Text style={[styles.price, hasPromo && styles.promoPrice]}>
                  {priceEUR} CFA
                </Text>
                {hasPromo && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>Économie!</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Add to Cart Button */}
            <TouchableOpacity 
              style={styles.addToCartButton}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: Add to cart
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.tertiary]}
                style={styles.addToCartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cart-outline" size={16} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [isProductLiked, handleToggleLike, navigation]);

  // Memoized computed values
  const promoProducts = useMemo(() => 
    products.filter(p => p.prixPromo > 0),
    [products]
  );

  const newProducts = useMemo(() => 
    products.slice(0, 6),
    [products]
  );

  const cartItemCount = useMemo(() => 
    cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems]
  );

const categoriesWithProducts = useMemo(() => {
  const typeToCategory = Object.fromEntries(
    types.map(t => [t._id, t.clefCategories])
  );

  return categories.filter(cat =>
    products.some(p => typeToCategory[p.ClefType] === cat._id)
  );
}, [categories, products, types]);


  // console.log({categories});
  // console.log({products});
  // console.log({types});
  // console.log({categoriesWithProducts});
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.tertiary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>Bonjour{user ? ` ${user.name?.split(' ')[0]}` : ''} 👋</Text>
            <Text style={styles.headerSubtitle}>Découvrez nos produits</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={28} color={COLORS.white} />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <Text style={styles.searchPlaceholder}>Rechercher des produits...</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Auto-Scrolling Banner Carousel */}
        {banners.length > 0 && (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={true}
              onMomentumScrollEnd={handleBannerScroll}
              decelerationRate="fast"
              snapToInterval={BANNER_WIDTH + 16}
              contentContainerStyle={styles.bannerContainer}
            >
              {banners.map((banner, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  style={styles.bannerWrapper}
                >
                  <Image
                    source={{ uri: banner.image }}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.bannerGradient}
                  >
                    {banner.title && (
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {renderBannerDots()}
          </View>
        )}

        {/* Categories Grid */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Catégories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categoriesGrid}>
              {categories.slice(0, 6).map(renderCategoryCard)}
            </View>
          </View>
        )}

        {/* Promotional Products */}
        {promoProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Promotions</Text>
                <View style={styles.fireIcon}>
                  <Ionicons name="flame" size={20} color={COLORS.secondary} />
                </View>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ProductListScreen', { 
                filter: 'promo',
                categoryName: 'Promotions'
              })}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={true}
              contentContainerStyle={styles.horizontalScroll}
            >
              {promoProducts.slice(0, 10).map(renderHorizontalProduct)}
            </ScrollView>
          </View>
        )}

        {/* New Products */}
        {newProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Nouveautés</Text>
                <MaterialCommunityIcons 
                  name="new-box" 
                  size={20} 
                  color={COLORS.primary} 
                  style={{ marginLeft: 8 }}
                />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ProductListScreen', { 
                filter: 'new',
                categoryName: 'Nouveautés'
              })}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={true}
              contentContainerStyle={styles.horizontalScroll}
            >
              {newProducts.map(renderHorizontalProduct)}
            </ScrollView>
          </View>
        )}

        {/* Popular Stores Section */}
        {popularStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons 
                  name="store" 
                  size={22} 
                  color={COLORS.primary} 
                />
                <Text style={styles.sectionTitle}>Boutiques populaires</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AllStores')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storesScroll}
            >
              {popularStores.map((store) => (
                <TouchableOpacity
                  key={store._id}
                  style={styles.storeCard}
                  onPress={() => navigation.navigate('Boutique', {
                    sellerId: store._id,
                    storeName: store.storeName || store.name,
                  })}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#F8F9FA', '#FFFFFF']}
                    style={styles.storeCardGradient}
                  >
                    <View style={styles.storeCardImageContainer}>
                      <Image
                        source={{ uri: store.logo || 'https://via.placeholder.com/100' }}
                        style={styles.storeCardImage}
                      />
                      {store.isvalid && (
                        <LinearGradient
                          colors={[COLORS.primary, COLORS.secondary]}
                          style={styles.storeVerifiedBadge}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <MaterialCommunityIcons name="check-decagram" size={16} color={COLORS.white} />
                        </LinearGradient>
                      )}
                    </View>
                    <View style={styles.storeCardInfo}>
                      <Text style={styles.storeCardName} numberOfLines={2}>
                        {store.storeName || `${store.userName2} ${store.name}`}
                      </Text>
                      <View style={styles.storeCardStatsRow}>
                        <View style={styles.storeCardStatItem}>
                          <View style={styles.storeCardStatIconBg}>
                            <Ionicons name="star" size={14} color={COLORS.secondary} />
                          </View>
                          <Text style={styles.storeCardStatText}>
                            {store.rating?.toFixed(1) || '0.0'}
                          </Text>
                        </View>
                        <View style={styles.storeCardStatDivider} />
                        <View style={styles.storeCardStatItem}>
                          <View style={styles.storeCardStatIconBg}>
                            <MaterialCommunityIcons 
                              name="account-group" 
                              size={14} 
                              color={COLORS.primary} 
                            />
                          </View>
                          <Text style={styles.storeCardStatText}>
                            {store.followersCount >= 1000 
                              ? `${(store.followersCount / 1000).toFixed(1)}k` 
                              : store.followersCount || 0}
                          </Text>
                        </View>
                      </View>
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.secondary]}
                        style={styles.storeCardVisitBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.storeCardVisitText}>Visiter</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
                      </LinearGradient>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products by Categories - NEW SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parcourir par catégorie</Text>
          </View>
          {categoriesWithProducts.map(renderCategorySection)}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  
  // Modern Header with Gradient
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.textLight,
  },
  
  scrollView: {
    flex: 1,
  },
  
  // Banner Carousel
  bannerSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  bannerContainer: {
    paddingHorizontal: 16,
  },
  bannerWrapper: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
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
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  bannerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  
  // Section Styles
  section: {
    marginTop: 24,
    marginBottom: 8,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  fireIcon: {
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  productCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  
  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: SCREEN_WIDTH < 360 ? (SCREEN_WIDTH - 48) / 3 : (SCREEN_WIDTH - 48) / 3,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoryGradient: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  categoryOverlay: {
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  
  // Horizontal Scroll
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  
  // Modern Product Cards - ULTRA RESPONSIVE
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(48, 160, 139, 0.08)',
  },
  horizontalProductCard: {
    marginRight: 12,
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  promoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  promoText: {
    color: COLORS.white,
    fontSize: SCREEN_WIDTH < 360 ? 11 : 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  heartButtonLiked: {
    backgroundColor: '#FF6B6B',
  },
  stockBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#FFA726',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  outOfStockBadge: {
    backgroundColor: '#EF5350',
  },
  stockText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    padding: 10,
    backgroundColor: COLORS.white,
  },
  productName: {
    fontSize: SCREEN_WIDTH < 360 ? 13 : 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: SCREEN_WIDTH < 360 ? 18 : 20,
    minHeight: SCREEN_WIDTH < 360 ? 36 : 40,
  },
  productBrand: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  priceContainer: {
    flex: 1,
    marginRight: 8,
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: SCREEN_WIDTH < 360 ? 13 : 14,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  promoPrice: {
    color: '#E74C3C',
  },
  oldPrice: {
    fontSize: SCREEN_WIDTH < 360 ? 10 : 11,
    textDecorationLine: 'line-through',
    color: '#999',
    marginBottom: 3,
    fontWeight: '400',
  },
  saveBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  saveText: {
    color: '#FF6B6B',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addToCartButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Products Grid
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING - (CARD_MARGIN / 2),
    justifyContent: 'flex-start',
  },
  
  // Category Sections with Products - NEW STYLES
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  categoryHeaderGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryHeaderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  categoryHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  categoryHeaderCount: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seeAllButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  categoryProductsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Store Cards Styles
  storesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storeCard: {
    width: 160,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginRight: 16,
    backgroundColor: COLORS.white,
  },
  storeCardGradient: {
    flex: 1,
  },
  storeCardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: COLORS.backgroundAlt,
  },
  storeCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  storeVerifiedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  storeCardInfo: {
    padding: 14,
  },
  storeCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    minHeight: 38,
  },
  storeCardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  storeCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeCardStatIconBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeCardStatText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  storeCardStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  storeCardVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  storeCardVisitText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  storeCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeCardRating: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  storeCardFollowers: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  
  bottomSpacing: {
    height: 32,
  },
});
