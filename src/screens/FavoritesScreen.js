import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { toggleLike, fetchUserLikes } from '../redux/likesSlice';
import { addArticleToPanier } from '../redux/cartSlice';
import { formatPrice } from '../utils/formatPrice';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const COLORS = {
  primary: '#30A08B',
  secondary: '#B2905F',
  tertiary: '#62aca2',
  white: '#FFFFFF',
  black: '#1A202C',
  gray: '#718096',
  lightGray: '#E2E8F0',
  paleGreen: '#F0FAF8',
  red: '#EF4444',
  green: '#10B981',
  darkGray: '#4A5568',
  orange: '#E87E04',
  bg: '#F7F8FA',
};

// ─────────────────────────────────────────────────────────
//  Pill horizontale de filtre
// ─────────────────────────────────────────────────────────
const FilterPill = ({ label, active, onPress, count }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.pill, active && styles.pillActive]}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
      {count != null ? ` (${count})` : ''}
    </Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────
//  Sélecteur de tri
// ─────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'dateAdded', label: "Date d'ajout", icon: 'calendar-outline' },
  { value: 'price',     label: 'Prix croissant', icon: 'trending-up-outline' },
  { value: 'priceDesc', label: 'Prix décroissant', icon: 'trending-down-outline' },
  { value: 'name',      label: 'Nom A → Z', icon: 'text-outline' },
];

const SortSelector = ({ current, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.sortScroll}
  >
    {SORT_OPTIONS.map((opt) => {
      const active = current === opt.value;
      return (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.8}
          style={[styles.sortChip, active && styles.sortChipActive]}
        >
          <Ionicons
            name={opt.icon}
            size={13}
            color={active ? COLORS.white : COLORS.primary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// ─────────────────────────────────────────────────────────
//  Carte produit
// ─────────────────────────────────────────────────────────
const ProductCard = React.memo(({ item, fadeAnim, onUnlike, onAddToCart, onPress }) => {
  const hasPromo = item.prixPromo > 0 && item.prixPromo < item.prix;
  const discount = hasPromo
    ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100)
    : null;
  const finalPrice = hasPromo ? item.prixPromo : item.prix;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* ── Image ── */}
        <TouchableOpacity onPress={onPress} activeOpacity={0.92}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.image1 }}
              style={styles.productImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.18)']}
              style={styles.imageGradient}
            />

            {/* Badge remise */}
            {hasPromo && discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discount}%</Text>
              </View>
            )}

            {/* Bouton cœur rouge actif */}
            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => onUnlike(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.heartBtnInner}>
                <Ionicons name="heart" size={17} color={COLORS.red} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ── Infos ── */}
        <View style={styles.productInfo}>
          {/* Marque */}
          {item.marque && (
            <Text style={styles.brandLabel} numberOfLines={1}>
              {item.marque}
            </Text>
          )}

          {/* Nom */}
          <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>

          {/* Étoiles statiques */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name="star" size={10} color={s <= 4 ? '#FFBB00' : '#D1D5DB'} />
            ))}
            <Text style={styles.ratingCount}>(128)</Text>
          </View>

          {/* Prix */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(finalPrice)} CFA</Text>
            {hasPromo && (
              <Text style={styles.oldPrice}>{formatPrice(item.prix)} CFA</Text>
            )}
          </View>

          {/* Actions bas de carte */}
          <View style={styles.cardActions}>
            {/* Bouton Voir */}
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.tertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewBtnGradient}
              >
                <Text style={styles.viewBtnText}>Voir</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bouton corbeille */}
            <TouchableOpacity
              style={styles.trashBtn}
              onPress={() => onUnlike(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.red} />
            </TouchableOpacity>
          </View>

          {/* Stock */}
          {item.quantite > 0 ? (
            <View style={styles.stockRow}>
              <View style={styles.stockDot} />
              <Text style={styles.stockText}>En stock</Text>
            </View>
          ) : (
            <View style={styles.stockRow}>
              <View style={[styles.stockDot, { backgroundColor: COLORS.red }]} />
              <Text style={[styles.stockText, { color: COLORS.red }]}>Rupture de stock</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────
//  Empty state
// ─────────────────────────────────────────────────────────
const EmptyState = ({ onExplore }) => (
  <View style={styles.emptyContainer}>
    <LinearGradient
      colors={['rgba(48,160,139,0.08)', 'rgba(48,160,139,0.02)']}
      style={styles.emptyGradient}
    >
      <View style={styles.emptyIconWrap}>
        <LinearGradient colors={['#FF6B6B', '#EE5A6F']} style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="heart-broken" size={44} color={COLORS.white} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
      <Text style={styles.emptySubtitle}>
        Ajoutez des produits à vos favoris pour les retrouver ici facilement.
      </Text>
      <TouchableOpacity onPress={onExplore} activeOpacity={0.85} style={styles.ctaBtn}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.tertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtnGradient}
        >
          <MaterialCommunityIcons name="compass-outline" size={18} color={COLORS.white} />
          <Text style={styles.ctaBtnText}>Découvrir des produits</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

// ─────────────────────────────────────────────────────────
//  Modal confirmation suppression
// ─────────────────────────────────────────────────────────
const DeleteModal = ({ visible, product, onCancel, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <LinearGradient colors={['#FF6B6B', '#EE5A6F']} style={styles.modalTop}>
          <MaterialCommunityIcons name="heart-broken" size={32} color={COLORS.white} />
        </LinearGradient>
        <View style={styles.modalBody}>
          <Text style={styles.modalTitle}>Retirer des favoris ?</Text>
          {product && (
            <View style={styles.modalProductRow}>
              <Image source={{ uri: product.image1 }} style={styles.modalProductImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalProductName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.modalProductPrice}>
                  {formatPrice(product.prixPromo > 0 ? product.prixPromo : product.prix)} CFA
                </Text>
              </View>
            </View>
          )}
          <Text style={styles.modalDesc}>
            Ce produit sera retiré de votre liste.{'\n'}Vous pourrez le rajouter à tout moment.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={onConfirm}>
              <LinearGradient colors={['#FF6B6B', '#EE5A6F']} style={styles.modalConfirmGrad}>
                <Ionicons name="trash-outline" size={15} color={COLORS.white} style={{ marginRight: 4 }} />
                <Text style={styles.modalConfirmText}>Retirer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  </Modal>
);

// ─────────────────────────────────────────────────────────
//  Écran principal
// ─────────────────────────────────────────────────────────
export default function FavoritesScreen() {
  const navigation = useNavigation();
  const dispatch   = useDispatch();

  // ── Sélecteurs Redux (logique inchangée) ──
  const { likedProducts, loading } = useSelector((state) => state.likes);
  const allProducts  = useSelector((state) => state.products?.data || []);
  const categories   = useSelector((state) => state.products?.categories || []);
  const { user }     = useSelector((state) => state.auth);

  // ── State ──
  const [refreshing,       setRefreshing]       = useState(false);
  const [sortBy,           setSortBy]           = useState('dateAdded');
  const [filterCategory,   setFilterCategory]   = useState('all');
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [productToDelete,  setProductToDelete]  = useState(null);
  const [fadeAnim]                               = useState(new Animated.Value(0));

  // ── Chargement initial (logique inchangée) ──
  useEffect(() => {
    console.log('❤️ [FavoritesScreen] Loading favorites for user:', user?.id);
    if (user?.id) dispatch(fetchUserLikes(user.id));
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [dispatch, user?.id]);

  // ── Dérivés (logique inchangée) ──
  const likedProductsDetails = useMemo(() => {
    return likedProducts
      .map((likeId) => allProducts.find((p) => p._id === likeId))
      .filter(Boolean);
  }, [likedProducts, allProducts]);

  const filteredProducts = useMemo(() => {
    if (filterCategory === 'all') return likedProductsDetails;
    return likedProductsDetails.filter((p) => p.ClefCategorie === filterCategory);
  }, [likedProductsDetails, filterCategory]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'price':     return sorted.sort((a, b) => (a.prix || 0) - (b.prix || 0));
      case 'priceDesc': return sorted.sort((a, b) => (b.prix || 0) - (a.prix || 0));
      case 'name':      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'nameDesc':  return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      default:          return sorted;
    }
  }, [filteredProducts, sortBy]);

  // ── Catégories présentes dans les favoris ──
  const presentCategories = useMemo(() => {
    const ids = new Set(likedProductsDetails.map((p) => p.ClefCategorie).filter(Boolean));
    return categories.filter((c) => ids.has(c._id));
  }, [likedProductsDetails, categories]);

  // ── Callbacks (logique inchangée) ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) await dispatch(fetchUserLikes(user.id));
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
      product,
      quantity: 1,
      selectedColor: null,
      selectedSize: null,
      colorImage: product.image1,
    };
    dispatch(addArticleToPanier(cartItem));
    Alert.alert('✓ Ajouté', `${product.name} a été ajouté au panier`);
  }, [dispatch]);

  // ─── Rendu : tête de liste (header + filtres + tri) ───
  const renderHeader = useCallback(() => (
    <View>
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={[COLORS.primary, '#27937F', COLORS.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBox}>
              <MaterialCommunityIcons name="heart-multiple" size={26} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Mes Favoris</Text>
              <Text style={styles.headerSub}>
                {likedProductsDetails.length} produit{likedProductsDetails.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{likedProductsDetails.length}</Text>
          </View>
        </View>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{sortedProducts.filter((p) => p.prixPromo > 0).length}</Text>
            <Text style={styles.statLbl}>En promo</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{sortedProducts.filter((p) => p.quantite > 0).length}</Text>
            <Text style={styles.statLbl}>Disponibles</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{presentCategories.length}</Text>
            <Text style={styles.statLbl}>Catégories</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Filtre catégories (pills) ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catégorie</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <FilterPill
            label="Tout"
            active={filterCategory === 'all'}
            onPress={() => setFilterCategory('all')}
            count={likedProductsDetails.length}
          />
          {presentCategories.map((cat) => (
            <FilterPill
              key={cat._id}
              label={cat.name}
              active={filterCategory === cat._id}
              onPress={() => setFilterCategory(cat._id)}
              count={likedProductsDetails.filter((p) => p.ClefCategorie === cat._id).length}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Tri ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trier par</Text>
        <SortSelector current={sortBy} onChange={setSortBy} />
      </View>

      {/* Nb résultats */}
      {sortedProducts.length > 0 && (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {sortedProducts.length} résultat{sortedProducts.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  ), [
    likedProductsDetails, sortedProducts, presentCategories,
    filterCategory, sortBy,
  ]);

  // ─── Rendu : carte produit ───
  const renderItem = useCallback(({ item }) => (
    <ProductCard
      item={item}
      fadeAnim={fadeAnim}
      onUnlike={handleUnlike}
      onAddToCart={handleAddToCart}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    />
  ), [fadeAnim, handleUnlike, handleAddToCart, navigation]);

  // ─── Rendu : écran non connecté ───
  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ScrollView style={{ flex: 1, backgroundColor: COLORS.white }} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#30A08B', '#2D9175', '#26805F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guestHeader}
          >
            <View style={styles.guestAvatarWrap}>
              <MaterialCommunityIcons name="heart-multiple" size={60} color={COLORS.white} />
            </View>
            <Text style={styles.guestTitle}>Vos favoris vous attendent</Text>
            <Text style={styles.guestSub}>Connectez-vous pour accéder à vos produits favoris</Text>
          </LinearGradient>

          <View style={styles.guestContent}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('QuickAuth', {
                pendingAction: 'open-favorites',
                returnScreen: 'MainTabs',
                returnParams: { screen: 'Favorites' },
              })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#30A08B', '#26805F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGrad}
              >
                <Ionicons name="log-in-outline" size={22} color={COLORS.white} />
                <Text style={styles.loginBtnText}>Se connecter</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('QuickAuth', {
                pendingAction: 'open-favorites',
                returnScreen: 'MainTabs',
                returnParams: { screen: 'Favorites' },
              })}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnText}>Créer un compte</Text>
            </TouchableOpacity>

            <View style={styles.featuresBox}>
              <Text style={styles.featuresTitle}>Avec un compte, vous pouvez :</Text>
              {[
                'Sauvegarder vos produits préférés',
                'Accéder à vos favoris depuis tous vos appareils',
                'Recevoir des alertes sur les promotions',
                'Ajouter rapidement au panier',
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </>
    );
  }

  // ─── Rendu principal ───
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.container}>
        <FlatList
          data={sortedProducts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            !loading
              ? () => <EmptyState onExplore={() => navigation.navigate('MainTabs')} />
              : null
          }
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

        <DeleteModal
          visible={showDeleteModal}
          product={productToDelete}
          onCancel={() => { setShowDeleteModal(false); setProductToDelete(null); }}
          onConfirm={confirmDelete}
        />
      </View>
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Liste ──
  listContent: {
    paddingBottom: 32,
  },
  columnWrapper: {
    paddingHorizontal: 12,
    marginBottom: 14,
    justifyContent: 'space-between',
  },

  // ── Header gradient ──
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerCountBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerCountText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },

  // Mini stats dans le header
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
  },

  // ── Sections filtres / tri ──
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Pills catégories
  pillsRow: {
    gap: 8,
    paddingRight: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#E6F7F4',
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  pillTextActive: {
    color: COLORS.primary,
  },

  // Tri chips
  sortScroll: {
    gap: 8,
    paddingRight: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sortChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sortChipTextActive: {
    color: COLORS.white,
  },

  // Nb résultats
  resultsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
  },
  resultsText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },

  // ── Carte produit ──
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.05,
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
    height: 56,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.red,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.white,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  heartBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  // Info produit
  productInfo: {
    padding: 10,
    gap: 5,
  },
  brandLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    gap: 2,
  },
  ratingCount: {
    fontSize: 10,
    color: COLORS.gray,
    marginLeft: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  oldPrice: {
    fontSize: 11,
    color: '#AAA',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },

  // Actions bas de carte
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  viewBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewBtnGradient: {
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  // Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

  // ── Empty state ──
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyGradient: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 260,
  },
  ctaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── Modal suppression ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  modalTop: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalProductRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 12,
    alignItems: 'center',
  },
  modalProductImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  modalProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray,
  },
  modalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalConfirmGrad: {
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ── Écran non connecté ──
  guestHeader: {
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  guestAvatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: 18,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  guestSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 21,
  },
  guestContent: {
    padding: 20,
  },
  loginBtn: {
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  loginBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  registerBtn: {
    marginBottom: 28,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  featuresBox: {
    backgroundColor: '#F0FAF8',
    borderRadius: 16,
    padding: 18,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
});
