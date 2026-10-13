import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  useStoreBannersQuery,
  useStoreByNameQuery,
  useStoreProductsQuery,
  useStoreQuery,
  useStoreStatsQuery,
  useStoreTypesQuery,
} from '../redux/catalogApi';
import { selectPanierCount } from '../redux/cartSlice';
import useStoreSocial from '../hooks/useStoreSocial';
import ProductGrid from '../components/ProductGrid';
import BannerCarousel from '../components/home/BannerCarousel';
import { Button, Chip, EmptyState, IconButton, PressableScale, Skeleton, SmartImage, Stars, Text, getPricing } from '../ui';
import { siteUrl } from '../config/env';
import { capitalize } from '../utils/text';
import { colors, fonts, gradients, GUTTER, radius, shadows } from '../theme';
import OriginBadge from '../components/OriginBadge';

const EMPTY = [];
const SORTS = [
  { key: 'newest', label: 'Récents' },
  { key: 'price_asc', label: 'Prix ↑' },
  { key: 'price_desc', label: 'Prix ↓' },
  { key: 'promo', label: 'Promos' },
];
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n || 0));

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color="textSecondary">{label}</Text>
    </View>
  );
}

/** Vitrine d'une boutique : identité, abonnement, contact, bannières, catalogue filtrable */
export default function BoutiqueScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const cartCount = useSelector(selectPanierCount);
  const params = route?.params || {};

  // Ouverture par id (app) ou par nom (lien ihambaobab.com/boutique/<nom>)
  const byName = useStoreByNameQuery(params.storeName, { skip: !!params.sellerId || !params.storeName });
  const sellerId = params.sellerId || byName.data?._id;
  const storeQ = useStoreQuery(sellerId, { skip: !sellerId });
  const store = storeQ.data || byName.data;

  const products = useStoreProductsQuery(sellerId, { skip: !sellerId });
  const banners = useStoreBannersQuery(sellerId, { skip: !sellerId });
  const types = useStoreTypesQuery(sellerId, { skip: !sellerId });
  const stats = useStoreStatsQuery(sellerId, { skip: !sellerId });

  const requireAuth = useCallback(
    () => navigation.navigate('QuickAuth', { returnScreen: 'Boutique', returnParams: { sellerId, storeName: store?.storeName } }),
    [navigation, sellerId, store?.storeName],
  );
  const social = useStoreSocial(sellerId, stats.data || store, requireAuth);

  const [typeId, setTypeId] = useState(null);
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');

  const all = products.data || EMPTY;
  // Sous-catégories réellement présentes dans le catalogue de la boutique
  const usedTypes = useMemo(() => {
    const present = new Set(all.map((p) => p.ClefType));
    return (types.data || EMPTY).filter((t) => present.has(t._id));
  }, [all, types.data]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = all;
    if (typeId) l = l.filter((p) => p.ClefType === typeId);
    if (term) l = l.filter((p) => `${p.name} ${p.marque || ''}`.toLowerCase().includes(term));
    if (sort === 'promo') l = l.filter((p) => getPricing(p).discount > 0);
    if (sort === 'price_asc') l = [...l].sort((a, b) => getPricing(a).current - getPricing(b).current);
    if (sort === 'price_desc') l = [...l].sort((a, b) => getPricing(b).current - getPricing(a).current);
    return l;
  }, [all, q, sort, typeId]);

  const name = store?.storeName || params.storeName || 'Boutique';
  const whatsapp = String(store?.whatsapp || store?.businessPhone || '').replace(/[^\d]/g, '');
  const rating = Number(stats.data?.rating ?? store?.rating) || 0;
  const reviewsCount = Number(stats.data?.reviewsCount ?? store?.reviewsCount) || 0;

  const share = useCallback(() => {
    const url = siteUrl(`/boutique/${encodeURIComponent(name)}`);
    Share.share({ message: `Découvrez ${name} sur Ihambaobab 🛍️\n${url}`, url, title: name }).catch(() => {});
  }, [name]);

  const contact = useCallback(() => {
    if (!whatsapp) return;
    const text = encodeURIComponent(`Bonjour ${name}, je vous contacte depuis Ihambaobab.`);
    Linking.openURL(`https://wa.me/${whatsapp}?text=${text}`).catch(() => {});
  }, [name, whatsapp]);

  const loadingStore = !store && (byName.isLoading || storeQ.isLoading || (!sellerId && !!params.storeName && !byName.isError));
  const missingTarget = !params.sellerId && !params.storeName;
  const notFound = missingTarget || (!store && (byName.isError || storeQ.isError) && !loadingStore);

  const header = (
    <View>
      {/* Couverture */}
      <View style={[styles.cover, { paddingTop: insets.top }]}>
        {store?.coverImage ? <SmartImage uri={store.coverImage} width={420} style={StyleSheet.absoluteFill} /> : null}
        <LinearGradient colors={store?.coverImage ? ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.05)'] : gradients.hero} style={StyleSheet.absoluteFill} />
        <View style={styles.topBar}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} elevated accessibilityLabel="Retour" />
          <View style={styles.topActions}>
            <IconButton name="share-social-outline" onPress={share} elevated accessibilityLabel="Partager la boutique" />
            <IconButton name="bag-handle-outline" badge={cartCount} onPress={() => navigation.navigate('Cart')} elevated accessibilityLabel="Panier" />
          </View>
        </View>
      </View>

      {/* Identité */}
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          {store?.logo ? (
            <SmartImage uri={store.logo} width={84} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.initial]}>
              <Text variant="hero" color="primaryDark">{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {loadingStore ? (
          <View style={styles.center}>
            <Skeleton width={180} height={22} />
            <Skeleton width={240} height={14} style={styles.mt8} />
          </View>
        ) : (
          <>
            <View style={styles.nameRow}>
              <Text variant="h1" numberOfLines={2} align="center" style={styles.shrink}>{name}</Text>
              {store?.isvalid ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </View>
            <OriginBadge sellerId={store?._id || sellerId} detail variant="smallMedium" style={styles.originCenter} />
            {store?.storeDescription ? (
              <Text variant="body" color="textSecondary" align="center" numberOfLines={3} style={styles.mt6}>{store.storeDescription}</Text>
            ) : null}

            <PressableScale
              onPress={() => navigation.navigate('SellerDetail', { sellerId })}
              style={styles.ratingRow}
              hitSlop={8}
              accessibilityLabel="Voir les avis de la boutique"
            >
              <Stars value={rating} size={14} />
              <Text variant="smallMedium" color="textSecondary">
                {reviewsCount ? `${rating.toFixed(1)} · ${reviewsCount} avis` : 'Aucun avis'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </PressableScale>

            <View style={styles.stats}>
              <Stat value={compact(all.length)} label="Produits" />
              <View style={styles.statDivider} />
              <Stat value={compact(social.followers)} label="Abonnés" />
              <View style={styles.statDivider} />
              <Stat value={compact(social.likes)} label="J'aime" />
            </View>

            <View style={styles.actions}>
              <Button
                title={social.following ? 'Abonné' : "S'abonner"}
                icon={social.following ? 'checkmark' : 'add'}
                variant={social.following ? 'soft' : 'primary'}
                onPress={social.toggleFollow}
                style={styles.flex}
                full
              />
              <IconButton
                name={social.liked ? 'heart' : 'heart-outline'}
                color={social.liked ? colors.danger : colors.text}
                bg={colors.surfaceAlt}
                size={48}
                onPress={social.toggleLike}
                accessibilityLabel={social.liked ? "Je n'aime plus" : "J'aime la boutique"}
              />
              {whatsapp ? (
                <IconButton name="logo-whatsapp" color="#25D366" bg={colors.surfaceAlt} size={48} onPress={contact} accessibilityLabel="Contacter sur WhatsApp" />
              ) : null}
            </View>

            {store?.city || store?.address || store?.openingHours ? (
              <View style={styles.infos}>
                {store?.city || store?.address ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                    <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.flex}>
                      {[store.address, store.city?.trim()].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
                {store?.openingHours ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                    <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.flex}>{store.openingHours}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>

      {banners.data?.length ? (
        <View style={styles.banners}>
          <BannerCarousel banners={banners.data} />
        </View>
      ) : null}

      {/* Catalogue */}
      <View style={styles.catalogHead}>
        <Text variant="h2">Catalogue</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={`Rechercher chez ${name}`}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q ? (
            <PressableScale onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      </View>
      {usedTypes.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tout" active={!typeId} onPress={() => setTypeId(null)} />
          {usedTypes.map((t) => (
            <Chip key={t._id} label={capitalize(t.name.trim())} active={typeId === t._id} onPress={() => setTypeId(t._id)} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, styles.sortChips]}>
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>
    </View>
  );

  if (notFound) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.simpleBar}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        </View>
        <EmptyState
          icon="storefront-outline"
          title="Boutique indisponible"
          message="Cette boutique n'existe pas ou n'est pas ouverte pour le moment."
          actionLabel="Voir d'autres boutiques"
          onAction={() => navigation.replace('AllStores')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ProductGrid
        products={list}
        loading={products.isLoading || loadingStore}
        hasMore={false}
        header={header}
        showStore={false}
        onRefresh={() => { products.refetch(); stats.refetch(); banners.refetch(); }}
        refreshing={products.isFetching && !products.isLoading}
        contentBottom={insets.bottom + 24}
        empty={
          <EmptyState
            icon={q || typeId || sort === 'promo' ? 'search-outline' : 'cube-outline'}
            title={q || typeId || sort === 'promo' ? 'Aucun produit trouvé' : 'Bientôt des produits'}
            message={q || typeId || sort === 'promo' ? 'Essayez un autre filtre.' : "Cette boutique n'a pas encore publié de produits."}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  originCenter: { alignSelf: 'center', marginTop: 4 },
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  center: { alignItems: 'center' },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  simpleBar: { paddingHorizontal: GUTTER, paddingVertical: 8 },

  cover: { height: 170, backgroundColor: colors.primaryDeep },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 8 },
  topActions: { flexDirection: 'row', gap: 8 },

  card: {
    marginHorizontal: GUTTER, marginTop: -56, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center', ...shadows.md,
  },
  logoWrap: { position: 'absolute', top: -42, alignSelf: 'center', padding: 4, borderRadius: 48, backgroundColor: colors.surface, ...shadows.sm },
  logo: { width: 84, height: 84, borderRadius: 42 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  stats: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 16, paddingVertical: 12,
    borderRadius: radius.md, backgroundColor: colors.bg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', marginTop: 14 },
  infos: { alignSelf: 'stretch', marginTop: 14, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  banners: { marginTop: 20 },
  catalogHead: { paddingHorizontal: GUTTER, marginTop: 28, gap: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 0 },
  chips: { gap: 8, paddingHorizontal: GUTTER, marginTop: 12 },
  sortChips: { paddingBottom: 14 },
});
