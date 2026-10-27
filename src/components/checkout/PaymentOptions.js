import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, Text } from '../../ui';
import { radius, useTheme } from '../../theme';

/**
 * Trois vrais choix, comme sur le web : la page sécurisée iPay propose elle-même
 * tous les moyens en ligne (le client y choisit Mobile Money, MyNita, carte…).
 * Les identifiants restent ceux attendus par services/paymentHelpers (PaymentMethods).
 */
export const ONLINE = 'Mobile Money';
export const CASH = 'payé à la livraison';
export const ASSISTED = 'paiement_assiste';

const ONLINE_BRANDS = ['Airtel', 'Moov', 'Zamani', 'MyNita', 'Amana', 'Zeyna', 'Visa', 'Mastercard'];

const OPTIONS = [
  {
    id: ONLINE,
    icon: 'shield-checkmark',
    title: 'Payer en ligne',
    hint: 'Mobile money, portefeuille ou carte — sur la page sécurisée iPay',
    badge: 'Recommandé',
  },
  { id: CASH, icon: 'cash-outline', title: 'Paiement à la livraison', hint: 'Payez le livreur en espèces à la réception' },
  { id: ASSISTED, icon: 'call-outline', title: 'Paiement assisté', hint: 'Un conseiller vous appelle pour finaliser le paiement' },
];

function PaymentOptions({ value, onChange }) {
  const { colors } = useTheme();

  return (
    <View style={styles.list}>
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <PressableScale
            key={o.id}
            onPress={() => onChange(o.id)}
            haptic="selection"
            scaleTo={0.985}
            style={[
              styles.option,
              { backgroundColor: colors.surface, borderColor: colors.border },
              active && [styles.optionActive, { borderColor: colors.primary, backgroundColor: colors.primarySoft }],
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.title}
          >
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }, active && [styles.iconActive, { backgroundColor: colors.primary }]]}>
                <Ionicons name={o.icon} size={20} color={active ? colors.textInverse : colors.primaryDark} />
              </View>
              <View style={styles.flex}>
                <View style={styles.titleRow}>
                  <Text variant="title">{o.title}</Text>
                  {o.badge ? (
                    <View style={[styles.badge, { backgroundColor: colors.successSoft }]}><Text variant="caption" color="success">{o.badge}</Text></View>
                  ) : null}
                </View>
                <Text variant="caption" color="textSecondary">{o.hint}</Text>
              </View>
              <View style={[styles.radio, { borderColor: colors.border }, active && [styles.radioActive, { borderColor: colors.primary }]]}>
                {active ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
              </View>
            </View>
            {o.id === ONLINE ? (
              <View style={styles.brands}>
                {ONLINE_BRANDS.map((b) => (
                  <View key={b} style={[styles.brand, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text variant="caption" color="textSecondary">{b}</Text></View>
                ))}
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  flex: { flex: 1 },
  option: { padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  optionActive: { borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconActive: {},
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioActive: {},
  dot: { width: 10, height: 10, borderRadius: 5 },
  brands: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginLeft: 54 },
  brand: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, borderWidth: StyleSheet.hairlineWidth },
});

export default memo(PaymentOptions);
