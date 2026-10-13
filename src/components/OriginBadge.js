import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSellerOrigin from '../hooks/useSellerOrigin';
import { Text } from '../ui';
import { colors } from '../theme';

/** « 📍 Niamey » : ville d'expédition d'une boutique (rien si inconnue, ou `fallback`) */
function OriginBadge({ sellerId, detail = false, variant = 'caption', color = 'wood', fallback = null, style }) {
  const origin = useSellerOrigin(sellerId);
  if (!origin) return fallback;
  return (
    <View style={[styles.row, style]}>
      <Ionicons name="location" size={variant === 'caption' ? 11 : 13} color={colors[color] || colors.wood} />
      <Text variant={variant} color={color} numberOfLines={1} style={styles.shrink}>
        {origin.city}{detail && origin.detail ? ` · ${origin.detail}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  shrink: { flexShrink: 1 },
});

export default memo(OriginBadge);
