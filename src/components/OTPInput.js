import React, { useRef, useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/constants';

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const OTPInput = ({
  otp,
  setOtp,
  length = 6,
  onComplete,
  timerValue = null,
  timerLabel = 'Temps d\'attente',
  timerHint = '',
  onResendPress = null,
  resendText = 'Renvoyer le code',
  resendDisabled = false,
}) => {
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

      {(timerValue !== null || onResendPress) && (
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{timerLabel}</Text>
          {timerValue !== null && (
            <Text style={styles.timerValue}>{formatDuration(timerValue)}</Text>
          )}
          {timerHint ? <Text style={styles.timerHint}>{timerHint}</Text> : null}
          {onResendPress ? (
            <TouchableOpacity
              style={[styles.resendButton, resendDisabled && styles.resendButtonDisabled]}
              onPress={onResendPress}
              disabled={resendDisabled}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color={resendDisabled ? COLORS.textMuted : COLORS.primary} />
              <Text style={[styles.resendText, resendDisabled && styles.resendTextDisabled]}>
                {resendDisabled && timerValue !== null
                  ? `${resendText} dans ${formatDuration(timerValue)}`
                  : resendText}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
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
  timerCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timerValue: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timerHint: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resendTextDisabled: {
    color: COLORS.textMuted,
  },
});

export default OTPInput;
