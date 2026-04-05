import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { API_URL } from '../config/api';
import { COLORS } from '../config/constants';

const BRAND = '#30A08B';
const BRAND_LIGHT = '#E8F5F1';

export default function OrdersScreen({ navigation }) {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('inProgress');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/getCommandesByClefUser/${user.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const ordersData = response.data?.commandes || (Array.isArray(response.data) ? response.data : []);
      setOrders(ordersData);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      setOrders([]);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchOrders());
    return unsub;
  }, [navigation, fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  // Catégorisation identique au web (CommandePage.tsx)
  const getOrderStatus = (order) => {
    const statusL = (order.statusLivraison || '').toLowerCase();
    const etatT = (order.etatTraitement || '').toLowerCase();

    if (statusL === 'annulé' || etatT === 'annulé' || etatT === 'annulée') return 'cancelled';
    if (
      statusL === 'en cours' ||
      order.statusPayment === 'en cours' ||
      order.statusPayment === 'en_attente' ||
      order.statusPayment === 'en attente' ||
      etatT === 'en cours' ||
      etatT === 'en traitement' ||
      etatT === 'payée'
    ) return 'inProgress';
    return 'completed';
  };

  const getPaymentBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (['payé', 'recu', 'payé à la livraison'].includes(s))
      return { color: '#16a34a', bg: '#f0fdf4', label: status, icon: 'checkmark-circle' };
    if (['en cours', 'en_attente', 'en attente'].includes(s))
      return { color: '#f59e0b', bg: '#fffbeb', label: 'En attente', icon: 'time-outline' };
    if (s === 'échec')
      return { color: '#ef4444', bg: '#fef2f2', label: 'Échec', icon: 'close-circle' };
    return { color: '#6b7280', bg: '#f3f4f6', label: status || '—', icon: 'help-circle-outline' };
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '0';
    return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateString; }
  };

  const tabs = [
    { id: 'inProgress', label: 'En cours', icon: 'time-outline' },
    { id: 'completed', label: 'Reçues', icon: 'checkmark-circle-outline' },
    { id: 'cancelled', label: 'Annulées', icon: 'close-circle-outline' },
  ];

  const filteredOrders = (Array.isArray(orders) ? orders : [])
    .filter((o) => getOrderStatus(o) === activeTab)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const tabCounts = tabs.reduce((acc, tab) => {
    acc[tab.id] = (Array.isArray(orders) ? orders : []).filter((o) => getOrderStatus(o) === tab.id).length;
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}><Text style={s.headerTitle}>Mes Commandes</Text></View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={s.loadingText}>Chargement de vos commandes…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />
      <View style={s.statusBar} />
      <SafeAreaView style={s.container} edges={['bottom']}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Mes Commandes</Text>
          <Text style={s.headerSub}>{orders.length} commande{orders.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCancelled = tab.id === 'cancelled';
            return (
              <TouchableOpacity
                key={tab.id}
                style={[s.tab, isActive && s.tabActive, isCancelled && isActive && s.tabCancelled]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? (isCancelled ? '#ef4444' : BRAND) : '#9ca3af'}
                />
                <Text style={[
                  s.tabLabel,
                  isActive && s.tabLabelActive,
                  isCancelled && isActive && { color: '#ef4444' },
                ]}>
                  {tab.label}
                </Text>
                <View style={[s.tabBadge, isActive && s.tabBadgeActive, isCancelled && isActive && { backgroundColor: '#ef4444' }]}>
                  <Text style={[s.tabBadgeText, isActive && s.tabBadgeTextActive]}>{tabCounts[tab.id]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Orders List */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} tintColor={BRAND} />}
        >
          {error ? (
            <View style={s.stateBox}>
              <Ionicons name="alert-circle" size={56} color="#ef4444" />
              <Text style={s.stateTitle}>Erreur de chargement</Text>
              <Text style={s.stateSub}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={fetchOrders}><Text style={s.retryText}>Réessayer</Text></TouchableOpacity>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={s.stateBox}>
              <View style={s.emptyCircle}>
                <Ionicons name={tabs.find(t => t.id === activeTab)?.icon || 'cube-outline'} size={48} color="#d1d5db" />
              </View>
              <Text style={s.stateTitle}>
                {activeTab === 'inProgress' ? 'Aucune commande en cours' : activeTab === 'completed' ? 'Aucune commande reçue' : 'Aucune commande annulée'}
              </Text>
              <Text style={s.stateSub}>
                {activeTab === 'inProgress' ? 'Vos commandes en cours apparaîtront ici' : activeTab === 'completed' ? 'Vos commandes livrées apparaîtront ici' : 'Vos commandes annulées apparaîtront ici'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const badge = getPaymentBadge(order.statusPayment);
              
              // Extraire les images des produits (max 4, ou 3 + indicateur)
              const productsWithImages = (order.prod || []).slice(0, 4);
              const extraProductsCount = Math.max(0, (order.prod?.length || 0) - 4);
              const displayLimit = extraProductsCount > 0 ? 3 : 4;
              const productsToShow = productsWithImages.slice(0, displayLimit);

              return (
                <TouchableOpacity
                  key={order._id}
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                >
                  {/* Top row: date + payment badge */}
                  <View style={s.cardTop}>
                    <View style={s.cardDateRow}>
                      <Ionicons name="calendar-outline" size={15} color={BRAND} />
                      <Text style={s.cardDate}>{formatDate(order.date)}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: badge.bg }]}>
                      <Ionicons name={badge.icon} size={13} color={badge.color} />
                      <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {/* Promo tag */}
                  {order.codePromo && (
                    <View style={s.promoRow}>
                      <Ionicons name="pricetag" size={12} color="#16a34a" />
                      <Text style={s.promoText}>Code : {order.codePromo}</Text>
                    </View>
                  )}

                    <View style={s.productImagesRow}>
                      {(() => {
                        // Gestion robuste du format prod (peut être [[Obj]] ou [Obj])
                        const rawProd = order.prod || [];
                        const products = (Array.isArray(rawProd[0]) && rawProd.length === 1) 
                          ? rawProd[0] 
                          : rawProd;
                        
                        const displayLimit = 4;
                        const productsToShow = products.slice(0, displayLimit);
                        const extraCount = products.length - displayLimit;
                        
                        return (
                          <>
                            {productsToShow.map((product, idx) => {
                              const imgUri = product.imageUrl || product.image || product.image1 || (product.images && product.images[0]) || null;
                              return (
                                <View key={idx} style={[s.productImageWrap, { zIndex: 10 - idx, left: idx > 0 ? -12 * idx : 0 }]}>
                                  {imgUri ? (
                                    <Image source={{ uri: imgUri }} style={s.miniProductImg} />
                                  ) : (
                                    <View style={[s.miniProductImg, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
                                      <Ionicons name="image-outline" size={16} color="#d1d5db" />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                            
                            {extraCount > 0 && (
                              <View style={[s.productImageWrap, { zIndex: 0, left: -12 * displayLimit }]}>
                                <View style={[s.miniProductImg, s.extraProductsBadge]}>
                                  <Text style={s.extraProductsText}>+{extraCount}</Text>
                                </View>
                              </View>
                            )}
                            
                            <View style={{ flex: 1, paddingLeft: extraCount > 0 ? 10 : (productsToShow.length > 0 ? 10 : 0) }}>
                              <Text style={s.itemCountText} numberOfLines={1}>
                                {products.length} article{products.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          </>
                        );
                      })()}
                    </View>

                  {/* Stats */}
                  <View style={s.statsRow}>
                    <View style={s.statBox}>
                      <Ionicons name="cube-outline" size={20} color={BRAND} />
                      <View>
                        <Text style={s.statLabel}>Produits</Text>
                        <Text style={s.statValue}>
                          {(() => {
                            const rawProd = order.prod || [];
                            const products = (Array.isArray(rawProd[0]) && rawProd.length === 1) ? rawProd[0] : rawProd;
                            return products.length || order.nbrProduits?.length || 0;
                          })()}
                        </Text>
                      </View>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statBox}>
                      <Ionicons name="cash-outline" size={20} color={BRAND} />
                      <View>
                        <Text style={s.statLabel}>Total</Text>
                        <Text style={s.statValue}>{formatPrice(order.prixTotal || order.prix)} CFA</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer: status */}
                  <View style={s.cardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.footerLabel}>Livraison</Text>
                      <Text style={s.footerValue}>{order.statusLivraison || '—'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.footerLabel}>Traitement</Text>
                      <Text style={s.footerValue}>{order.etatTraitement || '—'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={BRAND} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────
const s = StyleSheet.create({
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, height: Platform.OS === 'ios' ? 50 : 0, backgroundColor: BRAND, zIndex: 1000 },
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 15, color: '#6b7280' },

  // Header
  header: { backgroundColor: BRAND, paddingTop: Platform.OS === 'ios' ? 72 : 24, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f9fafb' },
  tabActive: { backgroundColor: BRAND_LIGHT, borderWidth: 1.5, borderColor: BRAND },
  tabCancelled: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  tabLabelActive: { color: BRAND },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, backgroundColor: '#e5e7eb' },
  tabBadgeActive: { backgroundColor: BRAND },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  tabBadgeTextActive: { color: '#fff' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Empty / Error states
  stateBox: { justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 8 },
  stateSub: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center', maxWidth: 260 },
  retryBtn: { marginTop: 20, backgroundColor: BRAND, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Order Card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#bbf7d0' },
  promoText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },

  productImagesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, minHeight: 46 },
  productImageWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, position: 'relative' },
  miniProductImg: { width: '100%', height: '100%', borderRadius: 20 },
  extraProductsBadge: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  extraProductsText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  itemCountText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  statBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statDivider: { width: 1, height: 36, backgroundColor: '#e5e7eb', marginHorizontal: 12 },
  statLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#111827' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footerLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  footerValue: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
});
