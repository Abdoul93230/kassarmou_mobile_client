import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ProductCard, ProductCardSkeleton, SectionHeader } from '../../ui';
import { GUTTER } from '../../theme';

const CARD_W = 148;
const GAP = 12;

/** Section horizontale de produits (Ventes flash, Nouveautés…) */
function ProductRail({ title, subtitle, icon, iconColor, products, loading, onSeeAll, header }) {
  const renderItem = useCallback(({ item }) => <ProductCard product={item} width={CARD_W} variant="rail" />, []);

  if (!loading && !products?.length) return null;

  return (
    <View style={styles.section}>
      {header || <SectionHeader title={title} subtitle={subtitle} icon={icon} iconColor={iconColor} onAction={onSeeAll} />}
      {loading && !products?.length ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((i) => <ProductCardSkeleton key={i} width={CARD_W} />)}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p._id}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={Separator}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const Separator = () => <View style={{ width: GAP }} />;

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  content: { paddingHorizontal: GUTTER },
  skeletonRow: { flexDirection: 'row', gap: GAP, paddingHorizontal: GUTTER },
});

export default memo(ProductRail);
