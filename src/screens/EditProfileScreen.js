import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';

import apiClient from '../config/api';
import { LEGACY_DEFAULT_AVATAR, SUPPORT } from '../config/env';
import { requestPasswordResetOtp, updateUserProfile } from '../redux/authSlice';
import { authErrorMessage } from '../hooks/useAuthReturn';
import { Button, IconButton, PressableScale, Skeleton, SmartImage, Text } from '../ui';
import TextField from '../ui/TextField';
import { colors, GUTTER, radius, shadows } from '../theme';

/** Modification du profil : photo, nom, email, préférence WhatsApp, mot de passe */
export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);
  const [photo, setPhoto] = useState(null); // URL actuelle
  const [newPhoto, setNewPhoto] = useState(null); // fichier local choisi
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      apiClient.get('/user', { params: { id: userId } }),
      apiClient.get('/getUserProfile', { params: { id: userId } }).catch(() => ({ data: { data: null } })),
    ])
      .then(([u, p]) => {
        const pr = p.data?.data;
        const data = {
          name: u.data?.user?.name || user?.name || '',
          email: u.data?.user?.email || '',
          phone: pr?.numero || u.data?.user?.phoneNumber || '',
          whatsapp: pr?.whatsapp !== false,
          photo: pr?.image && pr.image !== LEGACY_DEFAULT_AVATAR ? pr.image : null,
        };
        setInitial(data);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone);
        setWhatsapp(data.whatsapp);
        setPhoto(data.photo);
      })
      .catch(() => Toast.show({ type: 'error', text1: 'Profil indisponible', text2: 'Vérifiez votre connexion.' }))
      .finally(() => setLoading(false));
  }, [user?.name, userId]);

  const dirty =
    !!initial &&
    (name.trim() !== initial.name || email.trim() !== initial.email || whatsapp !== initial.whatsapp || !!newPhoto);

  const pickPhoto = useCallback(async (fromCamera) => {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', fromCamera ? "Autorisez l'appareil photo dans les réglages." : 'Autorisez l’accès à vos photos dans les réglages.');
      return;
    }
    const opts = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const small = await ImageManipulator.manipulateAsync(r.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
    setNewPhoto(small.uri);
  }, []);

  const choosePhoto = () =>
    Alert.alert('Photo de profil', undefined, [
      { text: 'Prendre une photo', onPress: () => pickPhoto(true) },
      { text: 'Choisir dans la galerie', onPress: () => pickPhoto(false) },
      { text: 'Annuler', style: 'cancel' },
    ]);

  const save = async () => {
    const e = {};
    if (name.trim().length < 2) e.name = 'Indiquez votre prénom et votre nom.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Adresse email invalide.';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('email', email.trim());
      form.append('phone', phone);
      form.append('whatsapp', String(whatsapp));
      form.append('id', userId);
      if (newPhoto) form.append('image', { uri: newPhoto, type: 'image/jpeg', name: `avatar-${userId}.jpg` });
      await apiClient.post('/createProfile', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      dispatch(updateUserProfile({ name: name.trim(), email: email.trim() }));
      Toast.show({ type: 'success', text1: 'Profil enregistré' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Enregistrement impossible', text2: err.response?.data?.message || 'Réessayez dans un instant.' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      const r = await dispatch(requestPasswordResetOtp(phone.replace(/\s/g, ''))).unwrap();
      navigation.navigate('VerifyOTP', {
        type: 'password-reset',
        attemptsRemaining: r.attemptsRemaining,
        cooldownSeconds: r.cooldownSeconds,
        expiresInSeconds: r.expiresInSeconds,
        channel: r.channel,
        returnScreen: 'EditProfile',
        formData: { phoneNumber: phone, name: null },
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Envoi du code impossible', text2: authErrorMessage(e, 'Réessayez plus tard.') });
    }
  };

  const avatarUri = newPhoto || photo;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} bg={colors.surfaceAlt} accessibilityLabel="Retour" />
        <Text variant="h2" style={styles.flex}>Mon profil</Text>
      </View>

      {loading ? (
        <View style={styles.pad}>
          <Skeleton width={96} height={96} radius={48} style={styles.center} />
          {[0, 1, 2].map((i) => <Skeleton key={i} height={50} radius={radius.md} style={styles.mt16} />)}
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
          <PressableScale onPress={choosePhoto} style={styles.avatarWrap} scaleTo={0.96} accessibilityLabel="Changer la photo de profil">
            {avatarUri ? (
              <SmartImage uri={avatarUri} width={96} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.initial]}><Text variant="hero" color="primaryDark">{(name || '?').charAt(0).toUpperCase()}</Text></View>
            )}
            <View style={styles.camera}><Ionicons name="camera" size={16} color={colors.textInverse} /></View>
          </PressableScale>
          <Text variant="small" color="primary" align="center" style={styles.mt8} onPress={choosePhoto}>Changer la photo</Text>

          <View style={styles.card}>
            <TextField label="Prénom et nom" icon="person-outline" value={name} onChangeText={(t) => { setName(t); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} autoCapitalize="words" autoComplete="name" />
            <TextField label="Email" optional icon="mail-outline" value={email} onChangeText={(t) => { setEmail(t); setErrors((x) => ({ ...x, email: undefined })); }} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="Pour recevoir vos reçus" />
            <TextField
              label="Téléphone"
              icon="call-outline"
              value={phone}
              editable={false}
              hint="C'est votre identifiant de connexion."
              suffix={<Ionicons name="lock-closed" size={16} color={colors.textMuted} />}
            />
            <PressableScale onPress={() => Linking.openURL(`https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent('Bonjour, je souhaite changer le numéro de mon compte Ihambaobab.')}`)} hitSlop={6} style={styles.inlineLink}>
              <Text variant="caption" color="primary">Changer de numéro ? Contactez le support</Text>
            </PressableScale>

            <View style={styles.switchRow}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <View style={styles.flex}>
                <Text variant="bodyMedium">Contact par WhatsApp</Text>
                <Text variant="caption" color="textMuted">Les vendeurs et livreurs peuvent vous écrire sur WhatsApp</Text>
              </View>
              <Switch value={whatsapp} onValueChange={setWhatsapp} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.surface} />
            </View>
          </View>

          <View style={styles.card}>
            <PressableScale onPress={changePassword} style={styles.row} scaleTo={0.99}>
              <View style={styles.rowIcon}><Ionicons name="key-outline" size={18} color={colors.primary} /></View>
              <View style={styles.flex}>
                <Text variant="bodyMedium">Changer mon mot de passe</Text>
                <Text variant="caption" color="textMuted">Un code de sécurité vous sera envoyé par SMS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </PressableScale>
          </View>
        </ScrollView>
      )}

      {!loading ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {saving ? <ActivityIndicator color={colors.primary} style={styles.mb8} /> : null}
          <Button title="Enregistrer" icon="checkmark" size="lg" full loading={saving} disabled={!dirty} onPress={save} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pad: { padding: GUTTER },
  center: { alignSelf: 'center' },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mb8: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 8 },
  avatarWrap: { alignSelf: 'center', width: 100, height: 100 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute', right: 0, bottom: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg,
  },
  card: { marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  inlineLink: { alignSelf: 'flex-start', marginTop: -6, marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 12,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },
});
