import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius as R, useTheme } from '../theme';

/** Bloc de chargement pulsé (remplace les spinners : l'écran a déjà sa forme). */
function Skeleton({ width = '100%', height = 16, radius = R.sm, style }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceAlt }, animated, style]} />;
}

export default memo(Skeleton);

/** Squelette d'une carte produit de grille */
export const ProductCardSkeleton = memo(function ProductCardSkeleton({ width }) {
  return (
    <View style={{ width }}>
      <Skeleton height={width * 1.2} radius={R.lg} />
      <Skeleton height={12} width="85%" style={styles.mt8} />
      <Skeleton height={12} width="55%" style={styles.mt6} />
      <Skeleton height={16} width="40%" style={styles.mt8} />
    </View>
  );
});

const styles = StyleSheet.create({ mt6: { marginTop: 6 }, mt8: { marginTop: 8 } });
