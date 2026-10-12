import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, gradients, radius, shadows } from '../theme';

const HEIGHT = { sm: 38, md: 48, lg: 56 };

const FOREGROUND = {
  primary: colors.textInverse,
  dark: colors.textInverse,
  danger: colors.textInverse,
  secondary: colors.primary,
  soft: colors.primaryDark,
  ghost: colors.text,
};

const VARIANT_STYLE = {
  secondary: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  soft: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  dark: { backgroundColor: colors.text },
};

/**
 * Bouton du design system.
 * variant : primary (dégradé marque) | secondary (contour) | soft | ghost | danger | dark
 */
function Button({ title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, full, style }) {
  const isDisabled = disabled || loading;
  const fg = FOREGROUND[variant];
  const iconSize = size === 'sm' ? 16 : 19;

  const content = (
    <View style={[styles.inner, { height: HEIGHT[size], paddingHorizontal: size === 'sm' ? 14 : 22 }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={iconSize} color={fg} /> : null}
          {title ? (
            <Text variant="button" color={fg} numberOfLines={1} style={size === 'sm' ? styles.smallText : null}>
              {title}
            </Text>
          ) : null}
          {iconRight ? <Ionicons name={iconRight} size={iconSize} color={fg} /> : null}
        </>
      )}
    </View>
  );

  const base = [styles.base, isDisabled && styles.disabled, full && styles.full, style];

  if (variant === 'primary') {
    return (
      <PressableScale haptic="light" onPress={onPress} disabled={isDisabled} style={[base, shadows.md]} accessibilityRole="button" accessibilityLabel={title}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale haptic="light" onPress={onPress} disabled={isDisabled} style={[base, VARIANT_STYLE[variant]]} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden', alignSelf: 'flex-start', borderRadius: radius.pill },
  disabled: { opacity: 0.5 },
  full: { alignSelf: 'stretch' },
  gradient: { borderRadius: radius.pill },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  smallText: { fontSize: 13 },
});

export default memo(Button);
