import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getDevicePosition, getZones, nearestZone, requestLocality, searchZones, zoneLabel } from '../../services/shippingV3';
import { PressableScale, Text } from '../../ui';
import { colors, fonts, radius } from '../../theme';

/**
 * Feuille « Où livrer ? » : quartier ou ville dans la liste officielle,
 * recherche instantanée (noms et autres noms), position de l'appareil,
 * ou localité absente de la liste → ville la plus proche + nom saisi.
 * onSelect(zone, { location? }) — zone.localityName est renseigné dans le dernier cas.
 */
function ZonePickerSheet({ visible, onClose, selected, onSelect }) {
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [locality, setLocality] = useState('');

  useEffect(() => {
    if (!visible || all.length) return;
    setLoading(true);
    setError(null);
    getZones()
      .then(setAll)
      .catch(() => setError('Impossible de charger les zones. Vérifiez votre connexion.'))
      .finally(() => setLoading(false));
  }, [visible, all.length]);

  const data = useMemo(() => searchZones(all, query), [all, query]);

  const close = () => {
    onClose();
    setQuery('');
    setError(null);
    setMissing(false);
    setLocality('');
  };

  const pick = (z, meta) => {
    const name = locality.trim();
    if (missing) {
      if (name.length < 2) {
        setError('Écrivez d’abord le nom de votre localité.');
        return;
      }
      requestLocality(name, z._id);
      Haptics.selectionAsync().catch(() => {});
      onSelect({ ...z, localityName: name }, meta);
    } else {
      const { localityName, ...plain } = z; // eslint-disable-line no-unused-vars
      Haptics.selectionAsync().catch(() => {});
      onSelect(plain, meta);
    }
    close();
  };

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const pos = await getDevicePosition();
      const list = all.length ? all : await getZones();
      if (!all.length) setAll(list);
      const z = nearestZone(list, pos);
      if (z) pick(z, { location: pos });
      else setError('Aucune zone proche : recherchez votre quartier ou votre ville.');
    } catch (e) {
      setError(e.code === 'denied'
        ? 'Autorisez la localisation, ou recherchez votre quartier.'
        : 'Position indisponible : recherchez votre quartier ou votre ville.');
    } finally {
      setLocating(false);
    }
  };

  const startMissing = () => {
    setMissing(true);
    setLocality(query.trim());
    setQuery('');
    setError(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.handle} />
          {missing ? (
            <>
              <PressableScale onPress={() => { setMissing(false); setError(null); }} hitSlop={8} style={styles.back}>
                <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                <Text variant="small" color="textSecondary">Retour à la liste</Text>
              </PressableScale>
              <Text variant="h2">Votre localité</Text>
              <Text variant="small" color="textSecondary" style={styles.sub}>Les frais sont calculés jusqu’à la ville la plus proche. Notre équipe ajoutera votre localité.</Text>
              <Text variant="smallMedium" style={styles.step}>1. Nom de votre village, quartier ou localité</Text>
              <View style={styles.search}>
                <Ionicons name="home-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={locality}
                  onChangeText={(t) => { setLocality(t); setError(null); }}
                  placeholder="Ex. Maijirgui"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  maxLength={100}
                  autoFocus
                />
              </View>
              <Text variant="smallMedium" style={styles.step}>2. Ville ou région la plus proche</Text>
            </>
          ) : (
            <>
              <Text variant="h2">Où livrer ?</Text>
              <Text variant="small" color="textSecondary" style={styles.sub}>Votre quartier ou votre ville : les frais et le délai en dépendent</Text>
            </>
          )}

          <View style={[styles.search, missing && styles.searchTight]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={missing ? 'Ex. Tessaoua, Maradi, Dosso…' : 'Ex. Yantala, Tessaoua, Konni…'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Effacer">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {!missing ? (
            <PressableScale onPress={locate} disabled={locating} scaleTo={0.98} style={styles.locate}>
              {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="locate" size={18} color={colors.primary} />}
              <Text variant="bodyMedium" color="primary">{locating ? 'Localisation…' : 'Utiliser ma position'}</Text>
            </PressableScale>
          ) : null}
          {error ? <Text variant="small" color="wood" style={styles.error}>{error}</Text> : null}

          {loading && !all.length ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={data}
              keyExtractor={(z) => z._id}
              keyboardShouldPersistTaps="handled"
              style={[styles.list, missing && styles.listShort]}
              ListHeaderComponent={!query && data.length ? <Text variant="caption" color="textMuted" style={styles.hint}>{missing ? 'VILLES ET COMMUNES' : 'VILLES ET COMMUNES · TAPEZ VOTRE QUARTIER'}</Text> : null}
              ListEmptyComponent={<Text variant="body" color="textSecondary" align="center" style={styles.empty}>Aucune zone « {query} »</Text>}
              ListFooterComponent={!missing ? (
                <PressableScale onPress={startMissing} scaleTo={0.98} style={styles.missing}>
                  <Ionicons name="home-outline" size={16} color={colors.wood} />
                  <Text variant="bodyMedium" color="wood">Ma localité n’est pas dans la liste</Text>
                </PressableScale>
              ) : null}
              renderItem={({ item }) => {
                const active = !missing && selected?._id === item._id && !selected?.localityName;
                const l = zoneLabel(item);
                return (
                  <PressableScale onPress={() => pick(item)} scaleTo={0.98} style={[styles.row, active && styles.rowActive]}>
                    <View style={[styles.pin, active && styles.pinActive, item.type !== 'district' && !active && styles.pinCity]}>
                      <Ionicons name={item.type === 'district' ? 'location' : 'business'} size={15} color={active ? colors.textInverse : item.type === 'district' ? colors.primary : colors.wood} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="title" numberOfLines={1}>{l.title}</Text>
                      {l.subtitle ? <Text variant="caption" color="textMuted" numberOfLines={1}>{l.subtitle}</Text> : null}
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
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, alignSelf: 'flex-start' },
  sub: { marginTop: 2 },
  step: { marginTop: 14, marginBottom: -8 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, marginTop: 16,
    paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  searchTight: { marginTop: 14 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 0 },
  locate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, marginTop: 10,
    borderRadius: radius.md, backgroundColor: colors.primarySoft,
  },
  error: { marginTop: 8 },
  hint: { marginTop: 4, marginBottom: 4, letterSpacing: 0.5 },
  list: { maxHeight: 420, marginTop: 8 },
  listShort: { maxHeight: 300 },
  loader: { marginVertical: 40 },
  empty: { marginVertical: 20 },
  missing: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, marginBottom: 4,
    paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.wood + '55', backgroundColor: colors.woodSoft,
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 8, borderRadius: radius.md },
  rowActive: { backgroundColor: colors.primarySoft },
  pin: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pinCity: { backgroundColor: colors.sandSoft },
  pinActive: { backgroundColor: colors.primary },
});

export default memo(ZonePickerSheet);
