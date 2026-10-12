import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, Text } from '../../ui';
import { colors, GUTTER, radius } from '../../theme';

const ACTIONS = [
  { key: 'promo', label: 'Promos', icon: 'flame', tint: colors.danger, bg: colors.dangerSoft },
  { key: 'new', label: 'Nouveautés', icon: 'sparkles', tint: colors.primaryDark, bg: colors.primarySoft },
  { key: 'stores', label: 'Boutiques', icon: 'storefront', tint: colors.wood, bg: colors.woodSoft },
  { key: 'wallet', label: 'Mes points', icon: 'gift', tint: colors.sand, bg: colors.sandSoft },
];

/** 4 raccourcis principaux, gros et lisibles — l'essentiel à portée de pouce */
function QuickActions({ onAction }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <PressableScale key={a.key} onPress={() => onAction(a.key)} haptic="selection" scaleTo={0.93} style={styles.item} accessibilityLabel={a.label}>
          <View style={[styles.icon, { backgroundColor: a.bg }]}>
            <Ionicons name={a.icon} size={22} color={a.tint} />
          </View>
          <Text variant="caption" style={styles.label} numberOfLines={1}>{a.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GUTTER, marginTop: 24 },
  item: { alignItems: 'center', width: '23%' },
  icon: { width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 6, color: colors.text },
});

export default memo(QuickActions);
