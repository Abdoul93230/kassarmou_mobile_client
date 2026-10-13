import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import {
  addArticleToPanier,
  clearPanierData,
  deleteArticlePanier,
  selectPanierArticles,
  updateArticleQuantity,
} from '../redux/cartSlice';
import { useProductsQuery } from '../redux/catalogApi';
import useCartCheckout from '../hooks/useCartCheckout';
import { Button, EmptyState, IconButton, PressableScale, Text } from '../ui';
import CartLine from '../components/cart/CartLine';
import ZonePickerSheet from '../components/cart/ZonePickerSheet';
import { zoneLabel } from '../services/shippingV3';
import ProductRail from '../components/home/ProductRail';
import { formatPrice } from '../utils/formatPrice';
import { colors, fonts, GUTTER, radius, shadows } from '../theme';

const F = (n) => `${formatPrice(n)} FCFA`;

function SummaryRow({ label, value, tone, bold }) {
  return (
    <View style={styles.sumRow}>
      <Text variant={bold ? 'h3' : 'body'} color={bold ? 'text' : 'textSecondary'}>{label}</Text>
      <Text variant={bold ? 'price' : 'bodyMedium'} color={tone || 'text'}>{value}</Text>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const articles = useSelector(selectPanierArticles) || [];
  const user = useSelector((s) => s.auth.user);
  const isStack = navigation.getState()?.type === 'stack';
  // Dans l'onglet, la barre d'onglets gère déjà la zone sûre du bas
  const bottomInset = isStack ? insets.bottom : 0;

  const cart = useCartCheckout(articles, user);
  const [zoneSheet, setZoneSheet] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoError, setPromoError] = useState(null);

  const suggestions = useProductsQuery({ sort: 'popular', limit: 10 }, { skip: articles.length > 0 });

  const removeLine = useCallback(
    (item) => {
      dispatch(deleteArticlePanier(item.id, item.color, item.taille));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Toast.show({
        type: 'info',
        text1: 'Article retiré',
        text2: 'Touchez ici pour annuler',
        visibilityTime: 3500,
        onPress: () => {
          Toast.hide();
          dispatch(addArticleToPanier(item));
        },
      });
    },
    [dispatch],
  );

  const clearAll = useCallback(() => {
    Alert.alert('Vider le panier ?', 'Tous les articles seront retirés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: () => dispatch(clearPanierData()) },
    ]);
  }, [dispatch]);

  const submitPromo = useCallback(async () => {
    if (!user) {
      navigation.navigate('QuickAuth', { pendingAction: 'checkout', returnScreen: 'Cart' });
      return;
    }
    setPromoError(null);
    const r = await cart.applyPromo(promoInput);
    if (r.ok) {
      setPromoInput('');
      setPromoOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setPromoError(r.message);
    }
  }, [cart, navigation, promoInput, user]);

  const checkout = useCallback(() => {
    if (!cart.zone) {
      setZoneSheet(true);
      return;
    }
    if (cart.blockedParcels.length) {
      const b = cart.blockedParcels[0];
      Alert.alert('Livraison indisponible', `${b.storeName} : ${b.message || 'cette boutique ne livre pas encore dans votre zone.'}\n\nChangez de zone ou retirez ses articles.`);
      return;
    }
    if (!cart.shippingReady) return;
    if (!user) {
      navigation.navigate('QuickAuth', { pendingAction: 'checkout', returnScreen: 'Cart' });
      return;
    }
    navigation.navigate('Checkout', {
      subtotal: cart.subtotal,
      reduction: cart.reduction,
      shippingFee: cart.shippingTotal,
      total: cart.total,
      selectedZone: cart.zone,
      deliveryLocation: cart.location,
      quoteRequired: cart.quoteRequired,
      appliedPromo: cart.promo,
      shippingCalculations: cart.shipping,
      groupedByStore: cart.groups,
    });
  }, [cart, navigation, user]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {isStack ? <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" /> : null}
      <View style={styles.flex}>
        <Text variant="h1">Mon panier</Text>
        {articles.length ? (
          <Text variant="small" color="textSecondary">
            {cart.itemCount} article{cart.itemCount > 1 ? 's' : ''} · {cart.groupList.length} boutique{cart.groupList.length > 1 ? 's' : ''}
          </Text>
        ) : null}
      </View>
      {articles.length ? (
        <PressableScale onPress={clearAll} hitSlop={10} accessibilityLabel="Vider le panier">
          <Text variant="smallMedium" color="danger">Vider</Text>
        </PressableScale>
      ) : null}
    </View>
  );

  // ── Panier vide ────────────────────────────────────────────────────────────
  if (!articles.length) {
    return (
      <View style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <EmptyState
            icon="bag-handle-outline"
            title="Votre panier est vide"
            message="Parcourez des milliers d'articles de vendeurs vérifiés au Niger."
            actionLabel="Commencer mes achats"
            onAction={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          />
          <ProductRail title="Populaires en ce moment" icon="flame" iconColor={colors.danger} products={suggestions.data} loading={suggestions.isLoading} />
        </ScrollView>
      </View>
    );
  }

  const busy = cart.shippingLoading;

  return (
    <View style={styles.screen}>
      {header}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + bottomInset }} keyboardShouldPersistTaps="handled">
        {/* Zone de livraison */}
        <PressableScale onPress={() => setZoneSheet(true)} scaleTo={0.985} style={[styles.zone, !cart.zone && styles.zoneMissing]}>
          <View style={[styles.zoneIcon, !cart.zone && styles.zoneIconMissing]}>
            <Ionicons name="location" size={18} color={cart.zone ? colors.primary : colors.textInverse} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption" color="textSecondary">Livrer à</Text>
            <Text variant="title" numberOfLines={1}>
              {cart.zone ? cart.zone.name : cart.zoneReady ? 'Choisir mon quartier ou ma ville' : 'Chargement…'}
            </Text>
            {cart.zone && zoneLabel(cart.zone).subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1}>{zoneLabel(cart.zone).subtitle}</Text> : null}
          </View>
          <Text variant="smallMedium" color="primary">{cart.zone ? 'Modifier' : 'Choisir'}</Text>
        </PressableScale>

        {cart.freeHint && !cart.shippingLoading ? (
          <View style={styles.freeHint}>
            <Ionicons name="gift-outline" size={16} color={colors.success} />
            <Text variant="small" color="success" style={styles.flex}>
              Plus que {F(cart.freeHint.remaining)} d’articles dans une boutique pour la livraison offerte
            </Text>
          </View>
        ) : null}

        {/* Articles par boutique */}
        {cart.groupList.map((g) => {
          const ship = cart.shipping[g.storeId];
          return (
            <View key={g.storeId} style={styles.store}>
              <PressableScale
                onPress={() => g.storeId !== 'unknown' && navigation.navigate('Boutique', { sellerId: g.storeId, storeName: g.storeName })}
                style={styles.storeHead}
                scaleTo={0.99}
              >
                <Ionicons name="storefront" size={16} color={colors.primaryDark} />
                <Text variant="title" numberOfLines={1} style={styles.flex}>{g.storeName}</Text>
                {cart.zone ? (
                  busy && !ship ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : ship ? (
                    <View style={[styles.shipPill, !ship.deliverable && (ship.quoteRequired ? styles.shipPillQuote : styles.shipPillOff)]}>
                      <Ionicons name="car-outline" size={13} color={!ship.deliverable ? (ship.quoteRequired ? colors.wood : colors.danger) : colors.primaryDark} />
                      <Text variant="caption" color={!ship.deliverable ? (ship.quoteRequired ? 'wood' : 'danger') : ship.free ? 'success' : 'primaryDark'}>
                        {!ship.deliverable ? (ship.quoteRequired ? 'Sur devis' : 'Non livrable') : ship.free ? 'Livraison offerte' : `${formatPrice(ship.totalCost)} F`}
                      </Text>
                    </View>
                  ) : null
                ) : null}
              </PressableScale>
              {g.items.map((item) => (
                <CartLine
                  key={`${item.id}-${item.color}-${item.taille}`}
                  item={item}
                  onOpen={() => navigation.navigate('ProductDetail', { product: item, productId: item._id })}
                  onQuantity={(q) => dispatch(updateArticleQuantity(item.id, item.color, item.taille, q))}
                  onRemove={() => removeLine(item)}
                />
              ))}
              {cart.zone && ship ? (
                <View style={[styles.shipFoot, !ship.deliverable && (ship.quoteRequired ? styles.shipFootQuote : styles.shipFootOff)]}>
                  <Ionicons name={ship.deliverable ? 'time-outline' : 'alert-circle-outline'} size={14} color={ship.deliverable ? colors.primaryDark : ship.quoteRequired ? colors.wood : colors.danger} />
                  <View style={styles.flex}>
                    <Text variant="caption" color={ship.deliverable ? 'textSecondary' : ship.quoteRequired ? 'wood' : 'danger'} numberOfLines={2}>
                      {ship.deliverable
                        ? `${ship.origin || g.storeName} → ${cart.zone.name}${ship.delay ? ` · ${ship.delay}` : ''}`
                        : ship.message || 'Cette boutique ne livre pas encore dans votre zone.'}
                    </Text>
                    {ship.deliverable && ship.freeHint ? (
                      <Text variant="caption" color="success">Plus que {F(ship.freeHint.remaining)} ici pour la livraison offerte</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {cart.shippingError ? (
          <View style={styles.notice}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
            <Text variant="small" color="danger" style={styles.flex}>{cart.shippingError}</Text>
          </View>
        ) : cart.quoteRequired ? (
          <View style={[styles.notice, styles.noticeQuote]}>
            <Ionicons name="cube-outline" size={16} color={colors.wood} />
            <Text variant="small" color="wood" style={styles.flex}>Article très volumineux : livraison sur devis. Notre équipe vous appelle pour fixer les frais (paiement à la livraison).</Text>
          </View>
        ) : null}

        {cart.savings > 0 ? (
          <View style={styles.savings}>
            <Ionicons name="sparkles" size={16} color={colors.success} />
            <Text variant="smallMedium" color="success">Vous économisez {F(cart.savings)} sur cette commande</Text>
          </View>
        ) : null}

        {/* Code promo */}
        <View style={styles.card}>
          {cart.promo ? (
            <View style={styles.promoApplied}>
              <Ionicons name="pricetag" size={18} color={colors.success} />
              <View style={styles.flex}>
                <Text variant="title">{cart.promo.code}</Text>
                <Text variant="caption" color="success">-{F(cart.promo.discount)} appliqués</Text>
              </View>
              <PressableScale onPress={cart.removePromo} hitSlop={10} accessibilityLabel="Retirer le code promo">
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </PressableScale>
            </View>
          ) : promoOpen ? (
            <>
              <View style={styles.promoRow}>
                <TextInput
                  value={promoInput}
                  onChangeText={(t) => { setPromoInput(t.toUpperCase()); setPromoError(null); }}
                  placeholder="CODE PROMO"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={submitPromo}
                  returnKeyType="done"
                  style={[styles.promoInput, promoError && styles.promoInputError]}
                />
                <Button title="Appliquer" size="md" variant="dark" onPress={submitPromo} loading={cart.promoLoading} disabled={!promoInput.trim()} />
              </View>
              {promoError ? <Text variant="small" color="danger" style={styles.promoErr}>{promoError}</Text> : null}
            </>
          ) : (
            <PressableScale onPress={() => setPromoOpen(true)} style={styles.promoToggle} scaleTo={0.99}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.flex}>Ajouter un code promo</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableScale>
          )}
        </View>

        {/* Récapitulatif */}
        <View style={styles.card}>
          <Text variant="h3" style={styles.sumTitle}>Récapitulatif</Text>
          <SummaryRow label={`Sous-total (${cart.itemCount})`} value={F(cart.subtotal)} />
          {cart.reduction > 0 ? <SummaryRow label="Code promo" value={`-${F(cart.reduction)}`} tone="success" /> : null}
          <SummaryRow
            label="Livraison"
            value={!cart.zone ? 'Choisir une zone' : busy ? 'Calcul…' : !cart.quote ? '—' : cart.shippingTotal > 0 ? `${F(cart.shippingTotal)}${cart.quoteRequired ? ' + devis' : ''}` : cart.quoteRequired ? 'Sur devis' : 'Offerte'}
            tone={!cart.zone ? 'textMuted' : undefined}
          />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={F(cart.total)} bold />
        </View>

        <View style={styles.trust}>
          <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
          <Text variant="caption" color="textMuted">Paiement 100 % sécurisé · Mobile money & carte</Text>
        </View>
      </ScrollView>

      {/* Barre de commande */}
      <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 12) }]}>
        <View>
          <Text variant="caption" color="textSecondary">Total</Text>
          <Text variant="price" style={styles.barTotal}>{formatPrice(cart.total)} F</Text>
        </View>
        <Button
          title={cart.zone ? 'Commander' : 'Choisir la livraison'}
          iconRight={cart.zone ? 'arrow-forward' : 'location-outline'}
          size="lg"
          onPress={checkout}
          disabled={busy || (!!cart.zone && !cart.shippingReady)}
          style={styles.flex}
          full
        />
      </View>

      <ZonePickerSheet visible={zoneSheet} onClose={() => setZoneSheet(false)} selected={cart.zone} onSelect={cart.setZone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12, backgroundColor: colors.bg },

  zone: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 4, padding: 14,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  zoneMissing: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  zoneIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  zoneIconMissing: { backgroundColor: colors.primary },

  store: {
    marginHorizontal: GUTTER, marginTop: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4,
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm,
  },
  storeHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  shipPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  shipPillQuote: { backgroundColor: colors.woodSoft },
  shipPillOff: { backgroundColor: colors.dangerSoft },
  shipFoot: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  shipFootQuote: { backgroundColor: colors.woodSoft, borderRadius: radius.sm, padding: 8, borderTopWidth: 0 },
  shipFootOff: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 8, borderTopWidth: 0 },
  freeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: GUTTER, marginTop: 10,
    padding: 12, borderRadius: radius.md, backgroundColor: colors.successSoft,
  },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: GUTTER, marginTop: 14,
    padding: 12, borderRadius: radius.md, backgroundColor: colors.dangerSoft,
  },
  noticeQuote: { backgroundColor: colors.woodSoft },

  savings: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: GUTTER, marginTop: 14,
    padding: 12, borderRadius: radius.md, backgroundColor: colors.successSoft,
  },

  card: { marginHorizontal: GUTTER, marginTop: 14, padding: 14, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm },
  promoToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoInput: {
    flex: 1, height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    paddingHorizontal: 18, fontFamily: fonts.semibold, fontSize: 15, letterSpacing: 1, color: colors.text,
  },
  promoInputError: { borderColor: colors.danger },
  promoErr: { marginTop: 8, marginLeft: 6 },
  promoApplied: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  sumTitle: { marginBottom: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 6 },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },

  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },
  barTotal: { fontSize: 20, lineHeight: 26 },
});
