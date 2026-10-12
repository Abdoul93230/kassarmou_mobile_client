import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

/**
 * Étoiles de notation. Lecture seule par défaut ; interactif si onChange est fourni.
 */
function Stars({ value = 0, size = 14, onChange, gap = 2, style }) {
  return (
    <View style={[styles.row, { gap }, style]} accessibilityLabel={`${Math.round(value * 10) / 10} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline';
        const icon = <Ionicons name={name} size={size} color={value >= i - 0.5 ? colors.star : colors.textMuted} />;
        if (!onChange) return <View key={i}>{icon}</View>;
        return (
          <Pressable
            key={i}
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(i);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${i} étoile${i > 1 ? 's' : ''}`}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });

export default memo(Stars);
