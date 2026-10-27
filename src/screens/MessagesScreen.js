import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Linking, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import apiClient from '../config/api';
import { SOCKET_URL, SUPPORT } from '../config/env';
import { EmptyState, IconButton, PressableScale, Text } from '../ui';
import { colors, fonts, GUTTER, radius, useTheme, themedStyles } from '../theme';

const QUICK = ['Où en est ma commande ?', 'Je veux modifier mon adresse', 'Problème de paiement', 'Retour / échange'];

const time = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === y.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

/** Messagerie avec le support Ihambaobab (temps réel, même canal que le site web) */
export default function MessagesScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(false);
  const socketRef = useRef(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await apiClient.get(`/getUserMessagesByClefUser/${userId}`);
      setMessages(Array.isArray(r.data) ? r.data : r.data?.data || []);
      apiClient.put('/lecturUserMessage', { userKey: userId }).catch(() => {});
    } catch {
      // affichage conservé ; nouvel essai au prochain événement
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], timeout: 20000 });
    socketRef.current = socket;
    socket.on('connect', () => setOnline(true));
    socket.on('disconnect', () => setOnline(false));
    socket.on('new_message_user', (m) => {
      if (String(m?.data?.clefUser) === String(userId)) {
        load();
        Haptics.selectionAsync().catch(() => {});
      }
    });
    socket.on('delete_message', () => load());
    return () => socket.close();
  }, [load, userId]);

  // Liste inversée (plus récents en bas) avec séparateurs de date
  const rows = useMemo(() => {
    const sorted = [...messages].sort((a, b) => new Date(a.date) - new Date(b.date));
    const out = [];
    let lastDay = null;
    sorted.forEach((m) => {
      const day = new Date(m.date).toDateString();
      if (day !== lastDay) {
        out.push({ _id: `day-${day}`, kind: 'day', date: m.date });
        lastDay = day;
      }
      out.push({ ...m, kind: 'msg' });
    });
    return out.reverse();
  }, [messages]);

  const send = async (value = text) => {
    const message = value.trim();
    if (!message || sending) return;
    setSending(true);
    const optimistic = { _id: `tmp-${Date.now()}`, message, provenance: true, date: new Date().toISOString(), pending: true };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    try {
      const data = { message, clefUser: userId, provenance: true };
      await apiClient.post('/createUserMessage', data);
      socketRef.current?.emit('new_message_u', { data });
      await load();
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(message);
      Toast.show({ type: 'error', text1: 'Message non envoyé', text2: 'Vérifiez votre connexion.' });
    } finally {
      setSending(false);
    }
  };

  if (!userId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <EmptyState
          icon="chatbubbles-outline"
          title="Discutez avec nous"
          message="Connectez-vous pour écrire au support et suivre nos réponses."
          actionLabel="Se connecter"
          onAction={() => navigation.navigate('QuickAuth', { returnScreen: 'Support' })}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <View style={[styles.agent, { backgroundColor: colors.primary }]}><Ionicons name="headset" size={20} color={colors.textInverse} /></View>
        <View style={styles.flex}>
          <Text variant="title">Support Ihambaobab</Text>
          <View style={styles.status}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
            <Text variant="caption" color="textSecondary">{online ? 'En ligne' : 'Hors ligne'}</Text>
          </View>
        </View>
        <IconButton name="logo-whatsapp" color="#25D366" bg={colors.surfaceAlt} onPress={() => Linking.openURL(`https://wa.me/${SUPPORT.whatsapp}`).catch(() => {})} accessibilityLabel="WhatsApp" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rows}
          inverted
          keyExtractor={(m) => m._id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <View style={[styles.welcome, { backgroundColor: colors.primarySoft }]}>
              <Text variant="small" color="textSecondary" align="center">
                👋 Bonjour {String(user?.name || '').split(' ')[0]} ! Posez votre question, notre équipe vous répond ici.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return <Text variant="caption" color="textMuted" align="center" style={styles.day}>{dayLabel(item.date)}</Text>;
            }
            const mine = item.provenance === true;
            return (
              <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
                <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: colors.primary }] : [styles.theirs, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
                  <Text variant="body" color={mine ? 'textInverse' : 'text'}>{item.message}</Text>
                  <Text variant="caption" color={mine ? 'textInverse' : 'textMuted'} style={styles.time}>
                    {item.pending ? 'Envoi…' : time(item.date)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {!loading && messages.length === 0 ? (
        <View style={styles.quick}>
          {QUICK.map((q) => (
            <PressableScale key={q} onPress={() => send(q)} style={[styles.quickChip, { backgroundColor: colors.primarySoft }]} scaleTo={0.96}>
              <Text variant="smallMedium" color="primaryDark">{q}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}

      <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Écrire un message…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          style={[styles.input, { backgroundColor: colors.bg, color: colors.text }]}
        />
        <PressableScale
          onPress={() => send()}
          disabled={!text.trim() || sending}
          scaleTo={0.9}
          style={[styles.send, { backgroundColor: colors.primary }, (!text.trim() || sending) && styles.sendOff]}
          accessibilityLabel="Envoyer"
        >
          <Ionicons name="send" size={18} color={colors.textInverse} />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingBottom: 10,
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  agent: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: GUTTER, paddingVertical: 12 },
  welcome: { padding: 14, marginBottom: 8, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  day: { marginVertical: 10 },
  bubbleRow: { flexDirection: 'row', marginVertical: 3 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  time: { opacity: 0.75, alignSelf: 'flex-end', marginTop: 2, fontSize: 10 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: GUTTER, paddingBottom: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: GUTTER, paddingTop: 10,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  input: {
    flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    borderRadius: 22, backgroundColor: colors.bg, fontFamily: fonts.regular, fontSize: 15, color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
}));
