import React from 'react';
import { Linking, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrderQuery } from '../redux/catalogApi';
import useReorder from '../hooks/useReorder';
import StageBadge from '../components/orders/StageBadge';
import { Button, EmptyState, IconButton, PressableScale, Skeleton, SmartImage, Text } from '../ui';
import { SUPPORT } from '../config/env';
import { formatPrice } from '../utils/formatPrice';
import { formatPhoneInternational } from '../utils/phoneRules';
import { formatDate, orderDate, orderPreview, orderStage } from '../utils/orders';
import { colors, GUTTER, radius, shadows } from '../theme';

const F = (n) => `${formatPrice(n || 0)} FCFA`;
const STEPS = [
  { label: 'Commande passée', icon: 'receipt-outline' },
  { label: 'En préparation', icon: 'cube-outline' },
  { label: 'En livraison', icon: 'car-outline' },
  { label: 'Livrée', icon: 'checkmark-done' },
];

function Timeline({ stage }) {
  if (stage.key === 'cancelled') {
    return (
      <View style={styles.cancelled}>
        <Ionicons name="close-circle" size={20} color={colors.danger} />
        <Text variant="bodyMedium" color="danger">Cette commande a été annulée</Text>
      </View>
    );
  }
  const current = stage.key === 'unpaid' ? 0 : stage.step;
  return (
    <View>
      {STEPS.map((s, i) => {
        const done = i <= current;
        const last = i === STEPS.length - 1;
        return (
          <View key={s.label} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, done && styles.stepDotDone]}>
                <Ionicons name={s.icon} size={14} color={done ? colors.textInverse : colors.textMuted} />
              </View>
              {!last ? <View style={[styles.stepLine, i < current && styles.stepLineDone]} /> : null}
            </View>
            <View style={styles.stepText}>
              <Text variant={i === current ? 'title' : 'body'} color={done ? 'text' : 'textMuted'}>{s.label}</Text>
              {i === current && stage.key === 'unpaid' ? <Text variant="caption" color="wood">Paiement en attente</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Line({ label, value, tone, bold }) {
  return (
    <View style={styles.line}>
      <Text variant={bold ? 'h3' : 'body'} color={bold ? 'text' : 'textSecondary'}>{label}</Text>
      <Text variant={bold ? 'price' : 'bodyMedium'} color={tone || 'text'}>{value}</Text>
    </View>
  );
}

/** Suivi détaillé d'une commande */
export default function OrderDetailScreen({ route, navigation }) {
  const { orderId, order: initial } = route.params || {};
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, isError, refetch } = useOrderQuery(orderId, { skip: !orderId });
  const order = data || initial;
  const reorder = useReorder(navigation);

  if (!order) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        </View>
        {isLoading ? (
          <View style={styles.pad}><Skeleton height={220} radius={radius.lg} /><Skeleton height={140} radius={radius.lg} style={styles.mt12} /></View>
        ) : (
          <EmptyState icon="alert-circle-outline" title="Commande introuvable" message={isError ? 'Vérifiez votre connexion puis réessayez.' : undefined} actionLabel="Réessayer" onAction={refetch} />
        )}
      </View>
    );
  }

  const stage = orderStage(order);
  const items = orderPreview(order);
  const d = order.livraisonDetails || {};
  const ref = String(order.reference || order._id);

  const contactSupport = () => {
    const text = encodeURIComponent(`Bonjour, j'ai une question sur ma commande n° ${ref}.`);
    Linking.openURL(`https://wa.me/${SUPPORT.whatsapp}?text=${text}`).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={styles.flex}>
          <Text variant="h2">Commande n° {ref.slice(-8)}</Text>
          <Text variant="caption" color="textMuted">Passée le {formatDate(orderDate(order))}</Text>
        </View>
        <IconButton name="share-outline" onPress={() => Share.share({ message: `Ma commande Ihambaobab n° ${ref}` }).catch(() => {})} bg={colors.surfaceAlt} accessibilityLabel="Partager la référence" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text variant="h3">Suivi</Text>
            <StageBadge stage={stage} />
          </View>
          <Timeline stage={stage} />
        </View>

        <View style={styles.card}>
          <Text variant="h3" style={styles.mb10}>Livraison</Text>
          <View style={styles.addr}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <View style={styles.flex}>
              <Text variant="title">{d.customerName || '—'}</Text>
              {d.numero ? <Text variant="body" color="textSecondary">{formatPhoneInternational(d.numero)}</Text> : null}
              <Text variant="body" color="textSecondary">{[d.quartier, d.region].filter(Boolean).join(', ')}</Text>
              {d.description ? <Text variant="small" color="textMuted" style={styles.mt4}>{d.description}</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text variant="h3" style={styles.mb10}>Articles ({items.length})</Text>
          {items.map((p, i) => {
            const qty = Number(p.quantite || p.quantity) || 1;
            const variant = [p.color || p.colors?.[0], p.taille || p.sizes?.[0]].filter(Boolean).join(' · ');
            return (
              <PressableScale
                key={`${p._id || i}-${i}`}
                onPress={() => p._id && navigation.navigate('ProductDetail', { productId: p._id })}
                style={styles.item}
                scaleTo={0.99}
              >
                <SmartImage uri={p.colorImage || p.imageUrl || p.image1 || p.image} width={60} style={styles.itemImg} />
                <View style={styles.flex}>
                  <Text variant="smallMedium" numberOfLines={2}>{p.name}</Text>
                  {variant ? <Text variant="caption" color="textMuted">{variant}</Text> : null}
                  <Text variant="caption" color="textSecondary" style={styles.mt4}>Qté {qty}</Text>
                </View>
                <Text variant="title">{formatPrice((Number(p.prix || p.price) || 0) * qty)} F</Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text variant="h3" style={styles.mb10}>Paiement</Text>
          <Line label="Sous-total" value={F(order.prixTotal ?? order.fraisSousTotalArticles)} />
          {Number(order.reduction) > 0 ? <Line label={`Code ${order.codePromo || 'promo'}`} value={`-${F(order.reduction)}`} tone="success" /> : null}
          {Number(order.pointsDiscount) > 0 ? <Line label="Baobab Points" value={`-${F(order.pointsDiscount)}`} tone="success" /> : null}
          <Line label="Livraison" value={Number(order.fraisLivraison) > 0 ? F(order.fraisLivraison) : 'Offerte'} />
          <View style={styles.divider} />
          <Line label="Total" value={F(order.prix)} bold />
          <Text variant="caption" color="textMuted" style={styles.mt8}>Statut du paiement : {order.statusPayment || '—'}</Text>
        </View>

        <PressableScale onPress={contactSupport} style={styles.help} scaleTo={0.99}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <View style={styles.flex}>
            <Text variant="title">Un souci avec cette commande ?</Text>
            <Text variant="caption" color="textSecondary">Écrivez au support, la référence est jointe</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </PressableScale>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {stage.key === 'unpaid' ? (
          <Button title={`Payer ${formatPrice(order.prix)} FCFA`} icon="lock-closed" size="lg" full onPress={() => reorder(order, 'pay')} />
        ) : (
          <Button title="Commander à nouveau" icon="refresh" variant="secondary" size="lg" full onPress={() => reorder(order, 'again')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pad: { padding: GUTTER },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mb10: { marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  card: { marginHorizontal: GUTTER, marginTop: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },

  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 28 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: colors.primary },
  stepLine: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: colors.primary },
  stepText: { paddingTop: 4, paddingBottom: 14, flex: 1 },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft },

  addr: { flexDirection: 'row', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  itemImg: { width: 60, height: 60, borderRadius: radius.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },
  help: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 12, padding: 14,
    borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 12,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },
});
