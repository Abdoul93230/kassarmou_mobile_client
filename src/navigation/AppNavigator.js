import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { verifyAuth } from '../redux/authSlice';

// Screens
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OrdersScreen from '../screens/OrdersScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MessagesScreen from '../screens/MessagesScreen';
import CategoryScreen from '../screens/CategoryScreen';
import SearchScreen from '../screens/SearchScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProductListScreen from '../screens/ProductListScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation principale avec Tabs
function MainTabs() {
  const cartItemCount = useSelector(state => state.cart.itemCount);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#30A08B',      // Primary - Teal
        tabBarInactiveTintColor: '#999999',    // Gris
        tabBarStyle: {
          backgroundColor: '#FFFFFF',          // Blanc
          borderTopColor: '#E0E0E0',           // Bordure grise
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarBadgeStyle: {
          backgroundColor: '#FC913A',          // Secondary - Orange
          color: '#FFFFFF',
        },
        headerShown: false,
      })}
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

  return (
    <NavigationContainer>
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
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProductDetail" 
          component={ProductDetailScreen}
          options={{ title: 'Détail du produit' }}
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
          name="Search" 
          component={SearchScreen}
          options={{ title: 'Recherche' }}
        />
        
        {/* Écrans d'authentification */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />
        
        {/* Écrans protégés (nécessitent authentification) */}
        {isAuthenticated && (
          <>
            <Stack.Screen 
              name="Checkout" 
              component={CheckoutScreen}
              options={{ title: 'Paiement' }}
            />
            <Stack.Screen 
              name="Orders" 
              component={OrdersScreen}
              options={{ title: 'Mes commandes' }}
            />
            <Stack.Screen 
              name="OrderDetail" 
              component={OrderDetailScreen}
              options={{ title: 'Détail de la commande' }}
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
