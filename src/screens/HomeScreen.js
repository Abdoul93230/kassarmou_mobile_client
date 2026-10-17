import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getCategories, getProducts_Pubs, getTypes } from '../redux/productsSlice';
import { fetchUserLikes } from '../redux/likesSlice';
import {
  flattenPages,
  useProductFeedInfiniteQuery,
  useProductsQuery,
  useStoresQuery,
} from '../redux/catalogApi';
import { IconButton, PressableScale, ProductCard, ProductCardSkeleton, SectionHeader, Text, getPricing } from '../ui';
import { useMessagingState } from '../services/messaging';
import BannerCarousel from '../components/home/BannerCarousel';
import CategoryRail from '../components/home/CategoryRail';
import QuickActions from '../components/home/QuickActions';
import ProductRail from '../components/home/ProductRail';
import StoreRail from '../components/home/StoreRail';
import NearbyRail from '../components/home/NearbyRail';
import TrustStrip from '../components/home/TrustStrip';
import EventBanner from '../components/EventBanner';
import CheckinCard from '../components/CheckinCard';
import { colors, gradients, GUTTER, radius, shadows } from '../theme';

const GAP = 12;
const EMPTY = [];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

// ─── En-tête : logo, salutation, recherche, messagerie ────────────────────────────
function HomeHeader({ user, onSearch, onMessages, elevated }) {
  const { unread } = useMessagingState(); // non-lus des boutiques, en temps réel
  const insets = useSafeAreaInsets();
  const firstName = (user?.name || '').trim().split(' ')[0];
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }, elevated && styles.headerElevated]}>
      <View style={styles.headerRow}>
        <View style={styles.brand}>
          <Image source={require('../../assets/brand/logo-horizontal.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Ihambaobab" />
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {greeting()}{firstName ? `, ${firstName}` : ''} 👋
          </Text>
        </View>
        <View style={styles.headerIcons}>
          {/* Le panier est déjà dans la barre d'onglets : en haut, recherche + messagerie */}
          <IconButton name="search" onPress={onSearch} bg={colors.surfaceAlt} accessibilityLabel="Rechercher un produit ou une boutique" />
          {user ? <IconButton name="chatbubble-ellipses-outline" onPress={onMessages} bg={colors.surfaceAlt} badge={unread} accessibilityLabel={unread ? `Messages, ${unread} non lu${unread > 1 ? 's' : ''}` : 'Messages'} /> : null}
        </View>
      </View>
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const cardWidth = (width - GUTTER * 2 - GAP) / 2;

  const user = useSelector((s) => s.auth.user);
  const allCategories = useSelector((s) => s.products.categories || EMPTY);
  const banners = useSelector((s) => s.products.products_Pubs || EMPTY);

  const promos = useProductsQuery({ promo: 1, limit: 12 });
  const newest = useProductsQuery({ sort: 'newest', limit: 12 });
  const stores = useStoresQuery();
  const feed = useProductFeedInfiniteQuery({ sort: 'popular' });

  const [refreshing, setRefreshing] = useState(false);
  const [elevated, setElevated] = useState(false);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getTypes());
    dispatch(getProducts_Pubs());
    const userId = user?.id || user?._id;
    if (userId) dispatch(fetchUserLikes(userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, user?.id, user?._id]);

  // Sécurité si le backend ignore encore le filtre promo : on ne garde que les vrais soldes
  const flashDeals = useMemo(() => (promos.data || EMPTY).filter((p) => getPricing(p).discount > 0), [promos.data]);
  // Catégorie technique « all » masquée côté client
  const categories = useMemo(() => allCategories.filter((c) => c?.name && c.name.trim().toLowerCase() !== 'all'), [allCategories]);
  // Pas de doublon entre sections : les nouveautés excluent les produits déjà en vente flash
  const newArrivals = useMemo(() => {
    const flashIds = new Set(flashDeals.map((p) => p._id));
    return (newest.data || EMPTY).filter((p) => !flashIds.has(p._id));
  }, [flashDeals, newest.data]);
  const newestIds = useMemo(
    () => new Set([...flashDeals, ...newArrivals].map((p) => p._id)),
    [flashDeals, newArrivals],
  );
  const topStores = useMemo(
    () => [...(stores.data || EMPTY)].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0)).slice(0, 10),
    [stores.data],
  );
  // Le fil évite de répéter les nouveautés déjà affichées juste au-dessus
  const feedItems = useMemo(() => flattenPages(feed.data).filter((p) => !newestIds.has(p._id)), [feed.data, newestIds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([promos.refetch(), newest.refetch(), stores.refetch(), feed.refetch()]);
    setRefreshing(false);
  }, [promos, newest, stores, feed]);

  const onEndReached = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  const openCategory = useCallback(
    (cat) => navigation.navigate('ProductListScreen', { categoryId: cat._id, categoryName: cat.name }),
    [navigation],
  );
  const openStore = useCallback(
    (store) => navigation.navigate('Boutique', { sellerId: store._id, storeName: store.storeName || store.name }),
    [navigation],
  );
  const onBanner = useCallback(
    (b) => {
      const cat = categories.find((c) => c._id === b.clefCategorie);
      navigation.navigate('ProductListScreen', cat ? { categoryId: cat._id, categoryName: cat.name } : {});
    },
    [categories, navigation],
  );
  const onQuickAction = useCallback(
    (key) => {
      if (key === 'promo') navigation.navigate('ProductListScreen', { filter: 'promo', categoryName: 'Promotions' });
      else if (key === 'new') navigation.navigate('ProductListScreen', { filter: 'new', categoryName: 'Nouveautés' });
      else if (key === 'stores') navigation.navigate('AllStores');
      else if (key === 'wallet') navigation.navigate(user ? 'Wallet' : 'QuickAuth', user ? undefined : { returnScreen: 'Wallet' });
    },
    [navigation, user],
  );

  const ListHeader = useMemo(
    () => (
      <View>
        <View style={styles.firstBlock}>
          <CategoryRail categories={categories} onPressCategory={openCategory} onPressAll={() => navigation.navigate('Categories')} />
        </View>

        <View style={styles.bannerBlock}>
          <BannerCarousel banners={banners} onPressBanner={onBanner} />
        </View>

        <QuickActions onAction={onQuickAction} />

        <View style={styles.gamification}>
          <EventBanner />
          <CheckinCard navigation={navigation} />
        </View>

        <NearbyRail navigation={navigation} />

        <ProductRail
          products={flashDeals}
          loading={promos.isLoading}
          onSeeAll={() => onQuickAction('promo')}
          header={
            <LinearGradient colors={gradients.promo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.flashHeader}>
              <Ionicons name="flash" size={18} color={colors.textInverse} />
              <Text variant="h3" color="textInverse" style={styles.flex}>Ventes flash</Text>
              <PressableScale onPress={() => onQuickAction('promo')} hitSlop={8} style={styles.flashCta}>
                <Text variant="caption" color="danger">Tout voir</Text>
              </PressableScale>
            </LinearGradient>
          }
        />

        <ProductRail
          title="Nouveautés"
          subtitle="Les derniers arrivages"
          icon="sparkles"
          products={newArrivals}
          loading={newest.isLoading}
          onSeeAll={() => onQuickAction('new')}
        />

        <StoreRail stores={topStores} onPressStore={openStore} onSeeAll={() => navigation.navigate('AllStores')} />

        <TrustStrip />

        <SectionHeader title="Pour vous" subtitle="Sélectionnés selon les tendances" icon="heart" iconColor={colors.danger} style={styles.feedHeader} />
      </View>
    ),
    [banners, categories, flashDeals, navigation, newArrivals, newest.isLoading, onBanner, onQuickAction, openCategory, openStore, promos.isLoading, topStores],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <View style={[styles.cell, index % 2 === 0 ? styles.cellLeft : styles.cellRight]}>
        <ProductCard product={item} width={cardWidth} />
      </View>
    ),
    [cardWidth],
  );

  const ListFooter = useMemo(() => {
    if (feed.isLoading || feed.isFetchingNextPage) {
      return (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardWidth} />)}
        </View>
      );
    }
    if (!feed.hasNextPage && feedItems.length > 0) {
      return (
        <View style={styles.end}>
          <Ionicons name="checkmark-done-circle" size={22} color={colors.primary} />
          <Text variant="small" color="textSecondary">Vous avez tout vu ! Revenez bientôt pour les nouveautés.</Text>
        </View>
      );
    }
    return <View style={styles.bottomSpace} />;
  }, [cardWidth, feed.hasNextPage, feed.isFetchingNextPage, feed.isLoading, feedItems.length]);

  return (
    <View style={styles.screen}>
      <HomeHeader
        user={user}
        elevated={elevated}
        onSearch={() => navigation.navigate('Search')}
        onMessages={() => navigation.navigate('Messages')}
      />
      <FlashList
        data={feedItems}
        numColumns={2}
        keyExtractor={(p) => p._id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 4 !== elevated) setElevated(y > 4);
        }}
        scrollEventThrottle={32}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  header: { backgroundColor: colors.bg, paddingHorizontal: GUTTER, paddingBottom: 12, zIndex: 2 },
  headerElevated: { backgroundColor: colors.surface, ...shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flex: 1, gap: 2 },
  logo: { width: 134, height: 34 },
  headerIcons: { flexDirection: 'row', gap: 10 },

  firstBlock: { paddingTop: 8 },
  bannerBlock: { marginTop: 20 },
  gamification: { marginTop: 20 },
  flashHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: GUTTER, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md,
  },
  flashCta: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  feedHeader: { marginTop: 32 },

  cell: { marginBottom: 18 },
  cellLeft: { paddingLeft: GUTTER, paddingRight: GAP / 2 },
  cellRight: { paddingLeft: GAP / 2, paddingRight: GUTTER },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GUTTER, paddingBottom: 24 },
  end: { alignItems: 'center', gap: 6, paddingVertical: 28, paddingHorizontal: 32 },
  bottomSpace: { height: 24 },
});
