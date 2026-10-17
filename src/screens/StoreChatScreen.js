import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { IconButton, PressableScale, SmartImage, Text } from '../ui';
import { colors, fonts, GUTTER, radius } from '../theme';
import { emit, emitWithAck, messagingApi, useMessagingEvents, useMessagingState } from '../services/messaging';
import { registerDevicePush } from '../services/pushNotifications';

const STARTERS = ['Est-il toujours disponible ?', 'Quels sont les délais de livraison ?', "Avez-vous d'autres tailles ou couleurs ?", 'Pouvez-vous me montrer plus de photos ?'];
const PUSH_ASKED = 'ihamPushAsked';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;
const time = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === y.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const tempId = () => `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function Card({ card, mine, onPress }) {
  if (!card) return null;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, mine && styles.cardMine]}>
      {card.image ? <SmartImage uri={card.image} width={56} style={styles.cardImg} /> : (
        <View style={[styles.cardImg, styles.cardIcon]}>
          <Ionicons name={card.kind === 'order' ? 'receipt-outline' : 'pricetag-outline'} size={20} color={colors.primaryDark} />
        </View>
      )}
      <View style={styles.flex}>
        <Text variant="smallMedium" numberOfLines={2}>{card.title}</Text>
        {card.subtitle ? <Text variant="caption" color="textSecondary" numberOfLines={1}>{card.subtitle}</Text> : null}
        <Text variant="smallMedium" color="primaryDark">{fcfa(card.price)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </PressableScale>
  );
}

/** Conversation avec une boutique (temps réel) */
export default function StoreChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const params = route.params || {};
  const { connected } = useMessagingState();
  const [conv, setConv] = useState(null); // { id, store }
  const [store, setStore] = useState(params.storeName ? { id: params.sellerId, name: params.storeName, logo: params.storeLogo } : null);
  const [messages, setMessages] = useState([]); // du plus récent au plus ancien (liste inversée)
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null); // carte produit / commande à joindre au prochain message
  const [text, setText] = useState('');
  const [online, setOnline] = useState(false);
  const [storeTyping, setStoreTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const convIdRef = useRef(null);
  const typingTimer = useRef(null);
  const storeTypingTimer = useRef(null);
  const focused = useRef(false);

  // ── Chargement ──
  const load = useCallback(async () => {
    setError(null);
    try {
      let c;
      let ctx = null;
      let storeOnline = false;
      if (params.conversationId) {
        const r = await messagingApi.get(params.conversationId);
        c = r.conversation; storeOnline = r.storeOnline;
      } else {
        const r = await messagingApi.open({ sellerId: params.sellerId, productId: params.productId, orderId: params.orderId });
        c = r.conversation; ctx = r.context; storeOnline = r.storeOnline;
      }
      convIdRef.current = c.id;
      setConv(c);
      setStore(c.store);
      setOnline(!!storeOnline);
      setContext(ctx);
      const rows = await messagingApi.messages(c.id);
      setMessages(rows);
      setHasMore(rows.length >= 30);
      if (focused.current) emit('conversation:view', { conversationId: c.id });
      messagingApi.read(c.id);
    } catch (e) {
      setError(e?.response?.data?.message || 'Impossible d’ouvrir la conversation.');
    } finally {
      setLoading(false);
    }
  }, [params.conversationId, params.sellerId, params.productId, params.orderId]);

  useEffect(() => { load(); }, [load]);

  // Écran visible : pas de push, messages lus au fil de l'eau
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (convIdRef.current) emit('conversation:view', { conversationId: convIdRef.current });
    return () => {
      focused.current = false;
      emit('conversation:leave', {});
    };
  }, []));

  // Reconnexion : on se signale de nouveau et on récupère ce qui a été manqué
  const wasConnected = useRef(connected);
  useEffect(() => {
    if (connected && !wasConnected.current && convIdRef.current) {
      if (focused.current) emit('conversation:view', { conversationId: convIdRef.current });
      messagingApi.messages(convIdRef.current).then((rows) => setMessages((prev) => {
        const pending = prev.filter((m) => m.pending || m.failed);
        return [...pending, ...rows];
      })).catch(() => {});
    }
    wasConnected.current = connected;
  }, [connected]);

  // ── Temps réel ──
  useMessagingEvents({
    'message:new': ({ conversationId, message }) => {
      if (conversationId !== convIdRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        const i = message.clientTempId ? prev.findIndex((m) => m.clientTempId === message.clientTempId) : -1;
        if (i >= 0) { const n = [...prev]; n[i] = message; return n; }
        return [message, ...prev];
      });
      if (message.from === 'store') {
        setStoreTyping(false);
        Haptics.selectionAsync().catch(() => {});
        if (focused.current) messagingApi.read(conversationId);
      }
    },
    'message:read': ({ conversationId, by, at }) => {
      if (conversationId !== convIdRef.current || by !== 'store') return;
      setMessages((prev) => prev.map((m) => (m.from === 'client' && !m.readAt && !m.pending ? { ...m, readAt: at } : m)));
    },
    typing: ({ conversationId, typing, from }) => {
      if (conversationId !== convIdRef.current || from !== 'store') return;
      setStoreTyping(typing);
      clearTimeout(storeTypingTimer.current);
      if (typing) storeTypingTimer.current = setTimeout(() => setStoreTyping(false), 8000);
    },
    'store:presence': ({ sellerId, online: on }) => {
      if (store?.id && String(sellerId) === String(store.id)) setOnline(on);
    },
  });

  const loadOlder = async () => {
    if (!hasMore || !convIdRef.current || !messages.length) return;
    setHasMore(false);
    const last = messages.filter((m) => !m.pending && !m.failed).pop();
    const rows = await messagingApi.messages(convIdRef.current, last?.id).catch(() => []);
    setMessages((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
    setHasMore(rows.length >= 30);
  };

  // ── Envoi ──
  const askPushOnce = async () => {
    try {
      if (await AsyncStorage.getItem(PUSH_ASKED)) return;
      await AsyncStorage.setItem(PUSH_ASKED, '1');
      await registerDevicePush({ ask: true });
    } catch { /* facultatif */ }
  };

  const deliver = async (msg) => {
    const body = {
      text: msg.text, attachments: msg.attachments, clientTempId: msg.clientTempId,
      productId: msg.card?.kind === 'product' ? msg.card.id : undefined,
      orderId: msg.card?.kind === 'order' ? msg.card.id : undefined,
    };
    try {
      let saved;
      try {
        const ack = await emitWithAck('message:send', { conversationId: convIdRef.current, ...body });
        if (!ack?.ok) throw new Error(ack?.error || 'refusé');
        saved = ack.message;
      } catch {
        saved = await messagingApi.send(convIdRef.current, body); // repli HTTP
      }
      setMessages((prev) => prev.map((m) => (m.clientTempId === msg.clientTempId ? saved : m)));
      askPushOnce();
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.clientTempId === msg.clientTempId ? { ...m, pending: false, failed: true } : m)));
      Toast.show({ type: 'error', text1: 'Message non envoyé', text2: e?.response?.data?.message || 'Touchez le message pour réessayer.' });
    }
  };

  const send = (value = text, extra = {}) => {
    const message = String(value || '').trim();
    if ((!message && !extra.attachments?.length) || !convIdRef.current) return;
    const id = tempId();
    const msg = {
      id, clientTempId: id, from: 'client', text: message, attachments: extra.attachments || [],
      card: context, createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [msg, ...prev]);
    setText('');
    setContext(null);
    emit('typing:stop', { conversationId: convIdRef.current });
    deliver(msg);
  };

  const retry = (m) => {
    setMessages((prev) => prev.map((x) => (x.clientTempId === m.clientTempId ? { ...x, failed: false, pending: true } : x)));
    deliver(m);
  };

  const onType = (v) => {
    setText(v);
    if (!convIdRef.current) return;
    emit('typing:start', { conversationId: convIdRef.current });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emit('typing:stop', { conversationId: convIdRef.current }), 2500);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'info', text1: 'Accès aux photos refusé', text2: 'Autorisez-le dans les réglages pour envoyer une photo.' });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false });
    if (r.canceled || !r.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await messagingApi.upload(r.assets[0]);
      send(text, { attachments: [url] });
    } catch {
      Toast.show({ type: 'error', text1: 'Photo non envoyée', text2: 'Vérifiez votre connexion.' });
    } finally {
      setUploading(false);
    }
  };

  const openCard = (card) => {
    if (!card?.id) return;
    if (card.kind === 'product') navigation.navigate('ProductDetail', { productId: card.id });
    else navigation.navigate('OrderDetail', { orderId: card.id });
  };

  // Séparateurs de jour (liste inversée)
  const rows = useMemo(() => {
    const out = [];
    messages.forEach((m, i) => {
      out.push({ ...m, kind: 'msg' });
      const next = messages[i + 1];
      const day = new Date(m.createdAt).toDateString();
      if (!next || new Date(next.createdAt).toDateString() !== day) out.push({ id: `day-${day}`, kind: 'day', date: m.createdAt });
    });
    return out;
  }, [messages]);
  const lastMine = messages.find((m) => m.from === 'client' && !m.pending && !m.failed);

  const storeName = store?.name || 'Boutique';
  const status = storeTyping ? 'écrit…' : online ? 'En ligne' : 'Vous répond ici dès que possible';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <PressableScale
          style={styles.headerStore}
          scaleTo={0.98}
          onPress={() => store?.id && navigation.navigate('Boutique', { sellerId: store.id, storeName: store.name })}
          accessibilityLabel={`Voir la boutique ${storeName}`}
        >
          {store?.logo ? <SmartImage uri={store.logo} width={40} style={styles.avatar} /> : (
            <View style={[styles.avatar, styles.avatarInitial]}><Text variant="title" color="primaryDark">{storeName.charAt(0).toUpperCase()}</Text></View>
          )}
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1}>{storeName}</Text>
            <View style={styles.status}>
              {online || storeTyping ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
              <Text variant="caption" color={storeTyping ? 'primary' : 'textSecondary'} numberOfLines={1}>{status}</Text>
            </View>
          </View>
        </PressableScale>
        {!connected ? <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} /> : null}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text variant="body" color="textSecondary" align="center">{error}</Text>
          <PressableScale onPress={() => { setLoading(true); load(); }} style={styles.retryBtn}><Text variant="smallMedium" color="textInverse">Réessayer</Text></PressableScale>
        </View>
      ) : (
        <FlatList
          data={rows}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={storeTyping ? (
            <View style={[styles.bubbleRow, styles.left]}><View style={[styles.bubble, styles.theirs]}><Text variant="small" color="textMuted">{storeName} écrit…</Text></View></View>
          ) : null}
          ListFooterComponent={
            <View style={styles.safety}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primaryDark} />
              <Text variant="caption" color="primaryDeep" style={styles.flex}>
                Échangez et payez uniquement sur Ihambaobab : votre achat reste protégé. Les numéros et liens externes sont masqués.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'day') return <Text variant="caption" color="textMuted" align="center" style={styles.day}>{dayLabel(item.date)}</Text>;
            if (item.from === 'system') return <Text variant="caption" color="textMuted" align="center" style={styles.day}>{item.text}</Text>;
            const mine = item.from === 'client';
            const Wrapper = item.failed ? PressableScale : View;
            return (
              <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
                <Wrapper onPress={item.failed ? () => retry(item) : undefined} style={[styles.bubble, mine ? styles.mine : styles.theirs, item.failed && styles.failed]}>
                  <Card card={item.card} mine={mine} onPress={() => openCard(item.card)} />
                  {(item.attachments || []).map((u) => <SmartImage key={u} uri={u} width={240} style={styles.photo} />)}
                  {item.text ? <Text variant="body" color={mine ? 'textInverse' : 'text'}>{item.text}</Text> : null}
                  {!mine && item.signature ? <Text variant="caption" color="textMuted" style={styles.signature}>— {item.signature}</Text> : null}
                  <Text variant="caption" color={mine ? 'textInverse' : 'textMuted'} style={styles.time}>
                    {item.failed ? 'Non envoyé · toucher pour réessayer' : item.pending ? 'Envoi…' : time(item.createdAt)}
                    {mine && lastMine?.id === item.id ? (item.readAt ? ' · Lu' : ' · Envoyé') : ''}
                  </Text>
                </Wrapper>
              </View>
            );
          }}
        />
      )}

      {!loading && !error && messages.length === 0 ? (
        <View style={styles.quick}>
          {STARTERS.map((q) => (
            <PressableScale key={q} onPress={() => send(q)} style={styles.quickChip} scaleTo={0.96}>
              <Text variant="smallMedium" color="primaryDark">{q}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}

      {context ? (
        <View style={styles.contextBar}>
          <Ionicons name={context.kind === 'order' ? 'receipt-outline' : 'pricetag-outline'} size={16} color={colors.primaryDark} />
          <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.flex}>
            À propos de : <Text variant="smallMedium">{context.title}</Text>
          </Text>
          <IconButton name="close" size={32} iconSize={16} onPress={() => setContext(null)} bg="transparent" accessibilityLabel="Ne pas joindre" />
        </View>
      ) : null}

      {!error ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <PressableScale onPress={pickPhoto} disabled={uploading || loading} scaleTo={0.9} style={styles.attach} accessibilityLabel="Envoyer une photo">
            {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="image-outline" size={22} color={colors.textSecondary} />}
          </PressableScale>
          <TextInput
            value={text}
            onChangeText={onType}
            placeholder={`Écrire à ${storeName}…`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            style={styles.input}
            editable={!loading}
          />
          <PressableScale
            onPress={() => send()}
            disabled={!text.trim() || loading}
            scaleTo={0.9}
            style={[styles.send, (!text.trim() || loading) && styles.sendOff]}
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="send" size={18} color={colors.textInverse} />
          </PressableScale>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingBottom: 10,
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerStore: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarInitial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  loader: { marginTop: 40 },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill },
  list: { paddingHorizontal: GUTTER, paddingVertical: 12 },
  safety: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, marginBottom: 10,
    borderRadius: radius.lg, backgroundColor: colors.primarySoft,
  },
  day: { marginVertical: 10, textTransform: 'capitalize' },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  failed: { opacity: 0.7, borderWidth: 1, borderColor: colors.danger },
  time: { opacity: 0.75, alignSelf: 'flex-end', marginTop: 2, fontSize: 10 },
  signature: { marginTop: 3, fontSize: 11 },
  photo: { width: 220, height: 220, borderRadius: 12, marginBottom: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, marginBottom: 6, minWidth: 220,
    borderRadius: 12, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  cardMine: { backgroundColor: colors.surface },
  cardImg: { width: 48, height: 48, borderRadius: 8 },
  cardIcon: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: GUTTER, paddingBottom: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  contextBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: GUTTER, paddingRight: 8, paddingVertical: 4,
    backgroundColor: colors.sandSoft, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: GUTTER, paddingTop: 10,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  attach: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    borderRadius: 22, backgroundColor: colors.bg, fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
