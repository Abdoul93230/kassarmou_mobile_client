import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { COLORS } from '../config/constants';

const NetworkIndicator = () => {
  const { isConnected } = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [previousStatus, setPreviousStatus] = useState(true);

  useEffect(() => {
    // Ne montrer l'indicateur que lors des changements de statut
    if (previousStatus !== isConnected) {
      setShowIndicator(true);
      
      // Animation d'entrée
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Masquer automatiquement après 3 secondes si connecté
      if (isConnected) {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowIndicator(false);
          });
        }, 3000);
      }

      setPreviousStatus(isConnected);
    }
  }, [isConnected]);

  if (!showIndicator) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isConnected ? styles.connected : styles.disconnected,
        { opacity: fadeAnim },
      ]}
    >
      <Ionicons
        name={isConnected ? 'wifi' : 'wifi-off'}
        size={16}
        color={COLORS.white}
      />
      <Text style={styles.text}>
        {isConnected ? 'Connexion rétablie' : 'Pas de connexion Internet'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  connected: {
    backgroundColor: '#2ECC71',
  },
  disconnected: {
    backgroundColor: '#E74C3C',
  },
  text: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NetworkIndicator;
