import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ProductRail from './ProductRail';
import ZonePickerSheet from '../cart/ZonePickerSheet';
import { fetchNearby, getRememberedZone, rememberZone } from '../../services/shippingV3';
import { PressableScale, Text } from '../../ui';
import { colors, GUTTER, radius, useTheme, themedStyles } from '../../theme';

/** Accueil : « Près de chez vous » — produits des boutiques de la zone du client */
function NearbyRail({ navigation }) {
  const { colors } = useTheme();
  const [zone, setZone] = useState(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);

  // Relu à chaque retour sur l'accueil (la zone a pu changer au panier)
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getRememberedZone().then((z) => {
        if (!alive) return;
        setZone((cur) => (cur?._id === z?._id ? cur : z));
        setReady(true);
      });
      return () => { alive = false; };
    }, []),
  );

  useEffect(() => {
    if (!zone?._id) {
      setData(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    fetchNearby(zone._id, 1, 10)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [zone?._id]);

  const choose = (z) => { rememberZone(z); setZone(z); };

  if (!ready) return null;

  if (!zone) {
    return (
      <>
        <PressableScale onPress={() => setSheet(true)} scaleTo={0.985} style={[styles.cta, { backgroundColor: colors.primarySoft, borderColor: colors.primary + '33' }]}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.primary }]}><Ionicons name="location" size={18} color={colors.textInverse} /></View>
          <View style={styles.flex}>
            <Text variant="title">Près de chez vous</Text>
            <Text variant="caption" color="textSecondary">Choisissez votre quartier : livraison plus rapide et moins chère</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </PressableScale>
        <ZonePickerSheet visible={sheet} onClose={() => setSheet(false)} selected={null} onSelect={choose} />
      </>
    );
  }

  if (!loading && (!data || data.total === 0)) return null;

  return (
    <ProductRail
      title="Près de chez vous"
      subtitle={data ? `Autour de ${data.destination?.name || zone.name} · ${data.sellerCount} boutique${data.sellerCount > 1 ? 's' : ''}` : `Autour de ${zone.name}`}
      icon="location"
      iconColor={colors.wood}
      products={data?.products || []}
      loading={loading}
      onSeeAll={() => navigation.navigate('Nearby')}
    />
  );
}

const styles = themedStyles((colors) => ({
  flex: { flex: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 16, padding: 14,
    borderRadius: radius.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '33',
  },
  ctaIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
}));

export default memo(NearbyRail);
