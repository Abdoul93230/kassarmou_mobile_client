import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, shadows } from '../theme';

/** Bouton rond à icône, avec badge optionnel (panier, notifications…) */
function IconButton({
  name, onPress, size = 40, iconSize = 20, color = colors.text, bg = colors.surface,
  badge, elevated, style, accessibilityLabel,
}) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.9}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, styles.center, elevated && shadows.sm, style]}
    >
      <Ionicons name={name} size={iconSize} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <Text variant="caption" color="textInverse" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});

export default memo(IconButton);
