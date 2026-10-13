import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { ZoomIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import apiClient from '../config/api';
import { clearPanierData, selectPanierArticles } from '../redux/cartSlice';
import { fetchPublicConfig, fetchWallet, selectConfig, selectWallet } from '../redux/gamificationSlice';
import { generateUniqueID } from '../services/paymentHelpers';
import { buildOrder, isOfflinePayment } from '../services/orderBuilder';
import { Button, Chip, IconButton, PressableScale, SmartImage, Text } from '../ui';
import TextField from '../ui/TextField';
import PhoneField from '../components/auth/PhoneField';
import PaymentOptions, { ONLINE } from '../components/checkout/PaymentOptions';
import ZonePickerSheet from '../components/cart/ZonePickerSheet';
import { getZones, quoteCart, rememberZone, zoneLabel } from '../services/shippingV3';
import {
  DEFAULT_PHONE_COUNTRY,
  formatPhoneInternational,
  parseStoredPhone,
  toBackendPhone,
  validatePhone,
} from '../utils/phoneRules';
import { formatPrice } from '../utils/formatPrice';
import { productImage } from '../utils/image';
import { colors, GUTTER, radius, shadows } from '../theme';

const F = (n) => `${formatPrice(n)} FCFA`;
const EMPTY_DELIVERY = { name: '', email: '', landmark: '' };

/** Frais par boutique issus d'un devis v3 (même forme que useCartCheckout) */
const calcsFromQuote = (q) => Object.fromEntries((q?.parcels || []).map((p) => [p.sellerId, {
  totalCost: p.deliverable ? p.fee || 0 : 0,
  deliverable: p.deliverable,
  quoteRequired: p.quoteRequired,
  message: p.message,
  delay: p.delay?.label || null,
  free: p.free || null,
  storeName: p.storeName,
}]));

function Section({ title, icon, right, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}><Ionicons name={icon} size={16} color={colors.primary} /></View>
        <Text variant="h3" style={styles.flex}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, tone, bold }) {
  return (
    <View style={styles.row}>
      <Text variant={bold ? 'h3' : 'body'} color={bold ? 'text' : 'textSecondary'}>{label}</Text>
      <Text variant={bold ? 'price' : 'bodyMedium'} color={tone || 'text'}>{value}</Text>
    </View>
  );
}

export default function CheckoutScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const cartItems = useSelector(selectPanierArticles) || [];
  const wallet = useSelector(selectWallet);
  const gConfig = useSelector(selectConfig);
  const userId = user?.id || user?._id;

  const {
    subtotal = 0, reduction = 0, shippingFee = 0,
    selectedZone = null, deliveryLocation = null, appliedPromo = null, shippingCalculations = {},
  } = route.params || {};

  const [delivery, setDelivery] = useState({ ...EMPTY_DELIVERY, name: user?.name || '' });
  // Zone, position et frais : modifiables ici (nouveau devis à chaque changement de zone)
  const [zone, setZone] = useState(selectedZone);
  const [location, setLocation] = useState(deliveryLocation);
  const [ship, setShip] = useState({ fee: shippingFee, calcs: shippingCalculations, loading: false, error: null });
  const [zoneSheet, setZoneSheet] = useState(false);
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [editingAddress, setEditingAddress] = useState(true);
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState(ONLINE);
  const [points, setPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { reference, method }

  // Adresse enregistrée (même source que le web)
  useEffect(() => {
    if (!userId) return;
    apiClient
      .get(`/getAddressByUserKey/${userId}`)
      .then((r) => {
        const a = r.data?.address;
        if (!a) return;
        setDelivery((d) => ({
          name: a.name || d.name,
          email: a.email || '',
          // Ancien format : le repère était saisi dans « description »
          landmark: a.landmark || a.description || '',
        }));
        if (a.numero) {
          const p = parseStoredPhone(a.numero);
          setCountry(p.country);
          setPhoneDigits(p.digits);
        }
        if (!location && a.location?.lat != null) setLocation(a.location);
        if (a.name && a.numero && (a.zoneId || selectedZone)) setEditingAddress(false);
      })
      .catch(() => {});
    dispatch(fetchPublicConfig());
    dispatch(fetchWallet(userId));
  }, [dispatch, userId]);

  const changeZone = useCallback(async (z, meta) => {
    setZone(z);
    rememberZone(z);
    if (meta?.location) setLocation(meta.location);
    setErrors((e) => ({ ...e, zone: undefined }));
    setShip((s) => ({ ...s, loading: true, error: null }));
    try {
      const q = await quoteCart(z._id, cartItems.filter((i) => i._id).map((i) => ({ productId: String(i._id), quantity: Number(i.quantite) || 1 })));
      setShip({ fee: q.totalFee, calcs: calcsFromQuote(q), loading: false, error: null });
    } catch {
      setShip((s) => ({ ...s, loading: false, error: 'Calcul des frais indisponible. Réessayez.' }));
    }
  }, [cartItems]);

  // Adresse sans zone transmise par le panier : on reprend celle de l'adresse enregistrée
  useEffect(() => {
    if (zone || !userId) return;
    apiClient.get(`/getAddressByUserKey/${userId}`)
      .then(async (r) => {
        const id = r.data?.address?.zoneId;
        if (!id) return;
        const z = (await getZones()).find((x) => x._id === String(id));
        if (z) changeZone(z);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const parcels = Object.values(ship.calcs || {});
  const blocked = parcels.filter((c) => c.deliverable === false && !c.quoteRequired);
  const quoteRequired = parcels.some((c) => c.quoteRequired);
  const total = Math.max(0, subtotal - reduction) + (ship.fee || 0);

  // Baobab Points
  const pointsInfo = useMemo(() => {
    if (!gConfig?.enabled || !wallet || wallet.balance <= 0) return null;
    const rate = gConfig?.redemption?.pointsToFcfaRate ?? 20;
    const maxPct = gConfig?.redemption?.maxPercentPerOrder ?? 30;
    const maxPoints = Math.min(wallet.balance, Math.floor((subtotal * maxPct) / 100 / rate));
    return maxPoints > 0 ? { rate, maxPct, maxPoints, balance: wallet.balance } : null;
  }, [gConfig, subtotal, wallet]);
  const pointsDiscount = pointsInfo ? points * pointsInfo.rate : 0;
  const payable = Math.max(0, total - pointsDiscount);

  const setField = useCallback((k, v) => {
    setDelivery((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }, []);

  const validate = useCallback(() => {
    const e = {};
    if (delivery.name.trim().length < 2) e.name = 'Indiquez votre nom complet';
    const phone = validatePhone(country, phoneDigits, true);
    if (!phone.isValid) e.phone = phone.message;
    if (!zone?._id) e.zone = 'Choisissez votre quartier ou votre ville';
    if (delivery.email.trim() && !/^\S+@\S+\.\S+$/.test(delivery.email.trim())) e.email = 'Adresse email invalide';
    setErrors(e);
    if (Object.keys(e).length) setEditingAddress(true);
    return !Object.keys(e).length;
  }, [country, delivery, phoneDigits, zone]);

  const placeOrder = useCallback(async () => {
    if (!userId) {
      navigation.navigate('QuickAuth', { pendingAction: 'checkout', returnScreen: 'Cart' });
      return;
    }
    if (!validate()) {
      Toast.show({ type: 'error', text1: 'Adresse incomplète', text2: 'Vérifiez les champs en rouge.' });
      return;
    }
    if (!method) {
      Toast.show({ type: 'info', text1: 'Choisissez un mode de paiement' });
      return;
    }
    if (!cartItems.length) {
      Toast.show({ type: 'error', text1: 'Votre panier est vide' });
      return;
    }
    if (ship.loading) return;
    if (blocked.length) {
      Toast.show({ type: 'error', text1: 'Livraison indisponible', text2: `${blocked[0].storeName} : ${blocked[0].message || 'zone non desservie'}` });
      return;
    }
    if (quoteRequired && !isOfflinePayment(method)) {
      Toast.show({ type: 'info', text1: 'Livraison sur devis', text2: 'Choisissez le paiement à la livraison ou le paiement assisté.' });
      return;
    }

    setSubmitting(true);
    try {
      // E.164 sans espace (+22787727501), format exigé par le backend
      const phone = toBackendPhone(country, phoneDigits);
      const transactionId = generateUniqueID();
      const existingOrder = JSON.parse((await AsyncStorage.getItem('pendingOrder')) || 'null');

      const order = buildOrder({
        userId, cartItems, delivery, phone, zone, location, shippingCalculations: ship.calcs,
        subtotal, shippingFee: ship.fee, reduction, total, promo: appliedPromo,
        pointsToUse: points, pointsDiscount, paymentMethod: method, transactionId, existingOrder,
      });

      await apiClient.post('/createOrUpdateAddress', {
        name: delivery.name.trim(),
        numero: phone,
        email: delivery.email.trim() || null,
        zoneId: zone._id,
        landmark: delivery.landmark.trim(),
        description: delivery.landmark.trim(),
        ...(location ? { location } : {}),
        clefUser: userId,
      });

      const res = existingOrder?.transactionId
        ? await apiClient.put('/updateCommande', order)
        : await apiClient.post('/createCommande', order);
      if (!res.data?.commande) throw new Error('Impossible de créer la commande');

      if (isOfflinePayment(method)) {
        await dispatch(clearPanierData());
        await AsyncStorage.multiRemove(['pendingOrder', 'shippingDetails', 'appliedPromoCode', 'paymentInitiated']);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setDone({ reference: transactionId, method });
        return;
      }

      // Paiement électronique : la commande est conservée pour un éventuel nouvel essai
      await AsyncStorage.setItem('pendingOrder', JSON.stringify({ transactionId, total: payable }));
      await AsyncStorage.setItem('paymentInitiated', JSON.stringify({ transactionId, method, timestamp: Date.now() }));
      navigation.navigate('PaymentWebView', { amount: payable, transactionId, paymentMethod: method });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Commande non envoyée',
        text2:
          e.response?.data?.message ||
          (Array.isArray(e.response?.data?.err) ? e.response.data.err.join(' ') : null) ||
          e.response?.data?.error ||
          'Vérifiez votre connexion et réessayez.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    appliedPromo, blocked, cartItems, country, delivery, dispatch, location, method, navigation, payable, phoneDigits, points,
    pointsDiscount, quoteRequired, reduction, ship, subtotal, total, userId, validate, zone,
  ]);

  // ── Confirmation ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[styles.screen, styles.doneWrap, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.doneIcon}>
          <Ionicons name="checkmark" size={56} color={colors.textInverse} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.doneText}>
          <Text variant="h1" align="center">Commande confirmée !</Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.mt8}>
            {done.method === 'paiement_assiste'
              ? 'Un conseiller va vous appeler pour finaliser le paiement.'
              : 'Vous paierez à la livraison. Le vendeur prépare votre colis.'}
          </Text>
          <View style={styles.refPill}>
            <Text variant="caption" color="textSecondary">Référence</Text>
            <Text variant="title" selectable>{done.reference}</Text>
          </View>
        </Animated.View>
        <View style={styles.doneActions}>
          <Button
            title="Suivre ma commande"
            icon="cube-outline"
            full
            size="lg"
            onPress={() => {
              navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Orders' }] });
            }}
          />
          <Button
            title="Continuer mes achats"
            variant="ghost"
            full
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })}
          />
        </View>
      </View>
    );
  }

  const offline = isOfflinePayment(method);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={styles.flex}>
          <Text variant="h2">Finaliser la commande</Text>
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={11} color={colors.success} />
            <Text variant="caption" color="success">Paiement sécurisé</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Adresse */}
        <Section
          title="Livraison"
          icon="location"
          right={!editingAddress ? (
            <PressableScale onPress={() => setEditingAddress(true)} hitSlop={10}>
              <Text variant="smallMedium" color="primary">Modifier</Text>
            </PressableScale>
          ) : null}
        >
          {!editingAddress ? (
            <View>
              <Text variant="title">{delivery.name}</Text>
              <Text variant="body" color="textSecondary">{formatPhoneInternational(toBackendPhone(country, phoneDigits))}</Text>
              <Text variant="body" color="textSecondary">{zone ? [zoneLabel(zone).title, zoneLabel(zone).subtitle].filter(Boolean).join(', ') : 'Zone à choisir'}</Text>
              {delivery.landmark ? <Text variant="small" color="textMuted" style={styles.mt4}>Repère : {delivery.landmark}</Text> : null}
              {location ? <Text variant="caption" color="primary" style={styles.mt4}>📍 Position enregistrée pour le livreur</Text> : null}
            </View>
          ) : (
            <View>
              <TextField label="Nom complet" icon="person-outline" value={delivery.name} onChangeText={(t) => setField('name', t)} error={errors.name} autoComplete="name" textContentType="name" />
              <PhoneField
                country={country}
                onCountryChange={setCountry}
                digits={phoneDigits}
                onDigitsChange={(d) => { setPhoneDigits(d); setErrors((e) => ({ ...e, phone: undefined })); }}
                label="Téléphone"
                error={errors.phone}
                hint="Le livreur vous appellera sur ce numéro"
              />
              <Text variant="smallMedium" color="textSecondary" style={styles.fieldLabel}>Quartier ou ville</Text>
              <PressableScale onPress={() => setZoneSheet(true)} scaleTo={0.985} style={[styles.zoneField, errors.zone && styles.zoneFieldError]}>
                <Ionicons name="location" size={18} color={zone ? colors.primary : colors.textMuted} />
                <View style={styles.flex}>
                  <Text variant={zone ? 'title' : 'body'} color={zone ? 'text' : 'textMuted'} numberOfLines={1}>{zone ? zoneLabel(zone).title : 'Choisir dans la liste'}</Text>
                  {zone && zoneLabel(zone).subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1}>{zoneLabel(zone).subtitle}</Text> : null}
                </View>
                <Text variant="smallMedium" color="primary">{zone ? 'Modifier' : 'Choisir'}</Text>
              </PressableScale>
              {errors.zone ? <Text variant="small" color="danger" style={styles.fieldError}>{errors.zone}</Text> : null}
              <TextField label="Point de repère" optional icon="navigate-outline" value={delivery.landmark} onChangeText={(t) => setField('landmark', t)} placeholder="Ex. derrière la pharmacie, portail bleu" maxLength={200} />
              <TextField label="Email" optional icon="mail-outline" value={delivery.email} onChangeText={(t) => setField('email', t)} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="Pour recevoir votre reçu" />
            </View>
          )}
        </Section>

        {/* Paiement */}
        <Section title="Paiement" icon="wallet">
          <PaymentOptions value={method} onChange={setMethod} />
          {method && !offline ? (
            <View style={styles.note}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text variant="small" color="textSecondary" style={styles.flex}>
                Vous choisirez votre moyen de paiement (mobile money, portefeuille ou carte) sur la page sécurisée iPay.
              </Text>
            </View>
          ) : null}
        </Section>

        {/* Baobab Points */}
        {pointsInfo ? (
          <Section title="Baobab Points" icon="gift" right={<Text variant="smallMedium" color="primaryDark">{pointsInfo.balance} BP</Text>}>
            <View style={styles.pointsRow}>
              {[0, Math.floor(pointsInfo.maxPoints / 2), pointsInfo.maxPoints]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <Chip key={v} label={v === 0 ? 'Aucun' : `${v} BP`} active={points === v} onPress={() => setPoints(v)} style={styles.flex} />
                ))}
            </View>
            <Text variant="caption" color="textMuted" style={styles.mt8}>
              1 BP = {pointsInfo.rate} FCFA · jusqu'à {pointsInfo.maxPct} % de la commande
            </Text>
          </Section>
        ) : null}

        {/* Récapitulatif */}
        <Section title="Récapitulatif" icon="receipt">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {cartItems.map((it) => (
              <View key={`${it.id}-${it.color}-${it.taille}`}>
                <SmartImage uri={it.colorImage || productImage(it)} width={56} style={styles.thumb} />
                <View style={styles.qtyBadge}><Text variant="caption" color="textInverse">{it.quantite}</Text></View>
              </View>
            ))}
          </ScrollView>
          <Row label="Sous-total" value={F(subtotal)} />
          {reduction > 0 ? <Row label={`Code ${appliedPromo?.code || 'promo'}`} value={`-${F(reduction)}`} tone="success" /> : null}
          <Row
            label="Livraison"
            value={ship.loading ? 'Calcul…' : ship.fee > 0 ? `${F(ship.fee)}${quoteRequired ? ' + devis' : ''}` : quoteRequired ? 'Sur devis' : parcels.some((c) => c.free) ? 'Offerte' : F(0)}
            tone={ship.fee === 0 && parcels.some((c) => c.free) ? 'success' : undefined}
          />
          {parcels.length > 1 || parcels.some((c) => c.delay || c.deliverable === false) ? parcels.map((c) => (
            <Text key={c.storeName} variant="caption" color={c.deliverable === false ? (c.quoteRequired ? 'wood' : 'danger') : 'textMuted'} style={styles.parcelLine} numberOfLines={2}>
              {c.storeName} · {c.deliverable === false ? (c.message || (c.quoteRequired ? 'sur devis' : 'non livrable')) : `${c.free ? 'offerte' : F(c.totalCost)}${c.delay ? ` · ${c.delay}` : ''}`}
            </Text>
          )) : null}
          {ship.error ? <Text variant="caption" color="danger" style={styles.parcelLine}>{ship.error}</Text> : null}
          {pointsDiscount > 0 ? <Row label="Baobab Points" value={`-${F(pointsDiscount)}`} tone="success" /> : null}
          <View style={styles.divider} />
          <Row label="Total à payer" value={F(payable)} bold />
        </Section>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title={offline ? 'Confirmer la commande' : `Payer ${formatPrice(payable)} FCFA`}
          icon={offline ? 'checkmark-circle-outline' : 'lock-closed'}
          size="lg"
          full
          loading={submitting}
          disabled={!method || ship.loading || blocked.length > 0}
          onPress={placeOrder}
        />
        {!method ? <Text variant="caption" color="textMuted" align="center" style={styles.mt6}>Choisissez un mode de paiement pour continuer</Text> : null}
      </View>
      <ZonePickerSheet visible={zoneSheet} onClose={() => setZoneSheet(false)} selected={zone} onSelect={changeZone} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  section: { marginHorizontal: GUTTER, marginTop: 14, padding: 16, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  dial: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.border },
  countries: { gap: 8, paddingBottom: 14 },
  fieldLabel: { marginBottom: 6, marginTop: 2 },
  fieldError: { marginTop: 4 },
  zoneField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, marginBottom: 14,
  },
  zoneFieldError: { borderColor: colors.danger },
  parcelLine: { paddingLeft: 8, marginTop: 2 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  pointsRow: { flexDirection: 'row', gap: 8 },

  thumbs: { gap: 10, paddingBottom: 12 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  qtyBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 8 },

  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 12,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },

  doneWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  doneIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  doneText: { marginTop: 28, alignItems: 'center' },
  refPill: { marginTop: 20, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  doneActions: { alignSelf: 'stretch', gap: 8, marginTop: 36 },
});
