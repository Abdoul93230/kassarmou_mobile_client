import React, { memo, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sendGuestOtp, verifyGuestOtp } from '../../services/guestSession';
import { formatPhoneInternational } from '../../utils/phoneRules';
import { Button, PressableScale, Text } from '../../ui';
import { colors, fonts, radius } from '../../theme';

/**
 * Vérification du numéro par SMS (1 fois par appareil, valable 90 jours).
 * SMS jamais reçu (ou envoi en échec) : `onCallback` → commande confirmée par appel de l'équipe.
 */
function GuestOtpSheet({ visible, phone, name, reason, onClose, onVerified, onCallback }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const sentFor = useRef(null);
  // Option « confirmer par appel » : 30 s après l'envoi (ou tout de suite si l'envoi échoue)
  const [callbackAvail, setCallbackAvail] = useState(false);
  const [fallbackIn, setFallbackIn] = useState(0);
  const [askCallback, setAskCallback] = useState(false);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const d = await sendGuestOtp(phone, name);
      setCooldown(d.cooldownSeconds || 60);
      if (d.callbackAvailable) { setCallbackAvail(true); setFallbackIn(30); }
    } catch (e) {
      const d = e.response?.data;
      setError(d?.message || 'Envoi impossible. Vérifiez le numéro.');
      if (d?.data?.cooldownSeconds) setCooldown(d.data.cooldownSeconds);
      if (d?.data?.callbackAvailable) { setCallbackAvail(true); setFallbackIn(0); }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (visible && sentFor.current !== phone) {
      sentFor.current = phone;
      setCode('');
      setAskCallback(false);
      setCallbackAvail(false);
      send();
    }
    if (!visible) sentFor.current = null;
  }, [visible, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (fallbackIn <= 0) return undefined;
    const t = setTimeout(() => setFallbackIn((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [fallbackIn]);

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return;
    setChecking(true);
    setError('');
    try {
      const s = await verifyGuestOtp(phone, value, name);
      onVerified(s);
    } catch (e) {
      setError(e.response?.data?.message || 'Code incorrect.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.icon}><Ionicons name="shield-checkmark" size={22} color={colors.primary} /></View>
          <Text variant="h2" style={styles.mt10}>Vérifiez votre numéro</Text>
          <Text variant="small" color="textSecondary" style={styles.mt4}>{reason || 'Pour le paiement à la livraison, nous vérifions votre numéro une seule fois.'}</Text>
          <Text variant="body" style={styles.mt10}>Code envoyé par SMS au <Text variant="bodyMedium">{formatPhoneInternational(phone)}</Text></Text>
          <TextInput
            value={code}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              setError('');
              if (v.length === 6) verify(v);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            autoFocus
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {error ? <Text variant="small" color="danger" style={styles.mt4}>{error}</Text> : null}
          <Button title="Valider" size="lg" full loading={checking} disabled={code.length !== 6} onPress={() => verify()} style={styles.mt10} />
          <PressableScale onPress={send} disabled={sending || cooldown > 0} style={styles.resend}>
            <Text variant="smallMedium" color={cooldown > 0 ? 'textMuted' : 'primary'}>
              {sending ? 'Envoi…' : cooldown > 0 ? `Renvoyer le code dans ${cooldown}s` : 'Renvoyer le code'}
            </Text>
          </PressableScale>
          {onCallback && callbackAvail && fallbackIn <= 0 ? (
            askCallback ? (
              <View style={styles.callback}>
                <View style={styles.row}>
                  <Ionicons name="call" size={16} color={colors.wood} />
                  <Text variant="bodyMedium">Confirmation par appel</Text>
                </View>
                <Text variant="small" color="textSecondary" style={styles.mt4}>
                  Votre commande est enregistrée et notre équipe vous appelle au {formatPhoneInternational(phone)} pour la confirmer avant sa préparation. Gardez votre téléphone à portée de main.
                </Text>
                <Button title="Commander, je serai joignable" size="md" full onPress={onCallback} style={styles.mt10} />
                <PressableScale onPress={() => setAskCallback(false)} style={styles.resend}>
                  <Text variant="caption" color="textMuted">Attendre encore le SMS</Text>
                </PressableScale>
              </View>
            ) : (
              <PressableScale onPress={() => setAskCallback(true)} style={styles.resend}>
                <Text variant="smallMedium" style={styles.woodText}>Je n'ai pas reçu le code</Text>
              </PressableScale>
            )
          ) : null}
          <Text variant="caption" color="textMuted" align="center">Astuce : le paiement en ligne ne demande pas de code.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: 20, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  input: {
    marginTop: 12, height: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    textAlign: 'center', fontSize: 26, letterSpacing: 10, fontFamily: fonts.bold, color: colors.text,
  },
  resend: { alignSelf: 'center', paddingVertical: 10 },
  callback: { marginTop: 6, marginBottom: 6, padding: 12, borderRadius: radius.md, backgroundColor: colors.woodSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  woodText: { color: colors.wood, textDecorationLine: 'underline' },
  mt4: { marginTop: 4 },
  mt10: { marginTop: 10 },
});

export default memo(GuestOtpSheet);
