import React, { memo, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Button, PressableScale, Stars, Text } from '../../ui';
import { timeAgo } from '../../utils/text';
import { colors, fonts, GUTTER, radius } from '../../theme';

const RATING_LABELS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

/** Résumé des notes : moyenne + répartition par étoile */
export const summarize = (reviews) => {
  const counts = [0, 0, 0, 0, 0];
  let sum = 0;
  reviews.forEach((r) => {
    const n = Math.min(5, Math.max(1, Math.round(Number(r.etoil) || 0)));
    counts[n - 1] += 1;
    sum += n;
  });
  return { avg: reviews.length ? sum / reviews.length : 0, count: reviews.length, counts };
};

const ReviewItem = memo(function ReviewItem({ review }) {
  const name = review.userName || 'Client';
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        <View style={styles.avatar}>
          <Text variant="smallMedium" color="primaryDark">{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="smallMedium" numberOfLines={1}>{name}</Text>
          <View style={styles.reviewMeta}>
            <Stars value={Number(review.etoil) || 0} size={12} />
            <Text variant="caption" color="textMuted">{timeAgo(review.date || review.createdAt)}</Text>
          </View>
        </View>
      </View>
      {review.description ? <Text variant="body" color="textSecondary" style={styles.reviewText}>{review.description}</Text> : null}
    </View>
  );
});

/** Fenêtre « Donner mon avis » */
export const ReviewSheet = memo(function ReviewSheet({ visible, onClose, onSubmit, submitting }) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const canSend = rating > 0 && text.trim().length >= 3;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text variant="h2" align="center">Votre avis compte</Text>
          <Text variant="small" color="textSecondary" align="center" style={styles.sheetSub}>
            Aidez les autres clients à bien choisir
          </Text>
          <View style={styles.starsPick}>
            <Stars value={rating} size={36} gap={10} onChange={setRating} />
            <Text variant="smallMedium" color={rating ? 'primaryDark' : 'textMuted'} style={styles.ratingLabel}>
              {RATING_LABELS[rating] || 'Touchez pour noter'}
            </Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Qualité, livraison, conformité…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={600}
            style={styles.input}
          />
          <Button
            title="Publier mon avis"
            full
            size="lg"
            loading={submitting}
            disabled={!canSend}
            onPress={async () => {
              const ok = await onSubmit({ rating, text: text.trim() });
              if (ok) {
                setRating(0);
                setText('');
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

/** Section Avis de la fiche produit */
function ReviewsSection({ reviews, loading, user, onRequireAuth, onSubmitReview, submitting }) {
  const [sheet, setSheet] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { avg, count, counts } = useMemo(() => summarize(reviews), [reviews]);
  const visible = showAll ? reviews : reviews.slice(0, 3);

  const openSheet = () => (user ? setSheet(true) : onRequireAuth());

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text variant="h2">Avis clients</Text>
        {count ? <Text variant="body" color="textSecondary">({count})</Text> : null}
      </View>

      {count > 0 ? (
        <View style={styles.summary}>
          <View style={styles.avgBox}>
            <Text variant="hero" color="text">{avg.toFixed(1)}</Text>
            <Stars value={avg} size={14} />
            <Text variant="caption" color="textMuted" style={styles.mt4}>{count} avis</Text>
          </View>
          <View style={styles.bars}>
            {[5, 4, 3, 2, 1].map((n) => (
              <View key={n} style={styles.barRow}>
                <Text variant="caption" color="textSecondary" style={styles.barLabel}>{n}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${count ? (counts[n - 1] / count) * 100 : 0}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : !loading ? (
        <Text variant="body" color="textSecondary" style={styles.empty}>
          Aucun avis pour l'instant. Soyez le premier à partager votre expérience !
        </Text>
      ) : null}

      {visible.map((r, i) => <ReviewItem key={r._id || i} review={r} />)}

      {count > 3 ? (
        <PressableScale onPress={() => setShowAll((v) => !v)} style={styles.more}>
          <Text variant="smallMedium" color="primary">{showAll ? 'Voir moins' : `Voir les ${count} avis`}</Text>
        </PressableScale>
      ) : null}

      <Button title="Donner mon avis" icon="create-outline" variant="secondary" full onPress={openSheet} style={styles.writeBtn} />

      <ReviewSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        submitting={submitting}
        onSubmit={async (payload) => {
          const ok = await onSubmitReview(payload);
          if (ok) {
            setSheet(false);
            Toast.show({ type: 'success', text1: 'Merci pour votre avis !', visibilityTime: 1800 });
          }
          return ok;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: GUTTER, marginTop: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  summary: {
    flexDirection: 'row', gap: 20, padding: 16, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  avgBox: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  bars: { flex: 1, justifyContent: 'center', gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.star },
  empty: { marginBottom: 4 },
  review: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reviewText: { marginTop: 8 },
  more: { paddingVertical: 12, alignItems: 'center' },
  writeBtn: { marginTop: 12 },

  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 },
  sheetSub: { marginTop: 4 },
  starsPick: { alignItems: 'center', marginVertical: 20 },
  ratingLabel: { marginTop: 8 },
  input: {
    minHeight: 110, textAlignVertical: 'top', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg, padding: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.text, marginBottom: 16,
  },
});

export default memo(ReviewsSection);
