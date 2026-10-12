import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale, SmartImage, Text } from '../../ui';
import QuantityStepper from '../../ui/QuantityStepper';
import { availableStock, originalPrice, unitPrice } from '../../utils/cart';
import { formatPrice } from '../../utils/formatPrice';
import { productImage } from '../../utils/image';
import { colors, radius } from '../../theme';

const IMG = 84;

/** Ligne d'article du panier : image, nom, variante, prix, quantité (− à 1 = supprimer) */
function CartLine({ item, onOpen, onQuantity, onRemove }) {
  const price = unitPrice(item);
  const original = originalPrice(item);
  const qty = Number(item.quantite) || 1;
  const max = Math.max(qty, availableStock(item));

  return (
    <View style={styles.row}>
      <PressableScale onPress={onOpen} scaleTo={0.96} accessibilityLabel={item.name}>
        <SmartImage uri={item.colorImage || productImage(item)} width={IMG} style={styles.img} />
      </PressableScale>
      <View style={styles.info}>
        <Text variant="smallMedium" numberOfLines={2}>{item.name}</Text>
        {item.color || item.taille ? (
          <View style={styles.tags}>
            {item.color ? <View style={styles.tag}><Text variant="caption" color="textSecondary">{item.color}</Text></View> : null}
            {item.taille ? <View style={styles.tag}><Text variant="caption" color="textSecondary">Taille {item.taille}</Text></View> : null}
          </View>
        ) : null}
        <View style={styles.bottom}>
          <View style={styles.flex}>
            <Text variant="price" color={original ? 'danger' : 'text'} numberOfLines={1}>
              {formatPrice(price)}<Text variant="caption" color={original ? 'danger' : 'text'}> F</Text>
            </Text>
            {original ? <Text variant="caption" color="textMuted" style={styles.strike}>{formatPrice(original)}</Text> : null}
          </View>
          <QuantityStepper
            size="sm"
            value={qty}
            min={0}
            max={max}
            onChange={(v) => (v <= 0 ? onRemove() : onQuantity(v))}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  img: { width: IMG, height: IMG, borderRadius: radius.md },
  info: { flex: 1, justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  flex: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
});

export default memo(CartLine);
