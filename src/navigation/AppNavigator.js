import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { verifyAuth } from '../redux/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectPanierCount } from '../redux/cartSlice';

// Screens
import SplashScreen from '../screens/SplashScreen';
import TabBar from './TabBar';
import HomeScreen from '../screens/HomeScreen';
import QuickAuthScreen from '../screens/QuickAuthScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CategoryScreen from '../screens/CategoryScreen';
import SearchScreen from '../screens/SearchScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PaymentWebViewScreen from '../screens/PaymentWebViewScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProductListScreen from '../screens/ProductListScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FaqScreen from '../screens/FaqScreen';
import BoutiqueScreen from '../screens/BoutiqueScreen';
import AllStoresScreen from '../screens/AllStoresScreen';
import SellerDetailScreen from '../screens/SellerDetailScreen';
import WalletScreen from '../screens/WalletScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec Tabs
function MainTabs() {
  const cartItemCount = useSelector(selectPanierCount);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoryScreen}
        options={{ title: 'Catégories' }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{ 
          title: 'Panier',
          tabBarBadge: cartItemCount > 0 ? cartItemCount : null,
        }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{ title: 'Favoris' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              navigation.navigate('QuickAuth', {
                pendingAction: 'open-favorites',
                returnScreen: 'MainTabs',
                returnParams: { screen: 'Favorites' },
              });
            }
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Navigation Stack principale
function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector(state => state.auth);
  const [initialCheckDone, setInitialCheckDone] = React.useState(false);

  useEffect(() => {
    // Vérifier l'authentification au démarrage une seule fois
    const checkAuth = async () => {
      await dispatch(verifyAuth());
      setInitialCheckDone(true);
    };
    checkAuth();
  }, [dispatch]);

  // Afficher l'écran de chargement pendant la vérification INITIALE uniquement
  if (!initialCheckDone) {
    return <SplashScreen />;
  }

  const linking = {
    prefixes: [
      'ihambaobab://',
      'https://ihambaobab.com',
      'https://www.ihambaobab.com'
    ],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: '',
            Search: 'search',
            Favorites: 'favorites',
            Profile: 'profile',
          }
        },
        ProductDetail: 'ProduitDetail/:productId',
        Boutique: 'boutique/:storeName',
        SellerDetail: 'Profile_boutiquier/:sellerId',
        ProductListScreen: 'Categorie/:categoryName',
        AllStores: 'boutiques',
        Cart: 'Panier',
        Checkout: 'checkout',
        Orders: 'commandes',
        OrderDetail: 'commandes/:orderId',
      }
    }
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      fallback={null}
      onReady={() => console.log('🧭 Navigation prête avec Deep Linking')}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#30A08B',        // Primary - Teal
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#FFFFFF',          // Blanc
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerBackTitleVisible: false,
        }}
      >
        {/* Écrans principaux toujours accessibles */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs}
          options={{ 
            headerShown: false,
            title: 'Accueil'
          }}
        />
        <Stack.Screen 
          name="ProductDetail" 
          component={ProductDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Cart" 
          component={CartScreen}
          options={{ title: 'Mon Panier', headerShown: false }}
        />
        <Stack.Screen 
          name="ProductListScreen" 
          component={ProductListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Boutique" 
          component={BoutiqueScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AllStores" 
          component={AllStoresScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SellerDetail" 
          component={SellerDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ title: 'Recherche' }}
        />
        
        {/* Écrans d'authentification */}
        <Stack.Screen 
          name="Login" 
          component={QuickAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={QuickAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="QuickAuth"
          component={QuickAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyOTP"
          component={VerifyOTPScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={QuickAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={QuickAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Faq"
          component={FaqScreen}
          options={{ headerShown: false }}
        />
        
        {/* Écrans protégés (nécessitent authentification) */}
        {isAuthenticated && (
          <>
            <Stack.Screen
              name="Wallet"
              component={WalletScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ title: 'Paiement' }}
            />
            <Stack.Screen 
              name="PaymentWebView" 
              component={PaymentWebViewScreen}
              options={{ 
                title: 'Paiement sécurisé',
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="Orders" 
              component={OrdersScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OrderDetail" 
              component={OrderDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Messages" 
              component={MessagesScreen}
              options={{ title: 'Messages' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
