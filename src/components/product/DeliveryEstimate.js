import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import ZonePickerSheet from '../cart/ZonePickerSheet';
import useSellerOrigin from '../../hooks/useSellerOrigin';
import { onZoneChange, quoteCart, rememberZone, resolveDeliveryZone, zoneLabel } from '../../services/shippingV3';
import { selectPanierArticles } from '../../redux/cartSlice';
import { storeIdOf } from '../../utils/cart';
import { PressableScale, Text } from '../../ui';
import { formatPrice } from '../../utils/formatPrice';
import { radius, useTheme, themedStyles } from '../../theme';

const F = (n) => `${formatPrice(n || 0)} F`;

/**
 * Ligne « Livraison » de la fiche produit, cohérente avec le panier :
 * - même quartier que le panier (dernier choisi, sinon adresse du compte) ;
 * - même calcul : un colis par boutique. Si le panier contient déjà des articles de cette boutique,
 *   on annonce ce que l'ajout change vraiment (« inclus dans votre colis » ou « +X F »).
 */
function DeliveryEstimate({ productId, sellerId, quantity = 1, style }) {
  const { colors } = useTheme();
  const origin = useSellerOrigin(sellerId);
  const user = useSelector((s) => s.auth.user);
  const cart = useSelector(selectPanierArticles);
  const userId = user?.id || user?._id;
  const [zone, setZone] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [result, setResult] = useState(null); // { parcel, before }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    resolveDeliveryZone(userId).then((z) => alive && z && setZone(z));
    const off = onZoneChange((z) => alive && setZone(z)); // changé depuis le panier ou une autre fiche
    return () => { alive = false; off(); };
  }, [userId]);

  // Articles de cette boutique déjà dans le panier (le panier les livrera dans le même colis)
  const sameStore = useMemo(
    () => (cart || []).filter((a) => a._id && sellerId && String(storeIdOf(a)) === String(sellerId) && Number(a.quantite) > 0),
    [cart, sellerId],
  );
  const cartKey = sameStore.map((a) => `${a._id}:${a.quantite}`).sort().join('|');

  useEffect(() => {
    if (!zone?._id || !productId) { setResult(null); return undefined; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const before = sameStore.map((a) => ({ productId: String(a._id), quantity: Number(a.quantite) }));
        // Après l'ajout : la quantité s'ajoute à celle déjà au panier pour ce produit
        const after = [...before];
        const i = after.findIndex((x) => x.productId === String(productId));
        if (i >= 0) after[i] = { ...after[i], quantity: after[i].quantity + Math.max(1, quantity) };
        else after.push({ productId: String(productId), quantity: Math.max(1, quantity) });
        const [qAfter, qBefore] = await Promise.all([
          quoteCart(zone._id, after),
          before.length ? quoteCart(zone._id, before) : Promise.resolve(null),
        ]);
        if (alive) setResult({ parcel: qAfter?.parcels?.[0] || null, before: qBefore?.parcels?.[0] || null });
      } catch {
        if (alive) setResult({ error: true });
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?._id, productId, quantity, cartKey]);

  const choose = (z) => rememberZone(z); // met aussi à jour le panier
  const place = zone ? zoneLabel(zone).title : null;
  const p = result?.parcel;
  const inCart = sameStore.length > 0 && result?.before?.deliverable;

  // Montant annoncé : frais du colis, ou ce que l'ajout change quand la boutique est déjà au panier
  let price = null;
  if (p?.deliverable) {
    if (p.free) price = { text: 'offerte', tone: 'success' };
    else if (inCart) {
      const extra = (p.fee || 0) - (result.before.free ? 0 : result.before.fee || 0);
      price = extra > 0 ? { text: `+${F(extra)}`, tone: 'text', note: 'sur votre colis de cette boutique' } : { text: 'déjà incluse', tone: 'success', note: 'dans votre colis de cette boutique' };
    } else price = { text: F(p.fee), tone: 'text' };
  }

  let line;
  if (!zone) {
    line = (
      <Text variant="small" color="textSecondary" numberOfLines={2} style={styles.flex}>
        {origin?.city ? `Expédié depuis ${origin.city} · ` : ''}
        <Text variant="smallMedium" color="primary">Voir les frais pour mon quartier</Text>
      </Text>
    );
  } else if (loading && !result) {
    line = <ActivityIndicator size="small" color={colors.primary} style={styles.flex} />;
  } else if (result?.error) {
    line = <Text variant="small" color="textSecondary" style={styles.flex}>Livraison vers {place} : frais calculés au panier</Text>;
  } else if (p && !p.deliverable) {
    line = (
      <Text variant="small" color={p.quoteRequired ? 'wood' : 'danger'} style={styles.flex}>
        {p.message || `Livraison indisponible vers ${place}.`}
      </Text>
    );
  } else if (p) {
    line = (
      <View style={styles.flex}>
        <Text variant="small" numberOfLines={2}>
          Livraison à {place} : <Text variant="smallMedium" color={price?.tone}>{price?.text}</Text>
          {p.delay?.label ? <Text variant="small" color="textSecondary"> · {p.delay.label}</Text> : null}
        </Text>
        {price?.note ? <Text variant="caption" color="textMuted">{price.note}</Text> : null}
        {p.delay?.sameDay && p.delay?.cutoff ? <Text variant="caption" color="textMuted">Commandez avant {p.delay.cutoff} pour le jour même</Text> : null}
        {p.freeHint ? <Text variant="caption" color="success">Plus que {F(p.freeHint.remaining)} dans cette boutique pour la livraison offerte</Text> : null}
      </View>
    );
  } else {
    line = <View style={styles.flex} />;
  }

  return (
    <>
      <PressableScale
        onPress={() => setSheet(true)}
        scaleTo={0.985}
        style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }, style]}
        accessibilityLabel={zone ? `Livraison à ${place}, changer de quartier` : 'Voir les frais de livraison pour mon quartier'}
      >
        <Ionicons name="car-outline" size={20} color={colors.primary} />
        {line}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </PressableScale>
      <ZonePickerSheet visible={sheet} onClose={() => setSheet(false)} selected={zone} onSelect={choose} />
    </>
  );
}

const styles = themedStyles((colors) => ({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  flex: { flex: 1 },
}));

export default memo(DeliveryEstimate);
