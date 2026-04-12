import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

/**
 * Composant de checklist pour valider les critères du mot de passe
 * Affiche visuellement chaque critère avec une icône (✓ ou ×)
 * 
 * @param {string} password - Le mot de passe à valider
 * @param {boolean} showChecklist - Si true, affiche la checklist (par défaut: true si password non vide)
 */
export default function PasswordChecklist({ password = '', showChecklist = null }) {
  // Afficher automatiquement quand l'utilisateur commence à taper
  const shouldShow = showChecklist !== null ? showChecklist : password.length > 0;

  // Vérification des critères
  const checks = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/'`~]/.test(password),
  };

  // Critères avec leurs messages
  const criteria = [
    {
      key: 'minLength',
      label: 'Au moins 8 caractères',
      isValid: checks.minLength,
    },
    {
      key: 'hasUpperCase',
      label: 'Une lettre majuscule (A-Z)',
      isValid: checks.hasUpperCase,
    },
    {
      key: 'hasLowerCase',
      label: 'Une lettre minuscule (a-z)',
      isValid: checks.hasLowerCase,
    },
    {
      key: 'hasNumber',
      label: 'Un chiffre (0-9)',
      isValid: checks.hasNumber,
    },
    {
      key: 'hasSpecialChar',
      label: 'Un caractère spécial (!@#$...)',
      isValid: checks.hasSpecialChar,
    },
  ];

  // Calculer la force du mot de passe
  const validCount = Object.values(checks).filter(Boolean).length;
  const strength = validCount === 5 ? 'Fort' : validCount >= 3 ? 'Moyen' : 'Faible';
  const strengthColor = validCount === 5 ? COLORS.success : validCount >= 3 ? '#FFA500' : COLORS.error;

  if (!shouldShow) return null;

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
        <Text style={styles.title}>Critères du mot de passe</Text>
      </View>

      {/* Liste des critères */}
      <View style={styles.criteriaList}>
        {criteria.map((criterion) => (
          <View key={criterion.key} style={styles.criterionRow}>
            <View style={[
              styles.iconContainer,
              criterion.isValid ? styles.iconValid : styles.iconInvalid
            ]}>
              <Ionicons 
                name={criterion.isValid ? 'checkmark' : 'close'} 
                size={14} 
                color={COLORS.white}
              />
            </View>
            <Text style={[
              styles.criterionText,
              criterion.isValid && styles.criterionTextValid
            ]}>
              {criterion.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Indicateur de force */}
      {password.length > 0 && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View 
              style={[
                styles.strengthFill,
                { 
                  width: `${(validCount / 5) * 100}%`,
                  backgroundColor: strengthColor 
                }
              ]} 
            />
          </View>
          <Text style={[styles.strengthText, { color: strengthColor }]}>
            {strength}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  criteriaList: {
    gap: 8,
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconValid: {
    backgroundColor: COLORS.success,
  },
  iconInvalid: {
    backgroundColor: COLORS.error,
  },
  criterionText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  criterionTextValid: {
    color: COLORS.success,
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  strengthContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  strengthBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
