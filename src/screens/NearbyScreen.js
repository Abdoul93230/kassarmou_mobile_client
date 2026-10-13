import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductGrid from '../components/ProductGrid';
import ZonePickerSheet from '../components/cart/ZonePickerSheet';
import { fetchNearby, getRememberedZone, rememberZone, zoneLabel } from '../services/shippingV3';
import { EmptyState, IconButton, PressableScale, Text } from '../ui';
import { colors, GUTTER, radius } from '../theme';

const LIMIT = 20;

/** « Près de chez moi » : produits des boutiques les plus proches, les plus proches d'abord */
export default function NearbyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [zone, setZone] = useState(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({ products: [], page: 0, pages: 0, total: 0, sellerCount: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    getRememberedZone().then((z) => { setZone(z); setReady(true); if (!z) setSheet(true); });
  }, []);

  const load = useCallback(async (z, page) => {
    if (!z?._id || busy.current) return;
    busy.current = true;
    if (page === 1) setLoading(true); else setLoadingMore(true);
    try {
      const d = await fetchNearby(z._id, page, LIMIT);
      setState((prev) => ({
        products: page === 1 ? d.products : [...prev.products, ...d.products],
        page: d.page, pages: d.pages, total: d.total, sellerCount: d.sellerCount,
      }));
    } catch {
      if (page === 1) setState({ products: [], page: 0, pages: 0, total: 0, sellerCount: 0 });
    } finally {
      busy.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { if (zone?._id) load(zone, 1); }, [zone?._id, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (z) => { rememberZone(z); setZone(z); };
  const label = zone ? zoneLabel(zone) : null;

  const header = (
    <View>
      <PressableScale onPress={() => setSheet(true)} scaleTo={0.985} style={styles.zone}>
        <Ionicons name="location" size={18} color={colors.primary} />
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>{label ? label.title : 'Choisir mon quartier ou ma ville'}</Text>
          {label?.subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1}>{label.subtitle}</Text> : null}
        </View>
        <Text variant="smallMedium" color="primary">{zone ? 'Modifier' : 'Choisir'}</Text>
      </PressableScale>
      {zone && state.total ? (
        <Text variant="small" color="textSecondary" style={styles.summary}>
          {state.total} produit{state.total > 1 ? 's' : ''} de {state.sellerCount} boutique{state.sellerCount > 1 ? 's' : ''} · quartier, puis ville, puis région
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Près de chez moi</Text>
      </View>

      {ready && !zone ? (
        <EmptyState
          icon="location-outline"
          title="Où êtes-vous ?"
          message="Choisissez votre quartier ou votre ville pour voir les boutiques proches."
          actionLabel="Choisir ma zone"
          onAction={() => setSheet(true)}
        />
      ) : (
        <ProductGrid
          products={state.products}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={state.page < state.pages}
          onEndReached={() => state.page < state.pages && load(zone, state.page + 1)}
          onRefresh={() => load(zone, 1)}
          refreshing={false}
          header={header}
          empty={
            <EmptyState
              icon="storefront-outline"
              title="Aucune boutique proche"
              message="Pas encore de boutique dans votre région. Les boutiques livrent partout au Niger."
            />
          }
          contentBottom={insets.bottom + 24}
        />
      )}

      <ZonePickerSheet visible={sheet} onClose={() => setSheet(false)} selected={zone} onSelect={choose} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  zone: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: GUTTER, marginBottom: 8, padding: 12,
    borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  summary: { marginHorizontal: GUTTER, marginBottom: 10 },
});
