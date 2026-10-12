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
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getProducts, getCategories, getProducts_Pubs, getTypes } from '../redux/productsSlice';
import { formatPrice } from '../utils/formatPrice';
import { fetchUserLikes, toggleLike } from '../redux/likesSlice';
import { addArticleToPanier } from '../redux/cartSlice';
import { COLORS } from '../config/constants';
import CheckinCard from '../components/CheckinCard';
import EventBanner from '../components/EventBanner';
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
// mainContent paddingH 12*2=24 + card padding 16*2=32 + gap between 2 cols = 10 → 66 total
const CARD_WIDTH = (SCREEN_WIDTH - 66) / 2;
const H_CARD_WIDTH = 170;

// ─── Flash Countdown ──────────────────────────────────────────────────────────
function FlashCountdown() {
  const [time, setTime] = useState({ h: 5, m: 59, s: 59 });

  useEffect(() => {
    const id = setInterval(() => {
      setTime((t) => {
        let { h, m, s } = t;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 5; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (n) => String(n).padStart(2, '0');
  const parts = [fmt(time.h), fmt(time.m), fmt(time.s)];

  return (
    <View style={styles.countdownRow}>
      <Text style={styles.countdownLabel}>Fin dans</Text>
      {parts.map((v, i) => (
        <View key={i} style={styles.countdownPart}>
          <View style={styles.countdownTile}>
            <Text style={styles.countdownNum}>{v}</Text>
          </View>
          {i < 2 && <Text style={styles.countdownSep}>:</Text>}
        </View>
      ))}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ iconName, iconColor = '#30A08B', title, subtitle, onPress }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIconBadge, { backgroundColor: iconColor }]}>
          <MaterialCommunityIcons name={iconName} size={17} color="#fff" />
        </View>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onPress && (
        <TouchableOpacity style={styles.seeAllBtn} onPress={onPress} activeOpacity={0.7}>
          <Text style={styles.seeAllText}>Voir tout</Text>
          <Ionicons name="chevron-forward" size={14} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Product Card (grid) ──────────────────────────────────────────────────────
function ProductCard({ product, navigation, onToggleLike, isLiked, onAddToCart }) {
  const hasPromo = product.prixPromo > 0 && product.prixPromo < product.prix;
  const price = hasPromo ? product.prixPromo : product.prix;
  const discount = hasPromo
    ? Math.round(((product.prix - product.prixPromo) / product.prix) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.productCard, { width: CARD_WIDTH }]}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ProductDetail', { product })}
    >
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: product.image1 }} style={styles.cardImage} resizeMode="cover" />
        {hasPromo && (
          <LinearGradient colors={['#FF6B6B', '#C44569']} style={styles.cardPromoBadge}>
            <Text style={styles.cardPromoText}>{`-${discount}%`}</Text>
          </LinearGradient>
        )}
        <TouchableOpacity
          style={[styles.cardHeart, isLiked && styles.cardHeartActive]}
          onPress={() => onToggleLike(product)}
          activeOpacity={0.8}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color={isLiked ? '#fff' : '#FF6B6B'} />
        </TouchableOpacity>
        {product.quantite > 0 && product.quantite < 5 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Stock limité</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{product.name}</Text>
        {product.marque ? <Text style={styles.cardBrand} numberOfLines={1}>{product.marque}</Text> : null}
        <View style={styles.cardFooter}>
          <View>
            {hasPromo && <Text style={styles.cardOldPrice}>{formatPrice(product.prix)} CFA</Text>}
            <Text style={[styles.cardPrice, hasPromo && { color: '#E74C3C' }]}>
              {formatPrice(price)} CFA
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cardCartBtn}
            activeOpacity={0.8}
            onPress={() => onAddToCart(product)}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.tertiary]} style={styles.cardCartGradient}>
              <Ionicons name="cart-outline" size={15} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Horizontal Product Card ───────────────────────────────────────────────────
function HProductCard({ product, navigation, onToggleLike, isLiked, onAddToCart }) {
  const hasPromo = product.prixPromo > 0 && product.prixPromo < product.prix;
  const price = hasPromo ? product.prixPromo : product.prix;
  const discount = hasPromo
    ? Math.round(((product.prix - product.prixPromo) / product.prix) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.hCard}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ProductDetail', { product })}
    >
      <View style={styles.hCardImageWrap}>
        <Image source={{ uri: product.image1 }} style={styles.hCardImage} resizeMode="cover" />
        {hasPromo && (
          <LinearGradient colors={['#FF6B6B', '#C44569']} style={styles.cardPromoBadge}>
            <Text style={styles.cardPromoText}>{`-${discount}%`}</Text>
          </LinearGradient>
        )}
        <TouchableOpacity
          style={[styles.cardHeart, isLiked && styles.cardHeartActive]}
          onPress={() => onToggleLike(product)}
          activeOpacity={0.8}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={15} color={isLiked ? '#fff' : '#FF6B6B'} />
        </TouchableOpacity>
      </View>
      <View style={styles.hCardInfo}>
        <Text style={styles.hCardName} numberOfLines={2}>{product.name}</Text>
        {hasPromo && <Text style={styles.cardOldPrice}>{formatPrice(product.prix)} CFA</Text>}
        <Text style={[styles.cardPrice, hasPromo && { color: '#E74C3C' }]}>
          {formatPrice(price)} CFA
        </Text>
        <TouchableOpacity
          style={styles.hCardCartBtn}
          onPress={() => onAddToCart(product)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.tertiary]} style={styles.hCardCartGradient}>
            <Ionicons name="cart-outline" size={13} color="#fff" />
            <Text style={styles.hCardCartText}>Ajouter</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [popularStores, setPopularStores] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerRef = useRef(null);
  const bannerTimer = useRef(null);

  // Infinite feed state
  const [feedItems, setFeedItems] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const feedLoadingRef = useRef(false);
  const feedSeenIds = useRef(new Set());

  const products = useSelector(selectProducts);
  const types = useSelector(selectTypes);
  const categories = useSelector(selectCategories);
  const banners = useSelector(selectBanners);
  const user = useSelector(selectUser);
  const cartItems = useSelector(selectCartItems);
  const likedProducts = useSelector(selectLikedProducts);

  useEffect(() => {
    loadData();
    const userId = user?.id || user?._id;
    if (userId) dispatch(fetchUserLikes(userId));
  }, []);

  // Auto-scroll banner
  useEffect(() => {
    if (banners.length > 1) {
      bannerTimer.current = setInterval(() => {
        setCurrentBannerIndex((prev) => {
          const next = (prev + 1) % banners.length;
          bannerRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
          return next;
        });
      }, 4500);
    }
    return () => clearInterval(bannerTimer.current);
  }, [banners.length]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      dispatch(getProducts(setLoading)),
      dispatch(getCategories(setLoading)),
      dispatch(getTypes(setLoading)),
      dispatch(getProducts_Pubs()),
      fetchStores(),
    ]);
    setLoading(false);
  };

  const fetchStores = async () => {
    try {
      let stores = [];
      try {
        const r = await axios.get(`${API_URL}/getSellersClients`);
        stores = r?.data?.data || [];
      } catch (e) {
        if (e?.response?.status !== 404) throw e;
        const r = await axios.get(`${API_URL}/getSellers`);
        stores = (r?.data?.data || []).filter((s) => s?.isvalid === true);
      }
      setPopularStores(
        stores.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0)).slice(0, 6)
      );
    } catch {}
  };

  const loadFeedPage = useCallback(async () => {
    if (feedLoadingRef.current || !feedHasMore) return;
    feedLoadingRef.current = true;
    setFeedLoading(true);
    try {
      const res = await axios.get(`${API_URL}/ProductsHome?limit=20&page=${feedPage}`);
      const incoming = res.data.products ?? res.data.data ?? [];
      const fresh = incoming.filter((p) => {
        if (feedSeenIds.current.has(p._id)) return false;
        feedSeenIds.current.add(p._id);
        return true;
      });
      if (fresh.length === 0 && incoming.length > 0) {
        setFeedHasMore(false);
      } else {
        if (incoming.length < 20) setFeedHasMore(false);
        setFeedItems((prev) => [...prev, ...fresh]);
        setFeedPage((p) => p + 1);
      }
    } catch {
      setFeedHasMore(false);
    } finally {
      feedLoadingRef.current = false;
      setFeedLoading(false);
    }
  }, [feedPage, feedHasMore]);

  // Load first page of feed on mount
  useEffect(() => { loadFeedPage(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset feed
    setFeedItems([]);
    setFeedPage(1);
    setFeedHasMore(true);
    feedSeenIds.current = new Set();
    feedLoadingRef.current = false;
    await loadData();
    setRefreshing(false);
    loadFeedPage();
  };

  const handleToggleLike = useCallback(async (product) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      navigation.navigate('Login');
      return;
    }
    try {
      await dispatch(toggleLike({ userId, product })).unwrap();
    } catch {}
  }, [user, dispatch]);

  const handleAddToCart = useCallback((product) => {
    dispatch(addArticleToPanier({
      ...product,
      id: product._id,
      quantite: 1,
      color: null,
      taille: null,
      colorImage: product.image1,
    }));
  }, [dispatch]);

  const isLiked = useCallback((id) => likedProducts.includes(id), [likedProducts]);

  const cartCount = useMemo(
    () => cartItems.reduce((s, i) => s + (i.quantite || i.quantity || 1), 0),
    [cartItems]
  );

  // Derived data — same logic as web HomeMain.tsx
  const typeToCategory = useMemo(() => {
    const map = {};
    types.forEach((t) => { map[t._id] = t.clefCategories; });
    return map;
  }, [types]);

  const featured = useMemo(() => products.slice(0, 8), [products]);

  const flashDeals = useMemo(
    () => products.filter((p) => p.prixPromo > 0 && p.prixPromo < p.prix).slice(0, 12),
    [products]
  );

  const newArrivals = useMemo(() => products.slice(8, 16), [products]);

  const categorySections = useMemo(() => {
    if (!products.length || !types.length || !categories.length) return [];
    return categories
      .filter((c) => c.name !== 'all')
      .map((cat) => {
        const typeIds = new Set(
          types.filter((t) => t.clefCategories === cat._id).map((t) => t._id)
        );
        const catProducts = products.filter((p) => typeIds.has(p.ClefType));
        return { cat, products: catProducts };
      })
      .filter(({ products: ps }) => ps.length >= 2);
  }, [products, types, categories]);

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.primary, COLORS.tertiary]} style={styles.loadingGrad}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#30A08B', '#27897A', '#1d7a6a']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Row 1 : Logo + titre + icônes */}
        <View style={styles.headerRow}>
          <View style={styles.headerBrand}>
            <Image
              source={require('../../assets/vraisLogo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerIcons}>
            {/* Notification */}
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            {/* Panier */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Cart')}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profil */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              {user ? (
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>
                    {(user.name || user.userName || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              ) : (
                <Ionicons name="person-circle-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2 : Barre de recherche */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.95}
          onPress={() => navigation.navigate('Search')}
        >
          <View style={styles.searchInner}>
            <Ionicons name="search" size={17} color={COLORS.primary} />
            <Text style={styles.searchPlaceholder}>Rechercher produits, boutiques…</Text>
          </View>
          <LinearGradient
            colors={[COLORS.primary, COLORS.tertiary]}
            style={styles.searchScanBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="options-outline" size={15} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        {banners.length > 0 ? (
          <View style={styles.bannerSection}>
            <ScrollView
              ref={bannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentBannerIndex(idx);
              }}
            >
              {banners.map((banner, i) => (
                <View key={i} style={styles.bannerSlide}>
                  <Image source={{ uri: banner.image }} style={styles.bannerImage} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.bannerGrad}>
                    {banner.title ? <Text style={styles.bannerTitle}>{banner.title}</Text> : null}
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <View key={i} style={[styles.dot, currentBannerIndex === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('ProductListScreen', {})} activeOpacity={0.9}>
            <LinearGradient
              colors={['#30A08B', '#1d7a6a']}
              style={styles.heroCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.heroCtaTitle}>IhamBaobab</Text>
              <Text style={styles.heroCtaSub}>La marketplace du Niger 🌍</Text>
              <View style={styles.heroCtaBtn}>
                <Text style={styles.heroCtaBtnText}>Découvrir →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Event Banner ─────────────────────────────────────────────────── */}
        <EventBanner />

        {/* ── Daily Checkin Banner ─────────────────────────────────────────── */}
        <CheckinCard navigation={navigation} />

        {/* ── Category Strip ───────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <View style={styles.catStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catStripContent}>
              <TouchableOpacity
                style={styles.catChipAll}
                onPress={() => navigation.navigate('ProductListScreen', {})}
                activeOpacity={0.8}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.tertiary]} style={styles.catChipGrad}>
                  <MaterialCommunityIcons name="apps" size={14} color="#fff" />
                  <Text style={styles.catChipAllText}>Tout</Text>
                </LinearGradient>
              </TouchableOpacity>
              {categories.filter((c) => c.name !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={styles.catChip}
                  onPress={() => navigation.navigate('ProductListScreen', { categoryId: cat._id, categoryName: cat.name })}
                  activeOpacity={0.8}
                >
                  {cat.image ? (
                    <Image source={{ uri: cat.image }} style={styles.catChipImg} />
                  ) : null}
                  <Text style={styles.catChipText} numberOfLines={1}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Trust Badges ─────────────────────────────────────────────────── */}
        <View style={styles.trustGrid}>
          {[
            { icon: 'truck-fast', label: 'Livraison rapide', sub: 'Partout au Niger' },
            { icon: 'shield-check', label: 'Paiement sécurisé', sub: 'Mobile Money & +' },
            { icon: 'refresh', label: 'Retour facile', sub: 'Sous 7 jours' },
            { icon: 'headset', label: 'Support 7j/7', sub: 'Toujours disponible' },
          ].map((b) => (
            <View key={b.label} style={styles.trustBadge}>
              <View style={styles.trustIconWrap}>
                <MaterialCommunityIcons name={b.icon} size={18} color={COLORS.primary} />
              </View>
              <View style={styles.trustTextWrap}>
                <Text style={styles.trustLabel}>{b.label}</Text>
                <Text style={styles.trustSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.mainContent}>

          {/* ── Featured Products ─────────────────────────────────────────── */}
          {featured.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                iconName="trending-up"
                iconColor={COLORS.primary}
                title="Produits vedettes"
                subtitle="Sélection du moment"
                onPress={() => navigation.navigate('ProductListScreen', {})}
              />
              <View style={styles.gridWrap}>
                {featured.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    navigation={navigation}
                    onToggleLike={handleToggleLike}
                    isLiked={isLiked(p._id)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Flash Deals ───────────────────────────────────────────────── */}
          {flashDeals.length > 0 && (
            <View style={styles.flashCard}>
              <LinearGradient colors={['#EF4444', '#F43F5E']} style={styles.flashHeader}>
                <View style={styles.flashHeaderLeft}>
                  <MaterialCommunityIcons name="fire" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.flashTitle}>FLASH DEALS</Text>
                </View>
                <FlashCountdown />
              </LinearGradient>
              <View style={styles.flashBody}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                  {flashDeals.map((p) => (
                    <HProductCard
                      key={p._id}
                      product={p}
                      navigation={navigation}
                      onToggleLike={handleToggleLike}
                      isLiked={isLiked(p._id)}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ── New Arrivals ──────────────────────────────────────────────── */}
          {newArrivals.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                iconName="star-shooting"
                iconColor="#B17236"
                title="Nouveautés"
                subtitle="Arrivages récents"
                onPress={() => navigation.navigate('ProductListScreen', { filter: 'new', categoryName: 'Nouveautés' })}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {newArrivals.map((p) => (
                  <HProductCard
                    key={p._id}
                    product={p}
                    navigation={navigation}
                    onToggleLike={handleToggleLike}
                    isLiked={isLiked(p._id)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Promo Banners (2-col) ─────────────────────────────────────── */}
          <View style={styles.promoBannersRow}>
            <TouchableOpacity
              style={[styles.promoBannerCard, { flex: 1, marginRight: 8 }]}
              onPress={() => navigation.navigate('ProductListScreen', { filter: 'promo', categoryName: 'Promotions' })}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#30A08B', '#1d7a6a']} style={styles.promoBannerGrad}>
                <MaterialCommunityIcons name="tag-multiple" size={26} color="rgba(255,255,255,0.8)" />
                <Text style={styles.promoBannerTitle}>Meilleures Promos</Text>
                <Text style={styles.promoBannerSub}>Jusqu'à <Text style={{ color: '#FFD700', fontWeight: 'bold' }}>-70%</Text></Text>
                <View style={styles.promoBannerBtn}>
                  <Text style={styles.promoBannerBtnText}>Voir les promos</Text>
                  <Ionicons name="chevron-forward" size={13} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promoBannerCard, { flex: 1 }]}
              onPress={() => {}}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#B17236', '#8a5427']} style={styles.promoBannerGrad}>
                <MaterialCommunityIcons name="trending-up" size={26} color="rgba(255,255,255,0.8)" />
                <Text style={styles.promoBannerTitle}>Vendre sur IhamBaobab</Text>
                <Text style={styles.promoBannerSub}>Rejoignez des milliers de vendeurs</Text>
                <View style={styles.promoBannerBtn}>
                  <Text style={styles.promoBannerBtnText}>Commencer</Text>
                  <Ionicons name="chevron-forward" size={13} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Popular Stores ────────────────────────────────────────────── */}
          {popularStores.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                iconName="store"
                iconColor={COLORS.primary}
                title="Boutiques populaires"
                subtitle="Vendeurs vérifiés"
                onPress={() => navigation.navigate('AllStores')}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {popularStores.map((store) => (
                  <TouchableOpacity
                    key={store._id}
                    style={styles.storeCard}
                    onPress={() => navigation.navigate('Boutique', { sellerId: store._id, storeName: store.storeName || store.name })}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: store.logo || 'https://via.placeholder.com/100' }} style={styles.storeLogo} />
                    {store.isvalid && (
                      <View style={styles.storeVerified}>
                        <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.primary} />
                      </View>
                    )}
                    <Text style={styles.storeName} numberOfLines={2}>{store.storeName || store.name}</Text>
                    <View style={styles.storeStats}>
                      <Ionicons name="star" size={11} color="#FFB800" />
                      <Text style={styles.storeStatText}>{store.rating?.toFixed(1) || '0.0'}</Text>
                      <Text style={styles.storeStatDot}>·</Text>
                      <MaterialCommunityIcons name="account-group" size={11} color={COLORS.primary} />
                      <Text style={styles.storeStatText}>
                        {store.followersCount >= 1000
                          ? `${(store.followersCount / 1000).toFixed(1)}k`
                          : String(store.followersCount || 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Category Sections ─────────────────────────────────────────── */}
          {categorySections.map(({ cat, products: catProds }, idx) => (
            <View key={cat._id} style={styles.card}>
              <SectionHeader
                iconName="grid"
                iconColor={idx % 2 === 0 ? COLORS.primary : '#B17236'}
                title={cat.name}
                subtitle={`${catProds.length} produit${catProds.length > 1 ? 's' : ''}`}
                onPress={() => navigation.navigate('ProductListScreen', { categoryId: cat._id, categoryName: cat.name })}
              />
              {/* First 4 as grid */}
              <View style={styles.gridWrap}>
                {catProds.slice(0, 4).map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    navigation={navigation}
                    onToggleLike={handleToggleLike}
                    isLiked={isLiked(p._id)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </View>
              {/* Overflow as horizontal scroll */}
              {catProds.length > 4 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hScrollContent, { marginTop: 12 }]}>
                  {catProds.slice(4).map((p) => (
                    <HProductCard
                      key={p._id}
                      product={p}
                      navigation={navigation}
                      onToggleLike={handleToggleLike}
                      isLiked={isLiked(p._id)}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ))}

          {/* ── Infinite Feed ─────────────────────────────────────────────── */}
          {feedItems.length > 0 && (
            <View style={styles.card}>
              <SectionHeader
                iconName="star-four-points"
                iconColor={COLORS.primary}
                title="Pour vous"
                subtitle="Des milliers d'articles"
                onPress={() => navigation.navigate('ProductListScreen', {})}
              />
              <View style={styles.gridWrap}>
                {feedItems.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    navigation={navigation}
                    onToggleLike={handleToggleLike}
                    isLiked={isLiked(p._id)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </View>
              {feedLoading && (
                <View style={styles.feedLoadingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.feedLoadingText}>Chargement…</Text>
                </View>
              )}
              {feedHasMore && !feedLoading && (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadFeedPage} activeOpacity={0.8}>
                  <Text style={styles.loadMoreText}>Voir plus d'articles</Text>
                  <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {!feedHasMore && feedItems.length > 0 && (
                <Text style={styles.feedEndText}>Vous avez tout vu ! 🎉</Text>
              )}
            </View>
          )}

          {/* ── Bottom CTA ────────────────────────────────────────────────── */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ProductListScreen', {})}
          >
            <LinearGradient
              colors={['#30A08B', '#2a9075', '#1d7a6a']}
              style={styles.bottomCta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.bottomCtaTitle}>Des milliers d'articles vous attendent</Text>
              <Text style={styles.bottomCtaSub}>Mode, électronique, maison, beauté et bien plus…</Text>
              <View style={styles.bottomCtaBtn}>
                <Text style={styles.bottomCtaBtnText}>Explorer tout le catalogue →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },

  loadingContainer: { flex: 1 },
  loadingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Header
  header: {
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 130,
    height: 34,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4757',
    borderWidth: 1.5,
    borderColor: '#30A08B',
  },
  cartBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#FF4757', borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 2 },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  searchInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchPlaceholder: { fontSize: 13, color: '#AAA', flex: 1 },
  searchScanBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Banner
  bannerSection: { marginTop: 16, marginBottom: 4 },
  bannerSlide: { width: SCREEN_WIDTH, height: 200, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  bannerGrad: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
    justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 16,
  },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C4C4', marginHorizontal: 3 },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  heroCta: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 28,
    alignItems: 'center',
  },
  heroCtaTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  heroCtaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 16 },
  heroCtaBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  heroCtaBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Category strip
  catStrip: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F1F1', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  catStripContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  catChipAll: { borderRadius: 20, overflow: 'hidden', marginRight: 4 },
  catChipGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 4 },
  catChipAllText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: '#F4F4F4', borderRadius: 20, marginRight: 4,
  },
  catChipImg: { width: 20, height: 20, borderRadius: 10 },
  catChipText: { fontSize: 12, fontWeight: '600', color: '#444', maxWidth: 80 },

  // Trust badges
  trustGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 12,
    gap: 8,
  },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
    minWidth: (SCREEN_WIDTH - 40) / 2 - 8,
    backgroundColor: '#fff', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#F0F0F0',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  trustIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0FAF7', justifyContent: 'center', alignItems: 'center' },
  trustTextWrap: { flex: 1 },
  trustLabel: { fontSize: 11, fontWeight: '700', color: '#1a1a1a' },
  trustSub: { fontSize: 10, color: '#999', marginTop: 1 },

  // Main content wrapper
  mainContent: { paddingHorizontal: 12, gap: 12 },

  // Card (white section)
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, borderWidth: 1, borderColor: '#F1F1F1' },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionIconBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', lineHeight: 20 },
  sectionSubtitle: { fontSize: 11, color: '#999', marginTop: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E0E0E0' },
  seeAllText: { fontSize: 12, fontWeight: '600', color: '#666' },

  // Product card (grid)
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(48,160,139,0.08)',
    elevation: 3, shadowColor: '#30A08B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 6,
    marginBottom: 10,
  },
  cardImageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#F8F9FA', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardPromoBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  cardPromoText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardHeart: {
    position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3,
  },
  cardHeartActive: { backgroundColor: '#FF6B6B' },
  stockBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: '#FFA726', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  cardInfo: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2, lineHeight: 18, minHeight: 36 },
  cardBrand: { fontSize: 10, color: '#999', marginBottom: 6, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardOldPrice: { fontSize: 10, color: '#999', textDecorationLine: 'line-through', marginBottom: 2 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  cardCartBtn: { borderRadius: 10, overflow: 'hidden' },
  cardCartGradient: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },

  // Horizontal product card
  hScrollContent: { paddingRight: 4, gap: 10 },
  hCard: {
    width: H_CARD_WIDTH, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  hCardImageWrap: { width: '100%', height: H_CARD_WIDTH, backgroundColor: '#F8F9FA', position: 'relative' },
  hCardImage: { width: '100%', height: '100%' },
  hCardInfo: { padding: 10 },
  hCardName: { fontSize: 12, fontWeight: '600', color: '#1a1a1a', lineHeight: 17, minHeight: 34, marginBottom: 4 },
  hCardCartBtn: { borderRadius: 8, overflow: 'hidden', marginTop: 6 },
  hCardCartGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, gap: 5 },
  hCardCartText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Flash card
  flashCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#FECDD3', elevation: 2, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  flashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  flashHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  flashTitle: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  flashBody: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 14 },

  // Countdown
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countdownLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  countdownPart: { flexDirection: 'row', alignItems: 'center' },
  countdownTile: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  countdownNum: { color: '#fff', fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  countdownSep: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginHorizontal: 1 },

  // Promo banners
  promoBannersRow: { flexDirection: 'row', gap: 8 },
  promoBannerCard: { borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  promoBannerGrad: { padding: 18, minHeight: 160, justifyContent: 'space-between' },
  promoBannerTitle: { color: '#fff', fontWeight: '900', fontSize: 15, lineHeight: 20, marginTop: 8 },
  promoBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  promoBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, alignSelf: 'flex-start', marginTop: 10 },
  promoBannerBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Stores
  storeCard: { width: 120, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F1F1F1', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, position: 'relative' },
  storeLogo: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE', marginBottom: 8 },
  storeVerified: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  storeName: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6, minHeight: 32 },
  storeStats: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeStatText: { fontSize: 11, color: '#666', fontWeight: '600' },
  storeStatDot: { color: '#CCC', fontSize: 12 },

  // Infinite feed
  feedLoadingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16 },
  feedLoadingText: { color: COLORS.primary, fontSize: 13, fontWeight: '500' },
  loadMoreBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, marginTop: 12 },
  loadMoreText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  feedEndText: { color: '#999', textAlign: 'center', fontSize: 12, paddingVertical: 16 },

  // Bottom CTA
  bottomCta: { borderRadius: 24, padding: 28, alignItems: 'center', marginTop: 4 },
  bottomCtaTitle: { color: '#fff', fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 6 },
  bottomCtaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  bottomCtaBtn: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
  bottomCtaBtnText: { color: COLORS.primary, fontWeight: '900', fontSize: 14 },
});
