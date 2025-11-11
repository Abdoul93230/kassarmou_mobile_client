import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  tertiary: '#62aca2',
  white: '#FFFFFF',
  black: '#1A202C',
  gray: '#718096',
  lightGray: '#E2E8F0',
  paleGreen: '#E6FFEA',
  background: '#F7FAFC',
  red: '#EF4444',
};

export default function SearchScreen() {
  const navigation = useNavigation();
  const inputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
  });

  const allProducts = useSelector((state) => state.products?.data || []);
  const categories = useSelector((state) => state.products?.categories || []);

  // Charger l'historique de recherche
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setRecentSearches(JSON.parse(history));
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // Sauvegarder l'historique de recherche
  const saveSearchHistory = async (term) => {
    try {
      const newHistory = [term, ...recentSearches.filter(h => h !== term)].slice(0, 10);
      setRecentSearches(newHistory);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  };

  // Supprimer l'historique
  const clearSearchHistory = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('searchHistory');
    } catch (error) {
      console.error('Erreur suppression historique:', error);
    }
  };

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

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
        !filters.category || product.ClefCategorie === filters.category;

      const matchesMinPrice =
        !filters.minPrice || product.prix >= parseFloat(filters.minPrice);

      const matchesMaxPrice =
        !filters.maxPrice || product.prix <= parseFloat(filters.maxPrice);

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
    });

    setSearchResults(results);
    setIsSearching(false);

    // Sauvegarder dans l'historique si recherche valide
    if (term.trim().length > 2) {
      saveSearchHistory(term.trim());
    }
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const handleRecentSearchPress = (term) => {
    setSearchTerm(term);
    inputRef.current?.focus();
  };

  const renderSearchResult = ({ item }) => {
    const imageUrl = item.image1 || item.images?.[0] || item.imageUrl;
    const price = item.prixPromo > 0 ? item.prixPromo : item.prix;
    const hasPromo = item.prixPromo > 0;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.resultImage}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={2}>
            {item.nom || item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.resultPrice}>€{price?.toFixed(2)}</Text>
            {hasPromo && (
              <Text style={styles.oldPrice}>€{item.prix?.toFixed(2)}</Text>
            )}
          </View>
          {item.isdisponible ? (
            <Text style={styles.inStock}>En stock</Text>
          ) : (
            <Text style={styles.outOfStock}>Rupture</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchTerm.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essayez avec d'autres mots-clés ou vérifiez l'orthographe
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.recentContainer}>
        {recentSearches.length > 0 && (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recherches récentes</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={styles.clearText}>Effacer</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((term, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => handleRecentSearchPress(term)}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                <Text style={styles.recentText}>{term}</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.gray} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.popularSection}>
          <Text style={styles.sectionTitle}>Catégories populaires</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.slice(0, 5).map((category) => (
              <TouchableOpacity
                key={category._id}
                style={styles.categoryChip}
                onPress={() => {
                  setFilters({ ...filters, category: category._id });
                  setSearchTerm('');
                }}
              >
                <Text style={styles.categoryChipText}>{category.name || category.nom}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header avec barre de recherche */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Rechercher des produits..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoFocus={true}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name={showFilters ? 'options' : 'options-outline'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Filtres */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Filtres</Text>
          
          {/* Catégorie */}
          <Text style={styles.filterLabel}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

          {/* Prix */}
          <View style={styles.priceFilters}>
            <View style={styles.priceInput}>
              <Text style={styles.filterLabel}>Prix min</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={filters.minPrice}
                onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
              />
            </View>
            <View style={styles.priceInput}>
              <Text style={styles.filterLabel}>Prix max</Text>
              <TextInput
                style={styles.input}
                placeholder="999999"
                keyboardType="numeric"
                value={filters.maxPrice}
                onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
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
      )}

      {/* Résultats */}
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={renderEmptyState}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  filterButton: {
    marginLeft: 12,
    padding: 4,
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
    marginTop: 8,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  priceFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 8,
  },
  oldPrice: {
    fontSize: 14,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  inStock: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  outOfStock: {
    fontSize: 12,
    color: COLORS.red,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  recentContainer: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  clearText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 12,
  },
  popularSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.paleGreen,
    marginRight: 12,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
