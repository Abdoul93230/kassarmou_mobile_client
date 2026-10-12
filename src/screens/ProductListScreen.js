import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProducts, getTypes } from '../redux/productsSlice';
import { toggleLike, fetchUserLikes } from '../redux/likesSlice';
import { formatPrice } from '../utils/formatPrice';

const { width, height } = Dimensions.get('window');

// Responsive card sizing
const getResponsiveValues = () => {
  if (width < 360) {
    return { columns: 2, cardMargin: 8 };
  } else if (width >= 360 && width < 768) {
    return { columns: 2, cardMargin: 12 };
  } else {
    return { columns: 3, cardMargin: 15 };
  }
};

const { columns: NUM_COLUMNS, cardMargin: CARD_MARGIN } = getResponsiveValues();
const CARD_WIDTH = (width - (NUM_COLUMNS + 1) * CARD_MARGIN) / NUM_COLUMNS;
const HERO_HEIGHT = 260;

// Function to strip HTML tags from description
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

// Images de couverture par défaut pour les catégories sans image
const DEFAULT_CATEGORY_IMAGES = {
  'Promotions': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
  'Nouveautés': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = ({ pulse }) => {
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });
  return (
    <View style={skeletonStyles.card}>
      <Animated.View style={[skeletonStyles.image, { opacity }]} />
      <View style={skeletonStyles.body}>
        <Animated.View style={[skeletonStyles.line, { opacity, width: '80%' }]} />
        <Animated.View style={[skeletonStyles.line, { opacity, width: '50%', marginTop: 6 }]} />
        <Animated.View style={[skeletonStyles.line, { opacity, width: '35%', marginTop: 10, backgroundColor: '#c8e6e2' }]} />
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN / 2,
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#E0E0E0',
  },
  body: {
    padding: 10,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
});

export default function ProductListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { categoryId, categoryName, marque, title, filter } = route.params || {};
  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : null;

  // Determine the display title
  const displayTitle = title || categoryName || 'Produits';

  const products = useSelector((state) => state.products?.data || []);
  const categories = useSelector((state) => state.products?.categories || []);
  const types = useSelector((state) => state.products?.types || []);
  const loading = useSelector((state) => state.products?.loading || false);
  const { likedProducts } = useSelector((state) => state.likes || { likedProducts: [] });
  const { user } = useSelector((state) => state.auth || {});

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 10;

  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid');
  const [scrollY] = useState(new Animated.Value(0));
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Animation pour le spinner de chargement
  const spinnerRotation = useState(new Animated.Value(0))[0];

  // Skeleton pulse animation
  const skeletonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinnerRotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();
    return () => spinAnimation.stop();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonPulse]);

  const spin = spinnerRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const typeToCategory = useMemo(() => {
    const mapping = {};
    types.forEach(type => {
      mapping[type._id] = type.clefCategories;
    });
    return mapping;
  }, [types]);

  // Get category details
  const currentCategory = useMemo(() => {
    if (categoryId) {
      return categories.find(cat => cat._id === categoryId);
    }
    if (decodedCategoryName) {
      return categories.find(
        (cat) => String(cat.name || '').toLowerCase() === decodedCategoryName.toLowerCase()
      );
    }
    return null;
  }, [categories, categoryId, decodedCategoryName]);

  const resolvedCategoryId = currentCategory?._id || categoryId;

  // Obtenir l'image de couverture
  const getCoverImage = useMemo(() => {
    if (currentCategory?.image) {
      return currentCategory.image;
    }
    if (filter === 'promo' && categoryName === 'Promotions') {
      return DEFAULT_CATEGORY_IMAGES['Promotions'];
    }
    if (filter === 'new' && categoryName === 'Nouveautés') {
      return DEFAULT_CATEGORY_IMAGES['Nouveautés'];
    }
    return DEFAULT_CATEGORY_IMAGES['default'];
  }, [currentCategory, filter, categoryName]);

  useEffect(() => {
    console.log('📦 [ProductListScreen] Params:', {
      categoryName,
      categoryId,
      resolvedCategoryId,
      marque,
      title,
      filter,
    });
    dispatch(getProducts());
    dispatch(getTypes());
    if (user?.id) {
      dispatch(fetchUserLikes(user.id));
    }
  }, [dispatch, categoryId, resolvedCategoryId, marque, filter, user?.id]);

  useEffect(() => {
    if (products.length > 0) {
      let filtered = products;

      if (filter === 'promo') {
        filtered = filtered.filter((product) => product.prixPromo > 0);
        console.log('🎁 [ProductListScreen] Filtered by promo:', filtered.length);
      } else if (filter === 'new') {
        filtered = products.slice(0, 20);
        console.log('✨ [ProductListScreen] Filtered by new:', filtered.length);
      }

      if (resolvedCategoryId) {
        filtered = filtered.filter((product) => {
          const productCategoryId = typeToCategory[product.ClefType];
          return productCategoryId === resolvedCategoryId;
        });
        console.log('📦 [ProductListScreen] Filtered by category:', filtered.length);
      }

      if (marque) {
        filtered = filtered.filter((product) => product.marque === marque);
        console.log('🏷️ [ProductListScreen] Filtered by marque:', marque, 'Count:', filtered.length);
      }

      applyFiltersAndSort(filtered);
    }
  }, [products, resolvedCategoryId, marque, filter, sortBy, searchQuery, typeToCategory]);

  const applyFiltersAndSort = (productsToProcess) => {
    let filtered = [...productsToProcess];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name?.toLowerCase().includes(query);
        const cleanDescription = stripHtmlTags(product.description || '');
        const descriptionMatch = cleanDescription.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
      console.log('🔍 [Search] Query:', searchQuery, 'Results:', filtered.length);
    }

    setSortedProducts(filtered);
  };

  const setSortedProducts = (productsToSort) => {
    let sorted = [...productsToSort];

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => {
          const priceA = a.prixPromo > 0 ? a.prixPromo : (a.prix || 0);
          const priceB = b.prixPromo > 0 ? b.prixPromo : (b.prix || 0);
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        sorted.sort((a, b) => {
          const priceA = a.prixPromo > 0 ? a.prixPromo : (a.prix || 0);
          const priceB = b.prixPromo > 0 ? b.prixPromo : (b.prix || 0);
          return priceB - priceA;
        });
        break;
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'popularity':
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(sorted);
    setCurrentPage(1);
    setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
  };

  useEffect(() => {
    if (filteredProducts.length > 0) {
      setDisplayedProducts(filteredProducts.slice(0, currentPage * PRODUCTS_PER_PAGE));
    }
  }, [filteredProducts, currentPage]);

  const loadMoreProducts = () => {
    if (isLoadingMore) return;

    const totalProducts = filteredProducts.length;
    const currentlyDisplayed = displayedProducts.length;

    if (currentlyDisplayed >= totalProducts) {
      return;
    }

    setIsLoadingMore(true);

    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 500);
  };

  const hasMoreProducts = displayedProducts.length < filteredProducts.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getProducts());
    setRefreshing(false);
  }, [dispatch]);

  const isProductLiked = (productId) => {
    return likedProducts.includes(productId);
  };

  const handleToggleLike = async (product, e) => {
    if (e) e.stopPropagation();
    const userId = user?.id || user?._id;

    if (!userId) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter des favoris');
      return;
    }

    console.log('❤️ Toggle like for product:', product._id, 'User:', userId);

    try {
      await dispatch(toggleLike({ userId, product })).unwrap();
      console.log('✅ Like toggled successfully');
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  const handleProductPress = (product) => {
    console.log('📦 [ProductListScreen] Navigate to product:', product.name);
    navigation.navigate('ProductDetail', { product });
  };

  // Animated header values
  const headerImageOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const headerTitleScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.92],
    extrapolate: 'clamp',
  });

  // ─── Sort chips ──────────────────────────────────────────────────────────────
  const SORT_OPTIONS = [
    { key: 'default', label: 'Pertinence', icon: 'apps-outline' },
    { key: 'price-asc', label: 'Prix ↑', icon: 'trending-up-outline' },
    { key: 'price-desc', label: 'Prix ↓', icon: 'trending-down-outline' },
    { key: 'name', label: 'Nom', icon: 'text-outline' },
    { key: 'popularity', label: 'Popularité', icon: 'flame-outline' },
  ];

  const renderSortOption = (option, label, icon) => (
    <TouchableOpacity
      key={option}
      style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
      onPress={() => setSortBy(option)}
      activeOpacity={0.7}
    >
      {sortBy === option ? (
        <LinearGradient
          colors={['#30A08B', '#26857A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sortChipGradient}
        >
          <Ionicons name={icon} size={14} color="#FFF" />
          <Text style={styles.sortChipTextActive}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.sortChipInner}>
          <Ionicons name={icon} size={14} color="#888" />
          <Text style={styles.sortChipText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ─── Grid Card ───────────────────────────────────────────────────────────────
  const renderGridCard = (item) => {
    const liked = isProductLiked(item._id);
    const currentPrice = item.prixPromo > 0 ? item.prixPromo : item.prix;
    const hasPromotion = item.prixPromo > 0;
    const promoPercentage = hasPromotion
      ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100)
      : 0;
    const isLimitedStock = item.stocks > 0 && item.stocks < 5;
    const isOutOfStock = item.stocks === 0;

    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.93}
      >
        {/* Image */}
        <View style={styles.gridImageWrap}>
          <Image
            source={{ uri: item.image1 }}
            style={styles.gridImage}
            resizeMode="cover"
          />

          {/* Gradient bottom fade */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.18)']}
            style={styles.gridImageFade}
            pointerEvents="none"
          />

          {/* Promo badge */}
          {hasPromotion && !isOutOfStock && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>-{promoPercentage}%</Text>
            </View>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockOverlayText}>Rupture</Text>
            </View>
          )}

          {/* Limited stock badge */}
          {isLimitedStock && !isOutOfStock && (
            <View style={styles.limitedBadge}>
              <MaterialCommunityIcons name="fire" size={10} color="#FFF" />
              <Text style={styles.limitedBadgeText}>Stock limité</Text>
            </View>
          )}

          {/* Heart button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={(e) => handleToggleLike(item, e)}
            activeOpacity={0.8}
          >
            {liked ? (
              <LinearGradient
                colors={['#FF4D4D', '#FF7070']}
                style={styles.heartBtnInner}
              >
                <Ionicons name="heart" size={16} color="#FFF" />
              </LinearGradient>
            ) : (
              <View style={styles.heartBtnInnerWhite}>
                <Ionicons name="heart-outline" size={16} color="#555" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.gridInfo}>
          {/* Brand */}
          {item.marque ? (
            <Text style={styles.gridBrand} numberOfLines={1}>{item.marque}</Text>
          ) : null}

          {/* Name */}
          <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>

          {/* Price row */}
          <View style={styles.gridPriceRow}>
            <Text style={[styles.gridPrice, isOutOfStock && { color: '#aaa' }]}>
              {formatPrice(currentPrice)} CFA
            </Text>
            {hasPromotion && (
              <Text style={styles.gridOldPrice}>{formatPrice(item.prix)}</Text>
            )}
          </View>

          {/* Cart button */}
          {!isOutOfStock && (
            <TouchableOpacity
              style={styles.gridCartBtn}
              onPress={() => handleProductPress(item)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#30A08B', '#26857A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gridCartGradient}
              >
                <Ionicons name="cart-outline" size={15} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── List Card ───────────────────────────────────────────────────────────────
  const renderListCard = (item) => {
    const liked = isProductLiked(item._id);
    const currentPrice = item.prixPromo > 0 ? item.prixPromo : item.prix;
    const hasPromotion = item.prixPromo > 0;
    const promoPercentage = hasPromotion
      ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100)
      : 0;
    const isLimitedStock = item.stocks > 0 && item.stocks < 5;
    const isOutOfStock = item.stocks === 0;

    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.93}
      >
        {/* Thumbnail */}
        <View style={styles.listThumbWrap}>
          <Image
            source={{ uri: item.image1 }}
            style={[styles.listThumb, isOutOfStock && { opacity: 0.5 }]}
            resizeMode="cover"
          />
          {hasPromotion && !isOutOfStock && (
            <View style={styles.listPromoBadge}>
              <Text style={styles.promoBadgeText}>-{promoPercentage}%</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.listOutOfStockOverlay}>
              <Text style={styles.outOfStockOverlayText}>Rupture</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.listDetails}>
          {item.marque ? (
            <Text style={styles.listBrand} numberOfLines={1}>{item.marque}</Text>
          ) : null}
          <Text style={styles.listName} numberOfLines={2}>{item.name}</Text>

          <View style={styles.listPriceRow}>
            <Text style={[styles.listPrice, isOutOfStock && { color: '#aaa' }]}>
              {formatPrice(currentPrice)} CFA
            </Text>
            {hasPromotion && (
              <Text style={styles.listOldPrice}>{formatPrice(item.prix)} CFA</Text>
            )}
          </View>

          {/* Stock badges */}
          <View style={styles.listBadgeRow}>
            {isLimitedStock && !isOutOfStock && (
              <View style={styles.limitedBadgeList}>
                <MaterialCommunityIcons name="fire" size={10} color="#FFF" />
                <Text style={styles.limitedBadgeText}>Stock limité</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockBadgeList}>
                <Text style={styles.outOfStockBadgeText}>Rupture de stock</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right actions */}
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.listHeartBtn}
            onPress={(e) => handleToggleLike(item, e)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={18}
              color={liked ? '#EF4444' : '#aaa'}
            />
          </TouchableOpacity>

          {!isOutOfStock && (
            <TouchableOpacity
              style={styles.listCartBtn}
              onPress={() => handleProductPress(item)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#30A08B', '#26857A']}
                style={styles.listCartGradient}
              >
                <Ionicons name="cart-outline" size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Unified renderItem ──────────────────────────────────────────────────────
  const renderProductCard = ({ item }) => {
    if (viewMode === 'grid') return renderGridCard(item);
    return renderListCard(item);
  };

  // ─── Empty state ─────────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name="package-variant-closed" size={72} color="#C8E6E2" />
      </View>
      <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim()
          ? `Aucun résultat pour "${searchQuery}"`
          : marque
            ? `Aucun produit de la marque "${marque}" disponible`
            : filter
              ? 'Aucun produit dans ce filtre pour le moment'
              : 'Aucun produit disponible dans cette catégorie'}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#30A08B', '#26857A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="arrow-back" size={16} color="#FFF" />
          <Text style={styles.emptyButtonText}>Retour aux catégories</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ─── Skeleton loading grid ───────────────────────────────────────────────────
  const renderSkeletonGrid = () => (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} pulse={skeletonPulse} />
      ))}
    </View>
  );

  // ─── Header component ────────────────────────────────────────────────────────
  const renderListHeader = () => (
    <>
      {/* ── Hero ── */}
      <View style={styles.heroHeader}>
        <Animated.Image
          source={{ uri: getCoverImage }}
          style={[styles.heroImage, { opacity: headerImageOpacity }]}
          resizeMode="cover"
        />

        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.heroContent}>
          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.heroBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.heroTopActions}>
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => setShowSearchBar(!showSearchBar)}
                activeOpacity={0.8}
              >
                <Ionicons name={showSearchBar ? 'close' : 'search'} size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroActionBtn}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                activeOpacity={0.8}
              >
                <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title block */}
          {!showSearchBar ? (
            <Animated.View style={[styles.heroTitleBlock, { transform: [{ scale: headerTitleScale }] }]}>
              <Text style={styles.heroTitle} numberOfLines={2}>{displayTitle}</Text>
              <Text style={styles.heroSubtitle}>
                {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''}
                {filteredProducts.length > 0
                  ? `  •  Dès ${formatPrice(Math.min(...filteredProducts.map(p => p.prixPromo > 0 ? p.prixPromo : p.prix)))} CFA`
                  : ''}
              </Text>

              {/* Integrated search bar */}
              <View style={styles.heroSearchBar}>
                <Ionicons name="search" size={16} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.heroSearchInput}
                  placeholder={`Rechercher dans ${displayTitle}...`}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  onFocus={() => setShowSearchBar(true)}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color="#bbb" />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          ) : (
            // Expanded search mode
            <View style={styles.heroSearchExpanded}>
              <View style={styles.heroSearchExpandedBar}>
                <Ionicons name="search" size={18} color="#30A08B" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.heroSearchExpandedInput}
                  placeholder={`Rechercher dans ${displayTitle}...`}
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={18} color="#bbb" />
                  </TouchableOpacity>
                )}
              </View>
              {searchQuery.trim() ? (
                <Text style={styles.heroSearchCount}>
                  {filteredProducts.length} résultat{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* ── Sticky filter bar ── */}
      <View style={styles.filterBar}>
        {/* Sort chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {SORT_OPTIONS.map(({ key, label, icon }) => renderSortOption(key, label, icon))}
        </ScrollView>

        {/* Right side: count + view toggle */}
        <View style={styles.filterRight}>
          <Text style={styles.filterCount}>{filteredProducts.length}</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
            >
              <Ionicons name="grid" size={15} color={viewMode === 'grid' ? '#30A08B' : '#bbb'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <Ionicons name="list" size={17} color={viewMode === 'list' ? '#30A08B' : '#bbb'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );

  // ─── Footer component ────────────────────────────────────────────────────────
  const renderListFooter = () => {
    if (loading && displayedProducts.length === 0) return null;

    if (hasMoreProducts) {
      return (
        <View style={styles.footerWrap}>
          {isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#30A08B" />
              <Text style={styles.footerLoadingText}>Chargement...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={loadMoreProducts}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#30A08B', '#26857A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loadMoreGradient}
              >
                <Ionicons name="reload-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.loadMoreText}>
                  Charger plus ({filteredProducts.length - displayedProducts.length} restants)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <Text style={styles.footerPageCount}>
            {displayedProducts.length} / {filteredProducts.length} produits
          </Text>
        </View>
      );
    }

    if (filteredProducts.length > 0) {
      return (
        <View style={styles.endOfListWrap}>
          <View style={styles.endOfListLine} />
          <View style={styles.endOfListBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#30A08B" />
            <Text style={styles.endOfListText}>
              Tous les {filteredProducts.length} produits affichés
            </Text>
          </View>
          <View style={styles.endOfListLine} />
        </View>
      );
    }

    return null;
  };

  // ─── Sticky top bar (when scrolled) ─────────────────────────────────────────
  const renderStickyBar = () => {
    if (!showStickyBar) return null;
    return (
      <View style={styles.stickyBar}>
        <LinearGradient
          colors={['#30A08B', '#26857A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.stickyBarGradient}
        >
          <TouchableOpacity
            style={styles.stickyBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          {!showSearchBar ? (
            <>
              <Text style={styles.stickyTitle} numberOfLines={1}>{displayTitle}</Text>
              <View style={styles.stickyActions}>
                <TouchableOpacity
                  style={styles.stickyActionButton}
                  onPress={() => setShowSearchBar(true)}
                >
                  <Ionicons name="search" size={19} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stickyActionButton}
                  onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  <Ionicons
                    name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
                    size={19}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.searchStickyContent}>
              <TouchableOpacity
                style={styles.searchBackButton}
                onPress={() => {
                  setShowSearchBar(false);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.searchStickyInputWrapper}>
                <Ionicons name="search" size={16} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.searchStickyInput}
                  placeholder="Rechercher..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearButton}>
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </View>
              {searchQuery.trim() ? (
                <View style={styles.searchResultBadge}>
                  <Text style={styles.searchResultBadgeText}>
                    {filteredProducts.length}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" translucent />
      <View style={styles.statusBarBackground} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {renderStickyBar()}

        {loading && displayedProducts.length === 0 ? (
          <>
            {renderListHeader()}
            {renderSkeletonGrid()}
          </>
        ) : (
          <Animated.FlatList
            data={displayedProducts}
            renderItem={renderProductCard}
            keyExtractor={(item) => item._id}
            numColumns={viewMode === 'grid' ? NUM_COLUMNS : 1}
            key={viewMode}
            contentContainerStyle={[
              styles.listContent,
              viewMode === 'list' && styles.listContentList,
            ]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!loading ? renderEmptyState : null}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#30A08B']}
                tintColor="#30A08B"
              />
            }
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              {
                useNativeDriver: false,
                listener: (event) => {
                  const offsetY = event.nativeEvent.contentOffset.y;
                  setShowStickyBar(offsetY > HERO_HEIGHT - 60);
                },
              }
            )}
            scrollEventThrottle={16}
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
          />
        )}
      </SafeAreaView>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Layout ──
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    backgroundColor: '#30A08B',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F4F6',
  },

  // ── Sticky bar ──
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  stickyBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 11,
    gap: 10,
  },
  stickyBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  stickyActions: {
    flexDirection: 'row',
    gap: 6,
  },
  stickyActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Sticky search
  searchStickyContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchStickyInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchStickyInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
    paddingVertical: 0,
  },
  searchClearButton: {
    padding: 2,
  },
  searchResultBadge: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  searchResultBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Hero ──
  heroHeader: {
    width: '100%',
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 14,
    paddingHorizontal: 18,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTopActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitleBlock: {
    gap: 6,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 10,
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  // Expanded search in hero
  heroSearchExpanded: {
    gap: 10,
  },
  heroSearchExpandedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  heroSearchExpandedInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  heroSearchCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },

  // ── Filter bar ──
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  sortChip: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sortChipActive: {
    borderColor: '#30A08B',
  },
  sortChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
  },
  sortChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
  },
  sortChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  sortChipTextActive: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
  },
  filterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 6,
    gap: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#EBEBEB',
    marginLeft: 4,
  },
  filterCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#30A08B',
    minWidth: 22,
    textAlign: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F4',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  viewToggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#E6F4F2',
  },

  // ── List content ──
  listContent: {
    paddingTop: 10,
    paddingHorizontal: CARD_MARGIN / 2,
    paddingBottom: 30,
  },
  listContentList: {
    paddingHorizontal: 12,
  },

  // ── Grid card ──
  gridCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN / 2,
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
  },
  gridImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  promoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    elevation: 2,
  },
  promoBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlayText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  limitedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F97316',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  limitedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  heartBtnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnInnerWhite: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  gridInfo: {
    padding: 10,
    backgroundColor: '#FFF',
    position: 'relative',
  },
  gridBrand: {
    fontSize: 10,
    color: '#B2905F',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
    marginBottom: 6,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#30A08B',
    letterSpacing: 0.2,
  },
  gridOldPrice: {
    fontSize: 11,
    color: '#BBB',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  gridCartBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  gridCartGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── List card ──
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  listThumbWrap: {
    width: 100,
    height: 110,
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  listThumb: {
    width: '100%',
    height: '100%',
  },
  listPromoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#EF4444',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  listOutOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listDetails: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    gap: 3,
  },
  listBrand: {
    fontSize: 10,
    color: '#B2905F',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    lineHeight: 18,
  },
  listPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  listPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#30A08B',
  },
  listOldPrice: {
    fontSize: 11,
    color: '#BBB',
    textDecorationLine: 'line-through',
  },
  listBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  limitedBadgeList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F97316',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  outOfStockBadgeList: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  outOfStockBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  listActions: {
    width: 44,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  listHeartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  listCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  listCartGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Skeleton grid ──
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_MARGIN / 2,
    paddingTop: 10,
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F9F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 13,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Footer / load more ──
  footerWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 10,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLoadingText: {
    fontSize: 14,
    color: '#30A08B',
    fontWeight: '600',
  },
  loadMoreBtn: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  loadMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  loadMoreText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerPageCount: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
  endOfListWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 10,
  },
  endOfListLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  endOfListBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F4F2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  endOfListText: {
    fontSize: 12,
    color: '#30A08B',
    fontWeight: '600',
  },
});
