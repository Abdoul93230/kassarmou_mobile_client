import { StyleSheet } from 'react-native';
import { getActiveColors } from './colors';

/**
 * Feuille de style qui suit le thème (clair / sombre).
 * const styles = themedStyles((colors) => ({ screen: { backgroundColor: colors.bg } }));
 * `styles.screen` renvoie toujours la version de la palette active (calculée une fois par palette).
 * Un StyleSheet.create classique lirait les couleurs une seule fois, au chargement du fichier.
 */
export function themedStyles(factory) {
  const cache = new Map(); // palette → styles
  const current = () => {
    const palette = getActiveColors();
    let sheet = cache.get(palette);
    if (!sheet) {
      sheet = StyleSheet.create(factory(palette));
      cache.set(palette, sheet);
    }
    return sheet;
  };
  return new Proxy({}, {
    get: (_, key) => current()[key],
    has: (_, key) => key in current(),
    ownKeys: () => Reflect.ownKeys(current()),
    getOwnPropertyDescriptor: (_, key) => {
      const sheet = current();
      return key in sheet ? { value: sheet[key], enumerable: true, configurable: true } : undefined;
    },
  });
}
