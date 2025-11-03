import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getProducts } from '../redux/productsSlice';
import { toggleLike, fetchUserLikes } from '../redux/likesSlice';

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

const formatPrice = (price) => {
  return price?.toFixed(2) || '0.00';
};

// Function to strip HTML tags from description
const stripHtmlTags = (html) => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Replace &amp; with &
    .replace(/&lt;/g, '<')   // Replace &lt; with <
    .replace(/&gt;/g, '>')   // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'")  // Replace &#39; with '
    .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
    .trim();
};

export default function ProductListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { categoryId, categoryName, marque, title } = route.params || {};
  
  // Determine the display title
  const displayTitle = title || categoryName || 'Produits';
  
  const products = useSelector((state) => state.products?.data || []);
  const categories = useSelector((state) => state.products?.categories || []);
  const loading = useSelector((state) => state.products?.loading || false);
  const { likedProducts } = useSelector((state) => state.likes || { likedProducts: [] });
  const { user } = useSelector((state) => state.auth || {});
  
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [scrollY] = useState(new Animated.Value(0));
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Get category details
  const currentCategory = useMemo(() => {
    return categories.find(cat => cat._id === categoryId);
  }, [categories, categoryId]);

  useEffect(() => {
    console.log('📦 [ProductListScreen] Params:', { categoryName, categoryId, marque, title });
    dispatch(getProducts());
    
    if (user?.id) {
      dispatch(fetchUserLikes(user.id));
    }
  }, [dispatch, categoryId, marque, user?.id]);

  useEffect(() => {
    if (products.length > 0) {
      let filtered = products;
      
      // Filter by category if categoryId is provided
      if (categoryId) {
        filtered = filtered.filter((product) => product.ClefCategorie === categoryId);
        console.log('📦 [ProductListScreen] Filtered by category:', filtered.length);
      }
      
      // Filter by marque if marque is provided
      if (marque) {
        filtered = filtered.filter((product) => product.marque === marque);
        console.log('🏷️ [ProductListScreen] Filtered by marque:', marque, 'Count:', filtered.length);
      }
      
      applyFiltersAndSort(filtered);
    }
  }, [products, categoryId, marque, sortBy, searchQuery]);

  const applyFiltersAndSort = (productsToProcess) => {
    let filtered = [...productsToProcess];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        // Search in product name
        const nameMatch = product.name?.toLowerCase().includes(query);
        
        // Search in product description (strip HTML tags first)
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
  };

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

  // Animated header values - Simplifié pour auto-height
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

  const renderSortOption = (option, label, icon) => (
    <TouchableOpacity
      style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
      onPress={() => setSortBy(option)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={16}
        color={sortBy === option ? '#FFF' : '#666'}
      />
      <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item, index }) => {
    const liked = isProductLiked(item._id);
    
    // Calculate prices
    const currentPrice = item.prixPromo > 0 ? item.prixPromo : item.prix;
    const hasPromotion = item.prixPromo > 0;
    const promoPercentage = hasPromotion
      ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100)
      : 0;
    
    const isLimitedStock = item.stocks > 0 && item.stocks <= 10;
    const isOutOfStock = item.stocks === 0;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          viewMode === 'list' && styles.productCardList
        ]}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.9}
      >
        {/* Product Image */}
        <View style={[
          styles.imageContainer,
          viewMode === 'list' && styles.imageContainerList
        ]}>
          <Image
            source={{ uri: item.image1 }}
            style={styles.productImage}
            resizeMode="cover"
          />
          
          {/* Like Button */}
          <TouchableOpacity
            style={styles.likeButton}
            onPress={(e) => handleToggleLike(item, e)}
          >
            <LinearGradient
              colors={liked ? ['#FF6B6B', '#FF8E8E'] : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.95)']}
              style={styles.likeButtonGradient}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? '#FFF' : '#666'}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Promotion Badge */}
          {hasPromotion && !isOutOfStock && (
            <LinearGradient
              colors={['#FC913A', '#FFB366']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoBadge}
            >
              <Text style={styles.promoText}>-{promoPercentage}%</Text>
            </LinearGradient>
          )}

          {/* Stock Badge */}
          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Épuisé</Text>
            </View>
          )}
          {isLimitedStock && !isOutOfStock && (
            <View style={styles.limitedStockBadge}>
              <MaterialCommunityIcons name="alert" size={12} color="#FFF" />
              <Text style={styles.limitedStockText}>Stock limité</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[
          styles.productInfo,
          viewMode === 'list' && styles.productInfoList
        ]}>
          <View style={{ flex: 1 }}>
            <Text 
              style={[
                styles.productName,
                viewMode === 'list' && { fontSize: 14, marginBottom: 4 }
              ]} 
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            {/* Prix */}
            <View style={styles.priceWrapper}>
              <Text style={[styles.price, viewMode === 'list' && { fontSize: 17 }]}>
                €{formatPrice(currentPrice)}
              </Text>
              {hasPromotion && (
                <Text style={[styles.originalPrice, viewMode === 'list' && { fontSize: 13 }]}>
                  €{formatPrice(item.prix)}
                </Text>
              )}
            </View>
          </View>

          {/* Actions pour le mode liste */}
          {viewMode === 'list' && (
            <View style={{ gap: 8 }}>
              {item.stocks > 0 && (
                <View style={styles.stockIndicator}>
                  <MaterialCommunityIcons name="package-variant" size={13} color="#30A08B" />
                  <Text style={styles.stockText}>{item.stocks}</Text>
                </View>
              )}
              
              {item.stocks > 0 && (
                <TouchableOpacity style={styles.addToCartButton}>
                  <LinearGradient
                    colors={['#30A08B', '#62aca2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.addToCartGradient}
                  >
                    <Ionicons name="cart" size={16} color="#FFF" />
                    <Text style={styles.addToCartText}>Ajouter</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.emptyGradient}
      >
        <MaterialCommunityIcons name="package-variant-closed" size={100} color="#E0E0E0" />
        <Text style={styles.emptyTitle}>Aucun produit</Text>
        <Text style={styles.emptySubtitle}>
          {marque 
            ? `Aucun produit de la marque "${marque}" disponible pour le moment`
            : 'Aucun produit disponible dans cette catégorie pour le moment'
          }
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => navigation.goBack()}
        >
          <LinearGradient
            colors={['#30A08B', '#62aca2']}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>Retour aux catégories</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      
      {/* Search Bar or Sticky Bar - Mode recherche remplace la sticky bar */}
      {showStickyBar && (
        <>
          {!showSearchBar ? (
            // Sticky Bar normale
            <View style={styles.stickyBar}>
              <TouchableOpacity
                style={styles.stickyBackButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={22} color="#FFF" />
              </TouchableOpacity>
              
              <Text style={styles.stickyTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              
              <View style={styles.stickyActions}>
                <TouchableOpacity 
                  style={styles.stickyActionButton}
                  onPress={() => setShowSearchBar(true)}
                >
                  <Ionicons name="search" size={20} color="#FFF" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.stickyActionButton}
                  onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  <Ionicons 
                    name={viewMode === 'grid' ? 'list' : 'grid'} 
                    size={20} 
                    color="#FFF" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Mode recherche - Remplace la sticky bar
            <View style={styles.searchStickyBar}>
              <View style={styles.searchStickyContent}>
                <TouchableOpacity
                  style={styles.searchBackButton}
                  onPress={() => {
                    setShowSearchBar(false);
                    setSearchQuery('');
                  }}
                >
                  <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                
                <View style={styles.searchStickyInputWrapper}>
                  <Ionicons name="search" size={18} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    style={styles.searchStickyInput}
                    placeholder="Rechercher..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setSearchQuery('')}
                      style={styles.searchClearButton}
                    >
                      <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {searchQuery.trim() && (
                <View style={styles.searchResultBadge}>
                  <Text style={styles.searchResultBadgeText}>
                    {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
      
      {/* Product List avec Header intégré */}
      <Animated.FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item._id}
        numColumns={viewMode === 'grid' ? NUM_COLUMNS : 1}
        key={viewMode}
        contentContainerStyle={styles.listContent}
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
              setShowStickyBar(offsetY > 180);
            }
          }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            {/* Animated Hero Header - Auto Height */}
            <View style={styles.heroHeader}>
              {currentCategory?.image && (
                <Animated.Image
                  source={{ uri: currentCategory.image }}
                  style={[styles.heroImage, { opacity: headerImageOpacity }]}
                  resizeMode="cover"
                  blurRadius={0}
                />
              )}
              {/* Dark overlay for better text visibility */}
              <View style={styles.darkOverlay} />
              
              {/* Mode normal ou mode recherche */}
              {!showSearchBar ? (
                // Contenu normal du header
                <View style={styles.heroGradient}>
                  {/* Top Bar */}
                  <View style={styles.heroTopBar}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => navigation.goBack()}
                    >
                      <View style={styles.backButtonGradient}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.heroActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => setShowSearchBar(true)}
                      >
                        <View style={styles.actionButtonGradient}>
                          <Ionicons name="search" size={20} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      >
                        <View style={styles.actionButtonGradient}>
                          <Ionicons 
                            name={viewMode === 'grid' ? 'list' : 'grid'} 
                            size={20} 
                            color="#FFF" 
                          />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Category Title */}
                  <Animated.View style={[styles.heroTitleContainer, { transform: [{ scale: headerTitleScale }] }]}>
                    <View style={styles.categoryBadge}>
                      <MaterialCommunityIcons 
                        name={marque ? "shield-check" : "tag"} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.categoryBadgeText}>
                        {marque ? 'Marque' : 'Catégorie'}
                      </Text>
                    </View>
                    
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {displayTitle}
                    </Text>
                  </Animated.View>
                  
                  {/* Stats */}
                  <View style={styles.heroStatsWrapper}>
                    <View style={styles.heroStats}>
                      <View style={styles.statItem}>
                        <View style={styles.statIconBadge}>
                          <Ionicons name="cube" size={13} color="#30A08B" />
                        </View>
                        <Text style={styles.statText}>
                          {filteredProducts.length} {filteredProducts.length === 1 ? 'produit' : 'produits'}
                        </Text>
                      </View>
                      
                      {filteredProducts.length > 0 && (
                        <>
                          <View style={styles.statDivider} />
                          
                          <View style={styles.statItem}>
                            <View style={styles.statIconBadge}>
                              <Ionicons name="pricetag" size={13} color="#FC913A" />
                            </View>
                            <Text style={styles.statText}>
                              Dès €{formatPrice(Math.min(...filteredProducts.map(p => p.prixPromo > 0 ? p.prixPromo : p.prix)))}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                // Mode recherche dans le header
                <View style={styles.heroSearchMode}>
                  <View style={styles.heroSearchTopBar}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => {
                        setShowSearchBar(false);
                        setSearchQuery('');
                      }}
                    >
                      <View style={styles.backButtonGradient}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.heroSearchInputContainer}>
                      <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" style={styles.heroSearchIcon} />
                      <TextInput
                        style={styles.heroSearchInput}
                        placeholder="Rechercher dans cette catégorie..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={true}
                        returnKeyType="search"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => setSearchQuery('')}
                          style={styles.heroSearchClear}
                        >
                          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {searchQuery.trim() && (
                    <View style={styles.heroSearchResults}>
                      <View style={styles.heroSearchResultBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                        <Text style={styles.heroSearchResultText}>
                          {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Sort & Filter Bar */}
            <View style={styles.filterBar}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                {renderSortOption('default', 'Défaut', 'apps')}
                {renderSortOption('price-asc', 'Prix ↑', 'arrow-up')}
                {renderSortOption('price-desc', 'Prix ↓', 'arrow-down')}
                {renderSortOption('name', 'Nom', 'text')}
                {renderSortOption('popularity', 'Populaire', 'flame')}
              </ScrollView>
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Sticky Bar Styles
  stickyBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#30A08B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stickyBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stickyTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  stickyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stickyActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Hero Header Styles
  heroHeader: {
    width: '100%',
    minHeight: 200,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  heroGradient: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  heroTitleContainer: {
    marginVertical: 20,
    minHeight: 80,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 18,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 0,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    lineHeight: 40,
  },
  heroStatsWrapper: {
    paddingTop: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.35)',
    marginTop: 10,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.30)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statDivider: {
    width: 1.5,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
  },
  // Filter Bar Styles
  filterBar: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  filterContent: {
    paddingHorizontal: 15,
    gap: 10,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: '#30A08B',
    borderColor: '#30A08B',
  },
  sortChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#FFF',
  },
  // Product List Styles
  listContent: {
    padding: CARD_MARGIN,
  },
  productCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN / 2,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  productCardList: {
    width: width - (CARD_MARGIN * 2),
    flexDirection: 'row',
    height: 150,
    marginVertical: CARD_MARGIN / 2,
    marginHorizontal: CARD_MARGIN,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  imageContainerList: {
    width: 120,
    height: '100%',
    aspectRatio: undefined,
    alignSelf: 'stretch',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  likeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  likeButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    elevation: 2,
  },
  promoText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(244,67,54,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  limitedStockBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,152,0,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitedStockText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 14,
  },
  productInfoList: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#30A08B',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  stockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 11,
    color: '#30A08B',
    fontWeight: '600',
  },
  addToCartButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    minHeight: 400,
  },
  emptyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Search Bar Styles
  searchBarContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 999,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  searchResultText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginLeft: 5,
  },
  // Sticky Search Bar Styles
  searchStickyBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    left: 0,
    right: 0,
    backgroundColor: '#30A08B',
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchStickyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  searchBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchStickyInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchStickyInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchClearButton: {
    padding: 2,
  },
  searchResultBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  searchResultBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Hero Search Mode Styles
  heroSearchMode: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroSearchTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  heroSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroSearchIcon: {
    marginRight: 0,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    paddingVertical: 0,
  },
  heroSearchClear: {
    padding: 4,
  },
  heroSearchResults: {
    alignItems: 'center',
  },
  heroSearchResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heroSearchResultText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
