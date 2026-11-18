import AsyncStorage from '@react-native-async-storage/async-storage';
import { siteUrl } from '../config/env';

const KEY = 'ihamPendingRef';

/** Lien de parrainage : ouvre l'app (ou le site) et préremplit le code à l'inscription */
export const referralLink = (code) => siteUrl(code ? `/?ref=${encodeURIComponent(code)}` : '/');

export const inviteMessage = (code, pointsFilleul) =>
  code
    ? `Je fais mes achats sur Ihambaobab, la marketplace du Niger 🇳🇪 Inscris-toi avec mon lien${pointsFilleul ? ` et gagne ${pointsFilleul} Baobab Points à ta première commande` : ''} : ${referralLink(code)}\nMon code : ${code}`
    : `Je fais mes achats sur Ihambaobab, la marketplace du Niger 🇳🇪 Rejoins-moi : ${referralLink()}`;

/** Code reçu par un lien, gardé jusqu'à l'inscription */
export const savePendingRef = (code) => {
  const c = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
  if (c) AsyncStorage.setItem(KEY, c).catch(() => {});
};
export const getPendingRef = () => AsyncStorage.getItem(KEY).catch(() => null);
export const clearPendingRef = () => AsyncStorage.removeItem(KEY).catch(() => {});
