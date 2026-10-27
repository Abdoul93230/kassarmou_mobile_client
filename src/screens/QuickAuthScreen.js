import React, { useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { checkPhoneAvailability, clearError, login, requestPasswordResetOtp, sendOtp } from '../redux/authSlice';
import AuthLayout from '../components/auth/AuthLayout';
import PhoneField from '../components/auth/PhoneField';
import PasswordField from '../components/auth/PasswordField';
import useAuthReturn, { authErrorMessage } from '../hooks/useAuthReturn';
import { Button, PressableScale, Text } from '../ui';
import TextField from '../ui/TextField';
import { siteUrl } from '../config/env';
import { DEFAULT_PHONE_COUNTRY, applyPhoneInputChange, toBackendPhone, validatePhone } from '../utils/phoneRules';
import { colors, radius, useTheme, themedStyles } from '../theme';

const STEP = { PHONE: 'phone', LOGIN: 'login', REGISTER: 'register' };

/**
 * Connexion / inscription unifiées, par numéro de téléphone :
 * 1. numéro → on sait si le compte existe
 * 2a. compte existant → mot de passe
 * 2b. nouveau client → prénom et nom → code SMS (écran VerifyOTP) → mot de passe
 */
export default function QuickAuthScreen({ navigation, route }) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const loading = useSelector((s) => s.auth.loading);
  const params = route?.params || {};
  const finish = useAuthReturn(navigation, params);

  const [step, setStep] = useState(STEP.PHONE);
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const [digits, setDigits] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [refCode, setRefCode] = useState('');
  const [showRef, setShowRef] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  const fullPhone = useMemo(() => toBackendPhone(country, digits), [country, digits]);
  const phoneDisplay = `${country.dialCode} ${applyPhoneInputChange(country, digits).display}`;

  const fail = (e, fallback) => {
    setError(authErrorMessage(e, fallback));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = () =>
    run(async () => {
      const v = validatePhone(country, digits, true);
      if (!v.isValid) return fail(v.message);
      try {
        dispatch(clearError());
        const r = await dispatch(checkPhoneAvailability(fullPhone)).unwrap();
        setStep(r.exists ? STEP.LOGIN : STEP.REGISTER);
        if (r.exists) setTimeout(() => passwordRef.current?.focus(), 350);
      } catch (e) {
        fail(e, 'Impossible de vérifier ce numéro. Vérifiez votre connexion.');
      }
      return undefined;
    });

  const submitLogin = () =>
    run(async () => {
      if (password.length < 6) return fail('Saisissez votre mot de passe.');
      try {
        await dispatch(login({ identifier: fullPhone, phoneNumber: fullPhone, password })).unwrap();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        finish();
      } catch (e) {
        fail(e, 'Mot de passe incorrect.');
      }
      return undefined;
    });

  const forgot = () =>
    run(async () => {
      try {
        const r = await dispatch(requestPasswordResetOtp(fullPhone)).unwrap();
        navigation.navigate('VerifyOTP', {
          ...params,
          type: 'password-reset',
          attemptsRemaining: r.attemptsRemaining,
          cooldownSeconds: r.cooldownSeconds,
          expiresInSeconds: r.expiresInSeconds,
          channel: r.channel,
          formData: { phoneNumber: fullPhone, name: null },
        });
      } catch (e) {
        fail(e, "Impossible d'envoyer le code de réinitialisation.");
      }
    });

  const submitRegister = () =>
    run(async () => {
      if (name.trim().length < 2) return fail('Indiquez votre prénom et votre nom.');
      try {
        const r = await dispatch(sendOtp({ phoneNumber: fullPhone, name: name.trim() })).unwrap();
        navigation.navigate('VerifyOTP', {
          ...params,
          type: 'quick-register',
          attemptsRemaining: r.attemptsRemaining,
          cooldownSeconds: r.cooldownSeconds,
          expiresInSeconds: r.expiresInSeconds,
          channel: r.channel,
          formData: { phoneNumber: fullPhone, name: name.trim(), refCode: refCode.trim().toUpperCase() || undefined },
        });
      } catch (e) {
        fail(e, "Impossible d'envoyer le code. Réessayez dans un instant.");
      }
      return undefined;
    });

  const back = () => {
    setError(null);
    if (step !== STEP.PHONE) {
      setStep(STEP.PHONE);
      setPassword('');
    } else if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const phoneChip = (
    <PressableScale onPress={back} style={[styles.phoneChip, { backgroundColor: colors.primarySoft }]} scaleTo={0.98} accessibilityLabel="Modifier le numéro">
      <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
      <Text variant="bodyMedium" style={styles.flex}>{phoneDisplay}</Text>
      <Text variant="smallMedium" color="primary">Modifier</Text>
    </PressableScale>
  );

  const legal = (
    <Text variant="caption" color="textMuted" align="center">
      En continuant, vous acceptez nos{' '}
      <Text variant="caption" color="primary" onPress={() => Linking.openURL(siteUrl('/informations-legales'))}>conditions</Text>
      {' '}et notre{' '}
      <Text variant="caption" color="primary" onPress={() => Linking.openURL(siteUrl('/confidentialite'))}>politique de confidentialité</Text>.
    </Text>
  );

  const errorBox = error ? (
    <View style={[styles.error, { backgroundColor: colors.dangerSoft }]} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text variant="small" color="danger" style={styles.flex}>{error}</Text>
    </View>
  ) : null;

  if (step === STEP.LOGIN) {
    return (
      <AuthLayout stepKey={step} onBack={back} title="Bon retour 👋" subtitle="Saisissez votre mot de passe pour vous connecter.">
        {phoneChip}
        <PasswordField
          ref={passwordRef}
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          onSubmitEditing={submitLogin}
          returnKeyType="go"
        />
        {errorBox}
        <Button title="Se connecter" size="lg" full loading={busy || loading} onPress={submitLogin} />
        <PressableScale onPress={forgot} style={styles.link} hitSlop={8} disabled={busy}>
          <Text variant="smallMedium" color="primary">Mot de passe oublié ? Recevoir un code par SMS</Text>
        </PressableScale>
      </AuthLayout>
    );
  }

  if (step === STEP.REGISTER) {
    return (
      <AuthLayout stepKey={step} onBack={back} title="Créons votre compte" subtitle="Bienvenue ! Il ne manque que votre nom. Nous vous enverrons ensuite un code par SMS." footer={legal}>
        {phoneChip}
        <TextField
          label="Prénom et nom"
          icon="person-outline"
          value={name}
          onChangeText={(t) => { setName(t); setError(null); }}
          placeholder="Ex. Aïcha Moussa"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={submitRegister}
        />
        {showRef ? (
          <TextField
            label="Code de parrainage"
            optional
            icon="gift-outline"
            value={refCode}
            onChangeText={(t) => setRefCode(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Ex. BAOBAB123"
          />
        ) : (
          <PressableScale onPress={() => setShowRef(true)} style={styles.refLink} hitSlop={8}>
            <Ionicons name="gift-outline" size={16} color={colors.wood} />
            <Text variant="smallMedium" color="wood">J'ai un code de parrainage</Text>
          </PressableScale>
        )}
        {errorBox}
        <Button title="Recevoir mon code" iconRight="arrow-forward" size="lg" full loading={busy} onPress={submitRegister} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      stepKey={step}
      onBack={back}
      backIcon="close"
      title="Connexion ou inscription"
      subtitle="Entrez votre numéro de téléphone. Si vous êtes nouveau, nous créerons votre compte en 30 secondes."
      footer={legal}
    >
      <PhoneField
        country={country}
        onCountryChange={setCountry}
        digits={digits}
        onDigitsChange={(d) => { setDigits(d); setError(null); }}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={submitPhone}
      />
      {errorBox}
      <Button title="Continuer" iconRight="arrow-forward" size="lg" full loading={busy} onPress={submitPhone} disabled={!digits} />
      <View style={styles.perks}>
        {[
          ['shield-checkmark-outline', 'Vos données restent privées'],
          ['flash-outline', 'Pas besoin d’email'],
        ].map(([icon, label]) => (
          <View key={label} style={styles.perk}>
            <Ionicons name={icon} size={16} color={colors.primary} />
            <Text variant="small" color="textSecondary">{label}</Text>
          </View>
        ))}
      </View>
    </AuthLayout>
  );
}

const styles = themedStyles((colors) => ({
  flex: { flex: 1 },
  phoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 16,
    borderRadius: radius.md, backgroundColor: colors.primarySoft,
  },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 14,
    borderRadius: radius.md, backgroundColor: colors.dangerSoft,
  },
  link: { alignSelf: 'center', marginTop: 18, paddingVertical: 6 },
  refLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 18 },
  perks: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22, flexWrap: 'wrap' },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
