import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTypes } from '../redux/productsSlice';
import { formatPrice } from '../utils/formatPrice';

const { width } = Dimensions.get('window');

const COLORS = {
  primary:    '#30A08B',
  secondary:  '#B2905F',
  white:      '#FFFFFF',
  black:      '#1A202C',
  gray:       '#718096',
  lightGray:  '#E2E8F0',
  paleGreen:  '#E8F7F4',
  background: '#F2F4F6',
  red:        '#EF4444',
  amber:      '#F59E0B',
};

// ─── Suggestions populaires (statiques ou issues des tendances) ────────────────
const POPULAR_SUGGESTIONS = [
  'Robe tendance', 'Sneakers', 'Sac à main', 'Parfum', 'Montre', 'Bijoux',
];

// ─── Composant : chip de suggestion / recherche récente ───────────────────────
const Chip = ({ label, icon, onPress, onRemove, variant = 'recent' }) => (
  <TouchableOpacity
    style={[styles.chip, variant === 'popular' && styles.chipPopular]}
    onPress={() => onPress(label)}
    activeOpacity={0.7}
  >
    {icon && <Ionicons name={icon} size={13} color={variant === 'popular' ? COLORS.primary : COLORS.gray} style={{ marginRight: 5 }} />}
    <Text
      style={[styles.chipText, variant === 'popular' && styles.chipTextPopular]}
      numberOfLines={1}
    >
      {label}
    </Text>
    {onRemove && (
      <TouchableOpacity
        onPress={() => onRemove(label)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={{ marginLeft: 6 }}
      >
        <Ionicons name="close" size={12} color={COLORS.gray} />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

// ─── Composant : carte résultat produit ───────────────────────────────────────
const ProductCard = React.memo(({ item, onPress }) => {
  const imageUrl  = item.image1 || item.images?.[0] || item.imageUrl;
  const hasPromo  = item.prixPromo > 0;
  const price     = hasPromo ? item.prixPromo : item.prix;
  const discount  = hasPromo
    ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100)
    : 0;
  const inStock   = item.quantite > 0;

  return (
    <TouchableOpacity style={styles.productCard} onPress={() => onPress(item)} activeOpacity={0.8}>
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        <Image source={{ uri: imageUrl }} style={styles.productThumb} resizeMode="cover" />
        {hasPromo && (
          <View style={styles.promoBadge}>
            <Text style={styles.promoText}>-{discount}%</Text>
          </View>
        )}
        {!inStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockOverlayText}>Rupture</Text>
          </View>
        )}
      </View>

      {/* Infos */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nom || item.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>{formatPrice(price)} CFA</Text>
          {hasPromo && (
            <Text style={styles.oldPrice}>{formatPrice(item.prix)} CFA</Text>
          )}
        </View>

        <View style={styles.stockRow}>
          <View style={[styles.stockDot, { backgroundColor: inStock ? COLORS.primary : COLORS.red }]} />
          <Text style={[styles.stockText, { color: inStock ? COLORS.primary : COLORS.red }]}>
            {inStock ? `En stock (${item.quantite})` : 'Rupture de stock'}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={COLORS.lightGray} />
    </TouchableOpacity>
  );
});

// ─── Screen principal ──────────────────────────────────────────────────────────
export default function SearchScreen({ route }) {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const inputRef   = useRef(null);

  // ── State logique (inchangé) ──────────────────────────────────────────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [showFilters, setShowFilters]       = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
  });

  const allProducts = useSelector((state) => state.products?.data || []);
  const categories  = useSelector((state) => state.products?.categories || []);
  const types       = useSelector((state) => state.products?.types || []);

  const typeToCategory = useMemo(() => {
    const mapping = {};
    types.forEach(type => { mapping[type._id] = type.clefCategories; });
    return mapping;
  }, [types]);

  useEffect(() => {
    loadSearchHistory();
    dispatch(getTypes());
  }, [dispatch]);

  useEffect(() => {
    const initialQuery = route?.params?.initialQuery;
    if (typeof initialQuery === 'string' && initialQuery.trim().length > 0) {
      setSearchTerm(initialQuery);
    }
  }, [route?.params?.initialQuery]);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) setRecentSearches(JSON.parse(history));
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const saveSearchHistory = async (term) => {
    try {
      const newHistory = [term, ...recentSearches.filter(h => h !== term)].slice(0, 10);
      setRecentSearches(newHistory);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('searchHistory');
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  const removeOneHistory = async (term) => {
    try {
      const updated = recentSearches.filter(h => h !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(updated));
    } catch (error) {
      console.error('Erreur suppression item historique:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { handleSearch(searchTerm); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filters, typeToCategory]);

  const handleSearch = (term) => {
    if (!term.trim() && !filters.category && !filters.minPrice && !filters.maxPrice) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    let results = allProducts.filter((product) => {
      const cleanDescription = product.description?.replace(/<[^>]*>/g, '') || '';
      const matchesSearch =
        !term.trim() ||
        product.nom?.toLowerCase().includes(term.toLowerCase()) ||
        product.name?.toLowerCase().includes(term.toLowerCase()) ||
        cleanDescription.toLowerCase().includes(term.toLowerCase());

      const matchesCategory =
        !filters.category || typeToCategory[product.ClefType] === filters.category;
      const matchesMinPrice =
        !filters.minPrice || product.prix >= parseFloat(filters.minPrice);
      const matchesMaxPrice =
        !filters.maxPrice || product.prix <= parseFloat(filters.maxPrice);

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
    });

    setSearchResults(results);
    setIsSearching(false);

    if (term.trim().length > 2) saveSearchHistory(term.trim());
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleRecentSearchPress = (term) => {
    setSearchTerm(term);
    inputRef.current?.focus();
  };
  // ──────────────────────────────────────────────────────────────────────────

  // ── Animations ────────────────────────────────────────────────────────────
  const filterHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(filterHeight, {
      toValue: showFilters ? 1 : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [showFilters]);

  const filterMaxHeight = filterHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  // ── Sections vides / suggestions ─────────────────────────────────────────
  const renderEmptyOrSuggestions = () => {
    if (searchTerm.trim()) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="magnify-close" size={52} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essayez avec d'autres mots-clés{'\n'}ou vérifiez l'orthographe
          </Text>
          <TouchableOpacity style={styles.emptyResetBtn} onPress={() => setSearchTerm('')}>
            <Text style={styles.emptyResetText}>Nouvelle recherche</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.suggestionsScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recherches récentes */}
        {recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Recherches récentes</Text>
              </View>
              <TouchableOpacity onPress={clearSearchHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearAllText}>Tout effacer</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chipsWrap}>
              {recentSearches.map((term, i) => (
                <Chip
                  key={i}
                  label={term}
                  icon="time-outline"
                  onPress={handleRecentSearchPress}
                  onRemove={removeOneHistory}
                  variant="recent"
                />
              ))}
            </View>
          </View>
        )}

        {/* Suggestions populaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flame" size={18} color={COLORS.secondary} />
              <Text style={styles.sectionTitle}>Tendances</Text>
            </View>
          </View>
          <View style={styles.chipsWrap}>
            {POPULAR_SUGGESTIONS.map((s, i) => (
              <Chip
                key={i}
                label={s}
                onPress={handleRecentSearchPress}
                variant="popular"
              />
            ))}
          </View>
        </View>

        {/* Catégories populaires */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Catégories populaires</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {categories.slice(0, 5).map((category) => (
                <TouchableOpacity
                  key={category._id}
                  style={styles.categoryPill}
                  activeOpacity={0.75}
                  onPress={() => {
                    setFilters({ ...filters, category: category._id });
                    setSearchTerm('');
                  }}
                >
                  <Text style={styles.categoryPillText}>{category.name || category.nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Rendu résultats ───────────────────────────────────────────────────────
  const renderSearchResult = ({ item }) => (
    <ProductCard item={item} onPress={handleProductPress} />
  );

  const renderResultsHeader = () => (
    <View style={styles.resultsHeader}>
      <Text style={styles.resultsCount}>
        <Text style={styles.resultsCountNum}>{searchResults.length}</Text>
        {' '}résultat{searchResults.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.black} />
        </TouchableOpacity>

        <View style={styles.searchBarWrapper}>
          <Ionicons name="search" size={18} color={COLORS.primary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            placeholderTextColor="#AAA"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus={true}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchTerm('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={20}
            color={showFilters ? COLORS.white : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Panneau filtres animé ── */}
      <Animated.View style={[styles.filtersPanel, { maxHeight: filterMaxHeight, overflow: 'hidden' }]}>
        <View style={styles.filtersPanelInner}>
          <Text style={styles.filterPanelTitle}>Filtres</Text>

          <Text style={styles.filterLabel}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <TouchableOpacity
              style={[styles.filterChip, !filters.category && styles.filterChipActive]}
              onPress={() => setFilters({ ...filters, category: '' })}
            >
              <Text style={[styles.filterChipText, !filters.category && styles.filterChipTextActive]}>
                Toutes
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={[styles.filterChip, filters.category === cat._id && styles.filterChipActive]}
                onPress={() => setFilters({ ...filters, category: cat._id })}
              >
                <Text style={[styles.filterChipText, filters.category === cat._id && styles.filterChipTextActive]}>
                  {cat.name || cat.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.priceRow}>
            <View style={styles.priceInputBox}>
              <Text style={styles.filterLabel}>Prix min (CFA)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={(t) => setFilters({ ...filters, minPrice: t })}
              />
            </View>
            <View style={styles.priceSeparator} />
            <View style={styles.priceInputBox}>
              <Text style={styles.filterLabel}>Prix max (CFA)</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="999 999"
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(t) => setFilters({ ...filters, maxPrice: t })}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setFilters({ category: '', minPrice: '', maxPrice: '' })}
          >
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Indicateur de recherche ── */}
      {isSearching && (
        <View style={styles.searchingBanner}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.searchingText}>Recherche en cours...</Text>
        </View>
      )}

      {/* ── Corps ── */}
      {!isSearching && searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
          ListHeaderComponent={renderResultsHeader}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        !isSearching && renderEmptyOrSuggestions()
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─ Header ─
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEFF2',
    gap: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E8EAF0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.paleGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(48,160,139,0.2)',
  },
  filterToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // ─ Filtres ─
  filtersPanel: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEFF2',
  },
  filtersPanelInner: {
    padding: 16,
  },
  filterPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  priceInputBox: {
    flex: 1,
  },
  priceSeparator: {
    width: 18,
    height: 2,
    backgroundColor: COLORS.lightGray,
    borderRadius: 1,
    marginTop: 18,
  },
  priceInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    fontSize: 14,
    color: COLORS.black,
  },
  resetButton: {
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // ─ Indicateur recherche ─
  searchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.paleGreen,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(48,160,139,0.15)',
  },
  searchingText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // ─ Résultats ─
  resultsList: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  resultsHeader: {
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  resultsCountNum: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 15,
  },
  separator: {
    height: 10,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  thumbContainer: {
    position: 'relative',
    width: 86,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
  },
  productThumb: {
    width: '100%',
    height: '100%',
  },
  promoBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promoText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '800',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlayText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.2,
  },
  oldPrice: {
    fontSize: 12,
    color: '#BBB',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ─ Empty / Suggestions ─
  emptyState: {
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.paleGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyResetBtn: {
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  emptyResetText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // ─ Suggestions scroll ─
  suggestionsScroll: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  clearAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    maxWidth: width * 0.55,
  },
  chipPopular: {
    backgroundColor: COLORS.paleGreen,
    borderColor: 'rgba(48,160,139,0.25)',
  },
  chipText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
  },
  chipTextPopular: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.paleGreen,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(48,160,139,0.2)',
  },
  categoryPillText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
