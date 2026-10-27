import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useLikedProductsQuery } from '../redux/catalogApi';
import ProductGrid from '../components/ProductGrid';
import { Chip, EmptyState, Text, getPricing } from '../ui';
import { colors, GUTTER, useTheme, themedStyles } from '../theme';

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'promo', label: 'En promo', icon: 'pricetag-outline' },
  { key: 'stock', label: 'Disponibles', icon: 'checkmark-circle-outline' },
];
const EMPTY = [];

/** Onglet Favoris : produits aimés, filtrables ; un cœur retiré disparaît aussitôt */
export default function FavoritesScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const likedIds = useSelector((s) => s.likes.likedProducts);
  const { data, isLoading, isFetching, refetch } = useLikedProductsQuery(userId, { skip: !userId, refetchOnMountOrArgChange: 30 });
  const [filter, setFilter] = useState('all');

  // Un nouveau favori ajouté ailleurs dans l'app : on recharge une fois pour l'afficher
  // (comparaison avec l'état précédent : un produit retiré du catalogue ne relance pas en boucle)
  const prevLiked = useRef(likedIds);
  useEffect(() => {
    const before = new Set(prevLiked.current);
    prevLiked.current = likedIds;
    if (data && likedIds.some((id) => !before.has(id))) refetch();
  }, [data, likedIds, refetch]);

  const products = useMemo(() => {
    const liked = new Set(likedIds);
    let l = (data || EMPTY).filter((p) => liked.size === 0 || liked.has(p._id));
    if (filter === 'promo') l = l.filter((p) => getPricing(p).discount > 0);
    if (filter === 'stock') l = l.filter((p) => !(Number(p.quantite) <= 0));
    return l;
  }, [data, filter, likedIds]);

  if (!userId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <Text variant="h1" style={styles.title}>Favoris</Text>
        <EmptyState
          icon="heart-outline"
          title="Gardez vos coups de cœur"
          message="Connectez-vous pour retrouver vos produits préférés sur tous vos appareils."
          actionLabel="Se connecter"
          onAction={() => navigation.navigate('QuickAuth', { returnScreen: 'MainTabs', returnParams: { screen: 'Favorites' } })}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="h1">Favoris</Text>
        {data?.length ? <Text variant="small" color="textSecondary">{products.length} article{products.length > 1 ? 's' : ''}</Text> : null}
      </View>
      <ProductGrid
        products={products}
        loading={isLoading}
        hasMore={false}
        onRefresh={refetch}
        refreshing={isFetching && !isLoading}
        header={
          data?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {FILTERS.map((f) => <Chip key={f.key} label={f.label} icon={f.icon} active={filter === f.key} onPress={() => setFilter(f.key)} />)}
            </ScrollView>
          ) : null
        }
        empty={
          <EmptyState
            icon="heart-outline"
            title={filter === 'all' ? 'Aucun favori pour le moment' : 'Aucun article ici'}
            message={filter === 'all' ? 'Touchez le ♡ sur un produit pour le retrouver ici.' : 'Essayez un autre filtre.'}
            actionLabel={filter === 'all' ? 'Découvrir des produits' : undefined}
            onAction={filter === 'all' ? () => navigation.navigate('Home') : undefined}
          />
        }
      />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { paddingHorizontal: GUTTER, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 4 },
  chips: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
}));
