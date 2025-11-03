import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../redux/authSlice';
import useNetworkStatus from '../hooks/useNetworkStatus';
import LoadingButton from '../components/LoadingButton';
import { COLORS } from '../config/constants';
import Toast from 'react-native-toast-message';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { isConnected } = useNetworkStatus();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await dispatch(logoutUser()).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Déconnexion réussie',
                text2: 'À bientôt !',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Impossible de se déconnecter',
              });
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Informations personnelles',
      subtitle: 'Modifier votre profil',
      onPress: () => {},
      badge: null,
    },
    {
      icon: 'cart-outline',
      title: 'Mes commandes',
      subtitle: 'Historique des achats',
      onPress: () => navigation.navigate('Orders'),
      badge: null,
    },
    {
      icon: 'heart-outline',
      title: 'Mes favoris',
      subtitle: 'Produits sauvegardés',
      onPress: () => {},
      badge: null,
    },
    {
      icon: 'location-outline',
      title: 'Adresses de livraison',
      subtitle: 'Gérer vos adresses',
      onPress: () => {},
      badge: null,
    },
    {
      icon: 'card-outline',
      title: 'Moyens de paiement',
      subtitle: 'Cartes et comptes',
      onPress: () => {},
      badge: null,
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Messages',
      subtitle: 'Discussions avec vendeurs',
      onPress: () => navigation.navigate('Messages'),
      badge: null,
    },
    {
      icon: 'settings-outline',
      title: 'Paramètres',
      subtitle: 'Notifications et confidentialité',
      onPress: () => {},
      badge: null,
    },
    {
      icon: 'help-circle-outline',
      title: 'Aide et support',
      subtitle: 'FAQ et contact',
      onPress: () => {},
      badge: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header avec gradient */}
        <LinearGradient
          colors={['#30A08B', '#2D9175', '#26805F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Indicateur hors ligne */}
          {!isConnected && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={14} color={COLORS.white} />
              <Text style={styles.offlineText}>Hors ligne</Text>
            </View>
          )}

          {/* Photo de profil */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {user?.profileImage ? (
                <Image 
                  source={{ uri: user.profileImage }} 
                  style={styles.avatar}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Informations utilisateur */}
          <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          
          {/* Badges/Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Commandes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton de déconnexion */}
        <View style={styles.logoutContainer}>
          <LoadingButton
            title="Se déconnecter"
            onPress={handleLogout}
            loading={loggingOut}
            variant="outline"
            leftIcon={<Ionicons name="log-out-outline" size={20} color={COLORS.error} />}
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2025 Kassarmoumarket</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  offlineText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  logoutButton: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
