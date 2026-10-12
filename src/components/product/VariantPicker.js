import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip, PressableScale, Text } from '../../ui';
import { colors, GUTTER, radius } from '../../theme';

const isLight = (hex = '') => {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
};

/** Choix de couleur (pastilles) et de taille (puces) */
function VariantPicker({ variants, selected, onSelect, size, onSelectSize }) {
  if (!variants?.length) return null;
  const sizes = selected?.sizes?.filter(Boolean) || [];

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="title">Couleur</Text>
        {selected?.color ? <Text variant="body" color="textSecondary">· {selected.color}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {variants.map((v, i) => {
          const active = selected === v;
          const out = Number(v.stock) <= 0;
          return (
            <PressableScale
              key={`${v.color}-${i}`}
              onPress={() => onSelect(v)}
              haptic="selection"
              scaleTo={0.9}
              style={[styles.swatchRing, active && styles.swatchRingActive]}
              accessibilityLabel={`${v.color}${out ? ', épuisé' : ''}`}
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.swatch, { backgroundColor: v.colorCode || colors.surfaceAlt }, isLight(v.colorCode) && styles.swatchBorder]}>
                {active ? <Ionicons name="checkmark" size={18} color={isLight(v.colorCode) ? colors.text : colors.textInverse} /> : null}
              </View>
              {out ? <View style={styles.strike} /> : null}
            </PressableScale>
          );
        })}
      </ScrollView>

      {sizes.length > 0 ? (
        <>
          <Text variant="title" style={styles.sizeLabel}>Taille</Text>
          <View style={styles.sizes}>
            {sizes.map((s) => (
              <Chip key={s} label={s} active={size === s} onPress={() => onSelectSize(s)} style={styles.sizeChip} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, marginTop: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  row: { gap: 10 },
  swatchRing: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
  swatchRingActive: { borderColor: colors.primary },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchBorder: { borderWidth: 1, borderColor: colors.border },
  strike: {
    position: 'absolute', top: 20, left: 2, right: 2, height: 2,
    backgroundColor: colors.danger, transform: [{ rotate: '-45deg' }],
  },
  sizeLabel: { marginTop: 20, marginBottom: 12 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeChip: { minWidth: 52, justifyContent: 'center' },
});

export default memo(VariantPicker);
