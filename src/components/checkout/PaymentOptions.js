import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, Text } from '../../ui';
import { colors, radius } from '../../theme';

/** Identifiants identiques au web / backend (voir services/paymentHelpers) */
export const PAYMENT_GROUPS = [
  {
    title: 'Mobile money & portefeuilles',
    items: [
      { id: 'Mobile Money', label: 'Mobile Money', hint: 'Airtel, Moov, Zamani…', icon: 'phone-portrait-outline' },
      { id: 'nita', label: 'MyNita', hint: 'Portefeuille MyNita', icon: 'wallet-outline' },
      { id: 'amana', label: 'Amana', hint: 'Portefeuille Amana', icon: 'wallet-outline' },
      { id: 'zeyna', label: 'Zeyna', hint: 'Portefeuille Zeyna', icon: 'wallet-outline' },
    ],
  },
  {
    title: 'Carte bancaire',
    items: [
      { id: 'Visa', label: 'Visa', hint: 'Paiement sécurisé 3-D Secure', icon: 'card-outline' },
      { id: 'master Card', label: 'Mastercard', hint: 'Paiement sécurisé 3-D Secure', icon: 'card-outline' },
    ],
  },
  {
    title: 'Autres options',
    items: [
      { id: 'payé à la livraison', label: 'Paiement à la livraison', hint: 'Payez en espèces à la réception', icon: 'cash-outline' },
      { id: 'paiement_assiste', label: 'Paiement assisté', hint: 'Un conseiller vous rappelle pour finaliser', icon: 'call-outline' },
    ],
  },
];

const Option = memo(function Option({ item, active, onPress }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="selection"
      scaleTo={0.985}
      style={[styles.option, active && styles.optionActive]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={item.label}
    >
      <View style={[styles.icon, active && styles.iconActive]}>
        <Ionicons name={item.icon} size={20} color={active ? colors.textInverse : colors.primaryDark} />
      </View>
      <View style={styles.flex}>
        <Text variant="title">{item.label}</Text>
        <Text variant="caption" color="textSecondary">{item.hint}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
    </PressableScale>
  );
});

/** Liste des moyens de paiement (boutons radio) */
function PaymentOptions({ value, onChange }) {
  return (
    <View>
      {PAYMENT_GROUPS.map((g) => (
        <View key={g.title} style={styles.group}>
          <Text variant="caption" color="textMuted" style={styles.groupTitle}>{g.title.toUpperCase()}</Text>
          {g.items.map((it) => (
            <Option key={it.id} item={it} active={value === it.id} onPress={() => onChange(it.id)} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 10 },
  groupTitle: { marginBottom: 8, marginLeft: 2, letterSpacing: 0.6 },
  flex: { flex: 1 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: colors.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});

export default memo(PaymentOptions);
