/**
 * Messagerie boutiques — API + connexion temps réel partagée.
 *
 * UNE seule connexion Socket.IO (namespace /messaging) pour toute l'app, ouverte quand le
 * client est connecté. Les écrans s'abonnent aux événements via useMessagingEvents().
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import apiClient from '../config/api';
import { SOCKET_URL } from '../config/env';

// ─── API ───────────────────────────────────────────────────────────────────────
export const messagingApi = {
  open: (body) => apiClient.post('/api/messaging/conversations', body).then((r) => r.data),
  get: (id) => apiClient.get(`/api/messaging/conversations/${id}`).then((r) => r.data),
  list: () => apiClient.get('/api/messaging/conversations', { params: { limit: 50 } }).then((r) => r.data.data || []),
  messages: (id, before) =>
    apiClient.get(`/api/messaging/conversations/${id}/messages`, { params: { before, limit: 30 } }).then((r) => r.data.data || []),
  send: (id, body) => apiClient.post(`/api/messaging/conversations/${id}/messages`, body).then((r) => r.data.message),
  read: (id) => apiClient.put(`/api/messaging/conversations/${id}/read`).catch(() => {}),
  archive: (id) => apiClient.delete(`/api/messaging/conversations/${id}`),
  unread: () => apiClient.get('/api/messaging/unread').then((r) => r.data.count || 0),
  registerPushToken: (token) => apiClient.post('/api/messaging/push-token', { token }),
  unregisterPushToken: (token) => apiClient.delete('/api/messaging/push-token', { data: { token } }).catch(() => {}),
  uploadAudio: async (uri, durationMs) => {
    const ext = (String(uri).split('?')[0].split('.').pop() || 'm4a').toLowerCase();
    const fd = new FormData();
    fd.append('audio', { uri, name: `vocal-${Date.now()}.${ext}`, type: ext === 'webm' ? 'audio/webm' : 'audio/mp4' });
    const r = await apiClient.post('/api/messaging/upload-audio', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
    return { url: r.data.url, durationMs: r.data.durationMs || durationMs || 0 };
  },
  upload: async (asset) => {
    const fd = new FormData();
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    fd.append('image', { uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' });
    const r = await apiClient.post('/api/messaging/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
    return r.data.url;
  },
};

// ─── Connexion partagée ────────────────────────────────────────────────────────
let socket = null;
let socketToken = null;
const listeners = new Map(); // event → Set(handler)
const EVENTS = ['message:new', 'message:read', 'conversation:updated', 'typing', 'unread:count', 'store:presence'];

// État observable (connexion + non-lus) pour les composants
let state = { connected: false, unread: 0 };
const subscribers = new Set();
const setState = (patch) => {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn());
};
const subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };
const getState = () => state;

const dispatch = (event, data) => listeners.get(event)?.forEach((fn) => { try { fn(data); } catch { /* écran démonté */ } });

async function readToken() {
  try {
    const u = JSON.parse((await AsyncStorage.getItem('userEcomme')) || 'null');
    return u?.token && !String(u.token).startsWith('otp-verified-') ? u.token : null;
  } catch {
    return null;
  }
}

/** Ouvre (ou rouvre avec le bon compte) la connexion temps réel */
export async function connectMessaging() {
  const token = await readToken();
  if (!token) return disconnectMessaging();
  if (socket && socketToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  disconnectMessaging();
  socketToken = token;
  socket = io(`${SOCKET_URL}/messaging`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5, // réseaux mobiles : étale les reconnexions
    timeout: 20000,
  });
  socket.on('connect', () => setState({ connected: true }));
  socket.on('disconnect', (reason) => {
    setState({ connected: false });
    if (reason === 'io server disconnect') setTimeout(() => socket?.connect(), 2000);
  });
  socket.on('unread:count', ({ count }) => setState({ unread: count || 0 }));
  EVENTS.forEach((ev) => socket.on(ev, (data) => dispatch(ev, data)));
  return socket;
}

export function disconnectMessaging() {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
  }
  socket = null;
  socketToken = null;
  setState({ connected: false, unread: 0 });
}

export const getMessagingSocket = () => socket;

/** Émission avec accusé ; rejette si pas de réponse (repli HTTP côté appelant) */
export function emitWithAck(event, payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return reject(new Error('offline'));
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => (err ? reject(err) : resolve(res)));
  });
}
export const emit = (event, payload) => { if (socket?.connected) socket.emit(event, payload); };

export const setUnread = (count) => setState({ unread: Math.max(0, count || 0) });

// ─── Hooks ─────────────────────────────────────────────────────────────────────
/** { connected, unread } */
export function useMessagingState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Abonnement aux événements temps réel ({ 'message:new': fn, ... }) */
export function useMessagingEvents(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const wrapped = {};
    Object.keys(ref.current || {}).forEach((ev) => {
      wrapped[ev] = (data) => ref.current?.[ev]?.(data);
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev).add(wrapped[ev]);
    });
    return () => Object.entries(wrapped).forEach(([ev, fn]) => listeners.get(ev)?.delete(fn));
  }, []);
}

/**
 * Garde la connexion ouverte tant que le client est connecté ; la rouvre au retour
 * au premier plan (Android coupe les sockets en arrière-plan) et recharge les non-lus.
 */
export function useMessagingConnection(userId) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!userId) {
      disconnectMessaging();
      return undefined;
    }
    let alive = true;
    const refresh = () => {
      connectMessaging().then(() => alive && force((x) => x + 1));
      messagingApi.unread().then((n) => alive && setUnread(n)).catch(() => {});
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { alive = false; sub.remove(); };
  }, [userId]);
}
