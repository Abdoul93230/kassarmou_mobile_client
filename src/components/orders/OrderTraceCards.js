import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../ui';
import { formatPrice } from '../../utils/formatPrice';
import { radius, useTheme, themedStyles } from '../../theme';

/** « votre code BAOBAB10 et vos 120 Baobab Points » */
const reservedLabel = (b) => [
  b?.promoCode ? `votre code ${b.promoCode}` : b?.promoDiscount > 0 ? 'votre code promo' : null,
  b?.points > 0 ? `vos ${b.points} Baobab Points` : null,
].filter(Boolean).join(' et ');

const restoredSentence = (b) => {
  const r = reservedLabel(b);
  if (!r) return '';
  const plural = b.points > 0;
  return ` ${r.charAt(0).toUpperCase()}${r.slice(1)} vous ${plural ? 'ont' : 'a'} été rendu${plural ? 's' : ''}.`;
};

function useCountdown(deadline) {
  const [left, setLeft] = useState(() => (deadline ? new Date(deadline).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setLeft(new Date(deadline).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return Math.max(0, left);
}

/** Bandeaux en tête de commande : paiement réservé (délai) ou annulation expliquée, puis code de livraison */
export function OrderTraceBanners({ trace }) {
  const { colors } = useTheme();
  const left = useCountdown(trace?.payment?.awaiting ? trace.payment.deadline : null);
  if (!trace) return null;
  const { breakdown: b, payment, cancel, deliveryCode } = trace;
  const reserved = reservedLabel(b);
  const expired = cancel?.reason === 'paiement_non_abouti';
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  return (
    <>
      {payment?.awaiting ? (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft || '#FFF7E6', borderColor: colors.warning || '#F5A524' }]}>
          <Ionicons name="time-outline" size={22} color={colors.warning || '#B7791F'} />
          <View style={styles.flex}>
            <Text variant="title">Paiement en attente</Text>
            <Text variant="small" color="textSecondary" style={styles.mt2}>
              {reserved ? `Vos articles, ${reserved} sont réservés ` : 'Vos articles sont réservés '}
              {left > 0 ? `encore ${mm}:${ss}.` : 'quelques instants.'}
            </Text>
            <Text variant="caption" color="textMuted" style={styles.mt4}>
              Sans paiement, la commande s'annule seule et tout vous est rendu. Rien n'est débité tant que vous n'avez pas validé.
            </Text>
          </View>
        </View>
      ) : null}

      {cancel ? (
        <View style={[styles.banner, { backgroundColor: expired ? colors.successSoft || '#E8F7EF' : colors.surface, borderColor: expired ? colors.success : colors.border }]}>
          <Ionicons name={expired ? 'arrow-undo-outline' : 'close-circle-outline'} size={22} color={expired ? colors.success : colors.danger} />
          <View style={styles.flex}>
            <Text variant="title">{expired ? 'Annulée : paiement non reçu' : `Annulée : ${cancel.label}`}</Text>
            <Text variant="small" color="textSecondary" style={styles.mt2}>
              {expired ? "Aucun montant n'a été débité." : `Annulée par ${cancel.by}${cancel.note ? ` — ${cancel.note}` : ''}.`}
              {restoredSentence(b)}
            </Text>
          </View>
        </View>
      ) : null}

      {deliveryCode ? (
        <View style={[styles.banner, styles.code, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="key-outline" size={22} color={colors.primaryDark || colors.primary} />
          <View style={styles.flex}>
            <Text variant="title">Code de livraison</Text>
            <Text variant="caption" color="textSecondary">Donnez-le au livreur seulement quand vous avez le colis en main.</Text>
          </View>
          <Text variant="h1" color="primaryDark" style={styles.codeText} selectable>{deliveryCode}</Text>
        </View>
      ) : null}
    </>
  );
}

const when = (d) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Étapes détaillées (journal), avec la date et l'heure de chaque étape */
export function OrderJournal({ trace }) {
  const { colors } = useTheme();
  const rows = trace?.history || [];
  if (!rows.length) return null;
  return (
    <View style={styles.journal}>
      {rows.map((e, i) => {
        const bad = e.type === 'cancelled' || e.type === 'payment_failed';
        const dot = bad ? colors.danger : e.type === 'expired' ? colors.warning || '#F5A524' : colors.primary;
        return (
          <View key={`${e.at}-${i}`} style={styles.jRow}>
            <View style={styles.jRail}>
              <View style={[styles.jDot, { backgroundColor: dot }]} />
              {i < rows.length - 1 ? <View style={[styles.jLine, { backgroundColor: colors.border }]} /> : null}
            </View>
            <View style={[styles.flex, styles.jBody]}>
              <Text variant="smallMedium">{e.label}</Text>
              <Text variant="caption" color="textMuted">{when(e.at)}{e.note ? ` · ${e.note}` : ''}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Libellé humain du paiement */
export const paymentText = (order, trace) => {
  if (trace?.payment?.paid || order?.statusPayment === 'payé') return 'Payé en ligne ✓';
  if (order?.statusPayment === 'payé à la livraison') return 'À payer à la livraison';
  if (order?.statusPayment === 'payé par téléphone') return 'Paiement assisté par téléphone';
  if (trace?.cancel) return 'Non payé';
  if (order?.statusPayment === 'échec') return 'Paiement non abouti';
  return 'En attente de paiement';
};

export const formatPoints = (n) => `${formatPrice(n)} Baobab Points`;

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1, marginHorizontal: 16, marginTop: 12 },
  code: { alignItems: 'center' },
  codeText: { letterSpacing: 6, fontVariant: ['tabular-nums'] },
  journal: { marginTop: 14 },
  jRow: { flexDirection: 'row', gap: 10 },
  jRail: { width: 14, alignItems: 'center' },
  jDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  jLine: { width: 2, flex: 1, marginVertical: 2 },
  jBody: { paddingBottom: 12 },
}));
