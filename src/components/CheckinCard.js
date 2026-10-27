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
import { colors, GUTTER, radius, useTheme, themedStyles } from '../theme';

/** Points gagnés par un pointage (jour + éventuel bonus de série) */
export const checkinPoints = (payload) =>
  (payload?.checkin?.transaction?.delta || 0) + (payload?.bonus?.transaction?.[0]?.delta || 0);

/** Carte « Pointez aujourd'hui » de l'accueil — disparaît une fois le pointage fait */
export default function CheckinCard({ navigation }) {
  const { colors, isDark } = useTheme();
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

  const gradientColors = isDark
    ? ['rgba(245, 158, 11, 0.22)', 'rgba(197, 164, 115, 0.20)']
    : [colors.warningSoft, colors.sandSoft];

  return (
    <PressableScale onPress={() => navigation?.navigate('Wallet')} scaleTo={0.99} style={styles.wrap}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isDark && { borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.35)' }]}
      >
        <View style={[styles.icon, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : colors.surface }]}>
          <Ionicons name="flame" size={22} color={colors.warning} />
        </View>
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


const styles = themedStyles((colors) => ({
  wrap: { marginHorizontal: GUTTER, marginTop: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
}));
