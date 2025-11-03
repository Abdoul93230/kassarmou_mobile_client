import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkIndicator from './src/components/NetworkIndicator';
import { verifyAuth } from './src/redux/authSlice';
import { loadCart } from './src/redux/cartSlice';

export default function App() {
  useEffect(() => {
    // Charger les données au démarrage
    store.dispatch(verifyAuth());
    store.dispatch(loadCart());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <NetworkIndicator />
          <AppNavigator />
          <StatusBar style="auto" />
          <Toast />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
