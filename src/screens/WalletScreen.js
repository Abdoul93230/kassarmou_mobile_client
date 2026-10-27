import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import {
  dailyCheckin,
  fetchPublicConfig,
  fetchTransactions,
  fetchWallet,
  selectConfig,
  selectIsLoadingCheckin,
  selectTransactions,
  selectWallet,
} from '../redux/gamificationSlice';
import { Button, EmptyState, IconButton, PressableScale, Skeleton, Text } from '../ui';
import { checkinPoints } from '../components/CheckinCard';
import { siteUrl } from '../config/env';
import { formatPrice } from '../utils/formatPrice';
import { formatDate } from '../utils/orders';
import { gradients, GUTTER, radius, shadows, useTheme } from '../theme';

const LEVEL_STYLE = {
  Graine: { colors: ['#4B5563', '#6B7280'], icon: 'leaf-outline' },
  Arbre: { colors: gradients.brand, icon: 'leaf' },
};

const TX = {
  PURCHASE: ['Achat', 'bag-handle-outline'],
  CHECKIN: ['Pointage quotidien', 'flash-outline'],
  CHECKIN_STREAK: ['Bonus de série', 'flame-outline'],
  REVIEW: ['Avis produit', 'star-outline'],
  FIRST_ORDER: ['1re commande', 'ribbon-outline'],
  REFERRAL_PARRAIN: ['Parrainage', 'people-outline'],
  REFERRAL_FILLEUL: ['Bonus filleul', 'people-outline'],
  REDEMPTION: ['Réduction utilisée', 'pricetag-outline'],
  ADMIN_CREDIT: ['Crédit', 'add-circle-outline'],
  ADMIN_DEBIT: ['Débit', 'remove-circle-outline'],
  CANCELLATION: ['Annulation', 'close-circle-outline'],
  EXPIRY: ['Expiration', 'time-outline'],
  EVENT: ['Événement', 'gift-outline'],
};

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/** Programme de fidélité Baobab Points */
export default function WalletScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const wallet = useSelector(selectWallet);
  const transactions = useSelector(selectTransactions) || [];
  const config = useSelector(selectConfig);
  const checkinLoading = useSelector(selectIsLoadingCheckin);
  const [refreshing, setRefreshing] = useState(false);

  // Grand Baobab a besoin de colors.wood qui est dynamique
  const levelStyles = useMemo(() => ({
    ...LEVEL_STYLE,
    'Grand Baobab': { colors: [colors.wood, '#8A5427'], icon: 'star' },
  }), [colors.wood]);

  const load = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      dispatch(fetchPublicConfig()),
      dispatch(fetchWallet(userId)),
      dispatch(fetchTransactions({ userId })),
    ]);
  }, [dispatch, userId]);

  useEffect(() => { load(); }, [load]);


  const rate = config?.redemption?.pointsToFcfaRate ?? 20;
  const levels = useMemo(() => config?.levels || [], [config]);
  const level = wallet?.level || 'Graine';
  const style = levelStyles[level] || levelStyles.Graine;

  // Progression vers le niveau suivant (sur le total gagné)
  const progress = useMemo(() => {
    const earned = Number(wallet?.totalEarned) || 0;
    const idx = levels.findIndex((l) => l.name === level);
    const next = idx >= 0 ? levels[idx + 1] : null;
    if (!next) return null;
    const from = levels[idx].minPoints || 0;
    const pct = Math.min(1, Math.max(0, (earned - from) / Math.max(1, next.minPoints - from)));
    return { next: next.name, remaining: Math.max(0, next.minPoints - earned), pct };
  }, [level, levels, wallet?.totalEarned]);

  const checkedToday = wallet?.lastCheckinDate ? sameDay(wallet.lastCheckinDate, Date.now()) : false;
  // Jours validés dans la semaine en cours de la série (7 = semaine complète)
  const streak = Number(wallet?.checkinStreak) || 0;
  const weekDone = streak === 0 ? 0 : streak % 7 || 7;

  const checkin = async () => {
    try {
      const r = await dispatch(dailyCheckin(userId)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Toast.show({ type: 'success', text1: `+${checkinPoints(r) || 1} BP`, text2: `Série de ${r?.streak ?? 1} jour(s) 🔥` });
      dispatch(fetchTransactions({ userId }));
    } catch (e) {
      Toast.show({ type: 'info', text1: typeof e === 'string' ? e : "Déjà pointé aujourd'hui" });
    }
  };

  const copyCode = async () => {
    if (!wallet?.referralCode) return;
    await Clipboard.setStringAsync(wallet.referralCode);
    Haptics.selectionAsync().catch(() => {});
    Toast.show({ type: 'success', text1: 'Code copié', text2: wallet.referralCode });
  };

  const shareCode = () => {
    const parrain = config?.modules?.REFERRAL?.pointsFilleul ?? 10;
    Share.share({
      message: `Rejoins-moi sur Ihambaobab, la marketplace du Niger 🇳🇪 Inscris-toi avec mon code ${wallet?.referralCode} et gagne ${parrain} Baobab Points à ta première commande : ${siteUrl('/')}`,
    }).catch(() => {});
  };

  if (!userId) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
        <EmptyState
          icon="gift-outline"
          title="Gagnez des Baobab Points"
          message="Connectez-vous pour cumuler des points à chaque achat et les utiliser en réduction."
          actionLabel="Se connecter"
          onAction={() => navigation.navigate('QuickAuth', { returnScreen: 'Wallet' })}
        />
      </View>
    );
  }

  const m = config?.modules || {};
  const earnWays = [
    ['bag-handle-outline', 'Acheter', `${m.POINTS_PURCHASE?.ratePerThousand ?? 2} BP par 1 000 FCFA, crédités à la livraison`],
    ['flash-outline', 'Pointer chaque jour', `+${m.DAILY_CHECKIN?.pointsPerDay ?? 1} BP/jour · +${m.DAILY_CHECKIN?.bonus7d ?? 10} BP à 7 jours de suite`],
    ['star-outline', 'Donner un avis', `${m.REVIEW_POINTS?.textOnly ?? 2} BP, ${m.REVIEW_POINTS?.withPhoto ?? 5} BP avec photo`],
    ['people-outline', 'Parrainer un ami', `${m.REFERRAL?.pointsParrain ?? 25} BP quand il reçoit sa 1re commande`],
    ['ribbon-outline', 'Première commande', `${m.FIRST_ORDER_BONUS?.points ?? 50} BP offerts`],
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Baobab Points</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Carte solde */}
        {!wallet ? (
          <Skeleton height={190} radius={radius.xl} style={styles.cardSkeleton} />
        ) : (
          <LinearGradient colors={style.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
            <View style={styles.levelPill}>
              <Ionicons name={style.icon} size={13} color={colors.textInverse} />
              <Text variant="caption" color="textInverse">Niveau {level}</Text>
            </View>
            <Text variant="caption" color="textInverse" style={styles.dim}>Solde disponible</Text>
            <Text variant="hero" color="textInverse" style={styles.balance}>{wallet.balance ?? 0} <Text variant="h2" color="textInverse">BP</Text></Text>
            <Text variant="small" color="textInverse" style={styles.dim}>
              ≈ {formatPrice((wallet.balance || 0) * rate)} FCFA de réduction
            </Text>
            {progress ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress.pct * 100}%` }]} /></View>
                <Text variant="caption" color="textInverse" style={styles.dim}>
                  Encore {progress.remaining} BP pour devenir {progress.next}
                </Text>
              </View>
            ) : (
              <Text variant="caption" color="textInverse" style={[styles.dim, styles.mt12]}>Niveau maximum atteint, bravo ! 🌳</Text>
            )}
          </LinearGradient>
        )}

        {/* Pointage */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.warningSoft }]}><Ionicons name="flame" size={20} color={colors.warning} /></View>
            <View style={styles.flex}>
              <Text variant="title">Pointage quotidien</Text>
              <Text variant="caption" color="textSecondary">Série : {wallet?.checkinStreak || 0} jour{(wallet?.checkinStreak || 0) > 1 ? 's' : ''}</Text>
            </View>
            <Button
              title={checkedToday ? 'Fait ✓' : 'Pointer'}
              size="sm"
              variant={checkedToday ? 'soft' : 'primary'}
              disabled={checkedToday}
              loading={checkinLoading}
              onPress={checkin}
            />
          </View>
          <View style={styles.week}>
            {Array.from({ length: 7 }).map((_, i) => {
              const filled = i < weekDone;
              return <View key={i} style={[styles.day, { backgroundColor: colors.surfaceAlt }, filled && { backgroundColor: colors.warning }]}><Text variant="caption" color={filled ? 'textInverse' : 'textMuted'}>{i + 1}</Text></View>;
            })}
          </View>
          <Text variant="caption" color="textMuted">7 jours de suite = bonus de {config?.modules?.DAILY_CHECKIN?.bonus7d ?? 10} BP</Text>
        </View>

        {/* Parrainage */}
        {wallet?.referralCode ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text variant="title">Invitez vos proches</Text>
            <Text variant="small" color="textSecondary" style={styles.mt4}>
              Vous gagnez {config?.modules?.REFERRAL?.pointsParrain ?? 25} BP pour chaque ami qui commande avec votre code.
            </Text>
            <PressableScale onPress={copyCode} style={[styles.code, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]} scaleTo={0.98} accessibilityLabel="Copier mon code">
              <Text variant="h2" style={styles.codeText}>{wallet.referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </PressableScale>
            <Button title="Partager mon code" icon="share-social-outline" full onPress={shareCode} />
          </View>
        ) : null}

        {/* Comment gagner */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="title" style={styles.mb8}>Comment gagner des points</Text>
          {earnWays.map(([icon, title, desc]) => (
            <View key={title} style={styles.earn}>
              <View style={[styles.icon, styles.iconSmall, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={16} color={colors.primary} /></View>
              <View style={styles.flex}>
                <Text variant="bodyMedium">{title}</Text>
                <Text variant="caption" color="textSecondary">{desc}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.note, { backgroundColor: colors.bg }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              À la commande : 1 BP = {rate} FCFA, jusqu'à {config?.redemption?.maxPercentPerOrder ?? 30} % du montant. Les points expirent après {config?.earning?.pointsExpireMonths ?? 12} mois.
            </Text>
          </View>
        </View>

        {/* Historique */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="title" style={styles.mb8}>Historique</Text>
          {!transactions.length ? (
            <Text variant="small" color="textMuted">Aucun mouvement pour l'instant.</Text>
          ) : (
            transactions.map((tx) => {
              const [label, icon] = TX[tx.type] || [tx.type, 'ellipse-outline'];
              const credit = Number(tx.delta) > 0;
              return (
                <View key={tx._id} style={styles.tx}>
                  <View style={[styles.icon, styles.iconSmall, { backgroundColor: credit ? colors.successSoft : colors.dangerSoft }]}>
                    <Ionicons name={icon} size={15} color={credit ? colors.success : colors.danger} />
                  </View>
                  <View style={styles.flex}>
                    <Text variant="smallMedium">{label}</Text>
                    <Text variant="caption" color="textMuted" numberOfLines={1}>{tx.reason ? `${tx.reason} · ` : ''}{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text variant="title" color={credit ? 'success' : 'danger'}>{credit ? '+' : '−'}{Math.abs(tx.delta)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  dim: { opacity: 0.85 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mb8: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  cardSkeleton: { marginHorizontal: GUTTER },
  balanceCard: { marginHorizontal: GUTTER, padding: 20, borderRadius: radius.xl, ...shadows.md },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: 14,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  balance: { fontSize: 42, lineHeight: 50, marginTop: 2 },
  progressWrap: { marginTop: 16, gap: 6 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  card: { marginHorizontal: GUTTER, marginTop: 14, padding: 16, borderRadius: radius.lg, ...shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconSmall: { width: 32, height: 32, borderRadius: 16 },
  week: { flexDirection: 'row', gap: 6, marginTop: 14, marginBottom: 8 },
  day: { flex: 1, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  code: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14, padding: 14,
    borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed',
  },
  codeText: { letterSpacing: 2 },
  earn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  note: { flexDirection: 'row', gap: 6, marginTop: 10, padding: 10, borderRadius: radius.md },
  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
});
