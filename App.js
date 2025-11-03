import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { StripeProvider } from '@stripe/stripe-react-native';
import store from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkIndicator from './src/components/NetworkIndicator';
import { verifyAuth } from './src/redux/authSlice';
import { loadCart } from './src/redux/cartSlice';

// Clé publique Stripe - Même clé que l'app web
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RKO4OFMhcWQWlbyWHqDypco5L0DrXDS4d6hEDfemzIzkzcKlodzbynkRLP2bsJGi0cxL4oy7CtJnhIGnq6tjH2A00AftfkRRQ';

export default function App() {
  useEffect(() => {
    // Charger les données au démarrage
    store.dispatch(verifyAuth());
    store.dispatch(loadCart());
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <SafeAreaProvider>
            <NetworkIndicator />
            <AppNavigator />
            <StatusBar style="auto" />
            <Toast />
          </SafeAreaProvider>
        </StripeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
