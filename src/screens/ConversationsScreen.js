import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState, IconButton, PressableScale, SmartImage, Skeleton, Text } from '../ui';
import { colors, GUTTER, radius } from '../theme';
import { messagingApi, setUnread, useMessagingEvents } from '../services/messaging';

const when = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const y = new Date(); y.setDate(now.getDate() - 1);
  if (date.toDateString() === y.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** Messages : conversations avec les boutiques + support Ihambaobab */
export default function ConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const [rows, setRows] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [typing, setTyping] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await messagingApi.list();
      setRows(data);
      setUnread(data.reduce((s, c) => s + (c.unread || 0), 0));
    } catch {
      setRows((r) => r || []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (user) load(); }, [load, user]));

  useMessagingEvents({
    'conversation:updated': (c) => setRows((prev) => (prev ? [c, ...prev.filter((x) => x.id !== c.id)] : prev)),
    typing: ({ conversationId, typing: on, from, kind }) => {
      if (from === 'store') setTyping((t) => ({ ...t, [conversationId]: on ? (kind === 'audio' ? 'enregistre un vocal…' : 'écrit…') : false }));
    },
  });

  const archive = (c) => Alert.alert('Retirer la conversation ?', `Elle réapparaîtra si ${c.store?.name || 'la boutique'} vous écrit.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Retirer', style: 'destructive', onPress: () => { messagingApi.archive(c.id).catch(() => {}); setRows((p) => p.filter((x) => x.id !== c.id)); } },
  ]);

  if (!user) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyState
          icon="chatbubbles-outline"
          title="Vos messages"
          message="Connectez-vous pour écrire aux boutiques et au support, et suivre leurs réponses."
          actionLabel="Se connecter"
          onAction={() => navigation.navigate('QuickAuth', { returnScreen: 'Messages' })}
        />
      </View>
    );
  }

  const support = (
    <PressableScale onPress={() => navigation.navigate('Support')} scaleTo={0.985} style={styles.row} accessibilityLabel="Support Ihambaobab">
      <View style={[styles.avatar, styles.supportAvatar]}><Ionicons name="headset" size={22} color={colors.textInverse} /></View>
      <View style={styles.flex}>
        <Text variant="title">Support Ihambaobab</Text>
        <Text variant="small" color="textSecondary" numberOfLines={1}>Commande, paiement, livraison : on vous aide</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressableScale>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Messages</Text>
      </View>
      <FlatList
        data={rows || []}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {support}
            {rows?.length ? <Text variant="caption" color="textMuted" style={styles.section}>BOUTIQUES</Text> : null}
          </>
        }
        ListEmptyComponent={rows === null ? (
          <View style={styles.skeletons}>{[0, 1, 2].map((i) => <Skeleton key={i} height={64} style={styles.skeleton} />)}</View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={36} color={colors.textMuted} />
            <Text variant="title" align="center" style={styles.emptyTitle}>Une question sur un produit ?</Text>
            <Text variant="small" color="textSecondary" align="center">
              Touchez « Contacter la boutique » sur une fiche produit ou une boutique : la discussion apparaîtra ici.
            </Text>
          </View>
        )}
        renderItem={({ item: c }) => (
          <PressableScale
            onPress={() => navigation.navigate('StoreChat', { conversationId: c.id, sellerId: c.store?.id, storeName: c.store?.name, storeLogo: c.store?.logo })}
            onLongPress={() => archive(c)}
            scaleTo={0.985}
            style={styles.row}
          >
            {c.store?.logo ? <SmartImage uri={c.store.logo} width={52} style={styles.avatar} /> : (
              <View style={[styles.avatar, styles.initial]}><Text variant="h3" color="primaryDark">{(c.store?.name || 'B').charAt(0).toUpperCase()}</Text></View>
            )}
            <View style={styles.flex}>
              <View style={styles.line}>
                <Text variant="title" numberOfLines={1} style={styles.flex}>{c.store?.name || 'Boutique'}</Text>
                <Text variant="caption" color={c.unread ? 'primary' : 'textMuted'}>{when(c.lastMessage?.at || c.updatedAt)}</Text>
              </View>
              <View style={styles.line}>
                <Text variant="small" color={typing[c.id] ? 'primary' : c.unread ? 'text' : 'textSecondary'} numberOfLines={1} style={[styles.flex, c.unread && styles.bold]}>
                  {typing[c.id] ? typing[c.id] : `${c.lastMessage?.from === 'client' ? 'Vous : ' : ''}${c.lastMessage?.text || ''}`}
                </Text>
                {c.unread ? <View style={styles.badge}><Text variant="caption" color="textInverse" style={styles.badgeText}>{c.unread > 99 ? '99+' : c.unread}</Text></View> : null}
              </View>
            </View>
          </PressableScale>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  section: { paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: 6, letterSpacing: 0.8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  supportAvatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bold: { fontWeight: '600' },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  skeletons: { padding: GUTTER, gap: 10 },
  skeleton: { borderRadius: radius.md },
  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 48, gap: 8 },
  emptyTitle: { marginTop: 6 },
});
