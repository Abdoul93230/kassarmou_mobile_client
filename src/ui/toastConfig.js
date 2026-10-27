import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, radius, shadows, useTheme } from '../theme';

const BrandToast = ({ text1, text2, kind }) => {
  const { colors, isDark } = useTheme();
  const iconName = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = kind === 'success' ? colors.success : kind === 'error' ? colors.danger : colors.primary;

  return (
    // En sombre, un gris plus clair que le fond et un liseré pour que le toast se détache
    <View style={[styles.toast, isDark && { backgroundColor: colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
      <Ionicons name={iconName} size={22} color={iconColor} />
      <View style={styles.flex}>
        {text1 ? <Text variant="title" color={isDark ? 'text' : 'textInverse'} numberOfLines={1}>{text1}</Text> : null}
        {text2 ? <Text variant="small" color={isDark ? 'text' : 'textInverse'} style={styles.sub} numberOfLines={2}>{text2}</Text> : null}
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
