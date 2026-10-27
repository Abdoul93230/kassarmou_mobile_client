import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, GUTTER, useTheme } from '../theme';

/** Titre de section avec lien « Voir tout » optionnel */
function SectionHeader({ title, subtitle, actionLabel = 'Voir tout', onAction, icon, iconColor, style }) {
  const { colors } = useTheme();
  const effectiveIconColor = iconColor || colors.primary;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          {icon ? <Ionicons name={icon} size={18} color={effectiveIconColor} /> : null}
          <Text variant="h2" numberOfLines={1}>{title}</Text>
        </View>
        {subtitle ? <Text variant="small" color="textSecondary" numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <PressableScale onPress={onAction} hitSlop={10} style={styles.action} accessibilityRole="link">
          <Text variant="smallMedium" color="primary">{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: GUTTER, marginBottom: 12, gap: 12 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 3 },
});

export default memo(SectionHeader);
