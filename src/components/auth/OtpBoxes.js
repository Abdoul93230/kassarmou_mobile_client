import React, { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Text } from '../../ui';
import { colors, fonts, radius, useTheme, themedStyles } from '../../theme';

/**
 * Saisie du code OTP en cases. Un seul champ invisible : le code reçu par SMS
 * est proposé automatiquement par le clavier (Android / iOS) et collable d'un coup.
 */
function OtpBoxes({ value, onChange, length = 6, error, onComplete, autoFocus = true }) {
  const { colors } = useTheme();
  const inputRef = useRef(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const handle = (t) => {
    const digits = t.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel={`Code à ${length} chiffres`}>
      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length }).map((_, i) => {
          const char = value[i] || '';
          const active = i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                { borderColor: colors.border, backgroundColor: colors.surface },
                char && [styles.boxFilled, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
                active && [styles.boxActive, { borderColor: colors.primary }],
                error && [styles.boxError, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }],
              ]}
            >
              <Text variant="h1" style={styles.digit}>{char}</Text>
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handle}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = themedStyles((colors) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, aspectRatio: 0.85, maxWidth: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  boxActive: { borderColor: colors.primary, borderWidth: 2 },
  boxError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  digit: { fontFamily: fonts.display },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
}));

export default memo(OtpBoxes);
