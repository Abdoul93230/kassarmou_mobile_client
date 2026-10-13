import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhoneField from '../components/auth/PhoneField';
import GuestOtpSheet from '../components/guest/GuestOtpSheet';
import { fetchGuestOrders, getGuestSession } from '../services/guestSession';
import { DEFAULT_PHONE_COUNTRY, toBackendPhone, validatePhone } from '../utils/phoneRules';
import { Button, EmptyState, IconButton, PressableScale, Text } from '../ui';
import { formatPrice } from '../utils/formatPrice';
import { colors, GUTTER, radius, shadows } from '../theme';

/**
 * « Retrouver mes commandes » sans compte : numéro + code SMS (une fois par appareil),
 * puis la liste des commandes de ce numéro.
 */
export default function FindOrdersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOrders(await fetchGuestOrders()); } catch { setOrders(null); } finally { setLoading(false); }
  };

  // Numéro déjà vérifié sur cet appareil : liste directe, sans SMS
  useEffect(() => { getGuestSession().then((s) => s?.verified && load()); }, []);

  const submit = async () => {
    const check = validatePhone(country, digits, true);
    if (!check.isValid) { setError(check.message); return; }
    const phone = toBackendPhone(country, digits);
    const s = await getGuestSession();
    if (s?.verified && s.phone === phone) { load(); return; }
    setOtpOpen(true);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>{orders ? 'Mes commandes' : 'Retrouver mes commandes'}</Text>
      </View>

      {orders ? (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.reference}
          contentContainerStyle={{ padding: GUTTER, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListEmptyComponent={<EmptyState icon="cube-outline" title="Aucune commande" message="Aucune commande pour ce numéro." />}
          ListFooterComponent={orders.length ? <Text variant="caption" color="textMuted" align="center" style={styles.mt12}>Créez un compte pour retrouver vos commandes partout et gagner des Baobab Points.</Text> : null}
          renderItem={({ item }) => (
            <PressableScale onPress={() => navigation.navigate('Tracking', { reference: item.reference, k: item.trackingToken })} scaleTo={0.985} style={styles.order}>
              <View style={styles.orderIcon}><Ionicons name="cube-outline" size={18} color={colors.primary} /></View>
              <View style={styles.flex}>
                <Text variant="title">n° {item.reference}</Text>
                <Text variant="caption" color="textSecondary" numberOfLines={1}>{item.items?.length || 0} article(s) · {item.etatTraitement || 'En cours'}</Text>
              </View>
              <Text variant="title">{formatPrice(item.prix || 0)} F</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </PressableScale>
          )}
        />
      ) : (
        <View style={styles.form}>
          <Text variant="body" color="textSecondary" style={styles.mb12}>Commandé sans compte ? Entrez votre numéro : nous vous envoyons un code par SMS.</Text>
          <PhoneField
            country={country}
            onCountryChange={setCountry}
            digits={digits}
            onDigitsChange={(d) => { setDigits(d); setError(null); }}
            label="Numéro de téléphone"
            error={error || undefined}
          />
          <Button title="Continuer" size="lg" full loading={loading} onPress={submit} />
          <PressableScale onPress={() => navigation.navigate('QuickAuth', { returnScreen: 'Orders' })} style={styles.login}>
            <Text variant="smallMedium" color="primary">J’ai un compte : me connecter</Text>
          </PressableScale>
        </View>
      )}

      <GuestOtpSheet
        visible={otpOpen}
        phone={toBackendPhone(country, digits)}
        name=""
        reason="Pour protéger vos commandes, confirmez que ce numéro est bien le vôtre."
        onClose={() => setOtpOpen(false)}
        onVerified={() => { setOtpOpen(false); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 10 },
  form: { margin: GUTTER, padding: 18, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  order: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  orderIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  login: { alignSelf: 'center', paddingVertical: 12 },
  mb12: { marginBottom: 12 },
  mt12: { marginTop: 12 },
});
