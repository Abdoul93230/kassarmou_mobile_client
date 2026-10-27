import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getCategories } from '../redux/productsSlice';
import { flattenPages, useSearchInfiniteQuery } from '../redux/catalogApi';
import ProductGrid from '../components/ProductGrid';
import { Chip, EmptyState, IconButton, PressableScale, SmartImage, Text } from '../ui';
import { capitalize } from '../utils/text';
import { fonts, GUTTER, radius, useTheme } from '../theme';

const HISTORY_KEY = 'searchHistory';
const TRENDING = ['Téléphone', 'Robe', 'Chaussures', 'Sac', 'Montre', 'Parfum', 'Panneau solaire', 'Ordinateur'];
const EMPTY = [];

/** Valeur retardée (anti-rebond) : évite une requête à chaque lettre */
const useDebounced = (value, delay) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

export default function SearchScreen({ navigation, route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const categories = useSelector((s) => s.products.categories || EMPTY);

  // q : lien du site (/Search?q=...)
  const [query, setQuery] = useState(route?.params?.query || route?.params?.q || '');
  const [history, setHistory] = useState([]);
  const term = useDebounced(query.trim(), 350);
  const active = term.length >= 2;

  const search = useSearchInfiniteQuery(term, { skip: !active });
  const results = useMemo(() => (active ? flattenPages(search.data) : EMPTY), [active, search.data]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((h) => h && setHistory(JSON.parse(h))).catch(() => {});
    if (!categories.length) dispatch(getCategories());
  }, [categories.length, dispatch]);

  const saveHistory = useCallback((t) => {
    const clean = t.trim();
    if (clean.length < 2) return;
    setHistory((prev) => {
      const next = [clean, ...prev.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const removeHistory = useCallback((t) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== t);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const runSearch = useCallback(
    (t) => {
      setQuery(t);
      saveHistory(t);
      Keyboard.dismiss();
    },
    [saveHistory],
  );

  const onEnd = useCallback(() => {
    if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
  }, [search]);

  // Catégories dont le nom correspond à la saisie (raccourcis instantanés)
  const matchingCats = useMemo(() => {
    if (!active) return EMPTY;
    const l = term.toLowerCase();
    return categories.filter((c) => c.name && c.name.toLowerCase() !== 'all' && c.name.toLowerCase().includes(l)).slice(0, 6);
  }, [active, categories, term]);

  const openCategory = (c) => navigation.navigate('ProductListScreen', { categoryId: c._id, categoryName: c.name });

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            placeholder="Que recherchez-vous ?"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel="Rechercher"
          />
          {query ? (
            <Pressable onPress={() => { setQuery(''); inputRef.current?.focus(); }} hitSlop={10} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {active ? (
        <ProductGrid
          products={results}
          loading={search.isLoading || (search.isFetching && !results.length)}
          loadingMore={search.isFetchingNextPage}
          hasMore={!!search.hasNextPage}
          onEndReached={onEnd}
          contentBottom={insets.bottom + 24}
          header={
            <View style={styles.resultsHead}>
              {matchingCats.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {matchingCats.map((c) => (
                    <Chip key={c._id} label={capitalize(c.name)} icon="grid-outline" onPress={() => openCategory(c)} />
                  ))}
                </ScrollView>
              ) : null}
              {results.length ? (
                <Text variant="small" color="textSecondary" style={styles.count}>
                  {search.data?.pages?.[0]?.total || results.length} résultat{results.length > 1 ? 's' : ''} pour « {term} »
                </Text>
              ) : null}
            </View>
          }
          empty={
            <EmptyState
              icon="search-outline"
              title="Aucun résultat"
              message={`Rien trouvé pour « ${term} ». Essayez un autre mot ou parcourez les catégories.`}
              actionLabel="Voir les catégories"
              onAction={() => navigation.navigate('MainTabs', { screen: 'Categories' })}
            />
          }
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {history.length ? (
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Text variant="h3">Recherches récentes</Text>
                <PressableScale
                  onPress={() => { setHistory([]); AsyncStorage.removeItem(HISTORY_KEY).catch(() => {}); }}
                  hitSlop={10}
                >
                  <Text variant="smallMedium" color="textSecondary">Effacer</Text>
                </PressableScale>
              </View>
              {history.map((h) => (
                <PressableScale key={h} onPress={() => runSearch(h)} style={[styles.historyRow, { borderBottomColor: colors.border }]} scaleTo={0.99}>
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <Text variant="body" style={styles.flex} numberOfLines={1}>{h}</Text>
                  <Pressable onPress={() => removeHistory(h)} hitSlop={10} accessibilityLabel={`Supprimer ${h}`}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </PressableScale>
              ))}
            </View>
          ) : null}

          <View style={styles.block}>
            <Text variant="h3" style={styles.blockTitle}>Tendances</Text>
            <View style={styles.wrapChips}>
              {TRENDING.map((t) => (
                <Chip key={t} label={t} icon="trending-up" onPress={() => runSearch(t)} />
              ))}
            </View>
          </View>

          {categories.length ? (
            <View style={styles.block}>
              <Text variant="h3" style={styles.blockTitle}>Parcourir les catégories</Text>
              <View style={styles.catGrid}>
                {categories
                  .filter((c) => c.name && c.name.toLowerCase() !== 'all')
                  .slice(0, 12)
                  .map((c) => (
                    <PressableScale key={c._id} onPress={() => openCategory(c)} style={styles.catCell} scaleTo={0.95}>
                      <View style={[styles.catImg, { backgroundColor: colors.primarySoft }]}>
                        {c.image ? <SmartImage uri={c.image} width={64} style={styles.fill} /> : <Ionicons name="pricetag-outline" size={22} color={colors.primary} />}
                      </View>
                      <Text variant="caption" color="textSecondary" align="center" numberOfLines={2} style={styles.catLabel}>{capitalize(c.name)}</Text>
                    </PressableScale>
                  ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingBottom: 12 },
  inputBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14,
    borderRadius: radius.pill, borderWidth: 1.5,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },

  resultsHead: { paddingBottom: 12, gap: 10 },
  chips: { gap: 8, paddingHorizontal: GUTTER },
  count: { paddingHorizontal: GUTTER },

  block: { paddingHorizontal: GUTTER, marginTop: 20 },
  blockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  blockTitle: { marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  catCell: { width: '25%', alignItems: 'center', paddingHorizontal: 4 },
  catImg: { width: 60, height: 60, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  catLabel: { marginTop: 6 },
});
