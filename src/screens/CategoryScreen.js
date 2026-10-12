import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategories, getTypes } from '../redux/productsSlice';
import { PressableScale, Skeleton, SmartImage, Text } from '../ui';
import { capitalize } from '../utils/text';
import { colors, gradients, GUTTER, radius } from '../theme';

const RAIL_W = 96;
const EMPTY = [];

/** Onglet Catégories : rail vertical à gauche, sous-catégories à droite */
export default function CategoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const allCategories = useSelector((s) => s.products.categories || EMPTY);
  const types = useSelector((s) => s.products.types || EMPTY);
  const categories = useMemo(() => allCategories.filter((c) => c?.name && c.name.trim().toLowerCase() !== 'all'), [allCategories]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(getCategories());
    dispatch(getTypes());
  }, [dispatch]);

  const selected = categories.find((c) => c._id === selectedId) || categories[0];
  const subTypes = useMemo(
    () => (selected ? types.filter((t) => String(t.clefCategories) === String(selected._id)) : EMPTY),
    [selected, types],
  );

  const openList = useCallback(
    (params) => navigation.navigate('ProductListScreen', params),
    [navigation],
  );

  const renderRailItem = useCallback(
    ({ item }) => {
      const active = selected?._id === item._id;
      return (
        <PressableScale onPress={() => setSelectedId(item._id)} haptic="selection" scaleTo={0.97} style={[styles.railItem, active && styles.railItemActive]}>
          {active ? <View style={styles.railMarker} /> : null}
          <View style={[styles.railImg, active && styles.railImgActive]}>
            {item.image ? <SmartImage uri={item.image} width={44} style={styles.fill} /> : <Ionicons name="pricetag-outline" size={18} color={colors.primary} />}
          </View>
          <Text variant="caption" align="center" numberOfLines={2} color={active ? 'primaryDark' : 'textSecondary'} style={active && styles.bold}>
            {capitalize(item.name)}
          </Text>
        </PressableScale>
      );
    },
    [selected?._id],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="h1" style={styles.flex}>Catégories</Text>
        <PressableScale onPress={() => navigation.navigate('Search')} style={styles.searchBtn} accessibilityLabel="Rechercher">
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <Text variant="small" color="textMuted">Rechercher</Text>
        </PressableScale>
      </View>

      {!categories.length ? (
        <View style={styles.loading}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} radius={radius.md} style={styles.mb10} />)}
        </View>
      ) : (
        <View style={styles.body}>
          <FlatList
            data={categories}
            keyExtractor={(c) => c._id}
            renderItem={renderRailItem}
            style={styles.rail}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
          />

          <ScrollView style={styles.flex} contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
            {selected ? (
              <>
                <PressableScale onPress={() => openList({ categoryId: selected._id, categoryName: selected.name })} scaleTo={0.98} style={styles.hero}>
                  {selected.image ? <SmartImage uri={selected.image} width={260} style={StyleSheet.absoluteFill} /> : null}
                  <LinearGradient colors={['rgba(15,61,52,0.15)', 'rgba(15,61,52,0.85)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.heroText}>
                    <Text variant="h2" color="textInverse" numberOfLines={2}>{capitalize(selected.name)}</Text>
                    <View style={styles.heroCta}>
                      <Text variant="smallMedium" color="textInverse">Tout voir</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.textInverse} />
                    </View>
                  </View>
                </PressableScale>

                {subTypes.length ? (
                  <>
                    <Text variant="title" style={styles.subTitle}>Sous-catégories</Text>
                    <View style={styles.typeGrid}>
                      {subTypes.map((t) => (
                        <PressableScale
                          key={t._id}
                          onPress={() => openList({ categoryId: selected._id, categoryName: t.name, title: capitalize(t.name), typeId: t._id })}
                          style={styles.typeCell}
                          scaleTo={0.95}
                        >
                          <View style={styles.typeIcon}>
                            <Text variant="h3" color="primaryDark">{capitalize(t.name).charAt(0)}</Text>
                          </View>
                          <Text variant="caption" align="center" numberOfLines={2}>{capitalize(t.name)}</Text>
                        </PressableScale>
                      ))}
                    </View>
                  </>
                ) : null}

                <View style={styles.shortcuts}>
                  <PressableScale onPress={() => openList({ filter: 'promo', categoryName: 'Promotions' })} style={styles.shortcut} scaleTo={0.97}>
                    <LinearGradient colors={gradients.promo} style={styles.shortcutIcon}>
                      <Ionicons name="flame" size={16} color={colors.textInverse} />
                    </LinearGradient>
                    <Text variant="smallMedium" style={styles.flex}>Promotions</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </PressableScale>
                  <PressableScale onPress={() => openList({ filter: 'new', categoryName: 'Nouveautés' })} style={styles.shortcut} scaleTo={0.97}>
                    <LinearGradient colors={gradients.brand} style={styles.shortcutIcon}>
                      <Ionicons name="sparkles" size={16} color={colors.textInverse} />
                    </LinearGradient>
                    <Text variant="smallMedium" style={styles.flex}>Nouveautés</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </PressableScale>
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bold: { fontFamily: 'Inter_600SemiBold' },
  mb10: { marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 12 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  loading: { padding: GUTTER },
  body: { flex: 1, flexDirection: 'row' },

  rail: { width: RAIL_W, flexGrow: 0, backgroundColor: colors.surfaceAlt },
  railContent: { paddingVertical: 6 },
  railItem: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, gap: 6 },
  railItemActive: { backgroundColor: colors.bg },
  railMarker: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2, backgroundColor: colors.primary },
  railImg: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  railImgActive: { borderWidth: 2, borderColor: colors.primary },
  fill: { width: '100%', height: '100%' },

  panel: { padding: 14, paddingBottom: 32 },
  hero: { height: 130, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.primaryDeep, justifyContent: 'flex-end' },
  heroText: { padding: 14, gap: 6 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subTitle: { marginTop: 20, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  typeCell: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4, gap: 6 },
  typeIcon: { width: 54, height: 54, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { marginTop: 24, gap: 10 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  shortcutIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
