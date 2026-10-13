import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fetchTracking, shareTracking, trackingUrl } from '../services/guestSession';
import { EmptyState, IconButton, Skeleton, SmartImage, Text } from '../ui';
import { formatPrice } from '../utils/formatPrice';
import { colors, GUTTER, radius, shadows } from '../theme';

const STEPS = [
  { label: 'Commande passée', icon: 'receipt-outline' },
  { label: 'En préparation', icon: 'cube-outline' },
  { label: 'En livraison', icon: 'car-outline' },
  { label: 'Livrée', icon: 'checkmark-done' },
];

const PAY_WAITING = ['en_attente', 'en attente', 'en cours', 'pending'];
const PAY_FAILED = ['échec', 'echec', 'failed'];

/**
 * Étape réelle de la commande. statusLivraison vaut « en cours » dès la création :
 * on ne s'y fie pas, seul etatTraitement (mis à jour par l'équipe) fait avancer la livraison,
 * et une commande en ligne non payée reste à « Commande passée ».
 */
function stageOf(o) {
  const etat = String(o?.etatTraitement || '').toLowerCase();
  const livr = String(o?.statusLivraison || '').toLowerCase();
  const pay = String(o?.statusPayment || '').toLowerCase();
  if (etat.includes('annul') || livr.includes('annul')) return { cancelled: true, step: 0 };
  if (['livraison reçu', 'livré', 'livrée', 'traité'].includes(etat) || ['livré', 'livrée'].includes(livr)) return { cancelled: false, step: 3 };
  if (['reçu par le livreur', 'en cours de livraison'].includes(etat)) return { cancelled: false, step: 2 };
  if (PAY_FAILED.includes(pay)) return { cancelled: false, step: 0, payment: 'failed' };
  if (PAY_WAITING.includes(pay)) return { cancelled: false, step: 0, payment: 'waiting' };
  return { cancelled: false, step: 1 };
}

const F = (n) => `${formatPrice(n || 0)} F`;

/** Suivi public d'une commande (lien partageable, sans connexion) */
export default function TrackingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { reference, k } = route.params || {};
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchTracking(reference, k));
      setError(null);
    } catch (e) {
      setError(e.response?.status === 404 ? 'Lien de suivi invalide ou expiré.' : 'Suivi indisponible. Réessayez.');
    }
  }, [reference, k]);

  useEffect(() => { load(); }, [load]);

  const st = stageOf(order);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={styles.flex}>
          <Text variant="h2">Suivi de commande</Text>
          {reference ? <Text variant="caption" color="textMuted">n° {reference}</Text> : null}
        </View>
        {order ? <IconButton name="share-social-outline" onPress={() => shareTracking(trackingUrl(reference, k))} bg={colors.surfaceAlt} accessibilityLabel="Partager le suivi" /> : null}
      </View>

      {error ? (
        <EmptyState icon="alert-circle-outline" title={error} actionLabel="Retrouver mes commandes" onAction={() => navigation.navigate('FindOrders')} />
      ) : !order ? (
        <View style={styles.pad}><Skeleton height={180} radius={radius.lg} /><Skeleton height={140} radius={radius.lg} style={styles.mt12} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <View style={styles.card}>
            {st.cancelled ? (
              <View style={styles.cancelled}>
                <Ionicons name="close-circle" size={20} color={colors.danger} />
                <Text variant="bodyMedium" color="danger">Cette commande a été annulée</Text>
              </View>
            ) : STEPS.map((s, i) => {
              const done = i <= st.step;
              return (
                <View key={s.label} style={styles.step}>
                  <View style={styles.rail}>
                    <View style={[styles.dot, done && styles.dotDone]}>
                      <Ionicons name={s.icon} size={14} color={done ? colors.textInverse : colors.textMuted} />
                    </View>
                    {i < STEPS.length - 1 ? <View style={[styles.line, i < st.step && styles.lineDone]} /> : null}
                  </View>
                  <Text variant={i === st.step ? 'title' : 'body'} color={done ? 'text' : 'textMuted'} style={styles.stepText}>{s.label}</Text>
                </View>
              );
            })}
            {!st.cancelled && st.payment ? (
              <View style={[styles.payNote, st.payment === 'failed' && styles.payNoteFailed]}>
                <Ionicons name={st.payment === 'failed' ? 'alert-circle' : 'time-outline'} size={18} color={st.payment === 'failed' ? colors.danger : colors.wood} />
                <Text variant="small" color={st.payment === 'failed' ? 'danger' : 'text'} style={styles.flex}>
                  {st.payment === 'failed'
                    ? "Paiement non abouti : la commande n'est pas encore validée et ne sera pas préparée. Repassez-la ou contactez-nous."
                    : 'Paiement en attente : la préparation commence dès sa confirmation.'}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text variant="h3" style={styles.mb8}>Livraison</Text>
            {order.livraison?.customerName ? <Text variant="body">Pour {order.livraison.customerName}</Text> : null}
            {order.livraison?.zone ? <Text variant="body" color="textSecondary">{[order.livraison.zone, order.livraison.region].filter(Boolean).join(', ')}</Text> : null}
            {order.livraison?.phoneMasked ? <Text variant="small" color="textMuted">{order.livraison.phoneMasked}</Text> : null}
            {(order.shippingByStore || []).filter((s) => s.delay).map((s, i) => (
              <Text key={i} variant="caption" color="textSecondary" style={styles.mt4}>{s.storeName} · {s.delay}</Text>
            ))}
          </View>

          <View style={styles.card}>
            <Text variant="h3" style={styles.mb8}>Articles ({order.items?.length || 0})</Text>
            {(order.items || []).map((it, i) => (
              <View key={i} style={styles.item}>
                <SmartImage uri={it.image} width={52} style={styles.thumb} />
                <View style={styles.flex}>
                  <Text variant="smallMedium" numberOfLines={2}>{it.name}</Text>
                  <Text variant="caption" color="textMuted">Qté {it.quantite}{it.color ? ` · ${it.color}` : ''}{it.taille ? ` · ${it.taille}` : ''}</Text>
                </View>
                <Text variant="title">{F((it.prix || 0) * (it.quantite || 1))}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.row}><Text variant="body" color="textSecondary">Livraison</Text><Text variant="bodyMedium">{order.fraisLivraison > 0 ? F(order.fraisLivraison) : 'Offerte'}</Text></View>
            <View style={styles.row}><Text variant="h3">Total</Text><Text variant="price">{F(order.prix)}</Text></View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pad: { padding: GUTTER },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mb8: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  card: { marginHorizontal: GUTTER, marginTop: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.primary },
  line: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.primary },
  stepText: { paddingTop: 4, paddingBottom: 14 },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  payNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4, padding: 12, borderRadius: radius.md, backgroundColor: colors.woodSoft },
  payNoteFailed: { backgroundColor: colors.dangerSoft },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
});
