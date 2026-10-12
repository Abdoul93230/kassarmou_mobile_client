import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, MuseoModerno_600SemiBold, MuseoModerno_700Bold } from '@expo-google-fonts/museomoderno';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkIndicator from './src/components/NetworkIndicator';
import { loadCart } from './src/redux/cartSlice';
import toastConfig from './src/ui/toastConfig';

// Avertissement interne d'une dépendance (react-navigation), sans impact — masqué en dev
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

// Garde l'écran de démarrage natif tant que les polices ne sont pas prêtes (pas de « saut » de texte)
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    MuseoModerno_600SemiBold,
    MuseoModerno_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    store.dispatch(loadCart());
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <NetworkIndicator />
          <AppNavigator />
          <StatusBar style="dark" />
          <Toast config={toastConfig} topOffset={56} />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
