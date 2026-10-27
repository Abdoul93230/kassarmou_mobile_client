import React, { forwardRef, memo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, fonts, radius, useTheme, themedStyles } from '../theme';

/**
 * Champ de saisie du design system : libellé, icône, préfixe/suffixe, message d'erreur.
 */
function TextField({ label, icon, prefix, suffix, error, hint, optional, style, multiline, ...inputProps }, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text variant="smallMedium" color="textSecondary" style={styles.label}>
          {label}
          {optional ? <Text variant="small" color="textMuted"> (facultatif)</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: colors.border },
          multiline && styles.boxMultiline,
          focused && { borderColor: colors.primary, borderWidth: 1.5 },
          error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={multiline && styles.iconTop} /> : null}
        {prefix || null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline]}
          multiline={multiline}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          {...inputProps}
        />
        {suffix || null}
      </View>
      {error ? (
        <Text variant="small" color="danger" style={styles.msg}>{error}</Text>
      ) : hint ? (
        <Text variant="small" color="textMuted" style={styles.msg}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  wrap: { marginBottom: 14 },
  label: { marginBottom: 6, marginLeft: 2 },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  boxFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  boxError: { borderColor: colors.danger },
  iconTop: { marginTop: 2 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top', paddingVertical: 0 },
  msg: { marginTop: 5, marginLeft: 2 },
}));

export default memo(forwardRef(TextField));
