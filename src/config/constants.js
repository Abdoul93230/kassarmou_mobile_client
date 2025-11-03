// Configuration Stripe
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RKO4OFMhcWQWlbyWHqDypco5L0DrXDS4d6hEDfemzIzkzcKlodzbynkRLP2bsJGi0cxL4oy7CtJnhIGnq6tjH2A00AftfkRRQ';

// Clés de stockage AsyncStorage
export const STORAGE_KEYS = {
  USER: 'userEcomme',
  PANIER: 'panier',
  THEME: 'theme',
};

// Couleurs du thème Kassarmou - Palette simplifiée
export const COLORS = {
  // 🎨 COULEURS PRINCIPALES (4 couleurs uniquement)
  primary: '#30A08B',        // Teal - Couleur principale de la marque
  secondary: '#FC913A',      // Orange - Accents et actions importantes
  tertiary: '#62aca2',       // Teal clair - Arrière-plans et ambiance
  
  // Couleurs de base
  white: '#FFFFFF',          // Blanc
  black: '#000000',          // Noir
  
  // 📝 Dérivées pour l'interface (basées sur les 4 principales)
  background: '#FFFFFF',     // Blanc
  backgroundAlt: '#F5F5F5',  // Gris très clair (dérivé)
  text: '#000000',           // Noir
  textLight: '#666666',      // Gris moyen (dérivé)
  textMuted: '#999999',      // Gris clair (dérivé)
  border: '#E0E0E0',         // Bordures (dérivé)
  
  // 🎯 États (réutilisation des couleurs principales)
  success: '#30A08B',        // primary - Succès
  error: '#FC913A',          // secondary - Erreurs/Alertes
  warning: '#FC913A',        // secondary - Avertissements
  info: '#62aca2',           // tertiary - Informations
  
  // Versions claires (pour arrière-plans)
  primaryLight: 'rgba(48, 160, 139, 0.1)',   // primary avec opacité
  secondaryLight: 'rgba(252, 145, 58, 0.1)', // secondary avec opacité
  tertiaryLight: 'rgba(98, 172, 162, 0.1)',  // tertiary avec opacité
  
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
