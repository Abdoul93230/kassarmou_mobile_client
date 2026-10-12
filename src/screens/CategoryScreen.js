
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchCategories } from '../redux/categoriesSlice';
import { getProducts, getTypes } from '../redux/productsSlice';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 10;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - (NUM_COLUMNS + 1) * CARD_MARGIN * 1.5) / NUM_COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.15;
const HEADER_MAX_HEIGHT = Platform.OS === 'ios' ? 175 : 160;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 120 : 108;

// ─── Skeleton animé ────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonInner} />
      <View style={styles.skeletonLabel} />
      <View style={styles.skeletonSub} />
    </Animated.View>
  );
}

// ─── Palette de couleurs pour les overlays ────────────────────────────────────
const OVERLAYS = [
  ['rgba(48,160,139,0.55)', 'rgba(48,160,139,0.82)'],
  ['rgba(178,144,95,0.55)', 'rgba(178,144,95,0.82)'],
  ['rgba(99,102,241,0.55)', 'rgba(99,102,241,0.82)'],
  ['rgba(236,72,153,0.55)', 'rgba(236,72,153,0.82)'],
  ['rgba(16,185,129,0.55)', 'rgba(16,185,129,0.82)'],
  ['rgba(245,158,11,0.55)', 'rgba(245,158,11,0.82)'],
  ['rgba(239,68,68,0.55)',  'rgba(239,68,68,0.82)'],
  ['rgba(59,130,246,0.55)', 'rgba(59,130,246,0.82)'],
];

// ─── Composant carte catégorie ─────────────────────────────────────────────────
const CategoryCard = React.memo(({ item, index, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const overlay = OVERLAYS[index % OVERLAYS.length];

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Image de fond */}
        <Image
          source={{ uri: item.image }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Overlay dégradé du bas vers le haut */}
        <LinearGradient
          colors={['transparent', overlay[0], overlay[1]]}
          locations={[0.0, 0.45, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Badge count en haut à droite */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{item._productCount ?? 0}</Text>
        </View>

        {/* Infos en bas */}
        <View style={styles.cardFooter}>
          <Text style={styles.categoryName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.countRow}>
            <Ionicons name="pricetag" size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.productCountText}>
              {' '}{item._productCount ?? 0} {(item._productCount ?? 0) === 1 ? 'produit' : 'produits'}
            </Text>
          </View>
        </View>

        {/* Flèche */}
        <View style={styles.arrowBadge}>
          <Ionicons name="chevron-forward" size={14} color="#FFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Screen principal ──────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { categories, loading } = useSelector(
    (state) => state.categories || { categories: [], loading: false }
  );
  const products = useSelector((state) => state.products?.data || []);
  const types    = useSelector((state) => state.products?.types || []);

  const [searchQuery, setSearchQuery]           = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [refreshing, setRefreshing]             = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  // ── Logique métier originale ──────────────────────────────────────────────
  const typeToCategory = useMemo(() => {
    const mapping = {};
    types.forEach(type => { mapping[type._id] = type.clefCategories; });
    return mapping;
  }, [types]);

  useEffect(() => {
    console.log('📂 [CategoryScreen] Loading categories...');
    dispatch(fetchCategories());
    dispatch(getProducts());
    dispatch(getTypes());
  }, [dispatch]);

  const getCategoryProductCount = useCallback(
    (categoryId) =>
      products.filter(product => typeToCategory[product.ClefType] === categoryId).length,
    [products, typeToCategory]
  );

  useEffect(() => {
    if (categories.length > 0) {
      console.log('📂 [CategoryScreen] Categories loaded:', categories.length);
      console.log('📦 [CategoryScreen] Products loaded:', products.length);
      console.log('🏷️ [CategoryScreen] Types loaded:', types.length);
      filterCategories(searchQuery);
    }
  }, [categories, searchQuery, products, types]);

  const filterCategories = (query) => {
    const base = categories.map(cat => ({
      ...cat,
      _productCount: getCategoryProductCount(cat._id),
    }));
    if (!query.trim()) {
      setFilteredCategories(base);
    } else {
      setFilteredCategories(
        base.filter(cat => cat.name?.toLowerCase().includes(query.toLowerCase()))
      );
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchCategories()),
      dispatch(getProducts()),
      dispatch(getTypes()),
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleCategoryPress = (category) => {
    navigation.navigate('ProductListScreen', {
      categoryId: category._id,
      categoryName: category.name,
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Animations du header ──────────────────────────────────────────────────
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });
  const titleScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Rendus ────────────────────────────────────────────────────────────────
  const renderCategoryCard = ({ item, index }) => (
    <CategoryCard item={item} index={index} onPress={handleCategoryPress} />
  );

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonGrid}>
      {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <MaterialCommunityIcons name="package-variant-closed" size={56} color="#30A08B" />
      </View>
      <Text style={styles.emptyTitle}>Aucune catégorie trouvée</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Essayez une autre recherche'
          : 'Les catégories seront bientôt disponibles'}
      </Text>
      {searchQuery.length > 0 && (
        <TouchableOpacity style={styles.emptyResetBtn} onPress={() => setSearchQuery('')}>
          <Text style={styles.emptyResetText}>Effacer la recherche</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />

      {/* ── Header animé ── */}
      <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
        <LinearGradient
          colors={['#30A08B', '#27897A', '#1E6B5F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Cercles décoratifs */}
        <View style={styles.headerDecorCircle1} />
        <View style={styles.headerDecorCircle2} />

        <View style={styles.headerContent}>
          {/* Ligne titre */}
          <Animated.View
            style={[styles.headerTop, { transform: [{ scale: titleScale }] }]}
          >
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="grid" size={22} color="#FFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Catégories</Text>
                <Animated.Text style={[styles.headerSubtitle, { opacity: subtitleOpacity }]}>
                  {filteredCategories.length}{' '}
                  {filteredCategories.length === 1 ? 'catégorie' : 'catégories'}
                </Animated.Text>
              </View>
            </View>
            <TouchableOpacity style={styles.headerActionBtn} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Barre de recherche */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#30A08B" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor="#AAA"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#CCC" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ── Contenu ── */}
      {loading && !refreshing ? (
        renderSkeletonLoader()
      ) : (
        <Animated.FlatList
          data={filteredCategories}
          renderItem={renderCategoryCard}
          keyExtractor={(item) => item._id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#30A08B']}
              tintColor="#30A08B"
              progressBackgroundColor="#FFF"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F6',
  },

  // ─ Header ─
  headerContainer: {
    overflow: 'hidden',
    zIndex: 100,
    elevation: 10,
    shadowColor: '#30A08B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerDecorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  headerDecorCircle2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 10,
    left: -25,
  },
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 18,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    transformOrigin: 'left center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  // ─ Grille ─
  listContent: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 14,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30A08B',
  },
  cardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 14,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productCountText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
  },
  arrowBadge: {
    position: 'absolute',
    bottom: 12,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // ─ Skeleton ─
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 14,
    gap: CARD_MARGIN,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
  },
  skeletonInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EBEBEB',
  },
  skeletonLabel: {
    height: 14,
    width: '70%',
    borderRadius: 7,
    backgroundColor: '#D0D0D0',
    marginBottom: 8,
  },
  skeletonSub: {
    height: 10,
    width: '45%',
    borderRadius: 5,
    backgroundColor: '#D8D8D8',
  },

  // ─ Empty ─
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E8F7F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyResetBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#30A08B',
  },
  emptyResetText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
