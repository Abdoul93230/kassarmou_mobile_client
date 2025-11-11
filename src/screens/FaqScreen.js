import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { COLORS } from '../config/constants';

const FAQ_DATA = [
  {
    question: '1. Quels sont les modes de paiement acceptés sur votre site ?',
    answer:
      "Nous acceptons les paiements par carte de crédit/débit (Visa, MasterCard), Mobile Money (Airtel, Orange, Moov).",
  },
  {
    question: '2. Quelle est la politique de livraison et combien de temps cela prendra-t-il ?',
    answer:
      "Nous proposons une livraison standard et express. Le délai de livraison dépend de votre emplacement, mais en général, cela prend entre 3 à 7 jours ouvrables pour la livraison standard et 1 à 3 jours ouvrables pour la livraison express.",
  },
  {
    question: '3. Puis-je suivre ma commande en ligne ?',
    answer:
      "Oui, une fois que votre commande a été expédiée, vous recevrez un numéro de suivi par e-mail, qui vous permettra de suivre l'état de votre commande en ligne.",
  },
  {
    question: '4. Proposez-vous des remises pour les achats en gros ?',
    answer:
      "Oui, nous offrons des remises pour les achats en gros. Veuillez nous contacter pour plus de détails sur nos offres spéciales pour les grossistes.",
  },
];

export default function FaqScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    // avoid SafeArea top inset here because we draw our own statusBarBackground
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      {/* ensure top safe-area has green background on iOS */}
      <View style={styles.statusBarBackground} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Questions fréquentes</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>Questions fréquemment posées :</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {FAQ_DATA.map((item, idx) => (
          <View key={idx} style={[styles.card, idx % 2 === 0 ? styles.cardLeftAccent : styles.cardRightAccent]}>
            <TouchableOpacity onPress={() => toggle(idx)} style={styles.row} activeOpacity={0.8}>
              <Text style={styles.question}>{item.question}</Text>
              <Ionicons name={openIndex === idx ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {openIndex === idx && (
              <View style={styles.answerContainer}>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Nos informations</Text>
          <Text style={styles.contactText}>Email: support@kassarmoumarket.com</Text>
          <Text style={styles.contactText}>WhatsApp: +32465965436</Text>
          <Text style={styles.contactText}>Adresse: 3053 Haasrode, Belgique</Text>

          <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('mailto:support@kassarmoumarket.com')}>
            <Text style={styles.contactButtonText}>Contacter le support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: '#30A08B',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: '#30A08B',
    zIndex: 1000,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  pageTitleContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#30A08B', marginBottom: 6 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCEDE0',
    // subtle shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardLeftAccent: { borderLeftWidth: 6, borderLeftColor: '#30A08B' },
  cardRightAccent: { borderLeftWidth: 6, borderLeftColor: '#30A08B' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  question: { fontSize: 15, fontWeight: '700', color: '#30A08B' },
  answerContainer: { marginTop: 12, paddingLeft: 6, borderLeftWidth: 2, borderLeftColor: COLORS.border },
  answer: { color: COLORS.textLight, lineHeight: 20 },
  contactCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginTop: 8 },
  contactTitle: { fontSize: 16, fontWeight: '700', color: '#30A08B', marginBottom: 8 },
  contactText: { color: COLORS.textLight, marginBottom: 6 },
  contactButton: { marginTop: 8, backgroundColor: '#30A08B', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  contactButtonText: { color: COLORS.white, fontWeight: '700' },
});
