import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { getCategories, getTypes } from '../redux/productsSlice';
import { selectPanierCount } from '../redux/cartSlice';
import { flattenPages, useProductFeedInfiniteQuery } from '../redux/catalogApi';
import ProductGrid from '../components/ProductGrid';
import { Chip, IconButton, Text, getPricing } from '../ui';
import { capitalize } from '../utils/text';
import { GUTTER, useTheme } from '../theme';

const SORTS = [
  { key: 'newest', label: 'Nouveautés', icon: 'sparkles-outline' },
  { key: 'popular', label: 'Populaires', icon: 'flame-outline' },
  { key: 'price_asc', label: 'Prix croissant', icon: 'arrow-up' },
  { key: 'price_desc', label: 'Prix décroissant', icon: 'arrow-down' },
];

const EMPTY = [];
const sorters = {
  price_asc: (a, b) => getPricing(a).current - getPricing(b).current,
  price_desc: (a, b) => getPricing(b).current - getPricing(a).current,
  popular: (a, b) => (b.views || 0) - (a.views || 0),
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
};

/**
 * Liste de produits filtrée côté serveur (catégorie, type, promo) avec pagination infinie.
 * params : categoryId, categoryName, filter ('promo' | 'new'), marque, title
 */
export default function ProductListScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { categoryId: paramCategoryId, categoryName, filter, marque, title } = route.params || {};
  const insets = useSafeAreaInsets();
  const cartCount = useSelector(selectPanierCount);
  const types = useSelector((s) => s.products.types || EMPTY);
  const categories = useSelector((s) => s.products.categories || EMPTY);

  const dispatch = useDispatch();
  useEffect(() => {
    // Ouverture directe (lien profond) : charger catégories/types s'ils manquent (cache AsyncStorage)
    if (!types.length) dispatch(getTypes());
    if (!categories.length) dispatch(getCategories());
  }, [categories.length, dispatch, types.length]);

  // Les liens profonds (Categorie/:categoryName) ne donnent que le nom : on retrouve l'id
  const categoryId = useMemo(() => {
    if (paramCategoryId || !categoryName) return paramCategoryId;
    const name = decodeURIComponent(String(categoryName)).trim().toLowerCase();
    return categories.find((c) => (c.name || '').trim().toLowerCase() === name)?._id;
  }, [categories, categoryName, paramCategoryId]);

  const [sort, setSort] = useState(filter === 'promo' ? 'popular' : 'newest');
  const [typeId, setTypeId] = useState(route.params?.typeId || null);

  const categoryTypes = useMemo(
    () => (categoryId ? types.filter((t) => String(t.clefCategories) === String(categoryId)) : EMPTY),
    [categoryId, types],
  );
  const typeToCategory = useMemo(() => Object.fromEntries(types.map((t) => [t._id, String(t.clefCategories)])), [types]);

  const args = useMemo(() => {
    const a = { sort };
    if (typeId) a.type = typeId;
    else if (categoryId) a.category = categoryId;
    if (filter === 'promo') a.promo = 1;
    return a;
  }, [categoryId, filter, sort, typeId]);

  const feed = useProductFeedInfiniteQuery(args);

  // Filet de sécurité tant que le backend n'applique pas encore ces filtres : on filtre/trie localement
  const products = useMemo(() => {
    let list = flattenPages(feed.data);
    if (typeId) list = list.filter((p) => p.ClefType === typeId);
    else if (categoryId && types.length) list = list.filter((p) => typeToCategory[p.ClefType] === String(categoryId));
    if (filter === 'promo') list = list.filter((p) => getPricing(p).discount > 0);
    if (marque) list = list.filter((p) => (p.marque || '').toLowerCase() === String(marque).toLowerCase());
    return [...list].sort(sorters[sort] || sorters.newest);
  }, [categoryId, feed.data, filter, marque, sort, typeId, typeToCategory, types.length]);

  const heading = capitalize(title || categoryName || (filter === 'promo' ? 'Promotions' : filter === 'new' ? 'Nouveautés' : marque || 'Tous les produits'));

  const onEnd = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [feed]);

  const header = (
    <View style={styles.filters}>
      {categoryTypes.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tout" active={!typeId} onPress={() => setTypeId(null)} />
          {categoryTypes.map((t) => (
            <Chip key={t._id} label={capitalize(t.name)} active={typeId === t._id} onPress={() => setTypeId(t._id)} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {SORTS.map((s) => (
          <Chip key={s.key} label={s.label} icon={s.icon} active={sort === s.key} onPress={() => setSort(s.key)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={styles.flex}>
          <Text variant="h2" numberOfLines={1}>{heading}</Text>
          {!feed.isLoading ? (
            <Text variant="caption" color="textSecondary">
              {products.length}{feed.hasNextPage ? '+' : ''} produit{products.length > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
        <IconButton name="search" onPress={() => navigation.navigate('Search')} bg={colors.surfaceAlt} accessibilityLabel="Rechercher" />
        <IconButton name="bag-handle-outline" badge={cartCount} onPress={() => navigation.navigate('Cart')} bg={colors.surfaceAlt} accessibilityLabel="Panier" />
      </View>

      <ProductGrid
        products={products}
        loading={feed.isLoading}
        loadingMore={feed.isFetchingNextPage}
        hasMore={!!feed.hasNextPage}
        onEndReached={onEnd}
        onRefresh={feed.refetch}
        refreshing={feed.isFetching && !feed.isFetchingNextPage && !feed.isLoading}
        header={header}
        contentBottom={insets.bottom + 24}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingBottom: 10 },
  filters: { paddingBottom: 14, gap: 10 },
  chips: { gap: 8, paddingHorizontal: GUTTER },
});
