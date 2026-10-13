import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

import apiClient from '../config/api';
import { LEGACY_DEFAULT_AVATAR, SELLER_APP_ID, SUPPORT, siteUrl } from '../config/env';
import { logoutUser } from '../redux/authSlice';
import { clearLikes } from '../redux/likesSlice';
import { fetchWallet, selectWallet } from '../redux/gamificationSlice';
import { catalogApi, useMyOrdersQuery } from '../redux/catalogApi';
import { orderStage } from '../utils/orders';
import { formatPhoneInternational } from '../utils/phoneRules';
import { Button, PressableScale, SmartImage, Text } from '../ui';
import DeleteAccountSheet from '../components/profile/DeleteAccountSheet';
import { colors, gradients, GUTTER, radius, shadows } from '../theme';

const ORDER_SHORTCUTS = [
  { key: 'unpaid', label: 'À payer', icon: 'card-outline' },
  { key: 'processing', label: 'Préparation', icon: 'cube-outline' },
  { key: 'shipping', label: 'Livraison', icon: 'car-outline' },
  { key: 'delivered', label: 'Livrées', icon: 'checkmark-done-outline' },
];

function Row({ icon, tint = colors.primary, title, subtitle, right, onPress, danger }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} style={styles.row} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerSoft : `${tint}1A` }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : tint} />
      </View>
      <View style={styles.flex}>
        <Text variant="bodyMedium" color={danger ? 'danger' : 'text'}>{title}</Text>
        {subtitle ? <Text variant="caption" color="textMuted">{subtitle}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </PressableScale>
  );
}

function Group({ title, children }) {
  return (
    <View style={styles.group}>
      {title ? <Text variant="caption" color="textMuted" style={styles.groupTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const likedCount = useSelector((s) => s.likes.likedProducts.length);
  const wallet = useSelector(selectWallet);
  const orders = useMyOrdersQuery(userId, { skip: !userId });

  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [u, p] = await Promise.all([
        apiClient.get('/user', { params: { id: userId } }),
        apiClient.get('/getUserProfile', { params: { id: userId } }).catch(() => ({ data: { data: null } })),
      ]);
      const pr = p.data?.data;
      setProfile({
        name: u.data?.user?.name || user?.name,
        email: u.data?.user?.email || '',
        phone: pr?.numero || u.data?.user?.phoneNumber || '',
        whatsapp: pr?.whatsapp !== false,
        image: pr?.image && pr.image !== LEGACY_DEFAULT_AVATAR ? pr.image : null,
      });
    } catch {
      // affichage avec les données de session
    }
  }, [user?.name, userId]);

  useEffect(() => {
    loadProfile();
    if (userId) dispatch(fetchWallet(userId));
  }, [dispatch, loadProfile, userId]);

  const counts = useMemo(() => {
    const c = { unpaid: 0, processing: 0, shipping: 0, delivered: 0 };
    (orders.data || []).forEach((o) => {
      const k = orderStage(o).key;
      if (k in c) c[k] += 1;
    });
    return c;
  }, [orders.data]);

  const changePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', 'Autorisez l’accès à vos photos pour changer votre photo de profil.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setUploading(true);
    try {
      // Compression : 512 px suffisent pour un avatar (envoi rapide même en 3G)
      const small = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 512 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
      const form = new FormData();
      form.append('image', { uri: small.uri, type: 'image/jpeg', name: `avatar-${userId}.jpg` });
      form.append('name', profile?.name || user?.name || '');
      form.append('email', profile?.email || '');
      form.append('phone', profile?.phone || '');
      form.append('whatsapp', String(profile?.whatsapp ?? true));
      form.append('id', userId);
      await apiClient.post('/createProfile', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
      await loadProfile();
      Toast.show({ type: 'success', text1: 'Photo mise à jour' });
    } catch {
      Toast.show({ type: 'error', text1: 'Envoi de la photo impossible', text2: 'Réessayez avec une meilleure connexion.' });
    } finally {
      setUploading(false);
    }
  }, [loadProfile, profile, user?.name, userId]);

  const logout = useCallback(() => {
    Alert.alert('Se déconnecter ?', 'Votre panier reste enregistré sur cet appareil.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await dispatch(logoutUser());
          dispatch(clearLikes());
          dispatch(catalogApi.util.resetApiState()); // aucune donnée privée ne reste en cache
          setProfile(null);
        },
      },
    ]);
  }, [dispatch]);

  const invite = () =>
    Share.share({
      message: `Je fais mes achats sur Ihambaobab, la marketplace du Niger 🇳🇪 Rejoins-moi : ${siteUrl('/')}`,
    }).catch(() => {});

  const openUrl = (url) => Linking.openURL(url).catch(() => {});
  const openSellerApp = () =>
    Linking.openURL(`market://details?id=${SELLER_APP_ID}`).catch(() => openUrl(`https://play.google.com/store/apps/details?id=${SELLER_APP_ID}`));

  const version = Constants.expoConfig?.version || '1.0.0';
  const name = profile?.name || user?.name || '';

  const helpGroup = (
    <Group title="Aide">
      <Row icon="logo-whatsapp" tint="#25D366" title="Discuter avec le support" subtitle={SUPPORT.phoneDisplay} onPress={() => openUrl(`https://wa.me/${SUPPORT.whatsapp}`)} />
      <Row icon="help-circle-outline" title="Questions fréquentes" onPress={() => navigation.navigate('Faq')} />
      <Row icon="mail-outline" title="Écrire au support" subtitle={SUPPORT.email} onPress={() => openUrl(`mailto:${SUPPORT.email}`)} />
      <Row icon="storefront-outline" tint={colors.wood} title="Vendre sur Ihambaobab" subtitle="Ouvrez votre boutique avec Ihambaobab Pro" onPress={openSellerApp} />
    </Group>
  );
  const legalGroup = (
    <Group title="Informations">
      <Row icon="shield-checkmark-outline" tint={colors.textSecondary} title="Confidentialité" onPress={() => openUrl(siteUrl('/confidentialite'))} />
      <Row icon="document-text-outline" tint={colors.textSecondary} title="Mentions légales" onPress={() => openUrl(siteUrl('/informations-legales'))} />
    </Group>
  );

  // ── Invité ───────────────────────────────────────────────────────────────────
  if (!userId) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
        <LinearGradient colors={gradients.hero} style={[styles.guestHero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.guestIcon}><Ionicons name="person" size={34} color={colors.textInverse} /></View>
          <Text variant="h1" color="textInverse" align="center">Bienvenue sur Ihambaobab</Text>
          <Text variant="body" color="textInverse" align="center" style={styles.guestSub}>
            Connectez-vous en quelques secondes avec votre numéro de téléphone pour suivre vos commandes et gagner des points.
          </Text>
          <Button
            title="Se connecter / S'inscrire"
            variant="dark"
            size="lg"
            onPress={() => navigation.navigate('QuickAuth', { returnScreen: 'MainTabs', returnParams: { screen: 'Profile' } })}
            style={styles.guestBtn}
          />
          <Button
            title="Suivre une commande passée sans compte"
            variant="ghost"
            size="md"
            onPress={() => navigation.navigate('FindOrders')}
            style={styles.guestBtn}
          />
        </LinearGradient>
        <View style={styles.perks}>
          {[
            ['cube-outline', 'Suivi de vos commandes en temps réel'],
            ['gift-outline', 'Baobab Points à chaque achat'],
            ['heart-outline', 'Favoris synchronisés'],
          ].map(([icon, label]) => (
            <View key={label} style={styles.perk}>
              <Ionicons name={icon} size={18} color={colors.primary} />
              <Text variant="smallMedium" style={styles.flex}>{label}</Text>
            </View>
          ))}
        </View>
        {helpGroup}
        {legalGroup}
        <Text variant="caption" color="textMuted" align="center" style={styles.version}>Ihambaobab · version {version}</Text>
      </ScrollView>
    );
  }

  // ── Connecté ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={gradients.hero} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.heroRow}>
          <PressableScale onPress={changePhoto} scaleTo={0.95} style={styles.avatarWrap} accessibilityLabel="Changer la photo de profil">
            {profile?.image ? (
              <SmartImage uri={profile.image} width={76} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarInitial]}>
                <Text variant="h1" color="primaryDark">{(name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.camera}>
              {uploading ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Ionicons name="camera" size={13} color={colors.textInverse} />}
            </View>
          </PressableScale>
          <View style={styles.flex}>
            <Text variant="h2" color="textInverse" numberOfLines={1}>{name}</Text>
            <Text variant="small" color="textInverse" style={styles.heroSub} numberOfLines={1}>{formatPhoneInternational(profile?.phone) || profile?.email || ''}</Text>
            <PressableScale onPress={() => navigation.navigate('EditProfile')} style={styles.editPill} hitSlop={6}>
              <Ionicons name="create-outline" size={13} color={colors.textInverse} />
              <Text variant="caption" color="textInverse">Modifier le profil</Text>
            </PressableScale>
          </View>
        </View>

        <View style={styles.stats}>
          <PressableScale onPress={() => navigation.navigate('Orders')} style={styles.stat}>
            <Text variant="h2" color="textInverse">{orders.data?.length ?? '–'}</Text>
            <Text variant="caption" color="textInverse" style={styles.statLabel}>Commandes</Text>
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('MainTabs', { screen: 'Favorites' })} style={styles.stat}>
            <Text variant="h2" color="textInverse">{likedCount}</Text>
            <Text variant="caption" color="textInverse" style={styles.statLabel}>Favoris</Text>
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('Wallet')} style={styles.stat}>
            <Text variant="h2" color="textInverse">{wallet?.balance ?? 0}</Text>
            <Text variant="caption" color="textInverse" style={styles.statLabel}>Baobab Points</Text>
          </PressableScale>
        </View>
      </LinearGradient>

      {/* Commandes par statut */}
      <View style={styles.ordersCard}>
        <View style={styles.ordersHead}>
          <Text variant="h3">Mes commandes</Text>
          <PressableScale onPress={() => navigation.navigate('Orders')} hitSlop={8} style={styles.inline}>
            <Text variant="smallMedium" color="primary">Tout voir</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </PressableScale>
        </View>
        <View style={styles.shortcuts}>
          {ORDER_SHORTCUTS.map((s) => (
            <PressableScale key={s.key} onPress={() => navigation.navigate('Orders', { stage: s.key })} style={styles.shortcut} scaleTo={0.93}>
              <View>
                <Ionicons name={s.icon} size={24} color={colors.text} />
                {counts[s.key] ? (
                  <View style={styles.badge}><Text variant="caption" color="textInverse" style={styles.badgeText}>{counts[s.key]}</Text></View>
                ) : null}
              </View>
              <Text variant="caption" color="textSecondary" style={styles.mt6}>{s.label}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      <Group title="Mon compte">
        <Row icon="person-outline" title="Informations personnelles" subtitle="Nom, téléphone, email" onPress={() => navigation.navigate('EditProfile')} />
        <Row icon="gift-outline" tint={colors.sand} title="Baobab Points" subtitle="Gagnez et utilisez vos points" onPress={() => navigation.navigate('Wallet')} />
        <Row icon="people-outline" tint={colors.wood} title="Inviter un ami" subtitle="Partagez Ihambaobab" onPress={invite} />
      </Group>

      {helpGroup}
      {legalGroup}

      <Group>
        <Row icon="log-out-outline" title="Se déconnecter" danger onPress={logout} right={null} />
        <Row icon="trash-outline" title="Supprimer mon compte" danger onPress={() => setDeleteSheet(true)} right={null} />
      </Group>

      <Text variant="caption" color="textMuted" align="center" style={styles.version}>Ihambaobab · version {version}</Text>

      <DeleteAccountSheet
        visible={deleteSheet}
        onClose={() => setDeleteSheet(false)}
        user={{ name, email: profile?.email || '' }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  mt6: { marginTop: 6 },

  hero: { paddingHorizontal: GUTTER, paddingBottom: 56, borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 80, height: 80 },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  avatarInitial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute', right: 0, bottom: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.wood,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  heroSub: { opacity: 0.8, marginTop: 2 },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  stats: { flexDirection: 'row', marginTop: 22 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { opacity: 0.8 },

  ordersCard: { marginHorizontal: GUTTER, marginTop: -36, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.md },
  ordersHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shortcuts: { flexDirection: 'row', marginTop: 16 },
  shortcut: { flex: 1, alignItems: 'center' },
  badge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },

  group: { marginTop: 22, marginHorizontal: GUTTER },
  groupTitle: { marginBottom: 8, marginLeft: 4, letterSpacing: 0.6 },
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 4, ...shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  version: { marginTop: 24 },

  guestHero: { alignItems: 'center', paddingHorizontal: 28, paddingBottom: 32, borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl },
  guestIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  guestSub: { opacity: 0.85, marginTop: 8 },
  guestBtn: { marginTop: 20, alignSelf: 'center' },
  perks: { marginHorizontal: GUTTER, marginTop: 20, padding: 16, gap: 12, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.sm },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
