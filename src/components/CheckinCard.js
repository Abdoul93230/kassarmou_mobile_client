import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchWallet,
  fetchPublicConfig,
  dailyCheckin,
  selectWallet,
  selectConfig,
  selectIsLoadingCheckin,
  clearCheckinResult,
  selectCheckinResult,
} from "../redux/gamificationSlice";
import { COLORS } from "../config/constants";

export default function CheckinCard({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const wallet = useSelector(selectWallet);
  const config = useSelector(selectConfig);
  const isLoadingCheckin = useSelector(selectIsLoadingCheckin);
  const checkinResult = useSelector(selectCheckinResult);

  const [toast, setToast] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (!wallet) dispatch(fetchWallet(user.id));
    if (!config) dispatch(fetchPublicConfig());
  }, [user?.id]);

  useEffect(() => {
    if (checkinResult) {
      setToast(`+${checkinResult.pointsEarned} BP crédités !`);
      const t = setTimeout(() => {
        setToast(null);
        dispatch(clearCheckinResult());
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [checkinResult]);

  if (!config?.enabled || !user?.id || dismissed) return null;

  const alreadyDone = wallet?.lastCheckinDate
    ? new Date(wallet.lastCheckinDate).toDateString() === new Date().toDateString()
    : false;

  if (alreadyDone) return null;

  const handleCheckin = async () => {
    try {
      await dispatch(dailyCheckin(user.id)).unwrap();
    } catch {
      // already checked in — card will disappear on next fetch
    }
  };

  const basePoints = config?.modules?.DAILY_CHECKIN?.pointsPerDay ?? 1;
  const streak = wallet?.checkinStreak ?? 0;

  return (
    <>
      <LinearGradient
        colors={["#30A08B", "#1d7a6a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="leaf" size={22} color="#fff" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Pointage du jour</Text>
          <Text style={styles.sub}>
            +{basePoints} BP
            {streak > 1 ? ` · Série ${streak}j 🔥` : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCheckin}
          disabled={isLoadingCheckin}
          style={styles.btn}
        >
          {isLoadingCheckin ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.btnText}>Pointer</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
          <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </LinearGradient>

      {toast && (
        <View style={styles.toast}>
          <Ionicons name="leaf" size={14} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginTop: 10,
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  title: { color: "#fff", fontWeight: "800", fontSize: 13 },
  sub: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 1 },
  btn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 70,
    alignItems: "center",
  },
  btnText: { color: COLORS.primary, fontWeight: "800", fontSize: 13 },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  toast: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 999,
  },
  toastText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
