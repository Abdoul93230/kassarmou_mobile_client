import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { lightColors, darkColors, setActiveColors } from './colors';

const THEME_STORAGE_KEY = '@ihambaobab_theme_mode';

export const ThemeContext = createContext({
  themeMode: 'system', // 'system' | 'light' | 'dark'
  setThemeMode: () => {},
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('system');

  // Chargement du mode sauvegardé au démarrage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setThemeModeState(saved);
        }
      } catch (e) {
        console.warn('Erreur chargement mode thème:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Erreur sauvegarde mode thème:', e);
    }
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const colors = useMemo(() => {
    const palette = isDark ? darkColors : lightColors;
    setActiveColors(palette);
    return palette;
  }, [isDark]);

  // Fond natif sous les écrans (transitions, clavier) : pas de flash blanc en mode sombre
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setThemeMode(next);
  }, [isDark, setThemeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      isDark,
      colors,
      toggleTheme,
    }),
    [themeMode, setThemeMode, isDark, colors, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      themeMode: 'light',
      setThemeMode: () => {},
      isDark: false,
      colors: lightColors,
      toggleTheme: () => {},
    };
  }
  return context;
}
