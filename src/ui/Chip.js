import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, radius } from '../theme';

/** Puce de filtre / sélection */
function Chip({ label, active, onPress, icon, style }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active ? styles.active : styles.idle, style]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.textInverse : colors.textSecondary} /> : null}
      <Text variant="smallMedium" color={active ? 'textInverse' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill },
  idle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  active: { backgroundColor: colors.text, borderWidth: 1, borderColor: colors.text },
});

export default memo(Chip);
