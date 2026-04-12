// Configuration Stripe
// export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RKO4OFMhcWQWlbyWHqDypco5L0DrXDS4d6hEDfemzIzkzcKlodzbynkRLP2bsJGi0cxL4oy7CtJnhIGnq6tjH2A00AftfkRRQ';
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SgXbBE3LmrX4AGzOpyi2PBGkrd06DxwhblPyMCk1ma5H6DiFhx55nv9O3M3tcUlvrEMhH4dW5R0cf1fr16haHJx00gcrxUXY0';

// Clés de stockage AsyncStorage
export const STORAGE_KEYS = {
  USER: 'userEcomme',
  PANIER: 'panier',
  THEME: 'theme',
};

// Couleurs du thème Kassarmou - Couleurs du drapeau du Niger
export const COLORS = {
  // 🎨 COULEURS PRINCIPALES (Drapeau Niger: Orange, Blanc, Vert)
  primary: '#E87E04',        // Orange du drapeau Niger
  secondary: '#008751',      // Vert du drapeau Niger
  tertiary: '#62aca2',       // Teal clair - Arrière-plans et ambiance
  
  // Couleurs de base
  white: '#FFFFFF',          // Blanc du drapeau Niger
  black: '#000000',          // Noir
  
  // 📝 Dérivées pour l'interface
  background: '#FFFFFF',     // Blanc
  backgroundAlt: '#F5F5F5',  // Gris très clair
  text: '#000000',           // Noir
  textLight: '#718096',      // Gris moyen
  textMuted: '#999999',      // Gris clair
  border: '#E2E8F0',         // Bordures
  
  // 🎯 États
  success: '#008751',        // Vert - Succès
  error: '#E74C3C',          // Rouge - Erreurs
  warning: '#E87E04',        // Orange - Avertissements
  info: '#62aca2',           // Teal - Informations
  
  // Versions claires (pour arrière-plans)
  primaryLight: '#FFE0B2',   // Orange clair
  secondaryLight: '#CCFFCC', // Vert clair
  tertiaryLight: 'rgba(98, 172, 162, 0.1)',
  
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
