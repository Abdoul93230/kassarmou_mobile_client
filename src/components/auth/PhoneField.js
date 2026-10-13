import React, { forwardRef, memo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip, PressableScale, Text } from '../../ui';
import TextField from '../../ui/TextField';
import { PHONE_COUNTRIES, applyPhoneInputChange, getPhonePlaceholder } from '../../utils/phoneRules';
import { colors } from '../../theme';

/** Champ téléphone avec indicatif pays (Niger par défaut) et formatage automatique */
function PhoneField({ country, onCountryChange, digits, onDigitsChange, error, label = 'Numéro de téléphone', ...rest }, ref) {
  const [picker, setPicker] = useState(false);
  const display = applyPhoneInputChange(country, digits).display;

  return (
    <View>
      <TextField
        ref={ref}
        label={label}
        value={display}
        onChangeText={(t) => {
          const next = applyPhoneInputChange(country, t);
          if (next.country.iso !== country.iso) onCountryChange(next.country); // numéro international collé
          onDigitsChange(next.digits);
        }}
        placeholder={getPhonePlaceholder(country)}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={error}
        prefix={
          <PressableScale onPress={() => setPicker((v) => !v)} style={styles.dial} hitSlop={6} accessibilityLabel="Changer de pays">
            <Text variant="bodyMedium">{country.flag} {country.dialCode}</Text>
            <Ionicons name={picker ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          </PressableScale>
        }
        {...rest}
      />
      {picker ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countries} keyboardShouldPersistTaps="handled">
          {PHONE_COUNTRIES.map((c) => (
            <Chip
              key={c.iso}
              label={`${c.flag} ${c.name}`}
              active={c.iso === country.iso}
              onPress={() => { onCountryChange(c); onDigitsChange(''); setPicker(false); }}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.border },
  countries: { gap: 8, paddingBottom: 14 },
});

export default memo(forwardRef(PhoneField));
