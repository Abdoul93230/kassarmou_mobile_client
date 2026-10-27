import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, radius, useTheme, themedStyles } from '../theme';

/** Puce de filtre / sélection */
function Chip({ label, active, onPress, icon, style }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.textInverse : colors.textSecondary} /> : null}
      <Text variant="smallMedium" color={active ? 'textInverse' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = themedStyles((colors) => ({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill },
  idle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  active: { backgroundColor: colors.inverse, borderWidth: 1, borderColor: colors.inverse },
}));

export default memo(Chip);
