/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          SOURCE UNIQUE DE VÉRITÉ — URLS DE L'APP            ║
 * ║  Toutes les URLs (API, images, socket, site) viennent d'ici. ║
 * ║  Ne jamais écrire une URL en dur dans un écran ou un service.║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Surcharge possible via .env (préfixe EXPO_PUBLIC_ obligatoire) :
 *   EXPO_PUBLIC_API_URL=http://192.168.1.10:8083
 */

const trimSlash = (url) => String(url).replace(/\/+$/, '');

export const API_URL = trimSlash(process.env.EXPO_PUBLIC_API_URL || 'https://api.ihambaobab.com');
export const SOCKET_URL = trimSlash(process.env.EXPO_PUBLIC_SOCKET_URL || API_URL);
export const SITE_URL = trimSlash(process.env.EXPO_PUBLIC_SITE_URL || 'https://www.ihambaobab.com');
export const IMAGES_URL = `${API_URL}/images`;

/** Construit une URL absolue de l'API : apiUrl('/user') → https://api.ihambaobab.com/user */
export const apiUrl = (path = '') => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Construit une URL absolue du site web : siteUrl('/boutique/x') */
export const siteUrl = (path = '') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Paiement iPay (même configuration que payment-page.html côté web) */
export const IPAY = {
  environment: 'live',
  publicKey: 'pk_f83a240bd0df4393b35a819925863e16',
  redirectUrl: siteUrl('/commandesReference'),
  cancelUrl: siteUrl('/error'),
  callbackUrl: apiUrl('/payment_callback2'),
};

/** Image de profil par défaut historique du backend (à ignorer à l'affichage) */
export const LEGACY_DEFAULT_AVATAR = 'https://chagona.onrender.com/images/image-1688253105925-0.jpeg';

/** Contacts officiels (identiques au site web) */
export const SUPPORT = {
  phone: '+22787727501',
  phoneDisplay: '+227 87 72 75 01',
  whatsapp: '22787727501',
  email: 'support@ihambaobab.com',
};

/** App vendeur sur le Play Store */
export const SELLER_APP_ID = 'com.ihambaobab.seller';
