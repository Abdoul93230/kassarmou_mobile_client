import React, { memo, useCallback, useMemo } from 'react';
import { RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ProductCard, ProductCardSkeleton, Text } from '../ui';
import { colors, GUTTER, useTheme } from '../theme';

const GAP = 12;

/**
 * Grille produits 2 colonnes virtualisée, avec chargement progressif.
 * Utilisée par la recherche, les listes (catégories, promos…) et les boutiques.
 */
function ProductGrid({
  products, loading, loadingMore, hasMore, onEndReached, onRefresh, refreshing,
  header, empty, contentBottom = 24, showStore = true,
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = (width - GUTTER * 2 - GAP) / 2;

  const renderItem = useCallback(
    ({ item, index }) => (
      <View style={[styles.cell, index % 2 === 0 ? styles.left : styles.right]}>
        <ProductCard product={item} width={cardWidth} showStore={showStore} />
      </View>
    ),
    [cardWidth, showStore],
  );

  const footer = useMemo(() => {
    if (loading || loadingMore) {
      return (
        <View style={styles.skeletons}>
          {[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardWidth} />)}
        </View>
      );
    }
    if (!hasMore && products.length > 6) {
      return (
        <View style={styles.end}>
          <Ionicons name="checkmark-done" size={18} color={colors.textMuted} />
          <Text variant="small" color="textMuted">Vous avez tout vu</Text>
        </View>
      );
    }
    return null;
  }, [cardWidth, hasMore, loading, loadingMore, products.length]);

  return (
    <FlashList
      data={products}
      numColumns={2}
      keyExtractor={(p) => p._id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={<View style={{ paddingBottom: contentBottom }}>{footer}</View>}
      ListEmptyComponent={!loading ? empty || <EmptyState icon="cube-outline" title="Aucun produit" message="Revenez bientôt, de nouveaux articles arrivent chaque jour." /> : null}
      onEndReached={hasMore && !loadingMore ? onEndReached : undefined}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  cell: { marginBottom: 18 },
  left: { paddingLeft: GUTTER, paddingRight: GAP / 2 },
  right: { paddingLeft: GAP / 2, paddingRight: GUTTER },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GUTTER, paddingTop: 4 },
  end: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 20 },
});

export default memo(ProductGrid);
