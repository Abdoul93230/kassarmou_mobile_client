import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import Text from './Text';
import { colors, radius, useTheme, themedStyles } from '../theme';

/** Sélecteur de quantité − / + */
function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const { colors } = useTheme();
  const h = size === 'sm' ? 32 : 42;
  const canDec = value > min;
  const canInc = value < max;
  return (
    <View style={[styles.wrap, { height: h, borderRadius: h / 2, backgroundColor: colors.surfaceAlt }]}>
      <PressableScale
        onPress={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        haptic="selection"
        scaleTo={0.85}
        hitSlop={6}
        style={[styles.btn, { width: h, height: h }]}
        accessibilityLabel="Diminuer la quantité"
      >
        <Ionicons name={min === 0 && value <= 1 ? 'trash-outline' : 'remove'} size={size === 'sm' ? 16 : 18} color={canDec ? colors.text : colors.textMuted} />
      </PressableScale>
      <Text variant="title" style={styles.value} accessibilityLabel={`Quantité ${value}`}>{value}</Text>
      <PressableScale
        onPress={() => canInc && onChange(value + 1)}
        disabled={!canInc}
        haptic="selection"
        scaleTo={0.85}
        hitSlop={6}
        style={[styles.btn, { width: h, height: h }]}
        accessibilityLabel="Augmenter la quantité"
      >
        <Ionicons name="add" size={size === 'sm' ? 16 : 18} color={canInc ? colors.text : colors.textMuted} />
      </PressableScale>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill },
  btn: { alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 28, textAlign: 'center' },
}));

export default memo(QuantityStepper);
