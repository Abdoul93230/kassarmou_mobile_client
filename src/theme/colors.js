/**
 * Palettes de couleurs Ihambaobab pour modes Clair et Sombre.
 * Charte : turquoise #30A08B · sahara sand #B2905F · baobab wood #B17236.
 */

export const lightColors = {
  // Marque
  primary: '#30A08B',
  primaryDark: '#1F7A69',
  primaryDeep: '#0F3D34',
  primarySoft: '#E8F5F2',
  sand: '#B2905F',
  sandSoft: '#F6F0E7',
  wood: '#B17236',
  woodSoft: '#F7EDE3',

  // Neutres (légèrement chauds pour s'accorder au sable)
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F2EF',
  border: '#ECEAE5',
  divider: '#F1EFEB',
  text: '#16181D',
  textSecondary: '#5B6170',
  textMuted: '#9A9FAB',
  textInverse: '#FFFFFF', // texte sur fond coloré (boutons, badges, photos)
  inverse: '#16181D',     // fond « inversé » (puce active, badge de quantité)
  onInverse: '#FFFFFF',   // texte sur fond inversé

  // États
  success: '#1E9E6A',
  successSoft: '#E6F6EF',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  warning: '#E8A13A',
  warningSoft: '#FDF4E6',
  star: '#F5B301',

  overlay: 'rgba(10, 14, 18, 0.45)',
  scrim: 'rgba(10, 14, 18, 0.06)',
  card: '#FFFFFF',
};

export const darkColors = {
  // Marque (légèrement rehaussée pour préserver l'éclat sur fond sombre)
  primary: '#35B29B',
  primaryDark: '#2BA08B',
  primaryDeep: '#185449',
  primarySoft: 'rgba(53, 178, 155, 0.16)',
  sand: '#C5A473',
  sandSoft: 'rgba(197, 164, 115, 0.16)',
  wood: '#C78546',
  woodSoft: 'rgba(199, 133, 70, 0.16)',

  // Neutres sombres (haut de gamme, ardoise foncée feutrée)
  bg: '#0F1216',
  surface: '#181C23',
  surfaceAlt: '#212732',
  border: '#2A3240',
  divider: '#232934',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF', // reste blanc : posé sur le turquoise, le rouge ou une photo
  inverse: '#F3F4F6',
  onInverse: '#0F1216',

  // États
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.18)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.18)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.18)',
  star: '#FBBF24',

  overlay: 'rgba(0, 0, 0, 0.75)',
  scrim: 'rgba(255, 255, 255, 0.05)',
  card: '#181C23',
};

// Variable globale interne gardant la palette active
let activeColors = lightColors;

export const setActiveColors = (newColors) => {
  activeColors = newColors;
};

export const getActiveColors = () => activeColors;

/**
 * Proxy rétro-compatible : tout import direct `colors.bg` lit la palette active à l'exécution.
 */
export const colors = new Proxy(lightColors, {
  get(target, prop) {
    if (prop in activeColors) {
      return activeColors[prop];
    }
    return target[prop];
  },
});
