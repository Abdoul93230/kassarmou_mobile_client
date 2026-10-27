import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, shadows, useTheme, themedStyles } from '../theme';

/** Bouton rond à icône, avec badge optionnel (panier, notifications…) */
function IconButton({
  name, onPress, size = 40, iconSize = 20, color, bg,
  badge, elevated, style, accessibilityLabel,
}) {
  const { colors } = useTheme();
  const iconColor = color || colors.text;
  const bgColor = bg || colors.surface;

  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
        styles.center,
        elevated && shadows.sm,
        elevated && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize} color={iconColor} />
      {badge ? (
        <View style={[styles.badge, { borderColor: colors.surface }]}>
          <Text variant="caption" color="textInverse" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = themedStyles((colors) => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
}));

export default memo(IconButton);
