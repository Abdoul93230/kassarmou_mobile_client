/**
 * Design system Ihambaobab — tokens uniques pour toute l'app.
 * Charte : turquoise #30A08B · sahara sand #B2905F · baobab wood #B17236 · police Museo Moderno.
 * Règle : aucun écran ne doit écrire de couleur, taille ou rayon en dur — tout vient d'ici.
 */
import { Platform } from 'react-native';
import { colors, lightColors, darkColors } from './colors';
export { colors, lightColors, darkColors };
export { ThemeProvider, useTheme, ThemeContext } from './ThemeContext';
export { themedStyles } from './themedStyles';

export const gradients = {
  brand: ['#30A08B', '#1F7A69'],
  hero: ['#0F3D34', '#1F7A69', '#30A08B'],
  sunset: ['#B17236', '#B2905F'],
  promo: ['#E5484D', '#B17236'],
  imageFade: ['transparent', 'rgba(0,0,0,0.55)'],
};

export const fonts = {
  // Museo Moderno : marque, titres, prix. Inter : texte courant (lisibilité maximale).
  display: 'MuseoModerno_700Bold',
  displayMedium: 'MuseoModerno_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  h1: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  price: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  priceLg: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 32, pill: 999 };

const shadow = (elevation, opacity, blur, y) =>
  Platform.select({
    ios: { shadowColor: '#0B1A17', shadowOpacity: opacity, shadowRadius: blur, shadowOffset: { width: 0, height: y } },
    android: { elevation, shadowColor: '#0B1A17' },
    default: {},
  });

export const shadows = {
  none: {},
  sm: shadow(2, 0.06, 6, 2),
  md: shadow(5, 0.08, 14, 6),
  lg: shadow(10, 0.12, 24, 12),
};

/** Marge latérale standard des écrans */
export const GUTTER = space.lg;

/** Durées d'animation cohérentes */
export const motion = { fast: 140, base: 220, slow: 360 };

const theme = { colors, gradients, fonts, type, space, radius, shadows, motion, GUTTER };
export default theme;
