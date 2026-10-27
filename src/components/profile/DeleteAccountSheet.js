import React, { memo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../config/api';
import { Button, Text } from '../../ui';
import TextField from '../../ui/TextField';
import { colors, radius, useTheme, themedStyles } from '../../theme';

/**
 * Demande de suppression de compte depuis l'app (exigence Google Play).
 * Même endpoint que la page web /supprimer-mon-compte.
 */
function DeleteAccountSheet({ visible, onClose, user, onDone }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);

  const submit = async () => {
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Indiquez votre nom et une adresse email valide pour que nous puissions vous répondre.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await apiClient.post('/api/deletion-request', {
        name: name.trim(),
        email: email.trim(),
        accountType: 'client',
        reason: reason.trim(),
      });
      setSent(r.data?.message || 'Votre demande a bien été enregistrée.');
      onDone?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Envoi impossible. Vérifiez votre connexion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {sent ? (
            <View style={styles.center}>
              <View style={[styles.okIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="mail-open-outline" size={30} color={colors.primary} /></View>
              <Text variant="h2" align="center">Demande envoyée</Text>
              <Text variant="body" color="textSecondary" align="center" style={styles.mt8}>{sent}</Text>
              <Button title="Fermer" variant="soft" onPress={onClose} style={styles.mt20} />
            </View>
          ) : (
            <>
              <Text variant="h2">Supprimer mon compte</Text>
              <Text variant="small" color="textSecondary" style={styles.sub}>
                Votre compte, vos favoris et vos points seront supprimés. Les factures de commandes sont conservées
                le temps exigé par la loi. Nous confirmons par email sous 30 jours.
              </Text>
              <TextField label="Nom complet" value={name} onChangeText={setName} />
              <TextField label="Email de contact" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TextField label="Raison" optional value={reason} onChangeText={setReason} multiline placeholder="Aidez-nous à nous améliorer" />
              {error ? <Text variant="small" color="danger" style={styles.err}>{error}</Text> : null}
              <Button title="Envoyer la demande" variant="danger" full size="lg" loading={sending} onPress={submit} />
              <Button title="Annuler" variant="ghost" full onPress={onClose} style={styles.mt4} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = themedStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, padding: 20 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  sub: { marginTop: 6, marginBottom: 18 },
  err: { marginBottom: 12 },
  center: { alignItems: 'center', paddingVertical: 8 },
  okIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt20: { marginTop: 20, alignSelf: 'center' },
}));

export default memo(DeleteAccountSheet);
