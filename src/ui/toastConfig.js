import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, shadows } from '../theme';

const ICONS = {
  success: { name: 'checkmark-circle', color: colors.success },
  error: { name: 'alert-circle', color: colors.danger },
  info: { name: 'information-circle', color: colors.primary },
};

const BrandToast = ({ text1, text2, kind }) => {
  const icon = ICONS[kind] || ICONS.info;
  return (
    <View style={styles.toast}>
      <Ionicons name={icon.name} size={22} color={icon.color} />
      <View style={styles.flex}>
        {text1 ? <Text variant="title" color="textInverse" numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text variant="small" color="textInverse" style={styles.sub} numberOfLines={2}>{text2}</Text> : null}
      </View>
    </View>
  );
};

/** Toasts sombres et compacts, cohérents avec la marque (remplace le style par défaut) */
const toastConfig = {
  success: (props) => <BrandToast {...props} kind="success" />,
  error: (props) => <BrandToast {...props} kind="error" />,
  info: (props) => <BrandToast {...props} kind="info" />,
};

const styles = StyleSheet.create({
  toast: {
    width: '92%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#16181D', borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14, ...shadows.lg,
  },
  flex: { flex: 1 },
  sub: { opacity: 0.75 },
});

export default toastConfig;
