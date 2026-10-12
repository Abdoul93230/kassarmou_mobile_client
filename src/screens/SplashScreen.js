import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Text } from '../ui';
import { colors } from '../theme';

/** Écran affiché pendant la vérification de session — même fond que le splash natif (aucun flash) */
export default function SplashScreen() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -60 + progress.value * 120 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
        <Image source={require('../../assets/brand/logo-horizontal.png')} style={styles.logo} contentFit="contain" />
        <Text variant="small" color="textSecondary" style={styles.tagline}>
          La marketplace du Niger
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, barStyle]} />
        </View>
      </Animated.View>
      <Text variant="caption" color="textMuted" style={styles.footer}>
        Paiement sécurisé · Livraison partout au Niger
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  logo: { width: 230, height: 59 },
  tagline: { marginTop: 10 },
  track: { width: 120, height: 3, borderRadius: 2, backgroundColor: colors.primarySoft, marginTop: 28, overflow: 'hidden' },
  bar: { width: 60, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  footer: { position: 'absolute', bottom: 48 },
});
