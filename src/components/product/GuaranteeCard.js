import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../ui';
import { GUARANTEES } from '../../config/policy';
import { radius, useTheme, themedStyles } from '../../theme';

/** Engagements réels d'Ihambaobab, affichés sur la fiche produit */
function GuaranteeCard({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <Text variant="title" style={styles.head}>Achetez l'esprit tranquille</Text>
      {GUARANTEES.map((g) => (
        <View key={g.title} style={styles.row}>
          <Ionicons name={g.icon} size={18} color={colors.primary} style={styles.icon} />
          <View style={styles.flex}>
            <Text variant="smallMedium">{g.title}</Text>
            <Text variant="caption" color="textSecondary">{g.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  card: { padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 10 },
  head: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: { marginTop: 1 },
  flex: { flex: 1 },
}));

export default memo(GuaranteeCard);
