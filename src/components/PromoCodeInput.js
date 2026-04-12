import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { COLORS } from '../config/constants';

/**
 * Composant de saisie et validation de code promo
 * Compatible avec le système de codes promo backend (/api/promocodes)
 * 
 * @param {number} orderAmount - Montant total de la commande avant réduction
 * @param {function} onPromoApplied - Callback appelé quand un code est appliqué/retiré
 * @param {string} userId - ID de l'utilisateur (optionnel pour validation, requis pour application)
 * @param {array} products - Liste des produits dans le panier (pour validation spécifique)
 * @param {object} initialPromo - Code promo déjà appliqué (pour restaurer après retour)
 */
export default function PromoCodeInput({
  orderAmount,
  onPromoApplied,
  userId,
  products = [],
  initialPromo = null,
}) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(initialPromo);
  const [isValidating, setIsValidating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fadeAnim] = useState(new Animated.Value(0));

  // Restaurer le code promo depuis AsyncStorage au montage
  useEffect(() => {
    loadSavedPromo();
  }, []);

  // Animer l'apparition des messages
  useEffect(() => {
    if (message.text) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(4000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (message.type !== 'success' || !appliedPromo) {
          setMessage({ type: '', text: '' });
        }
      });
    }
  }, [message]);

  // Charger le code promo sauvegardé
  const loadSavedPromo = async () => {
    try {
      const savedPromo = await AsyncStorage.getItem('appliedPromoCode');
      if (savedPromo) {
        const promoData = JSON.parse(savedPromo);
        // Vérifier que le code est toujours valide pour ce montant
        if (promoData && promoData.code) {
          setAppliedPromo(promoData);
          setPromoCode(promoData.code);
          if (onPromoApplied) {
            onPromoApplied({
              discount: promoData.discount || 0,
              finalAmount: promoData.finalAmount || orderAmount,
              promoCodeId: promoData.promoCodeId,
              code: promoData.code,
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement promo sauvegardé:', error);
    }
  };

  // Valider le code promo
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer un code promo' });
      return;
    }

    setIsValidating(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        `${API_URL}/api/promocodes/validate`,
        {
          code: promoCode.toUpperCase().trim(),
          orderAmount,
          userId,
          products: products.map(p => p.product?._id || p._id),
        }
      );

      if (response.data.valid) {
        const promoData = {
          ...response.data,
          code: response.data.promoCode.code,
          promoCodeId: response.data.promoCode.id,
        };

        setAppliedPromo(promoData);
        setMessage({
          type: 'success',
          text: `Code appliqué ! Réduction de ${response.data.discount.toLocaleString('fr-FR')} €`,
        });

        // Sauvegarder dans AsyncStorage
        await AsyncStorage.setItem('appliedPromoCode', JSON.stringify(promoData));

        // Appeler le callback parent
        if (onPromoApplied) {
          onPromoApplied({
            discount: response.data.discount,
            finalAmount: response.data.finalAmount,
            promoCodeId: response.data.promoCode.id,
            code: response.data.promoCode.code,
            promoCodeData: response.data.promoCode,
          });
        }
      }
    } catch (error) {
      console.error('Erreur validation code promo:', error);
      const errorMessage = error.response?.data?.message || 'Code promo invalide';
      setMessage({ type: 'error', text: errorMessage });
      setAppliedPromo(null);

      // Supprimer d'AsyncStorage
      await AsyncStorage.removeItem('appliedPromoCode');

      // Réinitialiser la réduction
      if (onPromoApplied) {
        onPromoApplied({ 
          discount: 0, 
          finalAmount: orderAmount,
          promoCodeId: null,
          code: null,
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Retirer le code promo
  const removePromoCode = async () => {
    setPromoCode('');
    setAppliedPromo(null);
    setMessage({ type: '', text: '' });
    
    await AsyncStorage.removeItem('appliedPromoCode');

    if (onPromoApplied) {
      onPromoApplied({ 
        discount: 0, 
        finalAmount: orderAmount,
        promoCodeId: null,
        code: null,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="pricetag" size={20} color={COLORS.primary} />
        <Text style={styles.headerText}>Code Promo</Text>
      </View>

      {/* Formulaire de saisie ou code appliqué */}
      {!appliedPromo ? (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={promoCode}
              onChangeText={(text) => setPromoCode(text.toUpperCase())}
              placeholder="Entrez votre code"
              placeholderTextColor={COLORS.textLight}
              editable={!isValidating}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={validatePromoCode}
            />
            <TouchableOpacity
              style={[
                styles.applyButton,
                (!promoCode.trim() || isValidating) && styles.applyButtonDisabled,
              ]}
              onPress={validatePromoCode}
              disabled={!promoCode.trim() || isValidating}
              activeOpacity={0.7}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.applyButtonText}>Appliquer</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Message d'erreur/succès */}
          {message.text && (
            <Animated.View
              style={[
                styles.messageContainer,
                message.type === 'success' ? styles.messageSuccess : styles.messageError,
                { opacity: fadeAnim },
              ]}
            >
              <Ionicons
                name={message.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={message.type === 'success' ? COLORS.success : COLORS.error}
              />
              <Text
                style={[
                  styles.messageText,
                  message.type === 'success' ? styles.messageTextSuccess : styles.messageTextError,
                ]}
              >
                {message.text}
              </Text>
            </Animated.View>
          )}
        </View>
      ) : (
        // Code promo appliqué
        <View style={styles.appliedContainer}>
          <View style={styles.appliedContent}>
            <View style={styles.appliedInfo}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <View style={styles.appliedDetails}>
                <Text style={styles.appliedCode}>{appliedPromo.promoCode?.code || appliedPromo.code}</Text>
                <Text style={styles.appliedDiscount}>
                  Réduction : {appliedPromo.discount.toLocaleString('fr-FR')} €
                </Text>
                {appliedPromo.promoCode?.description && (
                  <Text style={styles.appliedDescription}>
                    {appliedPromo.promoCode.description}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removePromoCode}
              activeOpacity={0.7}
            >
              <Text style={styles.removeButtonText}>Retirer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  inputContainer: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  applyButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  messageSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  messageError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  messageTextSuccess: {
    color: '#15803D',
  },
  messageTextError: {
    color: '#B91C1C',
  },
  appliedContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
  },
  appliedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  appliedDetails: {
    flex: 1,
  },
  appliedCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 4,
  },
  appliedDiscount: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '500',
  },
  appliedDescription: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 4,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
});
