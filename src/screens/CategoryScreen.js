import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchCategories } from '../redux/categoriesSlice';
import { getProducts } from '../redux/productsSlice';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - (NUM_COLUMNS + 1) * CARD_MARGIN) / NUM_COLUMNS;

export default function CategoryScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { categories, loading } = useSelector((state) => state.categories || { categories: [], loading: false });
  const products = useSelector((state) => state.products?.data || []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));

  useEffect(() => {
    console.log('📂 [CategoryScreen] Loading categories...');
    dispatch(fetchCategories());
    dispatch(getProducts());
  }, [dispatch]);

  useEffect(() => {
    if (categories.length > 0) {
      console.log('📂 [CategoryScreen] Categories loaded:', categories.length);
      console.log('📦 [CategoryScreen] Products loaded:', products.length);
      filterCategories(searchQuery);
    }
  }, [categories, searchQuery, products]);

  const filterCategories = (query) => {
    if (!query.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter((cat) =>
        cat.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
  };

  const getCategoryProductCount = (categoryId) => {
    return products.filter((product) => product.ClefCategorie === categoryId).length;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchCategories()),
      dispatch(getProducts())
    ]);
    setRefreshing(false);
  }, [dispatch]);

  const handleCategoryPress = (category) => {
    navigation.navigate('ProductListScreen', {
      categoryId: category._id,
      categoryName: category.name,
    });
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 80],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const renderCategoryCard = ({ item, index }) => {
    const productCount = getCategoryProductCount(item._id);
    const colors = [
      ['#30A08B', '#62aca2'],
      ['#FC913A', '#FFB366'],
      ['#6366F1', '#818CF8'],
      ['#EC4899', '#F472B6'],
      ['#10B981', '#34D399'],
      ['#F59E0B', '#FBBF24'],
    ];
    const colorPair = colors[index % colors.length];

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.8}
      >
        {/* Category Image Background */}
        <Image 
          source={{ uri: item.image }} 
          style={styles.categoryImageBackground}
          resizeMode="cover"
        />
        
        {/* Gradient Overlay - Reduced opacity for better image visibility */}
        <LinearGradient
          colors={[
            colorPair[0] + '60',  // 60 = 37.5% opacity
            colorPair[1] + '80',  // 80 = 50% opacity
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryGradientOverlay}
        >
          {/* Product Count Badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{productCount}</Text>
          </View>

          {/* Category Icon - Removed for better image visibility */}

          {/* Category Name */}
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productCountText}>
              {productCount} {productCount === 1 ? 'produit' : 'produits'}
            </Text>
          </View>

          {/* Arrow Icon */}
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="package-variant" size={100} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Aucune catégorie trouvée</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Essayez une autre recherche' : 'Les catégories seront bientôt disponibles'}
      </Text>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6].map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <LinearGradient
            colors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.skeletonGradient}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          { height: headerHeight, opacity: headerOpacity },
        ]}
      >
        <LinearGradient
          colors={['#30A08B', '#62aca2', '#4FB8A4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            {/* Header Top Section */}
            <View style={styles.headerTop}>
              <View style={styles.headerTitleContainer}>
                <View style={styles.iconBadge}>
                  <Ionicons name="grid" size={24} color="#FFF" />
                </View>
                <View style={styles.headerTextWrapper}>
                  <Text style={styles.headerTitle}>Catégories</Text>
                  <Text style={styles.headerSubtitle}>
                    {filteredCategories.length} {filteredCategories.length === 1 ? 'catégorie disponible' : 'catégories disponibles'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerActionButton}>
                  <Ionicons name="filter" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#30A08B" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher une catégorie..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Category List */}
      {loading && !refreshing ? (
        renderSkeletonLoader()
      ) : (
        <Animated.FlatList
          data={filteredCategories}
          renderItem={renderCategoryCard}
          keyExtractor={(item) => item._id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
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
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}
    </View>
  );
}

// Helper function to get category icon
const getCategoryIcon = (categoryName) => {
  const name = categoryName?.toLowerCase() || '';
  
  if (name.includes('vêtement') || name.includes('mode') || name.includes('habit')) return 'tshirt-crew';
  if (name.includes('chaussure') || name.includes('shoe')) return 'shoe-sneaker';
  if (name.includes('électronique') || name.includes('tech')) return 'laptop';
  if (name.includes('téléphone') || name.includes('phone')) return 'cellphone';
  if (name.includes('maison') || name.includes('décor')) return 'home';
  if (name.includes('beauté') || name.includes('cosmétique')) return 'palette';
  if (name.includes('sport') || name.includes('fitness')) return 'run';
  if (name.includes('livre') || name.includes('book')) return 'book-open-variant';
  if (name.includes('jouet') || name.includes('toy')) return 'toy-brick';
  if (name.includes('bijou') || name.includes('jewelry')) return 'diamond-stone';
  if (name.includes('sac') || name.includes('bag')) return 'bag-personal';
  if (name.includes('montre') || name.includes('watch')) return 'watch';
  if (name.includes('accessoire')) return 'shopping';
  
  return 'folder-multiple';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 100,
  },
  headerGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    marginTop: 5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    padding: CARD_MARGIN,
    paddingTop: 15,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 180,
    margin: CARD_MARGIN / 2,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
  },
  categoryImageBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  categoryGradientOverlay: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  countBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  iconContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  productCountText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: CARD_MARGIN,
    paddingTop: 15,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: 180,
    margin: CARD_MARGIN / 2,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  skeletonGradient: {
    flex: 1,
  },
});
