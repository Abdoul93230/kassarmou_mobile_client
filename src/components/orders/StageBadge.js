import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../ui';
import { colors, radius } from '../../theme';

const TONES = {
  warning: [colors.warningSoft, colors.wood],
  primary: [colors.primarySoft, colors.primaryDark],
  success: [colors.successSoft, colors.success],
  danger: [colors.dangerSoft, colors.danger],
};

/** Pastille de statut de commande */
function StageBadge({ stage }) {
  const [bg, fg] = TONES[stage.tone] || TONES.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={stage.icon} size={12} color={fg} />
      <Text variant="caption" style={{ color: fg }}>{stage.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
});

export default memo(StageBadge);
