import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Clipboard,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchWallet,
  fetchTransactions,
  fetchPublicConfig,
  dailyCheckin,
  selectWallet,
  selectTransactions,
  selectConfig,
  selectCheckinResult,
  selectIsLoadingWallet,
  selectIsLoadingCheckin,
  clearCheckinResult,
} from "../redux/gamificationSlice";
import { COLORS } from "../config/constants";

const LEVEL_CONFIG = {
  "Graine": { label: "Graine", colors: ["#6b7280", "#4b5563"], icon: "leaf-outline" },
  "Arbre": { label: "Arbre", colors: ["#30A08B", "#1d7a6a"], icon: "leaf" },
  "Grand Baobab": { label: "Grand Baobab", colors: ["#B17236", "#8a5427"], icon: "star" },
};

const TX_LABELS = {
  PURCHASE: { label: "Achat", color: COLORS.primary, sign: "+" },
  CHECKIN: { label: "Pointage", color: "#6366f1", sign: "+" },
  CHECKIN_STREAK: { label: "Bonus série", color: "#8b5cf6", sign: "+" },
  REVIEW: { label: "Avis", color: "#0ea5e9", sign: "+" },
  FIRST_ORDER: { label: "1ère commande", color: "#f59e0b", sign: "+" },
  REFERRAL_PARRAIN: { label: "Parrainage", color: "#10b981", sign: "+" },
  REFERRAL_FILLEUL: { label: "Bonus filleul", color: "#10b981", sign: "+" },
  REDEMPTION: { label: "Réduction utilisée", color: "#ef4444", sign: "−" },
  ADMIN_CREDIT: { label: "Crédit admin", color: COLORS.primary, sign: "+" },
  ADMIN_DEBIT: { label: "Débit admin", color: "#ef4444", sign: "−" },
  CANCELLATION: { label: "Annulation", color: "#ef4444", sign: "−" },
  EXPIRY: { label: "Expiration", color: "#9ca3af", sign: "−" },
  EVENT: { label: "Événement", color: "#f59e0b", sign: "+" },
};

function EarnAccordion({ config }) {
  const [openKey, setOpenKey] = useState(null);

  const r = config?.modules?.POINTS_PURCHASE?.ratePerThousand ?? 2;
  const cpd = config?.modules?.DAILY_CHECKIN?.pointsPerDay ?? 1;
  const b7 = config?.modules?.DAILY_CHECKIN?.bonus7d ?? 10;
  const b30 = config?.modules?.DAILY_CHECKIN?.bonus30d ?? 30;
  const rtxt = config?.modules?.REVIEW_POINTS?.textOnly ?? 2;
  const rphoto = config?.modules?.REVIEW_POINTS?.withPhoto ?? 5;
  const parrain = config?.modules?.REFERRAL?.pointsParrain ?? 25;
  const filleul = config?.modules?.REFERRAL?.pointsFilleul ?? 10;
  const expiry = config?.modules?.REFERRAL?.expiryDays ?? 30;
  const firstOrder = config?.modules?.FIRST_ORDER_BONUS?.points ?? 50;
  const redeemRate = config?.redemption?.pointsToFcfaRate ?? 20;
  const maxPct = config?.redemption?.maxPercentPerOrder ?? 30;

  const items = [
    {
      key: "purchase",
      icon: "cart-outline",
      label: "Commande livrée",
      desc: `${r} BP / 1 000 FCFA`,
      lines: [
        `Gagnez ${r} BP par tranche de 1 000 FCFA dépensés.`,
        `Points crédités après livraison.`,
        "",
        "Bonus de niveau :",
        `• Arbre → ×1.25 (${Math.round(r * 1.25 * 10) / 10} BP/1 000 FCFA)`,
        `• Grand Baobab → ×1.5 (${Math.round(r * 1.5 * 10) / 10} BP/1 000 FCFA)`,
      ],
    },
    {
      key: "checkin",
      icon: "flash-outline",
      label: "Pointage quotidien",
      desc: `+${cpd} BP/jour`,
      lines: [
        `Pointez chaque jour pour gagner ${cpd} BP.`,
        "",
        "Bonus de série :",
        `• 7 jours consécutifs → +${b7} BP`,
        `• 30 jours consécutifs → +${b30} BP`,
        "",
        "La série est remise à zéro si vous manquez un jour.",
      ],
    },
    {
      key: "review",
      icon: "star-outline",
      label: "Avis produit",
      desc: `${rtxt} BP (texte) · ${rphoto} BP (photo)`,
      lines: [
        "Laissez un avis sur un produit acheté :",
        `• Texte uniquement → ${rtxt} BP`,
        `• Avec photo → ${rphoto} BP`,
        "",
        "Un avis = un crédit (anti-doublon).",
      ],
    },
    {
      key: "referral",
      icon: "people-outline",
      label: "Parrainer un ami",
      desc: `${parrain} BP par filleul validé`,
      lines: [
        `Partagez votre code. Quand votre filleul reçoit sa 1ère commande :`,
        `• Vous gagnez ${parrain} BP`,
        `• Il gagne ${filleul} BP`,
        "",
        `Fenêtre de validation : ${expiry} jours.`,
        "",
        "Bonus progressif parrain :",
        `• 5–19 filleuls → +10 BP/filleul`,
        `• ≥ 20 filleuls → +30 BP/filleul`,
      ],
    },
    {
      key: "firstorder",
      icon: "ribbon-outline",
      label: "1ère commande",
      desc: `${firstOrder} BP bonus`,
      lines: [
        `${firstOrder} BP offerts à la livraison de votre première commande.`,
        "",
        "Ce bonus est accordé une seule fois par compte.",
      ],
    },
    {
      key: "redeem",
      icon: "gift-outline",
      label: "Utiliser mes BP",
      desc: `1 BP = ${redeemRate} FCFA`,
      lines: [
        `À la commande, utilisez vos BP comme réduction :`,
        `• 1 BP = ${redeemRate} FCFA`,
        `• Plafond : ${maxPct}% du montant`,
        "",
        `Exemple : 50 BP = ${50 * redeemRate} FCFA de réduction.`,
      ],
    },
  ];

  return (
    <View style={[styles.section, { paddingBottom: 4 }]}>
      <Text style={styles.sectionTitle}>Baobab Points — Comment ça marche ?</Text>
      {items.map(({ key, icon, label, desc, lines }) => {
        const isOpen = openKey === key;
        return (
          <View key={key} style={earnStyles.itemWrap}>
            <TouchableOpacity
              onPress={() => setOpenKey(isOpen ? null : key)}
              style={earnStyles.itemRow}
              activeOpacity={0.7}
            >
              <View style={earnStyles.iconWrap}>
                <Ionicons name={icon} size={17} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={earnStyles.itemLabel}>{label}</Text>
                <Text style={earnStyles.itemDesc}>{desc}</Text>
              </View>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={isOpen ? COLORS.primary : "#d1d5db"}
              />
            </TouchableOpacity>
            {isOpen && (
              <View style={earnStyles.detail}>
                {lines.map((line, i) => (
                  <Text
                    key={i}
                    style={[
                      earnStyles.detailLine,
                      line === "" && { marginBottom: 4 },
                      line.startsWith("•") && { marginLeft: 8 },
                      line.endsWith(":") && { fontWeight: "700", color: "#374151", marginTop: 4 },
                    ]}
                  >
                    {line || ""}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const earnStyles = StyleSheet.create({
  itemWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f0faf7",
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontSize: 13, fontWeight: "700", color: "#1f2937" },
  itemDesc: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  detail: {
    backgroundColor: "#f8fdfb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  detailLine: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },
});

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function WalletScreen({ navigation }) {
  const dispatch = useDispatch();
  const wallet = useSelector(selectWallet);
  const transactions = useSelector(selectTransactions);
  const config = useSelector(selectConfig);
  const checkinResult = useSelector(selectCheckinResult);
  const isLoadingWallet = useSelector(selectIsLoadingWallet);
  const isLoadingCheckin = useSelector(selectIsLoadingCheckin);
  const user = useSelector((state) => state.auth.user);

  const [refreshing, setRefreshing] = useState(false);
  const [checkinToast, setCheckinToast] = useState(null);

  const load = useCallback(() => {
    if (!user?.id) return;
    dispatch(fetchPublicConfig());
    dispatch(fetchWallet(user.id));
    dispatch(fetchTransactions({ userId: user.id }));
  }, [user?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (checkinResult) {
      setCheckinToast(`+${checkinResult.pointsEarned} BP crédités ! Série: ${checkinResult.streak} jour(s)`);
      const t = setTimeout(() => {
        setCheckinToast(null);
        dispatch(clearCheckinResult());
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [checkinResult]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCheckin = async () => {
    if (!user?.id) return;
    try {
      await dispatch(dailyCheckin(user.id)).unwrap();
    } catch (err) {
      Alert.alert("Pointage", err || "Déjà pointé aujourd'hui.");
    }
  };

  const copyReferralCode = () => {
    if (!wallet?.referralCode) return;
    Clipboard.setString(wallet.referralCode);
    Alert.alert("Copié !", `Code ${wallet.referralCode} copié dans le presse-papiers.`);
  };

  const alreadyCheckedIn = wallet?.lastCheckinDate
    ? new Date(wallet.lastCheckinDate).toDateString() === new Date().toDateString()
    : false;

  const level = wallet?.level || "Graine";
  const lvlCfg = LEVEL_CONFIG[level] || LEVEL_CONFIG["Graine"];
  const rate = config?.redemption?.pointsToFcfaRate ?? 20;

  if (!user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyCenter}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>Connexion requise</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate("QuickAuth")}>
            <Text style={styles.ctaBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={lvlCfg.colors} style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Baobab Points</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoadingWallet && !wallet ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.levelBadge}>
              <Ionicons name={lvlCfg.icon} size={14} color="#fff" />
              <Text style={styles.levelText}>{lvlCfg.label}</Text>
            </View>
            <Text style={styles.balanceLabel}>Solde</Text>
            <Text style={styles.balanceValue}>{(wallet?.balance ?? 0).toLocaleString("fr-FR")} BP</Text>
            <Text style={styles.balanceEquiv}>
              ≈ {((wallet?.balance ?? 0) * rate).toLocaleString("fr-FR")} FCFA
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{(wallet?.totalEarned ?? 0).toLocaleString("fr-FR")}</Text>
                <Text style={styles.statLabel}>Gagnés</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{(wallet?.totalSpent ?? 0).toLocaleString("fr-FR")}</Text>
                <Text style={styles.statLabel}>Utilisés</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{wallet?.checkinStreak ?? 0}</Text>
                <Text style={styles.statLabel}>Jours consécutifs</Text>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Daily checkin */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pointage du jour</Text>
          <TouchableOpacity
            onPress={handleCheckin}
            disabled={alreadyCheckedIn || isLoadingCheckin}
            style={[styles.checkinBtn, alreadyCheckedIn && styles.checkinBtnDone]}
          >
            {isLoadingCheckin ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={alreadyCheckedIn ? "checkmark-circle" : "flash"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.checkinBtnText}>
                  {alreadyCheckedIn
                    ? "Pointé aujourd'hui ✓"
                    : `Pointer (+${config?.modules?.DAILY_CHECKIN?.pointsPerDay ?? 1} BP)`}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {wallet?.checkinStreak > 0 && (
            <Text style={styles.streakHint}>
              Série actuelle : {wallet.checkinStreak} jour(s) 🔥
            </Text>
          )}
        </View>

        {/* Referral code */}
        {wallet?.referralCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Code de parrainage</Text>
            <TouchableOpacity style={styles.referralRow} onPress={copyReferralCode}>
              <Text style={styles.referralCode}>{wallet.referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.referralHint}>
              Partagez ce code pour gagner des points quand vos filleuls passent leur première commande.
            </Text>
          </View>
        )}

        {/* How to earn */}
        <EarnAccordion config={config} />

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          {isLoadingWallet && !transactions.length ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyTx}>Aucune transaction pour l'instant.</Text>
          ) : (
            transactions.map((tx) => {
              const cfg = TX_LABELS[tx.type] || { label: tx.type, color: "#6b7280", sign: "+" };
              const isCredit = tx.delta > 0;
              return (
                <View key={tx._id} style={styles.txRow}>
                  <View style={[styles.txDot, { backgroundColor: cfg.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txLabel}>{cfg.label}</Text>
                    {tx.reason ? <Text style={styles.txReason} numberOfLines={1}>{tx.reason}</Text> : null}
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txDelta, { color: isCredit ? COLORS.primary : "#ef4444" }]}>
                    {isCredit ? "+" : "−"}{Math.abs(tx.delta)} BP
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Toast */}
      {checkinToast && (
        <View style={styles.toast}>
          <Ionicons name="leaf" size={16} color="#fff" />
          <Text style={styles.toastText}>{checkinToast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fa" },
  headerGradient: { paddingBottom: 24 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 8 : 8,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  heroCard: { marginHorizontal: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 20 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.25)", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  levelText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  balanceLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  balanceValue: { color: "#fff", fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  balanceEquiv: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.3)" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, textAlign: "center" },
  scroll: { flex: 1 },
  section: { backgroundColor: "#fff", marginTop: 12, marginHorizontal: 12, borderRadius: 16, padding: 16, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1f2937", marginBottom: 12 },
  checkinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14 },
  checkinBtnDone: { backgroundColor: "#6b7280" },
  checkinBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  streakHint: { textAlign: "center", color: "#6b7280", fontSize: 12, marginTop: 8 },
  referralRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f0faf7", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  referralCode: { fontSize: 18, fontWeight: "900", color: COLORS.primary, letterSpacing: 2 },
  referralHint: { fontSize: 12, color: "#6b7280", lineHeight: 18 },
  earnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  earnIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f0faf7", alignItems: "center", justifyContent: "center" },
  earnLabel: { fontSize: 13, fontWeight: "700", color: "#1f2937" },
  earnDesc: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  emptyTx: { color: "#9ca3af", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  txDot: { width: 10, height: 10, borderRadius: 5 },
  txLabel: { fontSize: 13, fontWeight: "700", color: "#1f2937" },
  txReason: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  txDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  txDelta: { fontSize: 14, fontWeight: "800" },
  toast: { position: "absolute", bottom: 24, left: 24, right: 24, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  toastText: { color: "#fff", fontWeight: "700", fontSize: 13, flex: 1 },
  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  ctaBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  ctaBtnText: { color: "#fff", fontWeight: "700" },
});
