import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { selectActiveEvents } from "../redux/gamificationSlice";

function useCountdown(endDate) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setLabel(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(h > 48 ? `${Math.floor(h / 24)}j` : `${h}h${String(m).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [endDate]);

  return label;
}

function EventCard({ event, onDismiss }) {
  const countdown = useCountdown(event.endDate);
  const typeLabels = { PURCHASE: "achats", CHECKIN: "check-in", REVIEW: "avis", FIRST_ORDER: "1ère commande" };
  const typesText = event.applicableTypes?.length
    ? event.applicableTypes.map(t => typeLabels[t] || t).join(", ")
    : "tous les gains";

  return (
    <LinearGradient
      colors={["#f59e0b", "#f97316"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.card}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="flash" size={20} color="#fff" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>×{event.multiplier} BP — {event.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {event.description || typesText}
          {countdown ? `  ⏱ ${countdown}` : ""}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

export default function EventBanner() {
  const activeEvents = useSelector(selectActiveEvents);
  const [dismissed, setDismissed] = useState([]);

  const visible = (activeEvents || []).filter(e => !dismissed.includes(e.name));
  if (!visible.length) return null;

  return (
    <View style={styles.container}>
      {visible.map(evt => (
        <EventCard
          key={evt.name}
          event={evt}
          onDismiss={() => setDismissed(prev => [...prev, evt.name])}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { color: "#fff", fontWeight: "800", fontSize: 13, lineHeight: 17 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 1 },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});
