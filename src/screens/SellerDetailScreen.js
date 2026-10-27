import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import socialService from '../services/socialService';
import { useStoreQuery, useStoreStatsQuery } from '../redux/catalogApi';
import { ReviewSheet } from '../components/product/ReviewsSection';
import { Button, EmptyState, IconButton, PressableScale, SmartImage, Stars, Text } from '../ui';
import { timeAgo } from '../utils/text';
import { colors, GUTTER, radius, shadows, useTheme, themedStyles } from '../theme';

const PAGE = 10;

/** Avis clients d'une boutique : note globale, liste paginée, rédaction, « utile » */
export default function SellerDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { sellerId } = route.params || {};
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;

  const store = useStoreQuery(sellerId, { skip: !sellerId });
  const stats = useStoreStatsQuery(sellerId, { skip: !sellerId });

  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [posting, setPosting] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      if (!sellerId) return;
      setLoading(true);
      const res = await socialService.getSellerReviews(sellerId, p, PAGE);
      const list = res?.data?.reviews || [];
      setReviews((prev) => (p === 1 ? list : [...prev, ...list.filter((r) => !prev.some((x) => x._id === r._id))]));
      setPages(Number(res?.data?.totalPages) || 1);
      setPage(p);
      setLoading(false);
    },
    [sellerId],
  );

  useEffect(() => { load(1); }, [load]);

  const requireAuth = () => navigation.navigate('QuickAuth', { returnScreen: 'SellerDetail', returnParams: { sellerId } });

  const submit = useCallback(
    async ({ rating, text }) => {
      setPosting(true);
      try {
        await socialService.createReview(sellerId, { rating, comment: text });
        setSheet(false);
        Toast.show({ type: 'success', text1: 'Merci pour votre avis !' });
        await Promise.all([load(1), stats.refetch()]);
        return true;
      } catch (e) {
        Toast.show({ type: 'error', text1: "Avis non publié", text2: e.response?.data?.message || 'Réessayez dans un instant.' });
        return false;
      } finally {
        setPosting(false);
      }
    },
    [load, sellerId, stats],
  );

  const toggleUseful = useCallback(
    async (review) => {
      if (!userId) return requireAuth();
      const liked = (review.likes || []).map(String).includes(String(userId));
      const patch = (r) =>
        r._id !== review._id
          ? r
          : { ...r, likes: liked ? r.likes.filter((x) => String(x) !== String(userId)) : [...(r.likes || []), userId], likesCount: Math.max(0, (r.likesCount || 0) + (liked ? -1 : 1)) };
      setReviews((prev) => prev.map(patch));
      try {
        await (liked ? socialService.unlikeReview(review._id) : socialService.likeReview(review._id));
      } catch {
        load(1);
      }
      return undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [load, userId],
  );

  const remove = useCallback(
    (review) => {
      Alert.alert('Supprimer votre avis ?', '', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await socialService.deleteReview(review._id);
              setReviews((prev) => prev.filter((r) => r._id !== review._id));
              stats.refetch();
            } catch {
              Toast.show({ type: 'error', text1: 'Suppression impossible' });
            }
          },
        },
      ]);
    },
    [stats],
  );

  const s = store.data;
  const rating = Number(stats.data?.rating ?? s?.rating) || 0;
  const count = Number(stats.data?.reviewsCount ?? s?.reviewsCount) || 0;
  const name = s?.storeName || 'Boutique';
  const alreadyReviewed = reviews.some((r) => String(r.user?._id || r.user?.id || r.user) === String(userId));

  const header = (
    <View>
      <PressableScale onPress={() => navigation.navigate('Boutique', { sellerId, storeName: name })} style={[styles.storeCard, { backgroundColor: colors.surface }]} scaleTo={0.99}>
        {s?.logo ? <SmartImage uri={s.logo} width={56} style={styles.logo} /> : <View style={[styles.logo, styles.initial, { backgroundColor: colors.primarySoft }]}><Text variant="h2" color="primaryDark">{name.charAt(0)}</Text></View>}
        <View style={styles.flex}>
          <Text variant="h3" numberOfLines={1}>{name}</Text>
          <Text variant="small" color="textSecondary">Voir la boutique</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </PressableScale>

      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Text variant="hero" style={styles.big}>{rating ? rating.toFixed(1) : '—'}</Text>
        <Stars value={rating} size={20} gap={4} />
        <Text variant="small" color="textSecondary" style={styles.mt6}>{count ? `Basé sur ${count} avis` : 'Pas encore d\'avis'}</Text>
        {!alreadyReviewed ? (
          <Button title="Noter cette boutique" icon="star-outline" variant="secondary" onPress={() => (userId ? setSheet(true) : requireAuth())} style={styles.mt16} />
        ) : null}
      </View>
      {reviews.length ? <Text variant="h3" style={styles.listTitle}>Derniers avis</Text> : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Avis sur la boutique</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(r) => r._id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        onEndReached={() => !loading && page < pages && load(page + 1)}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => {
          const author = item.user?.name || item.user?.userName || 'Client';
          const mine = String(item.user?._id || item.user?.id) === String(userId);
          const useful = (item.likes || []).map(String).includes(String(userId));
          return (
            <View style={[styles.review, { borderBottomColor: colors.border }]}>
              <View style={styles.reviewHead}>
                <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Text variant="smallMedium" color="primaryDark">{author.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.flex}>
                  <Text variant="smallMedium">{author}{mine ? ' (vous)' : ''}</Text>
                  <View style={styles.metaRow}>
                    <Stars value={Number(item.rating) || 0} size={12} />
                    <Text variant="caption" color="textMuted">{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
                {mine ? (
                  <PressableScale onPress={() => remove(item)} hitSlop={10} accessibilityLabel="Supprimer mon avis">
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </PressableScale>
                ) : null}
              </View>
              {item.comment ? <Text variant="body" color="textSecondary" style={styles.mt8}>{item.comment}</Text> : null}
              <PressableScale onPress={() => toggleUseful(item)} style={[styles.useful, { backgroundColor: colors.surfaceAlt }, useful && [styles.usefulOn, { backgroundColor: colors.primarySoft }]]} hitSlop={6}>
                <Ionicons name={useful ? 'thumbs-up' : 'thumbs-up-outline'} size={14} color={useful ? colors.primaryDark : colors.textSecondary} />
                <Text variant="caption" color={useful ? 'primaryDark' : 'textSecondary'}>Utile{item.likesCount ? ` · ${item.likesCount}` : ''}</Text>
              </PressableScale>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.primary} style={styles.mt16} /> : (
            <EmptyState icon="chatbubbles-outline" title="Aucun avis" message="Achetez dans cette boutique et partagez votre expérience." />
          )
        }
        ListFooterComponent={loading && reviews.length ? <ActivityIndicator color={colors.primary} style={styles.mt16} /> : null}
      />

      <ReviewSheet visible={sheet} onClose={() => setSheet(false)} onSubmit={submit} submitting={posting} />
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  storeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: GUTTER, marginTop: 6, padding: 12,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm,
  },
  logo: { width: 56, height: 56, borderRadius: 28 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  summary: {
    alignItems: 'center', marginHorizontal: GUTTER, marginTop: 14, padding: 20, borderRadius: radius.lg,
    backgroundColor: colors.surface, ...shadows.sm,
  },
  big: { fontSize: 44, lineHeight: 52 },
  listTitle: { marginHorizontal: GUTTER, marginTop: 24, marginBottom: 4 },
  review: { marginHorizontal: GUTTER, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  useful: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  usefulOn: { backgroundColor: colors.primarySoft },
}));
