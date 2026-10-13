import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { login } from '../../redux/authSlice';
import { claimGuestAccount, clearGuestSession, shareTracking, trackingUrl } from '../../services/guestSession';
import { Button, PressableScale, Text } from '../../ui';
import TextField from '../../ui/TextField';
import { colors, radius } from '../../theme';

/**
 * Après une commande sans compte : lien de suivi (voir, copier, partager)
 * et création du compte avec un simple mot de passe (numéro déjà vérifié).
 */
function GuestSuccess({ reference, trackingToken, verified, navigation }) {
  const dispatch = useDispatch();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const url = trackingUrl(reference, trackingToken);

  const claim = async () => {
    if (password.length < 6) { setError('Au moins 6 caractères.'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await claimGuestAccount(password);
      await dispatch(login({ identifier: r.phone, phoneNumber: r.phone, password }));
      await clearGuestSession();
      setCreated(true);
    } catch (e) {
      const d = e.response?.data;
      setError(d?.code === 'ACCOUNT_EXISTS' ? 'Ce numéro a déjà un compte : connectez-vous.' : d?.message || e.message || 'Création impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text variant="title">Suivez votre commande</Text>
        <Text variant="caption" color="textSecondary">Ce lien suffit : gardez-le ou partagez-le.</Text>
        <View style={styles.actions}>
          <Button title="Suivre" icon="navigate-outline" size="md" onPress={() => navigation.navigate('Tracking', { reference, k: trackingToken })} style={styles.flex} />
          <PressableScale
            onPress={async () => { await Clipboard.setStringAsync(url); Toast.show({ type: 'success', text1: 'Lien copié' }); }}
            style={styles.iconBtn}
            accessibilityLabel="Copier le lien"
          >
            <Ionicons name="copy-outline" size={18} color={colors.text} />
          </PressableScale>
          <PressableScale onPress={() => shareTracking(url)} style={styles.iconBtn} accessibilityLabel="Partager">
            <Ionicons name="share-social-outline" size={18} color={colors.text} />
          </PressableScale>
        </View>
      </View>

      {created ? (
        <View style={[styles.card, styles.success]}>
          <Text variant="title" color="success">Votre compte est créé 🎉</Text>
          <Text variant="caption" color="textSecondary">Vos commandes et vos points sont dans votre compte.</Text>
          <Button title="Voir mes commandes" size="md" full onPress={() => navigation.navigate('Orders')} style={styles.mt10} />
        </View>
      ) : verified ? (
        <View style={[styles.card, styles.claim]}>
          <View style={styles.row}>
            <Ionicons name="gift" size={18} color={colors.wood} />
            <Text variant="title" style={styles.flex}>Gardez vos Baobab Points</Text>
          </View>
          <Text variant="caption" color="textSecondary" style={styles.mb8}>Votre numéro est déjà vérifié : choisissez un mot de passe, votre compte est prêt avec cette commande.</Text>
          <TextField label="Mot de passe" icon="lock-closed-outline" value={password} onChangeText={(t) => { setPassword(t); setError(''); }} secureTextEntry placeholder="6 caractères minimum" error={error || undefined} />
          <Button title="Créer mon compte" size="md" full loading={busy} onPress={claim} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text variant="small" color="textSecondary">Créez un compte pour retrouver vos commandes partout et gagner des Baobab Points.</Text>
          <Button title="Créer mon compte" variant="secondary" size="md" full onPress={() => navigation.navigate('QuickAuth', { returnScreen: 'Orders' })} style={styles.mt10} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 12, marginTop: 20 },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  claim: { backgroundColor: colors.primarySoft, borderColor: colors.primary + '55' },
  success: { backgroundColor: colors.successSoft, borderColor: colors.success + '55' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  flex: { flex: 1 },
  mb8: { marginBottom: 8 },
  mt10: { marginTop: 10 },
});

export default memo(GuestSuccess);
