import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useMyOrdersQuery } from '../redux/catalogApi';
import useReorder from '../hooks/useReorder';
import StageBadge from '../components/orders/StageBadge';
import { Button, Chip, EmptyState, IconButton, PressableScale, Skeleton, SmartImage, Text } from '../ui';
import { formatPrice } from '../utils/formatPrice';
import { formatDate, orderDate, orderItemsCount, orderPreview, orderStage } from '../utils/orders';
import { colors, GUTTER, radius, shadows, useTheme, themedStyles } from '../theme';

const TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'unpaid', label: 'À payer' },
  { key: 'processing', label: 'Préparation' },
  { key: 'shipping', label: 'Livraison' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'cancelled', label: 'Annulées' },
];

const OrderCard = React.memo(function OrderCard({ order, onOpen, onPay }) {
  const { colors } = useTheme();
  const stage = orderStage(order);
  const preview = orderPreview(order);
  const count = orderItemsCount(order);
  return (
    <PressableScale onPress={() => onOpen(order)} scaleTo={0.99} style={[styles.card, { backgroundColor: colors.surface }]} accessibilityLabel={`Commande ${order.reference}`}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text variant="title">Commande n° {String(order.reference || order._id).slice(-8)}</Text>
          <Text variant="caption" color="textMuted">{formatDate(orderDate(order))}</Text>
        </View>
        <StageBadge stage={stage} />
      </View>

      <View style={styles.thumbs}>
        {preview.slice(0, 4).map((p, i) => (
          <SmartImage key={`${p._id || i}-${i}`} uri={p.colorImage || p.imageUrl || p.image1 || p.image} width={56} style={styles.thumb} />
        ))}
        {preview.length > 4 ? (
          <View style={[styles.thumb, styles.more, { backgroundColor: colors.surfaceAlt }]}><Text variant="smallMedium" color="textSecondary">+{preview.length - 4}</Text></View>
        ) : null}
      </View>

      <View style={styles.cardFoot}>
        <Text variant="small" color="textSecondary">{count} article{count > 1 ? 's' : ''}</Text>
        <Text variant="price">{formatPrice(order.prix)} F</Text>
      </View>

      {stage.key === 'unpaid' ? (
        <Button title="Payer maintenant" icon="card-outline" size="sm" full onPress={() => onPay(order)} style={styles.payBtn} />
      ) : null}
    </PressableScale>
  );
});

/** Historique des commandes, filtrable par statut */
export default function OrdersScreen({ navigation, route }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const { data, isLoading, isFetching, isError, refetch } = useMyOrdersQuery(userId, { skip: !userId, refetchOnMountOrArgChange: true });
  const [tab, setTab] = useState(route?.params?.stage || 'all');
  const reorder = useReorder(navigation);

  const list = useMemo(
    () => (tab === 'all' ? data || [] : (data || []).filter((o) => orderStage(o).key === tab)),
    [data, tab],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Mes commandes</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((t) => <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(o) => o._id}
        renderItem={({ item }) => (
          <OrderCard order={item} onOpen={(o) => navigation.navigate('OrderDetail', { orderId: o._id, order: o })} onPay={(o) => reorder(o, 'pay')} />
        )}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
        initialNumToRender={6}
        windowSize={7}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>{[0, 1, 2].map((i) => <Skeleton key={i} height={170} radius={radius.lg} />)}</View>
          ) : isError ? (
            <EmptyState icon="cloud-offline-outline" title="Chargement impossible" message="Vérifiez votre connexion puis réessayez." actionLabel="Réessayer" onAction={refetch} />
          ) : (
            <EmptyState
              icon="cube-outline"
              title={tab === 'all' ? 'Aucune commande' : 'Rien dans cette catégorie'}
              message={tab === 'all' ? 'Vos achats apparaîtront ici avec leur suivi.' : 'Vos autres commandes sont dans « Toutes ».'}
              actionLabel={tab === 'all' ? 'Commencer mes achats' : undefined}
              onAction={tab === 'all' ? () => navigation.navigate('MainTabs', { screen: 'Home' }) : undefined}
            />
          )
        }
        ListFooterComponent={
          list.length ? (
            <View style={styles.help}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text variant="caption" color="textMuted" style={styles.flex}>Touchez une commande pour voir son suivi détaillé.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 6 },
  tabs: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  card: { marginHorizontal: GUTTER, marginBottom: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  more: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  payBtn: { marginTop: 12 },
  skeletons: { paddingHorizontal: GUTTER, gap: 12 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: GUTTER, paddingTop: 6 },
}));
