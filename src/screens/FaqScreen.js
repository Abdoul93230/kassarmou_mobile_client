import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Platform, ScrollView, StyleSheet, TextInput, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IconButton, PressableScale, Text } from '../ui';
import { SUPPORT } from '../config/env';
import { useSelector } from 'react-redux';
import { colors, fonts, GUTTER, radius, shadows } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ = [
  {
    q: 'Quels sont les moyens de paiement acceptés ?',
    a: 'Mobile Money (Airtel, Moov, Zamani…), les portefeuilles MyNita, Amana et Zeyna, les cartes Visa et Mastercard, le paiement à la livraison et le paiement assisté par un conseiller. Le paiement en ligne passe par la page sécurisée iPay.',
  },
  {
    q: 'Quels sont les délais de livraison ?',
    a: 'Nous proposons une livraison standard et express. Le délai dépend de votre emplacement : en général 3 à 7 jours ouvrables en standard et 1 à 3 jours ouvrables en express. Les frais sont calculés dans le panier selon votre zone.',
  },
  {
    q: 'Comment suivre ma commande ?',
    a: 'Ouvrez Profil › Mes commandes : chaque commande affiche son étape (préparation, livraison, livrée). Vous pouvez aussi contacter le support depuis la commande, la référence est jointe automatiquement.',
  },
  {
    q: 'Ma commande n’est pas payée, que faire ?',
    a: 'Dans Mes commandes, touchez « Payer maintenant » sur la commande concernée : vos articles sont remis dans le panier et vous reprenez le paiement là où vous l’aviez laissé.',
  },
  {
    q: 'Comment fonctionnent les Baobab Points ?',
    a: 'Vous gagnez des points en achetant, en pointant chaque jour, en donnant votre avis et en parrainant vos proches. À la commande, vos points se transforment en réduction. Le détail est dans Profil › Baobab Points.',
  },
  {
    q: 'Proposez-vous des remises pour les achats en gros ?',
    a: 'Oui, nous offrons des remises pour les achats en gros. Contactez-nous pour connaître nos offres spéciales pour les grossistes.',
  },
  {
    q: 'Comment vendre sur Ihambaobab ?',
    a: 'Téléchargez l’application Ihambaobab Pro sur le Play Store pour ouvrir votre boutique, gérer vos produits, vos commandes et votre caisse.',
  },
];

function Item({ item, open, onToggle }) {
  return (
    <PressableScale onPress={onToggle} scaleTo={0.99} style={[styles.item, open && styles.itemOpen]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={styles.qRow}>
        <Text variant="title" style={styles.flex}>{item.q}</Text>
        <Ionicons name={open ? 'remove-circle' : 'add-circle-outline'} size={22} color={open ? colors.primary : colors.textMuted} />
      </View>
      {open ? <Text variant="body" color="textSecondary" style={styles.answer}>{item.a}</Text> : null}
    </PressableScale>
  );
}

/** Centre d'aide : recherche dans la FAQ et contact direct */
export default function FaqScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(0);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(t)) : FAQ;
  }, [q]);

  const toggle = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => (o === i ? -1 : i));
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Centre d'aide</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher une question…" placeholderTextColor={colors.textMuted} style={styles.input} />
        </View>

        <View style={styles.listWrap}>
          {list.map((item) => {
            const i = FAQ.indexOf(item);
            return <Item key={item.q} item={item} open={open === i || !!q.trim()} onToggle={() => toggle(i)} />;
          })}
          {!list.length ? (
            <Text variant="body" color="textSecondary" align="center" style={styles.none}>Aucune réponse trouvée. Écrivez-nous, on vous aide !</Text>
          ) : null}
        </View>

        <View style={styles.contact}>
          <Text variant="h3">Besoin d'aide ?</Text>
          <Text variant="small" color="textSecondary" style={styles.mt4}>Notre équipe au Niger vous répond.</Text>
          <View style={styles.contactRow}>
            <PressableScale onPress={() => (user ? navigation.navigate('Messages') : navigation.navigate('QuickAuth', { returnScreen: 'Faq' }))} style={styles.contactBtn} scaleTo={0.96}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
              <Text variant="caption">Messages</Text>
            </PressableScale>
            <PressableScale onPress={() => Linking.openURL(`https://wa.me/${SUPPORT.whatsapp}`).catch(() => {})} style={styles.contactBtn} scaleTo={0.96}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text variant="caption">WhatsApp</Text>
            </PressableScale>
            <PressableScale onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`).catch(() => {})} style={styles.contactBtn} scaleTo={0.96}>
              <Ionicons name="call-outline" size={22} color={colors.wood} />
              <Text variant="caption">Appeler</Text>
            </PressableScale>
            <PressableScale onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`).catch(() => {})} style={styles.contactBtn} scaleTo={0.96}>
              <Ionicons name="mail-outline" size={22} color={colors.sand} />
              <Text variant="caption">Email</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, marginHorizontal: GUTTER, marginTop: 4, paddingHorizontal: 14,
    borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  listWrap: { marginHorizontal: GUTTER, marginTop: 16, gap: 10 },
  item: { padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  itemOpen: { borderWidth: 1.5, borderColor: colors.primarySoft },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  answer: { marginTop: 10 },
  none: { marginVertical: 24 },
  contact: { marginHorizontal: GUTTER, marginTop: 24, padding: 18, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  contactRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  contactBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.bg },
});
