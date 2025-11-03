import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const SplashScreen = () => {
  return (
    <LinearGradient
      colors={['#30A08B', '#2D9175', '#26805F']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={['#FFF', '#F0FFF4']}
            style={styles.logoCircle}
          >
            <Text style={styles.logoText}>K</Text>
          </LinearGradient>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>Kassarmoumarket</Text>
        <Text style={styles.tagline}>Votre marketplace de confiance</Text>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.footerText}>Paiement sécurisé • Livraison rapide</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  logoText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 48,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default SplashScreen;
