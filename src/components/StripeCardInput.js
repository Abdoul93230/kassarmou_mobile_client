import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardField } from '@stripe/stripe-react-native';

const COLORS = {
  primary: '#FF6B35',
  secondary: '#004E89',
  white: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  border: '#DFE6E9',
  background: '#F8F9FA',
};

const StripeCardInput = ({ onCardChange, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Informations de carte</Text>
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={styles.card}
        style={styles.cardContainer}
        onCardChange={onCardChange}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  cardContainer: {
    height: 50,
  },
  card: {
    backgroundColor: COLORS.white,
    textColor: COLORS.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  error: {
    color: '#EF476F',
    fontSize: 13,
    marginTop: 8,
  },
});

export default StripeCardInput;
