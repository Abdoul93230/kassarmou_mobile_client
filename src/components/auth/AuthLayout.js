import React, { memo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { IconButton, Text } from '../../ui';
import { colors, GUTTER } from '../../theme';

/** Gabarit des écrans d'authentification : en-tête, logo, titre, contenu, pied de page */
function AuthLayout({ onBack, backIcon = 'chevron-back', title, subtitle, children, footer, stepKey }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        {onBack ? <IconButton name={backIcon} onPress={onBack} bg={colors.surfaceAlt} accessibilityLabel="Retour" /> : <View style={styles.spacer} />}
        <Image source={require('../../../assets/brand/logo-horizontal.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Ihambaobab" />
        <View style={styles.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={stepKey} entering={FadeInDown.duration(260)}>
          <Text variant="h1">{title}</Text>
          {subtitle ? <Text variant="body" color="textSecondary" style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </Animated.View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingBottom: 8 },
  spacer: { width: 40 },
  logo: { width: 126, height: 32 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28 },
  subtitle: { marginTop: 8 },
  body: { marginTop: 28 },
  footer: { marginTop: 'auto', paddingTop: 24 },
});

export default memo(AuthLayout);
