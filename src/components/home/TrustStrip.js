import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../ui';
import { colors, GUTTER, radius } from '../../theme';

const ITEMS = [
  { icon: 'shield-checkmark-outline', label: 'Paiement sécurisé' },
  { icon: 'car-outline', label: 'Livraison au Niger' },
  { icon: 'chatbubbles-outline', label: 'Support local' },
];

/** Bandeau de réassurance : lève les freins à l'achat */
function TrustStrip() {
  return (
    <View style={styles.wrap}>
      {ITEMS.map((it) => (
        <View key={it.label} style={styles.item}>
          <Ionicons name={it.icon} size={18} color={colors.primary} />
          <Text variant="caption" color="textSecondary" align="center" numberOfLines={2}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', marginHorizontal: GUTTER, marginTop: 28, paddingVertical: 14,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 6 },
});

export default memo(TrustStrip);
