import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import { formatPrice } from '../utils/formatPrice';
import { colors, radius, useTheme, themedStyles } from '../theme';

/** Prix effectif d'un produit (prixPromo est le prix soldé s'il est inférieur au prix normal) */
export const getPricing = (product) => {
  const prix = Number(product?.prix) || 0;
  const promo = Number(product?.prixPromo) || 0;
  const onSale = promo > 0 && promo < prix;
  return {
    current: onSale ? promo : prix,
    original: onSale ? prix : null,
    discount: onSale ? Math.round(((prix - promo) / prix) * 100) : 0,
  };
};

/**
 * Affichage de prix : prix actuel en avant, ancien prix barré, badge de réduction.
 * size : 'sm' (cartes) | 'lg' (fiche produit)
 */
function Price({ product, size = 'sm', showBadge = false, color = 'text', style }) {
  const { colors } = useTheme();
  const { current, original, discount } = getPricing(product);
  const lg = size === 'lg';
  return (
    <View style={[styles.row, style]}>
      <Text variant={lg ? 'priceLg' : 'price'} color={original ? 'danger' : color} numberOfLines={1}>
        {formatPrice(current)}
        <Text variant={lg ? 'title' : 'caption'} color={original ? 'danger' : color}> F</Text>
      </Text>
      {original ? (
        <Text variant={lg ? 'body' : 'caption'} color="textMuted" style={styles.strike} numberOfLines={1}>
          {formatPrice(original)}
        </Text>
      ) : null}
      {showBadge && discount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
          <Text variant="caption" color="danger">-{discount}%</Text>
        </View>
      ) : null}
    </View>
  );
}


const styles = themedStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  badge: { backgroundColor: colors.dangerSoft, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center' },
}));

export default memo(Price);
