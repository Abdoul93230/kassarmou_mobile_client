import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStoresQuery } from '../redux/catalogApi';
import { Chip, EmptyState, IconButton, PressableScale, Skeleton, SmartImage, Stars, Text } from '../ui';
import { capitalize } from '../utils/text';
import { colors, fonts, GUTTER, radius, shadows } from '../theme';

const SORTS = [
  { key: 'popular', label: 'Populaires' },
  { key: 'rating', label: 'Mieux notées' },
  { key: 'recent', label: 'Nouvelles' },
];
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n || 0));

const StoreRow = React.memo(function StoreRow({ store, onPress }) {
  const name = store.storeName || store.name || 'Boutique';
  return (
    <PressableScale onPress={() => onPress(store)} scaleTo={0.985} style={styles.row} accessibilityLabel={name}>
      {store.logo ? (
        <SmartImage uri={store.logo} width={60} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.initial]}>
          <Text variant="h2" color="primaryDark">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text variant="title" numberOfLines={1} style={styles.shrink}>{name}</Text>
          {store.isvalid ? <Ionicons name="checkmark-circle" size={15} color={colors.primary} /> : null}
        </View>
        {store.storeDescription ? (
          <Text variant="small" color="textSecondary" numberOfLines={1}>{store.storeDescription}</Text>
        ) : null}
        <View style={styles.meta}>
          {Number(store.rating) > 0 ? (
            <>
              <Stars value={Number(store.rating)} size={11} />
              <Text variant="caption" color="textMuted">{Number(store.rating).toFixed(1)}</Text>
              <Text variant="caption" color="textMuted">·</Text>
            </>
          ) : null}
          <Text variant="caption" color="textMuted">{compact(store.followersCount)} abonnés</Text>
          {store.city ? (
            <>
              <Text variant="caption" color="textMuted">·</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>{store.city.trim()}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );
});

/** Annuaire des boutiques vérifiées */
export default function AllStoresScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch, isError } = useStoresQuery();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [category, setCategory] = useState(null);

  const categories = useMemo(() => {
    const set = new Set((data || []).map((s) => (s.category || '').trim().toLowerCase()).filter(Boolean));
    return [...set].slice(0, 12);
  }, [data]);

  const stores = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = (data || []).filter((s) => {
      if (category && (s.category || '').trim().toLowerCase() !== category) return false;
      if (!term) return true;
      return `${s.storeName || ''} ${s.storeDescription || ''} ${s.city || ''} ${s.category || ''}`.toLowerCase().includes(term);
    });
    if (sort === 'popular') l = [...l].sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    if (sort === 'rating') l = [...l].sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewsCount || 0) - (a.reviewsCount || 0));
    if (sort === 'recent') l = [...l].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return l;
  }, [category, data, q, sort]);

  const open = useCallback(
    (s) => navigation.navigate('Boutique', { sellerId: s._id, storeName: s.storeName || s.name }),
    [navigation],
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={styles.flex}>
          <Text variant="h2">Boutiques</Text>
          {data ? <Text variant="caption" color="textSecondary">{data.length} vendeurs vérifiés</Text> : null}
        </View>
      </View>

      <FlatList
        data={stores}
        keyExtractor={(s) => s._id}
        renderItem={({ item }) => <StoreRow store={item} onPress={open} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View style={styles.filters}>
            <View style={styles.search}>
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Nom, ville, spécialité…"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {SORTS.map((s) => <Chip key={s.key} label={s.label} active={sort === s.key} onPress={() => setSort(s.key)} />)}
              {categories.length > 1 ? <View style={styles.sep} /> : null}
              {categories.length > 1
                ? categories.map((c) => (
                  <Chip key={c} label={capitalize(c)} active={category === c} onPress={() => setCategory(category === c ? null : c)} />
                ))
                : null}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={84} radius={radius.lg} />)}
            </View>
          ) : (
            <EmptyState
              icon={isError ? 'cloud-offline-outline' : 'storefront-outline'}
              title={isError ? 'Connexion impossible' : 'Aucune boutique trouvée'}
              message={isError ? 'Vérifiez votre connexion internet.' : 'Essayez un autre mot-clé.'}
              actionLabel={isError ? 'Réessayer' : undefined}
              onAction={isError ? refetch : undefined}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 8 },
  filters: { paddingTop: 4, paddingBottom: 6 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, marginHorizontal: GUTTER, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  chips: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12, alignItems: 'center' },
  sep: { width: 1, height: 22, backgroundColor: colors.border, marginHorizontal: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginBottom: 10, padding: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm,
  },
  logo: { width: 60, height: 60, borderRadius: 30 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  skeletons: { paddingHorizontal: GUTTER, gap: 10 },
});
