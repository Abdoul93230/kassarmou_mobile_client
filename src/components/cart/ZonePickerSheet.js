import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../config/api';
import { PressableScale, Text } from '../../ui';
import { colors, fonts, radius } from '../../theme';

const TYPE_LABEL = { country: 'Pays', region: 'Région', city: 'Ville', district: 'Quartier' };
let zonesCache = null; // partagé entre ouvertures : la liste change rarement

const zonesOf = (res) => res?.data?.zones || res?.data?.data || [];

/** Feuille de choix de la zone de livraison, avec recherche instantanée */
function ZonePickerSheet({ visible, onClose, selected, onSelect }) {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState(zonesCache || []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || zonesCache) return;
    setLoading(true);
    apiClient
      .get('/api/shipping2/zones')
      .then((r) => {
        zonesCache = zonesOf(r).filter((z) => z.isActive !== false);
        setAll(zonesCache);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  // Recherche serveur avec anti-rebond, filtrage local en secours
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return undefined;
    }
    const t = setTimeout(() => {
      apiClient
        .get('/api/shipping2/zones/search', { params: { q, limit: 30 } })
        .then((r) => setResults(zonesOf(r)))
        .catch(() => {
          const l = q.toLowerCase();
          setResults(all.filter((z) => `${z.name} ${z.fullPath || ''}`.toLowerCase().includes(l)));
        });
    }, 280);
    return () => clearTimeout(t);
  }, [query, all]);

  // Par défaut : zones du Niger d'abord, des plus précises (quartiers) aux plus larges
  const suggestions = useMemo(() => {
    const niger = all.filter((z) => (z.fullPath || '').startsWith('Niger'));
    const rest = all.filter((z) => !(z.fullPath || '').startsWith('Niger'));
    const byPath = (a, b) => (a.fullPath || a.name).localeCompare(b.fullPath || b.name);
    return [...niger.sort(byPath), ...rest.sort(byPath)];
  }, [all]);

  const data = results ?? suggestions;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.handle} />
          <Text variant="h2">Où livrer ?</Text>
          <Text variant="small" color="textSecondary" style={styles.sub}>Choisissez votre quartier, ville ou région</Text>

          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ex. Commune 1, Maradi, Zinder…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {loading && !data.length ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={data}
              keyExtractor={(z) => z._id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <Text variant="body" color="textSecondary" align="center" style={styles.empty}>
                  Aucune zone trouvée pour « {query} »
                </Text>
              }
              renderItem={({ item }) => {
                const active = selected?._id === item._id;
                return (
                  <PressableScale
                    onPress={() => { onSelect(item); onClose(); setQuery(''); }}
                    scaleTo={0.98}
                    style={[styles.row, active && styles.rowActive]}
                  >
                    <View style={[styles.pin, active && styles.pinActive]}>
                      <Ionicons name="location" size={16} color={active ? colors.textInverse : colors.primary} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="title" numberOfLines={1}>{item.name}</Text>
                      <Text variant="caption" color="textMuted" numberOfLines={1}>
                        {[TYPE_LABEL[item.type], item.fullPath].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </PressableScale>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  sub: { marginTop: 2 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  list: { maxHeight: 460 },
  loader: { marginVertical: 40 },
  empty: { marginVertical: 32 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.md },
  rowActive: { backgroundColor: colors.primarySoft },
  pin: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pinActive: { backgroundColor: colors.primary },
});

export default memo(ZonePickerSheet);
