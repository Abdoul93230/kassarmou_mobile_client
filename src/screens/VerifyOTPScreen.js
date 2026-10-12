import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

import { login, registerWithOtp, requestPasswordResetOtp, resetPasswordWithPhoneOtp, sendOtp, verifyOtp } from '../redux/authSlice';
import AuthLayout from '../components/auth/AuthLayout';
import OtpBoxes from '../components/auth/OtpBoxes';
import PasswordField from '../components/auth/PasswordField';
import useAuthReturn, { authErrorMessage } from '../hooks/useAuthReturn';
import { Button, PressableScale, Text } from '../ui';
import { validatePassword } from '../utils/passwordRules';
import { colors, radius } from '../theme';

const OTP_LENGTH = 6;
const RESET = 'password-reset';
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/**
 * Vérification du code reçu (SMS/WhatsApp) puis choix du mot de passe.
 * Sert à l'inscription (quick-register) et au mot de passe oublié (password-reset).
 */
export default function VerifyOTPScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const params = route?.params || {};
  const { formData = {}, type = 'quick-register' } = params;
  const finish = useAuthReturn(navigation, params);
  const isReset = type === RESET;

  const [step, setStep] = useState('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(params.cooldownSeconds ?? 60);
  const [expiresIn, setExpiresIn] = useState(params.expiresInSeconds ?? 0);
  const [attempts, setAttempts] = useState(params.attemptsRemaining ?? null);
  const [channel, setChannel] = useState(params.channel || 'sms');

  useEffect(() => {
    const t = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
      setExpiresIn((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fail = (e, fallback) => {
    setError(authErrorMessage(e, fallback));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const submitCode = useCallback(
    async (value = code) => {
      if (value.length !== OTP_LENGTH || busy) return;
      setBusy(true);
      setError(null);
      try {
        await dispatch(verifyOtp({ phoneNumber: formData.phoneNumber, otp: value })).unwrap();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setStep('password');
      } catch (e) {
        if (Number.isFinite(Number(e?.attemptsRemaining))) setAttempts(Number(e.attemptsRemaining));
        fail(e, 'Code incorrect. Vérifiez le SMS reçu.');
        setCode('');
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, code, dispatch, formData.phoneNumber],
  );

  const resend = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = isReset
        ? await dispatch(requestPasswordResetOtp(formData.phoneNumber)).unwrap()
        : await dispatch(sendOtp({ phoneNumber: formData.phoneNumber, name: formData.name })).unwrap();
      setCooldown(r.cooldownSeconds ?? 60);
      setExpiresIn(r.expiresInSeconds ?? 0);
      setAttempts(r.attemptsRemaining ?? null);
      if (r.channel) setChannel(r.channel);
      setCode('');
      Toast.show({ type: 'success', text1: 'Nouveau code envoyé' });
    } catch (e) {
      fail(e, "Impossible de renvoyer le code pour l'instant.");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    const v = validatePassword(password);
    if (!v.valid) return fail(v.message);
    setBusy(true);
    setError(null);
    try {
      if (isReset) {
        await dispatch(resetPasswordWithPhoneOtp({ phone: formData.phoneNumber, code, newPassword: password })).unwrap();
      } else {
        await dispatch(
          registerWithOtp({
            phoneNumber: formData.phoneNumber,
            name: formData.name,
            password,
            code,
            ...(formData.refCode ? { refCode: formData.refCode } : {}),
          }),
        ).unwrap();
      }
      await dispatch(login({ identifier: formData.phoneNumber, phoneNumber: formData.phoneNumber, password })).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Toast.show({ type: 'success', text1: isReset ? 'Mot de passe mis à jour' : `Bienvenue ${String(formData.name || '').split(' ')[0]} 🎉` });
      finish();
    } catch (e) {
      fail(e, isReset ? 'Réinitialisation impossible.' : 'Création du compte impossible.');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const errorBox = error ? (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text variant="small" color="danger" style={styles.flex}>{error}</Text>
    </View>
  ) : null;

  if (step === 'password') {
    return (
      <AuthLayout
        stepKey="password"
        onBack={() => setStep('code')}
        title={isReset ? 'Nouveau mot de passe' : 'Sécurisez votre compte'}
        subtitle={isReset ? 'Choisissez un nouveau mot de passe facile à retenir pour vous.' : 'Dernière étape : choisissez un mot de passe. Vous l’utiliserez pour vous reconnecter.'}
      >
        <PasswordField
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          showStrength
          autoFocus
          label={isReset ? 'Nouveau mot de passe' : 'Mot de passe'}
          returnKeyType="done"
          onSubmitEditing={submitPassword}
        />
        {errorBox}
        <Button
          title={isReset ? 'Enregistrer et me connecter' : 'Créer mon compte'}
          icon={isReset ? 'checkmark-circle-outline' : 'sparkles'}
          size="lg"
          full
          loading={busy}
          disabled={!validatePassword(password).valid}
          onPress={submitPassword}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      stepKey="code"
      onBack={() => navigation.goBack()}
      title="Entrez le code"
      subtitle={`Nous avons envoyé un code à 6 chiffres par ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} au ${formData.phoneNumber || 'numéro indiqué'}.`}
    >
      <OtpBoxes value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={submitCode} error={!!error} />

      <View style={styles.meta}>
        {expiresIn > 0 ? <Text variant="caption" color="textMuted">Code valable {fmt(expiresIn)}</Text> : <View />}
        {attempts !== null ? <Text variant="caption" color="textMuted">{attempts} renvoi{attempts > 1 ? 's' : ''} restant{attempts > 1 ? 's' : ''}</Text> : null}
      </View>

      {errorBox}

      <Button title="Vérifier" size="lg" full loading={busy} disabled={code.length !== OTP_LENGTH} onPress={() => submitCode()} />

      <PressableScale onPress={resend} disabled={cooldown > 0 || busy} style={styles.resend} hitSlop={8}>
        <Ionicons name="refresh" size={16} color={cooldown > 0 ? colors.textMuted : colors.primary} />
        <Text variant="smallMedium" color={cooldown > 0 ? 'textMuted' : 'primary'}>
          {cooldown > 0 ? `Renvoyer le code dans ${fmt(cooldown)}` : 'Renvoyer le code'}
        </Text>
      </PressableScale>

      <PressableScale onPress={() => navigation.goBack()} style={styles.change} hitSlop={8}>
        <Text variant="small" color="textSecondary">Mauvais numéro ? <Text variant="smallMedium" color="primary">Le modifier</Text></Text>
      </PressableScale>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 18 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 14, borderRadius: radius.md, backgroundColor: colors.dangerSoft },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 6 },
  change: { alignSelf: 'center', marginTop: 10, paddingVertical: 6 },
});
