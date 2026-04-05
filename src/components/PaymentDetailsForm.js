import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCardNumber } from '../services/paymentService';

const COLORS = {
  primary: '#30A08B',
  white: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  border: '#DFE6E9',
  background: '#F8F9FA',
};

export default function PaymentDetailsForm({
  paymentMethod,
  cardDetails,
  setCardDetails,
  mobileDetails,
  setMobileDetails,
}) {
  // Formulaire pour carte bancaire
  if (['stripe', 'Visa', 'master Card'].includes(paymentMethod)) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Informations de carte</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Numéro de carte</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color={COLORS.textLight} style={styles.icon} />
            <TextInput
              style={styles.input}
              value={formatCardNumber(cardDetails.number || '')}
              onChangeText={(text) => {
                const onlyDigits = text.replace(/[^\d]/g, '');
                setCardDetails({ ...cardDetails, number: onlyDigits });
              }}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Expiration</Text>
            <TextInput
              style={styles.input}
              value={cardDetails.expiry || ''}
              onChangeText={(text) => {
                const val = text.replace(/[^\d]/g, '');
                let expiry = '';
                if (val.length > 2) {
                  expiry = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                } else {
                  expiry = val;
                }
                setCardDetails({ ...cardDetails, expiry });
              }}
              placeholder="MM/AA"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>CVC</Text>
            <TextInput
              style={styles.input}
              value={cardDetails.cvc || ''}
              onChangeText={(text) =>
                setCardDetails({
                  ...cardDetails,
                  cvc: text.replace(/[^\d]/g, ''),
                })
              }
              placeholder="123"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </View>
      </View>
    );
  }

  // Formulaire pour Mobile Money et Wallets
  if (['mobile_money', 'Mobile Money', 'zeyna', 'nita', 'amana'].includes(paymentMethod)) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          {paymentMethod === 'mobile_money' || paymentMethod === 'Mobile Money' ? 'Mobile Money' : 
           paymentMethod === 'zeyna' ? 'Zeyna Money' :
           paymentMethod === 'nita' ? 'MyNita' : 'Amana'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Numéro de téléphone</Text>
          <View style={styles.row}>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  // Toggle entre +227 et +229
                  setMobileDetails({
                    ...mobileDetails,
                    operateur: mobileDetails.operateur === '227' ? '229' : '227',
                  });
                }}
              >
                <Text style={styles.pickerText}>+{mobileDetails.operateur || '227'}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              value={mobileDetails.number || ''}
              onChangeText={(text) =>
                setMobileDetails({
                  ...mobileDetails,
                  number: text.replace(/[^\d]/g, ''),
                })
              }
              placeholder="90123456"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              maxLength={8}
            />
          </View>
        </View>

        {(paymentMethod === 'mobile_money' || paymentMethod === 'Mobile Money') && (
          <View style={styles.operatorsInfo}>
            <Text style={styles.infoText}>Opérateurs supportés :</Text>
            <Text style={styles.infoText}>Airtel • Moov • MTN • Orange</Text>
          </View>
        )}
      </View>
    );
  }

  if (paymentMethod === 'paiement_assiste') {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Paiement assisté</Text>
        <View style={styles.operatorsInfo}>
          <Text style={styles.infoText}>Un conseiller vous contactera pour finaliser le paiement en toute sécurité.</Text>
        </View>
      </View>
    );
  }

  // Paiement à la livraison
  if (['cash', 'payé à la livraison'].includes(paymentMethod)) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Paiement à la livraison</Text>
        
        <View style={styles.cashOnDeliverySteps}>
          {[
            { step: 1, text: 'Confirmation par téléphone' },
            { step: 2, text: 'Livraison par un agent' },
            { step: 3, text: 'Paiement espèces/carte' },
            { step: 4, text: 'Remise d\'un reçu' },
          ].map((item) => (
            <View key={item.step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{item.step}</Text>
              </View>
              <Text style={styles.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
  },
  pickerContainer: {
    width: 100,
  },
  picker: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.text,
  },
  operatorsInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  cashOnDeliverySteps: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
});
