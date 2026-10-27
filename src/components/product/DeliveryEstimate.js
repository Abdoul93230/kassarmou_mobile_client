import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../config/api';
import ZonePickerSheet from '../cart/ZonePickerSheet';
import useSellerOrigin from '../../hooks/useSellerOrigin';
import { getRememberedZone, rememberZone, zoneLabel } from '../../services/shippingV3';
import { PressableScale, Text } from '../../ui';
import { formatPrice } from '../../utils/formatPrice';
import { colors, radius, useTheme, themedStyles } from '../../theme';

const F = (n) => `${formatPrice(n || 0)} F`;

/**
 * Bloc « Livraison » de la fiche produit : d'où part le colis, vers quelle zone,
 * frais et délai réels pour la quantité choisie (même calcul que le panier et la commande).
 */
function DeliveryEstimate({ productId, sellerId, quantity = 1, style }) {
  const { colors } = useTheme();
  const origin = useSellerOrigin(sellerId);
  const [zone, setZone] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getRememberedZone().then((z) => alive && z && setZone(z));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!zone?._id || !productId) {
      setEstimate(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setFailed(false);
    const t = setTimeout(async () => {
      try {
        const r = await apiClient.get('/api/shipping-v3/estimate', {
          params: { productId, destinationZoneId: zone._id, quantity: Math.max(1, quantity) },
          timeout: 10000,
        });
        if (alive) setEstimate(r.data?.data || null);
      } catch {
        if (alive) { setEstimate(null); setFailed(true); }
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [zone?._id, productId, quantity]);

  const choose = (z) => { setZone(z); rememberZone(z); };
  const label = zone ? zoneLabel(zone) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Ionicons name="car-outline" size={20} color={colors.primary} /></View>
        <View style={styles.flex}>
          <Text variant="title">Livraison</Text>
          {origin ? (
            <View style={styles.originRow}>
              <Text variant="small" color="textSecondary">Expédié depuis </Text>
              <Ionicons name="location" size={12} color={colors.wood} />
              <Text variant="smallMedium" color="wood">{origin.city}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <PressableScale onPress={() => setSheet(true)} scaleTo={0.985} style={[styles.zone, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={16} color={zone ? colors.primary : colors.textMuted} />
        <View style={styles.flex}>
          <Text variant={zone ? 'smallMedium' : 'small'} color={zone ? 'text' : 'textSecondary'} numberOfLines={1}>
            {zone ? `Vers ${label.title}` : 'Choisir mon quartier ou ma ville'}
          </Text>
          {label?.subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1}>{label.subtitle}</Text> : null}
        </View>
        <Text variant="smallMedium" color="primary">{zone ? 'Modifier' : 'Choisir'}</Text>
      </PressableScale>

      {!zone ? (
        <Text variant="caption" color="textMuted" style={styles.mt8}>Choisissez votre zone pour voir les frais et le délai exacts.</Text>
      ) : loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.mt8} />
      ) : failed ? (
        <Text variant="caption" color="textMuted" style={styles.mt8}>Frais calculés au panier.</Text>
      ) : estimate ? (
        estimate.deliverable ? (
          <View style={styles.mt8}>
            <View style={styles.row}>
              <View style={styles.delay}>
                <Ionicons name="time-outline" size={15} color={colors.primary} />
                <Text variant="bodyMedium">{estimate.delay?.label || '—'}</Text>
              </View>
              {/* {estimate.free ? (
                <View style={styles.delay}>
                  <Text variant="caption" color="textMuted" style={styles.strike}>{F(estimate.free.amount)}</Text>
                  <Text variant="title" color="success">Offerte</Text>
                </View>
              ) : (
                <Text variant="title">{F(estimate.fee)}</Text>
              )} */}
            </View>
            {estimate.delay?.sameDay && estimate.delay?.cutoff ? (
              <Text variant="caption" color="textMuted" style={styles.mt4}>Commandez avant {estimate.delay.cutoff} pour une livraison le jour même.</Text>
            ) : null}
            {estimate.freeHint ? (
              <View style={[styles.hint, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="gift-outline" size={14} color={colors.success} />
                <Text variant="caption" color="success" style={styles.flex}>Plus que {F(estimate.freeHint.remaining)} dans cette boutique pour la livraison offerte</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.hint, { backgroundColor: estimate.quoteRequired ? colors.woodSoft : colors.dangerSoft }]}>
            <Ionicons name="alert-circle-outline" size={14} color={estimate.quoteRequired ? colors.wood : colors.danger} />
            <Text variant="caption" color={estimate.quoteRequired ? 'wood' : 'danger'} style={styles.flex}>
              {estimate.message || 'Livraison indisponible pour cette zone.'}
            </Text>
          </View>
        )
      ) : null}

      <ZonePickerSheet visible={sheet} onClose={() => setSheet(false)} selected={zone} onSelect={choose} />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  zone: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  delay: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strike: { textDecorationLine: 'line-through' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, padding: 8, borderRadius: radius.sm, backgroundColor: colors.successSoft },
  hintQuote: { backgroundColor: colors.woodSoft },
  hintOff: { backgroundColor: colors.dangerSoft },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 10 },
}));

export default memo(DeliveryEstimate);
