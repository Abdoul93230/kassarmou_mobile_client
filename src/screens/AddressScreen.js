import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import apiClient from '../config/api';
import { Button, IconButton, PressableScale, Text } from '../ui';
import TextField from '../ui/TextField';
import PhoneField from '../components/auth/PhoneField';
import ZonePickerSheet from '../components/cart/ZonePickerSheet';
import { getZones, rememberZone, zoneLabel } from '../services/shippingV3';
import { DEFAULT_PHONE_COUNTRY, parseStoredPhone, toBackendPhone, validatePhone } from '../utils/phoneRules';
import { GUTTER, radius, useTheme, themedStyles } from '../theme';

/**
 * Adresse de livraison du compte (même source que le site /livraison et que la commande) :
 * proposée automatiquement à la prochaine commande.
 */
export default function AddressScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [landmark, setLandmark] = useState('');
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [zone, setZone] = useState(null);
  const [location, setLocation] = useState(null);
  const [zoneSheet, setZoneSheet] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!userId) return;
    apiClient.get(`/getAddressByUserKey/${userId}`)
      .then(async (r) => {
        const a = r.data?.address;
        if (!a) return;
        if (a.name) setName(a.name);
        setEmail(a.email || '');
        setLandmark(a.landmark || a.description || '');
        if (a.numero) {
          const p = parseStoredPhone(a.numero);
          setCountry(p.country);
          setPhoneDigits(p.digits);
        }
        if (a.location?.lat != null) setLocation(a.location);
        if (a.zoneId) {
          const z = (await getZones()).find((x) => x._id === String(a.zoneId));
          if (z) setZone(a.localityName ? { ...z, localityName: a.localityName } : z);
        }
      })
      .catch(() => {}) // pas encore d'adresse : formulaire vide
      .finally(() => setLoading(false));
  }, [userId]);

  const clearError = (k) => setErrors((e) => ({ ...e, [k]: undefined }));

  const onZone = useCallback((z, meta) => {
    setZone(z);
    rememberZone(z);
    if (meta?.location) setLocation(meta.location);
    clearError('zone');
  }, []);

  const save = async () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Indiquez le nom de la personne à livrer.';
    const phone = validatePhone(country, phoneDigits, true);
    if (!phone.isValid) e.phone = phone.message;
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Adresse e-mail invalide.';
    if (!zone) e.zone = 'Choisissez votre quartier.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await apiClient.post('/createOrUpdateAddress', {
        name: name.trim(),
        numero: toBackendPhone(country, phoneDigits),
        email: email.trim() || null,
        zoneId: zone._id,
        localityName: zone.localityName || '',
        landmark: landmark.trim(),
        description: landmark.trim(),
        ...(location ? { location } : {}),
        clefUser: userId,
      });
      Toast.show({ type: 'success', text1: 'Adresse enregistrée', text2: 'Elle sera proposée à votre prochaine commande.' });
      navigation.goBack();
    } catch (err) {
      const msg = err?.response?.data?.err?.[0] || err?.response?.data?.message || 'Vérifiez votre connexion et réessayez.';
      Toast.show({ type: 'error', text1: 'Adresse non enregistrée', text2: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Adresse de livraison</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Text variant="small" color="textSecondary">
            Enregistrée sur votre compte : elle est remplie d'office à chaque commande, sur l'app comme sur le site.
          </Text>

          <Text variant="smallMedium" color="textSecondary" style={styles.label}>Quartier de livraison</Text>
          <PressableScale
            onPress={() => setZoneSheet(true)}
            scaleTo={0.985}
            style={[styles.zone, { backgroundColor: colors.surface, borderColor: errors.zone ? colors.danger : colors.border }]}
            accessibilityLabel="Choisir le quartier"
          >
            <Ionicons name="location" size={18} color={zone ? colors.primary : colors.textMuted} />
            <Text variant="body" color={zone ? 'text' : 'textMuted'} style={styles.flex} numberOfLines={2}>
              {zone ? zoneLabel(zone) : 'Choisir votre quartier'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressableScale>
          {errors.zone ? <Text variant="small" color="danger" style={styles.err}>{errors.zone}</Text> : null}

          <TextField
            label="Point de repère"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Ex. près de la mosquée, portail bleu"
            icon="flag-outline"
            optional
            style={styles.field}
          />
          <TextField
            label="Nom de la personne à livrer"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            icon="person-outline"
            error={errors.name}
            style={styles.field}
          />
          <View style={styles.field}>
            <PhoneField
              country={country}
              onCountryChange={setCountry}
              digits={phoneDigits}
              onDigitsChange={(d) => { setPhoneDigits(d); clearError('phone'); }}
              label="Téléphone"
              error={errors.phone}
              hint="Le livreur vous appellera sur ce numéro"
            />
          </View>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            optional
            error={errors.email}
            style={styles.field}
          />

          <Button title="Enregistrer l'adresse" icon="checkmark" size="lg" full loading={saving} onPress={save} style={styles.save} />
        </ScrollView>
      )}

      <ZonePickerSheet visible={zoneSheet} onClose={() => setZoneSheet(false)} selected={zone} onSelect={onZone} />
    </KeyboardAvoidingView>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  loader: { marginTop: 40 },
  body: { paddingHorizontal: GUTTER, paddingTop: 8 },
  label: { marginTop: 18, marginBottom: 6 },
  zone: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  err: { marginTop: 6 },
  field: { marginTop: 16 },
  save: { marginTop: 28 },
}));
