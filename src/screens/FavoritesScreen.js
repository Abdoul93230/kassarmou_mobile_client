import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toggleLike, fetchUserLikes } from '../redux/likesSlice';
import { addItemToCart } from '../redux/cartSlice';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  tertiary: '#62aca2',
  white: '#FFFFFF',
  black: '#1A202C',
  gray: '#718096',
  lightGray: '#E2E8F0',
  paleGreen: '#E6FFEA',
  red: '#EF4444',
  green: '#10B981',
  darkGray: '#4A5568',
  orange: '#E87E04',
};

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { likedProducts, loading } = useSelector((state) => state.likes);
  const allProducts = useSelector((state) => state.products?.data || []);
  const categories = useSelector((state) => state.products?.categories || []);
  const { user } = useSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('dateAdded');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    console.log('❤️ [FavoritesScreen] Loading favorites for user:', user?.id);
    if (user?.id) {
      dispatch(fetchUserLikes(user.id));
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [dispatch, user?.id]);

  // Get full product details for liked products
  const likedProductsDetails = useMemo(() => {
    return likedProducts
      .map(likeId => allProducts.find(p => p._id === likeId))
      .filter(Boolean);
  }, [likedProducts, allProducts]);

  // Filter by category
  const filteredProducts = useMemo(() => {
    if (filterCategory === 'all') return likedProductsDetails;
    return likedProductsDetails.filter(p => p.ClefCategorie === filterCategory);
  }, [likedProductsDetails, filterCategory]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => (a.prix || 0) - (b.prix || 0));
      case 'priceDesc':
        return sorted.sort((a, b) => (b.prix || 0) - (a.prix || 0));
      case 'name':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'nameDesc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await dispatch(fetchUserLikes(user.id));
    }
    setRefreshing(false);
  }, [dispatch, user?.id]);

  const handleUnlike = useCallback((product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (productToDelete && user?.id) {
      console.log('🗑️ [FavoritesScreen] Removing from favorites:', productToDelete._id);
      dispatch(toggleLike({ productId: productToDelete._id, userId: user.id }));
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  }, [productToDelete, user?.id, dispatch]);

  const handleAddToCart = useCallback((product) => {
    const cartItem = {
      product: product,
      quantity: 1,
      selectedColor: null,
      selectedSize: null,
      colorImage: product.image1,
    };
    dispatch(addItemToCart(cartItem));
    Alert.alert('✓ Ajouté', `${product.name} a été ajouté au panier`);
  }, [dispatch]);

  const handleShare = useCallback((product) => {
    // TODO: Implement sharing functionality
    Alert.alert('Partage', `Partager ${product.name}`);
  }, []);

  const calculateDiscount = (price, promoPrice) => {
    if (!promoPrice || price <= promoPrice) return null;
    return Math.round(((price - promoPrice) / price) * 100);
  };

  const renderProductCard = useCallback(({ item, index }) => {
    const hasPromo = item.prixPromo > 0 && item.prixPromo < item.prix;
    const discount = calculateDiscount(item.prix, item.prixPromo);
    const finalPrice = hasPromo ? item.prixPromo : item.prix;

    return (
      <Animated.View 
        style={[
          styles.cardWrapper,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          activeOpacity={0.9}
        >
          {/* Image Container */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.image1 }} 
              style={styles.productImage}
              resizeMode="cover"
            />
            
            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)']}
              style={styles.imageGradient}
            />
            
            {/* Discount Badge */}
            {hasPromo && discount && (
              <LinearGradient
                colors={['#FF6B6B', '#EE5A6F']}
                style={styles.discountBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="tag" size={10} color={COLORS.white} />
                <Text style={styles.discountText}>-{discount}%</Text>
              </LinearGradient>
            )}
            
            {/* Heart Button */}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => handleUnlike(item)}
            >
              <LinearGradient
                colors={['#FF6B6B', '#EE5A6F']}
                style={styles.heartGradient}
              >
                <Ionicons name="heart" size={16} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Product Info */}
          <View style={styles.productInfo}>
            {/* Brand Badge */}
            {item.marque && (
              <View style={styles.brandBadge}>
                <MaterialCommunityIcons name="shield-check" size={10} color={COLORS.green} />
                <Text style={styles.brandText} numberOfLines={1}>{item.marque}</Text>
              </View>
            )}
            
            {/* Product Name */}
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            
            {/* Rating */}
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.ratingText}>4.5</Text>
              <Text style={styles.reviewCount}>(128)</Text>
            </View>
            
            {/* Price Row */}
            <View style={styles.priceRow}>
              <View style={styles.priceColumn}>
                <Text style={styles.price}>€{finalPrice.toFixed(2)}</Text>
                {hasPromo && (
                  <Text style={styles.oldPrice}>€{item.prix.toFixed(2)}</Text>
                )}
              </View>
              
              {/* Quick Add Button */}
              {item.isdisponible && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddToCart(item)}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.tertiary]}
                    style={styles.addButtonGradient}
                  >
                    <Ionicons name="cart" size={16} color={COLORS.white} />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Stock Indicator */}
            {item.isdisponible ? (
              <View style={styles.stockBadge}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>En stock</Text>
              </View>
            ) : (
              <View style={styles.outOfStockBadge}>
                <MaterialCommunityIcons name="close-circle" size={12} color={COLORS.red} />
                <Text style={styles.outOfStockText}>Rupture</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fadeAnim, navigation, handleUnlike, handleAddToCart]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.tertiary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerIconBadge}>
              <MaterialCommunityIcons name="heart-multiple" size={28} color={COLORS.white} />
            </View>
            <Text style={styles.headerTitle}>Mes Favoris</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{likedProductsDetails.length}</Text>
              <Text style={styles.statLabel}>
                Produit{likedProductsDetails.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {sortedProducts.filter(p => p.prixPromo > 0).length}
              </Text>
              <Text style={styles.statLabel}>En promo</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {sortedProducts.filter(p => p.isdisponible).length}
              </Text>
              <Text style={styles.statLabel}>Disponibles</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
      
      {/* Filters Button */}
      <TouchableOpacity
        style={styles.filtersButton}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={showFilters ? [COLORS.secondary, '#FFB366'] : [COLORS.white, COLORS.white]}
          style={styles.filtersButtonGradient}
        >
          <MaterialCommunityIcons 
            name="tune-variant" 
            size={20} 
            color={showFilters ? COLORS.white : COLORS.primary} 
          />
          <Text style={[styles.filtersButtonText, showFilters && styles.filtersButtonTextActive]}>
            Filtres & Tri
          </Text>
          <Ionicons 
            name={showFilters ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={showFilters ? COLORS.white : COLORS.primary} 
          />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Catégorie</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              <TouchableOpacity
                style={[styles.categoryChip, filterCategory === 'all' && styles.categoryChipActive]}
                onPress={() => setFilterCategory('all')}
              >
                <Text style={[styles.categoryChipText, filterCategory === 'all' && styles.categoryChipTextActive]}>
                  Toutes
                </Text>
              </TouchableOpacity>
              
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[styles.categoryChip, filterCategory === cat._id && styles.categoryChipActive]}
                  onPress={() => setFilterCategory(cat._id)}
                >
                  <Text style={[styles.categoryChipText, filterCategory === cat._id && styles.categoryChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Trier par</Text>
            <View style={styles.sortButtons}>
              {[
                { value: 'dateAdded', label: 'Date d\'ajout', icon: 'calendar' },
                { value: 'price', label: 'Prix ↑', icon: 'arrow-up' },
                { value: 'priceDesc', label: 'Prix ↓', icon: 'arrow-down' },
                { value: 'name', label: 'Nom A-Z', icon: 'sort-alphabetical-ascending' },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.value}
                  style={[styles.sortButton, sortBy === sort.value && styles.sortButtonActive]}
                  onPress={() => setSortBy(sort.value)}
                >
                  <MaterialCommunityIcons 
                    name={sort.icon} 
                    size={16} 
                    color={sortBy === sort.value ? COLORS.white : COLORS.primary} 
                  />
                  <Text style={[styles.sortButtonText, sortBy === sort.value && styles.sortButtonTextActive]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(48, 160, 139, 0.05)', 'rgba(48, 160, 139, 0.02)']}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#EE5A6F']}
            style={styles.emptyIconGradient}
          >
            <MaterialCommunityIcons name="heart-broken" size={48} color={COLORS.white} />
          </LinearGradient>
        </View>
        
        <Text style={styles.emptyTitle}>Aucun favori</Text>
        <Text style={styles.emptySubtitle}>
          Vous n'avez pas encore ajouté de produits à vos favoris.{'\n'}
          Explorez notre catalogue et ajoutez vos coups de cœur ! 💚
        </Text>
        
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => navigation.navigate('Home')}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.tertiary]}
            style={styles.exploreButtonGradient}
          >
            <MaterialCommunityIcons name="compass" size={20} color={COLORS.white} />
            <Text style={styles.exploreButtonText}>Découvrir des produits</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <FlatList
        data={sortedProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item._id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && renderEmptyState}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={sortedProducts.length > 0 ? styles.columnWrapper : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FF6B6B', '#EE5A6F']}
              style={styles.modalHeader}
            >
              <MaterialCommunityIcons name="heart-broken" size={32} color={COLORS.white} />
            </LinearGradient>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>Retirer des favoris ?</Text>
              
              {productToDelete && (
                <View style={styles.modalProductInfo}>
                  <Image 
                    source={{ uri: productToDelete.image1 }}
                    style={styles.modalProductImage}
                  />
                  <View style={styles.modalProductDetails}>
                    <Text style={styles.modalProductName} numberOfLines={2}>
                      {productToDelete.name}
                    </Text>
                    <Text style={styles.modalProductPrice}>
                      €{(productToDelete.prixPromo > 0 ? productToDelete.prixPromo : productToDelete.prix).toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
              
              <Text style={styles.modalDescription}>
                Êtes-vous sûr de vouloir retirer ce produit de vos favoris ?{'\n'}
                Vous pourrez toujours l'ajouter à nouveau plus tard. 💫
              </Text>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={confirmDelete}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A6F']}
                    style={styles.modalConfirmGradient}
                  >
                    <Text style={styles.modalConfirmText}>Retirer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paleGreen,
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  
  // Header Styles
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  
  // Filters Styles
  filtersButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filtersButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 12,
  },
  filtersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filtersButtonTextActive: {
    color: COLORS.white,
  },
  filtersPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  categoriesScroll: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sortButtonTextActive: {
    color: COLORS.white,
  },
  
  // Card Styles
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  heartGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Product Info Styles
  productInfo: {
    padding: 12,
    gap: 6,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    gap: 4,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.green,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    lineHeight: 18,
    minHeight: 36,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  reviewCount: {
    fontSize: 10,
    color: COLORS.gray,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceColumn: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  oldPrice: {
    fontSize: 11,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addButton: {
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    gap: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 4,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.red,
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
    padding: 24,
    margin: 16,
    borderRadius: 24,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalProductInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  modalProductDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
