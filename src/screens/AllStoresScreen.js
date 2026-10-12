import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_URL } from '../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#30A08B',
  primaryDark: '#217A6A',
  primaryLight: '#E8F7F4',
  secondary: '#B2905F',
  secondaryLight: '#FDF5EC',
  white: '#FFFFFF',
  black: '#1A1A2E',
  gray: '#718096',
  lightGray: '#EDF2F7',
  midGray: '#CBD5E0',
  darkGray: '#4A5568',
  yellow: '#F6C90E',
  yellowBg: '#FFFBEA',
  background: '#F4F7F9',
  cardBg: '#FFFFFF',
  shadow: '#000000',
  verified: '#30A08B',
  official: '#B2905F',
};

// ─────────────────────────────────────────────
// Skeleton Loader pour une card boutique
// ─────────────────────────────────────────────
const SkeletonCard = ({ anim }) => {
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });
  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonLogo, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { width: '70%', opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '50%', opacity, marginTop: 8 }]} />
        <Animated.View style={[styles.skeletonLine, { width: '90%', opacity, marginTop: 8, height: 10 }]} />
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          <Animated.View style={[styles.skeletonBadge, { opacity }]} />
          <Animated.View style={[styles.skeletonBtn, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────
const EmptyState = ({ searchQuery }) => (
  <View style={styles.emptyContainer}>
    <LinearGradient colors={[COLORS.primaryLight, '#DCEEFA']} style={styles.emptyIconBg}>
      <MaterialCommunityIcons name="store-search" size={52} color={COLORS.primary} />
    </LinearGradient>
    <Text style={styles.emptyTitle}>
      {searchQuery ? 'Aucun résultat' : 'Aucune boutique'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {searchQuery
        ? `Aucune boutique ne correspond à « ${searchQuery} »`
        : 'Les boutiques apparaîtront ici une fois disponibles'}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// Card Boutique
// ─────────────────────────────────────────────
const StoreCard = ({ item, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const followersFormatted =
    item.followersCount >= 1000
      ? `${(item.followersCount / 1000).toFixed(1)}k`
      : item.followersCount || 0;

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* Logo rond + badge vérifié */}
        <View style={styles.cardLogoArea}>
          <View style={styles.logoRing}>
            <Image
              source={{ uri: item.logo || 'https://ui-avatars.com/api/?name=Shop&background=30A08B&color=fff&size=200' }}
              style={styles.storeLogo}
            />
          </View>
          {item.isvalid && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.verified} />
            </View>
          )}
        </View>

        {/* Infos boutique */}
        <View style={styles.cardBody}>
          {/* Nom + badge officiel */}
          <View style={styles.nameRow}>
            <Text style={styles.storeName} numberOfLines={1}>
              {item.storeName || `${item.userName2 || ''} ${item.name || ''}`.trim()}
            </Text>
            {item.isvalid && (
              <View style={styles.officialBadge}>
                <MaterialCommunityIcons name="shield-check" size={10} color={COLORS.official} />
                <Text style={styles.officialBadgeText}>Officielle</Text>
              </View>
            )}
          </View>

          {/* Description courte */}
          {item.storeDescription ? (
            <Text style={styles.storeDesc} numberOfLines={2}>
              {item.storeDescription}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            {/* Note */}
            <View style={styles.statChip}>
              <Ionicons name="star" size={12} color={COLORS.yellow} />
              <Text style={styles.statChipText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            </View>

            <View style={styles.statSep} />

            {/* Followers */}
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="account-group" size={12} color={COLORS.primary} />
              <Text style={styles.statChipText}>{followersFormatted}</Text>
            </View>

            {item.city ? (
              <>
                <View style={styles.statSep} />
                <View style={styles.statChip}>
                  <Ionicons name="location-sharp" size={11} color={COLORS.secondary} />
                  <Text style={[styles.statChipText, { maxWidth: 80 }]} numberOfLines={1}>
                    {item.city}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Bas de la card : catégorie + bouton Visiter */}
          <View style={styles.cardFooter}>
            {item.category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.visitBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.visitBtnText}>Visiter</Text>
                <Ionicons name="arrow-forward" size={13} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Écran principal
// ─────────────────────────────────────────────
export default function AllStoresScreen({ navigation }) {
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation skeleton
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    filterStores();
  }, [searchQuery, stores]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      let activeStores = [];

      try {
        const clientSafeResponse = await axios.get(`${API_URL}/getSellersClients`);
        activeStores = clientSafeResponse?.data?.data || [];
      } catch (error) {
        // Fallback temporaire tant que la route getSellersClients n'est pas déployée en prod
        if (error?.response?.status !== 404) {
          throw error;
        }

        const legacyResponse = await axios.get(`${API_URL}/getSellers`);
        activeStores = (legacyResponse?.data?.data || []).filter((store) => store?.isvalid === true);
      }

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
    <StoreCard item={item} onPress={() => handleStorePress(item)} />
  );

  // ── Skeleton loading ──
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Toutes les boutiques</Text>
              <Text style={styles.headerSubtitle}>Découvrez nos vendeurs</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Barre de recherche dans le header */}
          <View style={styles.headerSearchWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <Text style={styles.searchPlaceholder}>Rechercher une boutique...</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} anim={skeletonAnim} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Header gradient ── */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Toutes les boutiques</Text>
            <Text style={styles.headerSubtitle}>
              {stores.length} vendeur{stores.length > 1 ? 's' : ''} disponible{stores.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Barre de recherche intégrée au header */}
        <View style={styles.headerSearchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.gray} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Boutique, catégorie, ville..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.midGray}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.midGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Compteur résultats ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {searchQuery
            ? `${filteredStores.length} résultat${filteredStores.length > 1 ? 's' : ''} pour « ${searchQuery} »`
            : `${filteredStores.length} boutique${filteredStores.length > 1 ? 's' : ''}`}
        </Text>
        {filteredStores.length > 0 && (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagText}>En ligne</Text>
          </View>
        )}
      </View>

      {/* ── Liste ── */}
      <FlatList
        data={filteredStores}
        renderItem={renderStoreCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStores();
            }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={<EmptyState searchQuery={searchQuery} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ──
  header: {
    paddingTop: 48,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Barre de recherche dans le header ──
  headerSearchWrapper: {
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: COLORS.midGray,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
    height: 46,
  },

  // ── Barre résultats ──
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48,160,139,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  liveTagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── FlatList ──
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },

  // ── Card boutique ──
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },

  // Logo
  cardLogoArea: {
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  logoRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    borderColor: COLORS.primaryLight,
    padding: 2,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  storeLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: COLORS.lightGray,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  // Corps
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.black,
    flexShrink: 1,
    letterSpacing: 0.1,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(178,144,95,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 3,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.official,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  storeDesc: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 17,
    marginBottom: 8,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChipText: {
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '700',
  },
  statSep: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.midGray,
    marginHorizontal: 4,
  },

  // Footer card
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  visitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  visitBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // ── Skeleton ──
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  skeletonLogo: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.lightGray,
    marginRight: 14,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: COLORS.lightGray,
    borderRadius: 7,
  },
  skeletonBadge: {
    width: 80,
    height: 28,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
  },
  skeletonBtn: {
    width: 72,
    height: 32,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    fontWeight: '500',
  },
});
