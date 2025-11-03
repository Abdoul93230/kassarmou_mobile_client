import React, { useRef, useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const OTPInput = ({ otp, setOtp, length = 6, onComplete }) => {
  const inputRefs = useRef([]);
  const [showPasteHelper, setShowPasteHelper] = useState(false);

  useEffect(() => {
    // Focus on first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Vérifier si le code est complet
  useEffect(() => {
    const isComplete = otp.every(digit => digit !== '');
    if (isComplete && onComplete) {
      onComplete(otp.join(''));
    }
  }, [otp]);

  const handleChange = (text, index) => {
    // Si le texte collé contient plusieurs chiffres (copier-coller du code complet)
    if (text.length > 1) {
      // Extraire uniquement les chiffres
      const digits = text.replace(/\D/g, '').slice(0, length);
      
      if (digits.length > 0) {
        const newOtp = Array(length).fill('');
        
        // Remplir les cases avec les chiffres collés
        for (let i = 0; i < digits.length && i < length; i++) {
          newOtp[i] = digits[i];
        }
        
        setOtp(newOtp);
        
        // Focus sur le dernier input rempli ou le dernier input
        const focusIndex = Math.min(digits.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      }
      return;
    }

    // Comportement normal pour un seul chiffre
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      // Cette fonction sera appelée manuellement via un bouton
      // Car React Native ne supporte pas directement Clipboard API dans tous les contextes
      setShowPasteHelper(true);
    } catch (error) {
      console.log('Paste error:', error);
    }
  };

  return (
    <View>
      <View style={styles.container}>
        {Array(length)
          .fill(0)
          .map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.input,
                otp[index] && styles.inputFilled,
              ]}
              value={otp[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={length} // Augmenté pour permettre le copier-coller
              selectTextOnFocus
              autoComplete="one-time-code" // Support natif pour OTP sur iOS
              textContentType="oneTimeCode" // Support natif pour OTP sur iOS
            />
          ))}
      </View>
      
      {/* Helper text pour le copier-coller */}
      <View style={styles.helperContainer}>
        <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.helperText}>
          Vous pouvez coller le code directement dans n'importe quel champ
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 8,
  },
  input: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    backgroundColor: COLORS.backgroundAlt,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default OTPInput;
