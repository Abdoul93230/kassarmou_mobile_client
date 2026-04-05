import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#30A08B',
  secondary: '#B2905F',
  tertiary: '#B17236',
  white: '#FFFFFF',
  border: '#E2E8F0',
};

const PAYMENT_METHODS = [
  {
    id: 'master Card',
    label: 'MasterCard',
    icon: 'card-outline',
    color: COLORS.primary,
    description: 'Paiement sécurisé',
  },
  {
    id: 'Visa',
    label: 'Visa',
    icon: 'card-outline',
    color: COLORS.secondary,
    description: 'Paiement sécurisé',
  },
  {
    id: 'Mobile Money',
    label: 'Mobile Money',
    icon: 'phone-portrait-outline',
    color: COLORS.tertiary,
    description: 'Airtel, Moov, MTN, Zamani',
  },
  {
    id: 'payé à la livraison',
    label: 'Domicile',
    icon: 'home-outline',
    color: COLORS.primary,
    description: 'Paiement à la livraison',
  },
  {
    id: 'paiement_assiste',
    label: 'Paiement assisté',
    icon: 'call-outline',
    color: COLORS.tertiary,
    description: 'Accompagnement par téléphone',
  },
  {
    id: 'nita',
    label: 'MyNita',
    icon: 'wallet-outline',
    color: COLORS.primary,
    description: 'Portefeuille MyNita',
  },
  {
    id: 'zeyna',
    label: 'Zeyna',
    icon: 'wallet-outline',
    color: COLORS.secondary,
    description: 'Portefeuille Zeyna',
  },
  {
    id: 'amana',
    label: 'Amana',
    icon: 'wallet-outline',
    color: '#FF9F1C',
    description: 'Paiement instantané',
  },
];

export default function PaymentMethodSelector({ selectedMethod, onSelectMethod }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mode de paiement</Text>
      <Text style={styles.subtitle}>Choisissez votre méthode de paiement</Text>

      <View style={styles.methodsGrid}>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardSelected,
            ]}
            onPress={() => onSelectMethod(method.id)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                selectedMethod === method.id
                  ? [method.color, method.color + 'CC']
                  : ['#FFFFFF', '#FFFFFF']
              }
              style={styles.methodGradient}
            >
              <View style={styles.methodContent}>
                <Ionicons
                  name={method.icon}
                  size={32}
                  color={selectedMethod === method.id ? COLORS.white : method.color}
                />
                <Text
                  style={[
                    styles.methodLabel,
                    selectedMethod === method.id && styles.methodLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {method.label}
                </Text>
                <Text
                  style={[
                    styles.methodDescription,
                    selectedMethod === method.id && styles.methodDescriptionSelected,
                  ]}
                  numberOfLines={1}
                >
                  {method.description}
                </Text>
              </View>

              {selectedMethod === method.id && (
                <View style={styles.checkMark}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  methodCard: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  methodCardSelected: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  methodGradient: {
    padding: 16,
    minHeight: 120,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  methodContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginTop: 8,
    textAlign: 'center',
  },
  methodLabelSelected: {
    color: COLORS.white,
  },
  methodDescription: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 4,
    textAlign: 'center',
  },
  methodDescriptionSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
