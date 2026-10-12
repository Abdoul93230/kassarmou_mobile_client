import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Pressable avec léger rétrécissement au toucher (feedback tactile premium).
 * haptic : 'light' | 'medium' | 'selection' | false
 */
function PressableScale({ children, style, scaleTo = 0.97, haptic = false, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(
    (e) => {
      if (haptic === 'selection') Haptics.selectionAsync().catch(() => {});
      else if (haptic) {
        Haptics.impactAsync(haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withTiming(scaleTo, { duration: 90 }); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      onPress={handlePress}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default memo(PressableScale);
