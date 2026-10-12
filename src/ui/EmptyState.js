import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import { colors } from '../theme';

/** État vide / erreur : icône, message clair et une action pour s'en sortir */
function EmptyState({ icon = 'cube-outline', title, message, actionLabel, onAction, tone = 'primary', style }) {
  const tint = tone === 'danger' ? colors.danger : colors.primary;
  const soft = tone === 'danger' ? colors.dangerSoft : colors.primarySoft;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconWrap, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={34} color={tint} />
      </View>
      {title ? <Text variant="h2" align="center">{title}</Text> : null}
      {message ? <Text variant="body" color="textSecondary" align="center" style={styles.msg}>{message}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 10 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  msg: { maxWidth: 300 },
  btn: { marginTop: 12, alignSelf: 'center' },
});

export default memo(EmptyState);
