import React, { forwardRef, memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, Text } from '../../ui';
import TextField from '../../ui/TextField';
import { getPasswordChecks, getPasswordStrength } from '../../utils/passwordRules';
import { colors } from '../../theme';

const RULES = [
  ['minLength', '8 caractères'],
  ['letter', 'Une lettre'],
  ['number', 'Un chiffre'],
];

/**
 * Mot de passe avec bouton afficher/masquer.
 * showStrength : jauge de force + règles (création de mot de passe).
 */
function PasswordField({ value, onChangeText, showStrength, label = 'Mot de passe', error, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  const checks = useMemo(() => getPasswordChecks(value), [value]);
  const strength = useMemo(() => getPasswordStrength(value), [value]);

  return (
    <View>
      <TextField
        ref={ref}
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        icon="lock-closed-outline"
        error={error}
        textContentType={showStrength ? 'newPassword' : 'password'}
        autoComplete={showStrength ? 'password-new' : 'password'}
        suffix={
          <PressableScale
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </PressableScale>
        }
        {...rest}
      />

      {showStrength && value ? (
        <View style={styles.strength}>
          <View style={styles.bars}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.bar, { backgroundColor: strength.score >= [1, 4, 5, 6][i] ? strength.color : colors.border }]} />
            ))}
          </View>
          <Text variant="caption" style={{ color: strength.color }}>{strength.label}</Text>
        </View>
      ) : null}
      {showStrength ? (
        <View style={styles.rules}>
          {RULES.map(([k, l]) => (
            <View key={k} style={styles.rule}>
              <Ionicons name={checks[k] ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={checks[k] ? colors.success : colors.textMuted} />
              <Text variant="caption" color={checks[k] ? 'success' : 'textMuted'}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -6, marginBottom: 8 },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default memo(forwardRef(PasswordField));
