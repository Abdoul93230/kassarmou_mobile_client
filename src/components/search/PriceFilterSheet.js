import React, { memo, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Text } from '../../ui';
import TextField from '../../ui/TextField';
import { radius, useTheme, themedStyles } from '../../theme';
import { formatPrice } from '../../utils/formatPrice';

/** Fourchettes rapides (FCFA) */
export const PRICE_RANGES = [
  { label: 'Moins de 5 000 F', min: 0, max: 5000 },
  { label: '5 000 – 20 000 F', min: 5000, max: 20000 },
  { label: '20 000 – 50 000 F', min: 20000, max: 50000 },
  { label: 'Plus de 50 000 F', min: 50000, max: 0 },
];

/** Libellé court d'une fourchette pour la puce « Prix » */
export const priceLabel = ({ min, max } = {}) => {
  if (min > 0 && max > 0) return `${formatPrice(min)} – ${formatPrice(max)} F`;
  if (max > 0) return `Moins de ${formatPrice(max)} F`;
  if (min > 0) return `Plus de ${formatPrice(min)} F`;
  return 'Prix';
};

const digits = (v) => String(v || '').replace(/\D/g, '').slice(0, 9);

/** Volet de filtre par prix (le prix payé : promo comprise) */
function PriceFilterSheet({ visible, value, onApply, onClose }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMin(value?.min ? String(value.min) : '');
    setMax(value?.max ? String(value.max) : '');
  }, [visible, value]);

  const nMin = Number(min) || 0;
  const nMax = Number(max) || 0;
  const invalid = nMin > 0 && nMax > 0 && nMin > nMax;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text variant="h2">Prix</Text>
          <Text variant="small" color="textSecondary" style={styles.mt4}>Le prix payé, promotions comprises.</Text>

          <View style={styles.ranges}>
            {PRICE_RANGES.map((r) => (
              <Chip
                key={r.label}
                label={r.label}
                active={nMin === r.min && nMax === r.max}
                onPress={() => { setMin(r.min ? String(r.min) : ''); setMax(r.max ? String(r.max) : ''); }}
              />
            ))}
          </View>

          <View style={styles.inputs}>
            <TextField label="Minimum" value={min} onChangeText={(v) => setMin(digits(v))} keyboardType="number-pad" suffix={<Text variant="smallMedium" color="textMuted">F</Text>} placeholder="0" style={styles.flex} />
            <TextField label="Maximum" value={max} onChangeText={(v) => setMax(digits(v))} keyboardType="number-pad" suffix={<Text variant="smallMedium" color="textMuted">F</Text>} placeholder="Sans limite" style={styles.flex} />
          </View>
          {invalid ? <Text variant="caption" color="danger" style={styles.mt4}>Le minimum dépasse le maximum.</Text> : null}

          <View style={styles.actions}>
            <Button title="Effacer" variant="ghost" onPress={() => { onApply({ min: 0, max: 0 }); onClose(); }} style={styles.flex} />
            <Button title="Appliquer" disabled={invalid} onPress={() => { onApply({ min: nMin, max: nMax }); onClose(); }} style={styles.flex2} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  mt4: { marginTop: 4 },
  ranges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  inputs: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  flex: { flex: 1 },
  flex2: { flex: 2 },
}));

export default memo(PriceFilterSheet);
