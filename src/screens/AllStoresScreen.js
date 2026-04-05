import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#718096',
  lightGray: '#E2E8F0',
  darkGray: '#4A5568',
  yellow: '#FCD34D',
};

export default function AllStoresScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    filterStores();
  }, [searchQuery, stores]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/getSellers`);
      const activeStores = response.data.data.filter(store => store.isvalid === true);
      setStores(activeStores);
      setFilteredStores(activeStores);
    } catch (error) {
      console.error('Erreur lors de la récupération des boutiques:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterStores = () => {
    if (!searchQuery.trim()) {
      setFilteredStores(stores);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = stores.filter(store => {
      const storeName = (store.storeName || '').toLowerCase();
      const category = (store.category || '').toLowerCase();
      const city = (store.city || '').toLowerCase();
      return storeName.includes(query) || category.includes(query) || city.includes(query);
    });
    setFilteredStores(filtered);
  };

  const handleStorePress = (store) => {
    navigation.navigate('Boutique', {
      sellerId: store._id,
      storeName: store.storeName || store.name,
    });
  };

  const renderStoreCard = ({ item }) => (
    <TouchableOpacity
      style={styles.storeCard}
      onPress={() => handleStorePress(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.storeCardGradient}
      >
        <View style={styles.storeCardContent}>
          <View style={styles.storeLogoContainer}>
            <Image
              source={{ uri: item.logo || 'https://via.placeholder.com/100' }}
              style={styles.storeLogo}
            />
            {item.isvalid && (
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.verifiedBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.white} />
              </LinearGradient>
            )}
          </View>
          
          <View style={styles.storeInfo}>
            <Text style={styles.storeName} numberOfLines={2}>
              {item.storeName || `${item.userName2} ${item.name}`}
            </Text>

            {item.storeDescription && (
              <Text style={styles.storeDescription} numberOfLines={2}>
                {item.storeDescription}
              </Text>
            )}

            <View style={styles.storeStatsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <Ionicons name="star" size={13} color={COLORS.yellow} />
                </View>
                <Text style={styles.statText}>{item.rating?.toFixed(1) || '0.0'}</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="account-group" size={13} color={COLORS.primary} />
                </View>
                <Text style={styles.statText}>
                  {item.followersCount >= 1000 
                    ? `${(item.followersCount / 1000).toFixed(1)}k` 
                    : item.followersCount || 0}
                </Text>
              </View>
              
              {item.city && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.statIconBg}>
                      <Ionicons name="location" size={13} color={COLORS.secondary} />
                    </View>
                    <Text style={styles.statText} numberOfLines={1}>{item.city}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.bottomRow}>
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText} numberOfLines={1}>{item.category}</Text>
                </View>
              )}
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.visitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.visitButtonText}>Visiter</Text>
                <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
              </LinearGradient>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des boutiques...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, '#62aca2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Toutes les boutiques</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une boutique..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredStores.length} boutique{filteredStores.length > 1 ? 's' : ''} trouvée{filteredStores.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Stores List */}
      <FlatList
        data={filteredStores}
        renderItem={renderStoreCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStores();
            }}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="store-off" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>Aucune boutique trouvée</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: COLORS.black,
  },
  resultsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storeCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    backgroundColor: COLORS.white,
  },
  storeCardGradient: {
    flex: 1,
  },
  storeCardContent: {
    flexDirection: 'row',
    padding: 14,
  },
  storeLogoContainer: {
    position: 'relative',
    marginRight: 14,
  },
  storeLogo: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 12,
    width: 24,
    height: 24,
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
  storeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 6,
    lineHeight: 20,
  },
  storeDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
    marginBottom: 10,
  },
  storeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  statText: {
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(48, 160, 139, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '60%',
  },
  categoryText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  visitButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
});
