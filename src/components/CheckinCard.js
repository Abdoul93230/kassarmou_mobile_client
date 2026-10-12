import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import {
  dailyCheckin,
  fetchPublicConfig,
  fetchWallet,
  selectConfig,
  selectIsLoadingCheckin,
  selectWallet,
} from '../redux/gamificationSlice';
import { Button, PressableScale, Text } from '../ui';
import { colors, GUTTER, radius } from '../theme';

/** Points gagnés par un pointage (jour + éventuel bonus de série) */
export const checkinPoints = (payload) =>
  (payload?.checkin?.transaction?.delta || 0) + (payload?.bonus?.transaction?.[0]?.delta || 0);

/** Carte « Pointez aujourd'hui » de l'accueil — disparaît une fois le pointage fait */
export default function CheckinCard({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const wallet = useSelector(selectWallet);
  const config = useSelector(selectConfig);
  const loading = useSelector(selectIsLoadingCheckin);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!wallet) dispatch(fetchWallet(userId));
    if (!config) dispatch(fetchPublicConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!config?.enabled || !userId || hidden) return null;
  const done = wallet?.lastCheckinDate && new Date(wallet.lastCheckinDate).toDateString() === new Date().toDateString();
  if (done) return null;

  const perDay = config?.modules?.DAILY_CHECKIN?.pointsPerDay ?? 1;
  const streak = wallet?.checkinStreak ?? 0;

  const checkin = async () => {
    try {
      const r = await dispatch(dailyCheckin(userId)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Toast.show({ type: 'success', text1: `+${checkinPoints(r) || perDay} Baobab Points`, text2: `Série de ${r?.streak ?? streak + 1} jour(s) 🔥` });
    } catch {
      setHidden(true);
    }
  };

  return (
    <PressableScale onPress={() => navigation?.navigate('Wallet')} scaleTo={0.99} style={styles.wrap}>
      <LinearGradient colors={[colors.warningSoft, colors.sandSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.icon}><Ionicons name="flame" size={22} color={colors.warning} /></View>
        <View style={styles.flex}>
          <Text variant="title">Pointez aujourd'hui</Text>
          <Text variant="caption" color="textSecondary">
            +{perDay} BP{streak ? ` · série de ${streak} jour${streak > 1 ? 's' : ''}` : ' · commencez votre série'}
          </Text>
        </View>
        <Button title="Pointer" size="sm" loading={loading} onPress={checkin} />
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: GUTTER, marginTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
