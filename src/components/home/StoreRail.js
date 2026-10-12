import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, SectionHeader, SmartImage, Text } from '../../ui';
import { colors, GUTTER, radius, shadows } from '../../theme';

const CARD_W = 128;

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n || 0));

/** Boutiques populaires : logo, nom, badge vérifié, abonnés */
function StoreRail({ stores, onPressStore, onSeeAll }) {
  const renderItem = useCallback(
    ({ item }) => {
      const name = item.storeName || item.name;
      return (
        <PressableScale onPress={() => onPressStore(item)} scaleTo={0.96} style={styles.card} accessibilityLabel={name}>
          <View style={styles.logoWrap}>
            {item.logo ? (
              <SmartImage uri={item.logo} width={64} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.initial]}>
                <Text variant="h2" color="primaryDark">{(name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {item.isvalid ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              </View>
            ) : null}
          </View>
          <Text variant="smallMedium" numberOfLines={1} align="center" style={styles.name}>{name}</Text>
          <View style={styles.meta}>
            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
            <Text variant="caption" color="textMuted">{compact(item.followersCount)} abonnés</Text>
          </View>
        </PressableScale>
      );
    },
    [onPressStore],
  );

  if (!stores?.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Boutiques à découvrir" subtitle="Vendeurs vérifiés du Niger" icon="storefront" onAction={onSeeAll} />
      <FlatList
        data={stores}
        keyExtractor={(s) => s._id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  content: { paddingHorizontal: GUTTER, gap: 12, paddingBottom: 6 },
  card: {
    width: CARD_W, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 10,
    backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.sm,
  },
  logoWrap: { width: 64, height: 64 },
  logo: { width: 64, height: 64, borderRadius: 32 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  verified: { position: 'absolute', right: -4, bottom: -2, backgroundColor: colors.surface, borderRadius: 10 },
  name: { marginTop: 10, width: '100%' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
});

export default memo(StoreRail);
