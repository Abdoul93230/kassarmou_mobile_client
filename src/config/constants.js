// Configuration Stripe
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RKO4OFMhcWQWlbyWHqDypco5L0DrXDS4d6hEDfemzIzkzcKlodzbynkRLP2bsJGi0cxL4oy7CtJnhIGnq6tjH2A00AftfkRRQ';

// Clés de stockage AsyncStorage
export const STORAGE_KEYS = {
  USER: 'userEcomme',
  PANIER: 'panier',
  THEME: 'theme',
};

// Couleurs du thème Ihambaobab - Couleurs du drapeau du Niger
export const COLORS = {
  // 🎨 COULEURS PRINCIPALES (Branding Niger)
  primary: '#30A08B',        // Turquoise - Couleur principale
  secondary: '#B2905F',      // Sahara Sand - Couleur secondaire
  tertiary: '#B17236',       // Baobab Wood - Couleur tertiaire
  
  // Couleurs de base
  white: '#FFFFFF',
  black: '#000000',
  
  // 📝 Dérivées pour l'interface
  background: '#FFFFFF',
  backgroundAlt: '#F5F5F5',
  text: '#000000',
  textLight: '#718096',
  textMuted: '#999999',
  border: '#E2E8F0',
  
  // 🎯 États
  success: '#30A08B',        // Turquoise - Succès
  error: '#E74C3C',          // Rouge - Erreurs
  warning: '#B17236',        // Baobab Wood - Avertissements
  info: '#B2905F',           // Sahara Sand - Informations
  
  // Versions claires (pour arrière-plans)
  primaryLight: 'rgba(48, 160, 139, 0.1)',    // Turquoise clair
  secondaryLight: 'rgba(178, 144, 95, 0.1)',  // Sahara Sand clair
  tertiaryLight: 'rgba(177, 114, 54, 0.1)',   // Baobab Wood clair
  
  // Transparences
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.7)',
};

// Tailles
export const SIZES = {
  base: 8,
  font: 14,
  radius: 8,
  padding: 16,
};

// Statuts des commandes
export const ORDER_STATUS = {
  EN_ATTENTE: 'en attente',
  CONFIRMEE: 'confirmée',
  EN_COURS: 'en cours de livraison',
  LIVREE: 'livrée',
  ANNULEE: 'annulée',
};

// Statuts des paiements
export const PAYMENT_STATUS = {
  EN_ATTENTE: 'en attente',
  PAYE: 'payé',
  ECHEC: 'échec',
  REMBOURSE: 'remboursé',
};
