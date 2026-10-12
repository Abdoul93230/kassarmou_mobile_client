import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import SmartImage from './SmartImage';
import Text from './Text';
import Price, { getPricing } from './Price';
import useProductActions, { useIsLiked } from '../hooks/useProductActions';
import { productImage } from '../utils/image';
import { colors, radius, shadows } from '../theme';

const storeName = (p) => p?.Clefournisseur?.storeName || p?.Clefournisseur?.name || null;

/**
 * Carte produit universelle.
 * variant : 'grid' (grilles 2 colonnes) | 'rail' (carrousels horizontaux, plus compacte)
 */
function ProductCard({ product, width, variant = 'grid', showStore = true }) {
  const { openProduct, like, addToCart } = useProductActions();
  const liked = useIsLiked(product?._id);
  const { discount } = getPricing(product);
  const outOfStock = product?.quantite !== undefined && Number(product.quantite) <= 0;
  const imageHeight = variant === 'rail' ? width * 1.05 : width * 1.18;

  const onPress = useCallback(() => openProduct(product), [openProduct, product]);
  const onLike = useCallback(() => like(product), [like, product]);
  const onAdd = useCallback(() => addToCart(product), [addToCart, product]);

  if (!product) return null;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        <SmartImage uri={productImage(product)} width={width} style={StyleSheet.absoluteFill} recyclingKey={product._id} />

        {discount > 0 ? (
          <View style={styles.discount}>
            <Text variant="caption" color="textInverse">-{discount}%</Text>
          </View>
        ) : null}

        <PressableScale onPress={onLike} haptic={false} scaleTo={0.85} hitSlop={10} style={styles.heart} accessibilityLabel={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.danger : colors.text} />
        </PressableScale>

        {outOfStock ? (
          <View style={styles.soldOut}>
            <Text variant="caption" color="textInverse">Épuisé</Text>
          </View>
        ) : (
          <PressableScale onPress={onAdd} haptic={false} scaleTo={0.85} hitSlop={8} style={styles.add} accessibilityLabel="Ajouter au panier">
            <Ionicons name="add" size={20} color={colors.textInverse} />
          </PressableScale>
        )}
      </View>

      <View style={styles.info}>
        <Text variant="smallMedium" numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        {showStore && storeName(product) ? (
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={11} color={colors.textMuted} />
            <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.flex}>
              {storeName(product)}
            </Text>
          </View>
        ) : null}
        <Price product={product} style={styles.price} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  discount: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.danger, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 3,
  },
  heart: {
    position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
  },
  add: {
    position: 'absolute', bottom: 8, right: 8, width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.md,
  },
  soldOut: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: colors.overlay, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  info: { paddingTop: 8, paddingHorizontal: 2, gap: 3 },
  name: { minHeight: 36 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  price: { marginTop: 1 },
});

export default memo(ProductCard);
