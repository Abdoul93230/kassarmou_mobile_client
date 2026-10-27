import React, { memo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, PressableScale, Text } from '../../ui';
import { colors, radius, useTheme, themedStyles } from '../../theme';

const BENEFITS = [
  ['time-outline', 'Toutes vos commandes et leur suivi au même endroit'],
  ['gift-outline', 'Baobab Points sur chaque achat et codes promo'],
  ['location-outline', 'Adresse enregistrée : commande en 2 touches la prochaine fois'],
  ['flash-outline', 'Offres réservées aux membres'],
];

/** « Comment voulez-vous commander ? » — compte mis en avant, sans compte à une touche */
function CheckoutChoiceSheet({ visible, onClose, onGuest, onAccount }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text variant="h2">Comment voulez-vous commander ?</Text>

        <View style={[styles.account, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
          <View style={styles.row}>
            <Ionicons name="person-circle" size={20} color={colors.primary} />
            <Text variant="title" style={styles.flex}>Avec un compte</Text>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}><Text variant="caption" color="textInverse">Recommandé</Text></View>
          </View>
          {BENEFITS.map(([icon, text]) => (
            <View key={text} style={styles.benefit}>
              <Ionicons name={icon} size={15} color={colors.primary} />
              <Text variant="small" color="textSecondary" style={styles.flex}>{text}</Text>
            </View>
          ))}
          <Button title="Se connecter ou créer un compte" size="md" full onPress={onAccount} style={styles.mt10} />
        </View>

        <PressableScale onPress={onGuest} scaleTo={0.98} style={[styles.guest, { borderColor: colors.border }]}>
          <View style={[styles.guestIcon, { backgroundColor: colors.surfaceAlt }]}><Ionicons name="bag-handle-outline" size={18} color={colors.textSecondary} /></View>
          <View style={styles.flex}>
            <Text variant="title">Continuer sans compte</Text>
            <Text variant="caption" color="textSecondary">Juste votre nom et votre numéro. Suivi par lien.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </PressableScale>
        <Text variant="caption" color="textMuted" align="center" style={styles.mt10}>Vous pourrez créer votre compte après la commande et garder vos points.</Text>
      </View>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  account: { marginTop: 14, padding: 14, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 5 },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  guestIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  mt10: { marginTop: 10 },
}));

export default memo(CheckoutChoiceSheet);
