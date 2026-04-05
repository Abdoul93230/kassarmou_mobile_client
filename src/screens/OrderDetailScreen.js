import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/api';
import { COLORS } from '../config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BRAND = '#30A08B';
const BRAND_LIGHT = '#E8F5F1';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const user = useSelector(state => state.auth.user);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => { fetchOrderDetails(); }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true); setError(null);
      const response = await axios.get(`${API_URL}/getCommandesById/${orderId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setOrder(response.data.commande);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement de la commande');
    } finally { setLoading(false); }
  };

  const fmtPrice = (price) => {
    if (!price && price !== 0) return '0';
    return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d; }
  };

  const fmtDateTime = (d) => {
    try { return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (['payé', 'recu', 'livré', 'payé à la livraison', 'validée'].includes(s)) return '#16a34a';
    if (['en cours', 'en_attente', 'en attente', 'en traitement', 'payée'].includes(s)) return '#f59e0b';
    if (['annulé', 'annulée', 'échec'].includes(s)) return '#ef4444';
    return '#6b7280';
  };

  const isCancelled = (order?.statusLivraison || '').toLowerCase() === 'annulé' || (order?.etatTraitement || '').toLowerCase() === 'annulé';

  // Logique identique au web (CommandeSuivi.tsx lignes 319-321)
  const shouldShowPaymentButton = () => {
    if (!order) return false;
    return (
      order.statusPayment === 'échec' ||
      (order.statusPayment !== 'recu' && order.statusPayment !== 'payé')
    );
  };

  const handlePaymentRetry = async () => {
    try {
      if (order?.prod) {
        await AsyncStorage.setItem('panier', JSON.stringify(order.prod));
        if (order?.reference && order?._id) {
          await AsyncStorage.setItem('pendingOrder', JSON.stringify({ commandeId: order._id, transactionId: order.reference, timestamp: Date.now() }));
        }

        // Avoid stale auto-check redirect loops on retry flow.
        await AsyncStorage.removeItem('paymentInitiated');
        
        // Sauvegarder le code promo s'il y en a un pour l'auto-appliquer dans le panier (Cles identiques au WEB)
        if (order?.idCodePro) {
          await AsyncStorage.setItem('idCodePro', order.idCodePro);
          if (order?.codePromo) {
            await AsyncStorage.setItem('appliedPromoCode', order.codePromo);
          }
        } else {
          await AsyncStorage.removeItem('idCodePro');
          await AsyncStorage.removeItem('appliedPromoCode');
        }

        Alert.alert('Reprendre le paiement', 'Vous allez être redirigé vers le panier pour finaliser le paiement.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => navigation.navigate('Cart') },
        ]);
      }
    } catch { Alert.alert('Erreur', 'Impossible de préparer le paiement.'); }
  };

  // ─── Loading ──────────
  if (loading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={st.loadingText}>Chargement de la commande…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ──────────
  if (error || !order) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={st.errorText}>{error || 'Commande non trouvée'}</Text>
          <TouchableOpacity style={st.retryBtn} onPress={fetchOrderDetails}><Text style={st.retryText}>Réessayer</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}><Text style={{ color: BRAND, fontWeight: '600' }}>Retour</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ──────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <View style={st.statusBar} />
      <SafeAreaView style={st.container} edges={['bottom']}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Commande #{order._id?.slice(0, 7)}…</Text>
            <Text style={st.headerSub}>Commandé le {fmtDate(order.date)}</Text>
          </View>
          <View style={[st.headerBadge, { backgroundColor: getStatusColor(order.etatTraitement) }]}>
            <Text style={st.headerBadgeText}>{order.etatTraitement || 'En attente'}</Text>
          </View>
        </View>

        <ScrollView style={st.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

          {/* ── Cancellation Alert ── */}
          {isCancelled && (
            <View style={st.alertCard}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="alert-circle" size={22} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={st.alertTitle}>Commande annulée</Text>
                  <Text style={st.alertBody}>Cette commande a été annulée. Raisons possibles :</Text>
                  {['Produit non disponible en stock', 'Problème de livraison', 'Annulation demandée', 'Problème de paiement'].map((r, i) => (
                    <Text key={i} style={st.alertBullet}>  •  {r}</Text>
                  ))}
                  <Text style={st.alertHint}>💡 Vous pouvez relancer cette commande depuis le bouton ci-dessous.</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Payment Retry ── */}
          {shouldShowPaymentButton() && (
            <TouchableOpacity style={st.payBtn} onPress={handlePaymentRetry} activeOpacity={0.8}>
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={st.payBtnText}>{isCancelled ? 'Relancer la commande' : 'Faire le paiement'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          )}

          {/* ── Status Grid ── */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="pulse" size={20} color={BRAND} />
              <Text style={st.sectionTitle}>Statut de la commande</Text>
            </View>
            <View style={st.statusGrid}>
              {[
                { label: 'Paiement', value: order.statusPayment === 'payé par téléphone' ? 'Paiement assisté' : (order.statusPayment || 'En attente'), icon: 'card-outline' },
                { label: 'Livraison', value: order.statusLivraison || 'En cours', icon: 'bicycle-outline' },
                { label: 'Traitement', value: order.etatTraitement || 'En attente', icon: 'settings-outline' },
                { label: 'Référence', value: order.reference || '—', icon: 'barcode-outline', noColor: true },
              ].map((item, i) => (
                <View key={i} style={st.statusTile}>
                  <Ionicons name={item.icon} size={20} color={BRAND} />
                  <Text style={st.statusTileLabel}>{item.label}</Text>
                  <Text style={[st.statusTileValue, !item.noColor && { color: getStatusColor(item.value) }]} numberOfLines={2}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Delivery Info ── */}
          {order.livraisonDetails && (
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Ionicons name="location" size={20} color={BRAND} />
                <Text style={st.sectionTitle}>Détails de livraison</Text>
              </View>
              <View style={st.deliveryGrid}>
                {[
                  { icon: 'person', label: 'Client', value: order.livraisonDetails.customerName || order.livraisonDetails.name },
                  { icon: 'mail', label: 'Email', value: order.livraisonDetails.email },
                  { icon: 'map', label: 'Région', value: order.livraisonDetails.region },
                  { icon: 'home', label: 'Quartier', value: order.livraisonDetails.quartier },
                  { icon: 'call', label: 'Téléphone', value: order.livraisonDetails.numero },
                  { icon: 'navigate', label: 'Frais', value: `${fmtPrice(order.fraisLivraison || 0)} CFA` },
                ].filter(d => d.value).map((d, i) => (
                  <View key={i} style={st.deliveryTile}>
                    <View style={st.deliveryIcon}><Ionicons name={d.icon} size={18} color={BRAND} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.deliveryLabel}>{d.label}</Text>
                      <Text style={st.deliveryValue}>{d.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {order.livraisonDetails.description && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>📝 {order.livraisonDetails.description}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Products ── */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="cube" size={20} color={BRAND} />
              <Text style={st.sectionTitle}>Articles commandés ({order.prod?.length || 0})</Text>
            </View>
            {(() => {
              // Gestion robuste du format prod (peut être [[Obj]] ou [Obj])
              const rawProd = order.prod || [];
              const products = (Array.isArray(rawProd[0]) && rawProd.length === 1) 
                ? rawProd[0] 
                : rawProd;
              
              if (!products || products.length === 0) {
                return (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                    <Text style={{ color: '#9ca3af', marginTop: 8 }}>Aucun article trouvé</Text>
                  </View>
                );
              }

              return products.map((product, index) => {
                const imgUri = product.imageUrl || product.image || product.image1 || (product.images && product.images[0]) || null;
                const price = product.prix || product.price || 0;
                
                return (
                  <View key={index} style={[st.productCard, index === products.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={st.productImgContainer}>
                      {imgUri ? (
                        <Image source={{ uri: imgUri }} style={st.productImage} resizeMode="cover" />
                      ) : (
                        <View style={[st.productImage, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="image-outline" size={24} color="#d1d5db" />
                        </View>
                      )}
                    </View>
                    
                    <View style={st.productInfo}>
                      <Text style={st.productName} numberOfLines={2}>{product.name || 'Produit'}</Text>
                      <View style={st.productMeta}>
                        {product.size && <Text style={st.metaTag}>📏 {product.size}</Text>}
                        {product.color && <Text style={st.metaTag}>🎨 {product.color}</Text>}
                      </View>
                      <View style={st.productBottom}>
                        <View style={st.qtyBadge}>
                          <Text style={st.qtyText}>×{product.quantity || 1}</Text>
                        </View>
                        <Text style={st.productPrice}>{fmtPrice(price)} CFA</Text>
                      </View>
                    </View>
                  </View>
                );
              });
            })()}
          </View>

          {/* ── Financial Summary ── */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="receipt" size={20} color={BRAND} />
              <Text style={st.sectionTitle}>Résumé financier</Text>
            </View>

            {/* Promo badge */}
            {order.codePromo && (
              <View style={st.promoBanner}>
                <Ionicons name="pricetag" size={16} color="#16a34a" />
                <Text style={st.promoBannerText}>Code promo : {order.codePromo}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              </View>
            )}

            <View style={st.financeCard}>
              {/* Sous-total */}
              <View style={st.finRow}>
                <Text style={st.finLabel}>Sous-total (articles)</Text>
                <Text style={st.finValue}>{fmtPrice(order.prixTotal || order.fraisSousTotalArticles || (order.prix - (order.fraisLivraison || 0) + (order.reduction || 0)))} CFA</Text>
              </View>

              {/* Shipping */}
              <View style={st.finRow}>
                <Text style={st.finLabel}>Frais d'expédition</Text>
                <Text style={st.finValue}>
                  {(order.fraisLivraison && order.fraisLivraison > 0) ? `+ ${fmtPrice(order.fraisLivraison)} CFA` : 'Gratuit'}
                </Text>
              </View>

              {/* Reduction */}
              {order.reduction > 0 && (
                <View style={st.promoFinRow}>
                  <Text style={st.promoFinLabel}>Réduction appliquée</Text>
                  <Text style={st.promoFinValue}>-{fmtPrice(order.reduction)} CFA</Text>
                </View>
              )}

              {/* Total */}
              <View style={st.finDivider} />
              <View style={st.finTotalRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={st.finTotalLabel}>Total à payer</Text>
                  <Text style={st.finTotalSub}>TVA incluse le cas échéant</Text>
                </View>
                <Text style={st.finTotalValue}>{fmtPrice(order.prix)} CFA</Text>
              </View>
            </View>

            {/* Payment mode footer */}
            <View style={st.paymentFooter}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="card-outline" size={16} color={BRAND} />
                  <Text style={st.payFooterLabel}>Mode de paiement</Text>
                </View>
                <Text style={st.payFooterValue}>
                  {order.statusPayment === 'payé par téléphone' ? 'Paiement assisté' : order.statusPayment || 'Non spécifié'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={[st.payFooterLabel, { marginBottom: 4 }]}>Référence</Text>
                <Text style={st.payFooterRef}>{order.reference || '—'}</Text>
              </View>
            </View>
          </View>

          {/* ── Order History Timeline ── */}
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Ionicons name="time" size={20} color={BRAND} />
              <Text style={st.sectionTitle}>Historique de la commande</Text>
            </View>
            <View style={st.timeline}>
              {/* Commande passée */}
              <View style={st.timelineItem}>
                <View style={[st.dot, { backgroundColor: BRAND }]} />
                <View style={st.timelineLine} />
                <View style={st.timelineContent}>
                  <Text style={st.timelineTitle}>Commande passée</Text>
                  <Text style={st.timelineDate}>{fmtDateTime(order.date)}</Text>
                </View>
              </View>

              {/* Validée */}
              {order.dateValidation && (
                <View style={st.timelineItem}>
                  <View style={[st.dot, { backgroundColor: '#3b82f6' }]} />
                  <View style={st.timelineLine} />
                  <View style={st.timelineContent}>
                    <Text style={st.timelineTitle}>Commande validée</Text>
                    <Text style={st.timelineDate}>{fmtDateTime(order.dateValidation)}</Text>
                  </View>
                </View>
              )}

              {/* Current */}
              <View style={st.timelineItem}>
                <View style={[st.dot, { backgroundColor: isCancelled ? '#ef4444' : order.statusLivraison === 'livré' ? '#16a34a' : '#f59e0b' }]} />
                <View style={st.timelineContent}>
                  <Text style={st.timelineTitle}>Statut actuel : {order.etatTraitement || order.statusLivraison}</Text>
                  <Text style={st.timelineDate}>Livraison : {order.statusLivraison} · Paiement : {order.statusPayment}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Help ── */}
          <TouchableOpacity style={st.helpBtn} onPress={() => Alert.alert('Aide', 'Contactez le support pour toute question concernant votre commande.')} activeOpacity={0.8}>
            <Ionicons name="help-circle" size={20} color="#fff" />
            <Text style={st.helpBtnText}>Besoin d'aide ?</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────
const st = StyleSheet.create({
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 50 : 0, backgroundColor: BRAND, zIndex: 1000 },
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 14, fontSize: 15, color: '#6b7280' },
  errorText: { fontSize: 15, color: '#ef4444', textAlign: 'center', marginTop: 16, marginBottom: 20, lineHeight: 22 },
  retryBtn: { backgroundColor: BRAND, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Header
  header: { backgroundColor: BRAND, paddingTop: Platform.OS === 'ios' ? 72 : 24, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, textTransform: 'capitalize' },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },

  scroll: { flex: 1 },

  // Cancellation alert
  alertCard: { margin: 16, marginBottom: 0, padding: 16, backgroundColor: '#fef2f2', borderRadius: 16, borderWidth: 1, borderColor: '#fecaca' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#991b1b', marginBottom: 4 },
  alertBody: { fontSize: 13, color: '#b91c1c', lineHeight: 20 },
  alertBullet: { fontSize: 12, color: '#b91c1c', marginTop: 2 },
  alertHint: { fontSize: 12, color: '#991b1b', fontWeight: '600', marginTop: 10, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },

  // Payment CTA
  payBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, elevation: 3, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  payBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Sections
  section: { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  // Status Grid
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusTile: { width: '47%', backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, gap: 6 },
  statusTileLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  statusTileValue: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },

  // Delivery Grid
  deliveryGrid: { gap: 10 },
  deliveryTile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f9fafb', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12 },
  deliveryIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND_LIGHT, justifyContent: 'center', alignItems: 'center' },
  deliveryLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 1 },
  deliveryValue: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Product Cards
  productCard: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productImg: { width: 72, height: 72, borderRadius: 12 },
  productImgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, justifyContent: 'space-between' },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },
  productMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metaTag: { fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  productBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  qtyBadge: { backgroundColor: BRAND_LIGHT, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  qtyText: { fontSize: 12, fontWeight: '700', color: BRAND },
  productPrice: { fontSize: 15, fontWeight: '800', color: BRAND },

  // Financial Summary
  promoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  promoBannerText: { fontSize: 13, fontWeight: '700', color: '#16a34a', flex: 1 },
  financeCard: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  finLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500', flex: 1, paddingRight: 10 },
  finValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  promoFinRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BRAND_LIGHT, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginVertical: 4 },
  promoFinLabel: { fontSize: 13, color: BRAND, fontWeight: '600', flex: 1, paddingRight: 10 },
  promoFinValue: { fontSize: 14, fontWeight: '800', color: BRAND },
  finDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  finTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  finTotalLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  finTotalSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  finTotalValue: { fontSize: 22, fontWeight: '800', color: BRAND },

  // Payment footer
  paymentFooter: { marginTop: 14, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payFooterLabel: { fontSize: 11, color: '#6b7280' },
  payFooterValue: { fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  payFooterRef: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 50 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { position: 'absolute', left: 5, top: 16, width: 2, height: 36, backgroundColor: '#e5e7eb' },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  timelineDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Help
  helpBtn: { margin: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND, paddingVertical: 14, borderRadius: 14, elevation: 2 },
  helpBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
