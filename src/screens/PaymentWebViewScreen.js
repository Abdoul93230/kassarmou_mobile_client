import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import apiClient from '../config/api';
import { API_URL, IPAY, SITE_URL } from '../config/env';
import { clearPanierData } from '../redux/cartSlice';
import { catalogApi } from '../redux/catalogApi';
import { Button, IconButton, Text } from '../ui';
import { formatPrice } from '../utils/formatPrice';
import { colors, GUTTER, radius, shadows } from '../theme';

/** Montant de test : uniquement en développement et si explicitement défini */
const DEV_TEST_AMOUNT = __DEV__ ? Number(process.env.EXPO_PUBLIC_PAYMENT_TEST_AMOUNT) || 0 : 0;

const normalize = (status) => {
  const v = String(status || '').trim().toLowerCase();
  if (['payé', 'paye', 'paid', 'success', 'succeeded', 'completed'].includes(v)) return 'succeeded';
  if (['échec', 'echec', 'failed', 'cancelled', 'canceled', 'rejected'].includes(v)) return 'failed';
  return 'pending';
};

/** Page HTML qui lance le SDK iPay (même configuration que payment-page.html du web) */
const buildHtml = ({ amount, transactionId }) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,Roboto,'Segoe UI',sans-serif;background:#FAFAF8;color:#16181D;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{width:100%;max-width:420px;background:#fff;border-radius:24px;padding:28px 24px;text-align:center;box-shadow:0 10px 30px rgba(11,26,23,.08)}
  .brand{font-weight:800;font-size:20px;letter-spacing:-.3px}.brand span{color:#30A08B}.brand b{color:#B2905F}
  .amount{font-size:34px;font-weight:800;margin:18px 0 4px}.amount small{font-size:16px;font-weight:600;color:#5B6170}
  .ref{color:#9A9FAB;font-size:12px}
  .spin{width:34px;height:34px;border:3px solid #E8F5F2;border-top-color:#30A08B;border-radius:50%;margin:22px auto 10px;animation:r .9s linear infinite}
  @keyframes r{to{transform:rotate(360deg)}}
  .hint{color:#5B6170;font-size:14px;line-height:20px}
  .ipaymoney-button{margin-top:20px;width:100%;border:0;border-radius:999px;padding:15px;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#30A08B,#1F7A69)}
  .secure{margin-top:16px;font-size:12px;color:#1E9E6A}
</style></head><body>
<div class="card">
  <div class="brand"><span>Iham</span><b>baobab</b></div>
  <div class="amount">${formatPrice(amount)} <small>FCFA</small></div>
  <div class="ref">Commande n° ${transactionId}</div>
  <div class="spin" id="spin"></div>
  <p class="hint" id="hint">Ouverture de la page de paiement sécurisée…</p>
  <button type="button" id="checkout-button" class="ipaymoney-button"
    data-environement="${IPAY.environment}" data-key="${IPAY.publicKey}"
    data-amount="${amount}" data-transaction-id="${transactionId}"
    data-redirect-url="${IPAY.redirectUrl}" data-cancel-url="${IPAY.cancelUrl}" data-callback-url="${IPAY.callbackUrl}">
    Choisir mon moyen de paiement
  </button>
  <div class="secure">🔒 Paiement chiffré et sécurisé par iPay</div>
</div>
<script src="https://i-pay.money/checkout.js"></script>
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script>
  var sent = {};
  function toRN(p){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(p)); }
  function norm(s){ s=String(s||'').trim().toLowerCase();
    if(['payé','paye','paid','success','succeeded','completed'].indexOf(s)>=0) return 'succeeded';
    if(['échec','echec','failed','cancelled','canceled','rejected'].indexOf(s)>=0) return 'failed';
    return 'pending'; }
  function onIpay(e){
    var d=e.data; if(typeof d==='string'){ try{ d=JSON.parse(d);}catch(x){ return; } }
    if(!d||typeof d!=='object') return;
    if(d.type==='payment.response' && d.other){
      // Relais du résultat iPay (format iPay d'origine) — même comportement que le web
      var k=[d.other.externalReference||'',d.other.reference||'',d.other.status||''].join('::');
      if(!sent[k]){ sent[k]=1; fetch('${IPAY.callbackUrl}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d.other)}).catch(function(){}); }
      toRN({type:'ipay_result', status:norm(d.other.status)});
    }
  }
  window.addEventListener('message', onIpay); window.addEventListener('message', onIpay, true); document.addEventListener('message', onIpay);
  function monitor(){
    var done=false, attempts=0, total=0;
    var steps=[3000,5000,8000,13000,21000,34000,55000];
    function finish(s){ if(done) return; done=true; toRN({type:'payment_status_final', status:s}); }
    function poll(){ if(done) return; attempts++;
      fetch('${API_URL}/getOrderPaymentStatus/'+encodeURIComponent('${transactionId}')).then(function(r){return r.ok?r.json():null}).then(function(j){
        var s=norm(j&&j.status); if(s!=='pending') return finish(s);
        if(total>=600000) return; var n=steps[Math.min(attempts-1,steps.length-1)]; total+=n; setTimeout(poll,n);
      }).catch(function(){ var n=steps[Math.min(attempts-1,steps.length-1)]; total+=n; setTimeout(poll,n); });
    }
    try{
      var sock=io('${API_URL}',{transports:['websocket','polling'],timeout:10000,reconnectionAttempts:3});
      var ok=false;
      sock.on('connect',function(){ ok=true; sock.emit('payment:join',{reference:'${transactionId}'}); });
      sock.on('payment:status',function(ev){ var ref=ev&&(ev.reference||ev.externalReference); if(ref!=='${transactionId}') return;
        var s=norm(ev.statusPayment||ev.status); if(s!=='pending'){ finish(s); sock.disconnect(); } });
      sock.on('disconnect',function(){ if(!done) poll(); });
      setTimeout(function(){ if(!ok && !done){ sock.close(); poll(); } },10000);
    }catch(x){ poll(); }
  }
  document.addEventListener('DOMContentLoaded', function(){
    var b=document.getElementById('checkout-button');
    b.addEventListener('click', function(){ toRN({type:'checkout_clicked'}); });
    setTimeout(function(){ b.click(); document.getElementById('spin').style.display='none';
      document.getElementById('hint').textContent="Si la fenêtre de paiement s'est fermée, touchez le bouton ci-dessous."; }, 600);
    monitor();
  });
</script></body></html>`;

/** Paiement en ligne via le SDK iPay (mobile money, portefeuilles, cartes) */
export default function PaymentWebViewScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { amount, transactionId } = route.params || {};
  const payAmount = DEV_TEST_AMOUNT || Math.round(Number(amount) || 0);

  const [phase, setPhase] = useState('loading'); // loading | ready | verifying | success | failed
  const settled = useRef(false);
  const html = useMemo(() => buildHtml({ amount: payAmount, transactionId }), [payAmount, transactionId]);

  const succeed = useCallback(async () => {
    if (settled.current) return;
    settled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await dispatch(clearPanierData());
    await AsyncStorage.multiRemove(['pendingOrder', 'paymentInitiated', 'shippingDetails', 'appliedPromoCode']).catch(() => {});
    dispatch(catalogApi.util.invalidateTags(['Orders']));
    setPhase('success');
  }, [dispatch]);

  const fail = useCallback(() => {
    if (settled.current) return;
    settled.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    AsyncStorage.removeItem('paymentInitiated').catch(() => {});
    setPhase('failed');
  }, []);

  /** Source de vérité : le statut enregistré par le backend (webhook iPay) */
  const verify = useCallback(async () => {
    if (settled.current) return;
    setPhase('verifying');
    for (let i = 0; i < 6 && !settled.current; i += 1) {
      try {
        const r = await apiClient.get(`/getOrderPaymentStatus/${encodeURIComponent(transactionId)}`);
        const s = normalize(r.data?.status);
        if (s === 'succeeded') return succeed();
        if (s === 'failed') return fail();
      } catch {
        // réseau : on réessaie
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
    if (!settled.current) setPhase('ready'); // toujours en attente : la page continue de surveiller
    return undefined;
  }, [fail, succeed, transactionId]);

  const confirmLeave = useCallback(() => {
    if (phase === 'success' || phase === 'failed') {
      navigation.goBack();
      return;
    }
    Alert.alert('Quitter le paiement ?', 'Votre commande reste enregistrée : vous pourrez la payer plus tard depuis « Mes commandes ».', [
      { text: 'Continuer le paiement', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, [navigation, phase]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

  const onMessage = (e) => {
    let d;
    try { d = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (d.type === 'payment_status_final') {
      if (d.status === 'succeeded') succeed();
      else if (d.status === 'failed') fail();
    } else if (d.type === 'ipay_result') {
      if (d.status === 'succeeded') verify();
      else if (d.status === 'failed') fail();
    }
  };

  // Redirections iPay vers le site : on les intercepte et on vérifie côté serveur
  const onShouldStart = (req) => {
    const url = String(req.url || '').toLowerCase();
    if (url.includes('ihambaobab.com') && (url.includes('commandesreference') || url.includes('/error'))) {
      if (url.includes('/error') || /status=(failed|error|cancel)/.test(url)) fail();
      else verify();
      return false;
    }
    return true;
  };

  // Nouvel essai : retour au checkout, qui met à jour la commande avec une NOUVELLE référence
  // (iPay n'accepte pas de rejouer une transaction échouée — même logique que le web)
  const retry = () => navigation.goBack();

  const user = useSelector((st) => st.auth.user);
  // Sans compte : suivi par lien (la commande invité est mémorisée au checkout)
  const goOrders = async () => {
    if (!user) {
      const last = JSON.parse((await AsyncStorage.getItem('lastGuestOrder')) || 'null');
      if (last?.trackingToken) {
        navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Tracking', params: { reference: last.reference, k: last.trackingToken } }] });
        return;
      }
    }
    navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: 'Orders' }] });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="close" onPress={confirmLeave} bg={colors.surfaceAlt} accessibilityLabel="Quitter le paiement" />
        <View style={styles.flex}>
          <Text variant="title">Paiement sécurisé</Text>
          <View style={styles.secure}>
            <Ionicons name="lock-closed" size={11} color={colors.success} />
            <Text variant="caption" color="success">Chiffré par iPay</Text>
          </View>
        </View>
        <Text variant="price">{formatPrice(payAmount)} F</Text>
      </View>

      {phase === 'success' || phase === 'failed' ? null : (
        <View style={styles.flex}>
        <WebView
          source={{ html, baseUrl: `${SITE_URL}/` }}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadEnd={() => setPhase((p) => (p === 'loading' ? 'ready' : p))}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          javaScriptCanOpenWindowsAutomatically
          setSupportMultipleWindows={false}
          style={styles.web}
        />
        {phase === 'loading' || phase === 'verifying' ? (
          <Animated.View entering={FadeIn} style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="title" style={styles.mt16}>{phase === 'verifying' ? 'Confirmation du paiement…' : 'Connexion sécurisée…'}</Text>
            <Text variant="small" color="textSecondary" align="center" style={styles.mt6}>
              {phase === 'verifying' ? 'Ne fermez pas l’application, cela prend quelques secondes.' : 'Préparation de votre paiement'}
            </Text>
          </Animated.View>
        ) : null}
        </View>
      )}

      {phase === 'success' ? (
        <View style={[styles.result, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.bigIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={56} color={colors.textInverse} />
          </Animated.View>
          <Text variant="h1" align="center" style={styles.mt24}>Paiement confirmé !</Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.mt8}>
            Merci pour votre achat. Le vendeur prépare votre commande, vous pouvez suivre chaque étape.
          </Text>
          <View style={styles.refPill}><Text variant="caption" color="textSecondary">Référence</Text><Text variant="title" selectable>{transactionId}</Text></View>
          <View style={styles.actions}>
            <Button title="Suivre ma commande" icon="cube-outline" size="lg" full onPress={goOrders} />
            <Button title="Continuer mes achats" variant="ghost" full onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })} />
          </View>
        </View>
      ) : null}

      {phase === 'failed' ? (
        <View style={[styles.result, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.bigIcon, { backgroundColor: colors.danger }]}>
            <Ionicons name="close" size={56} color={colors.textInverse} />
          </Animated.View>
          <Text variant="h1" align="center" style={styles.mt24}>Paiement non abouti</Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.mt8}>
            Aucun montant n'a été validé. Votre commande est conservée : réessayez ou choisissez un autre moyen de paiement.
          </Text>
          <View style={styles.actions}>
            <Button title="Réessayer le paiement" icon="refresh" size="lg" full onPress={retry} />
            <Button title="Voir mes commandes" variant="ghost" full onPress={goOrders} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, zIndex: 2,
  },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  web: { flex: 1, backgroundColor: colors.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  result: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  bigIcon: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', ...shadows.lg },
  refPill: { marginTop: 20, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 32 },
});
