import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, SmartImage, Text } from '../../ui';
import { colors, GUTTER, radius, useTheme, themedStyles } from '../../theme';
import OriginBadge from '../OriginBadge';

/** Carte vendeur : inspire confiance et mène à la boutique */
function SellerCard({ seller, onPress }) {
  const { colors } = useTheme();
  if (!seller || typeof seller !== 'object') return null;
  const name = seller.storeName || seller.name || 'Boutique';
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel={`Visiter ${name}`}>
      {seller.logo ? (
        <SmartImage uri={seller.logo} width={52} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.initial, { backgroundColor: colors.primarySoft }]}>
          <Text variant="h2" color="primaryDark">{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <Text variant="title" numberOfLines={1} style={styles.shrink}>{name}</Text>
          {seller.isvalid !== false ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
        </View>
        <View style={styles.sub}>
          <Text variant="small" color="textSecondary">{seller.isvalid !== false ? 'Vendeur vérifié ·' : 'Vendeur ·'}</Text>
          <OriginBadge sellerId={seller._id} variant="small" fallback={<Text variant="small" color="textSecondary">Niger</Text>} style={styles.originInline} />
        </View>
      </View>
      <View style={[styles.cta, { backgroundColor: colors.primarySoft }]}>
        <Text variant="smallMedium" color="primaryDark">Boutique</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
      </View>
    </PressableScale>
  );
}

const styles = themedStyles((colors) => ({
  sub: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  originInline: { flexShrink: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 24,
    padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  logo: { width: 52, height: 52, borderRadius: 26 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primarySoft,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill,
  },
}));

export default memo(SellerCard);
