import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Text } from '../ui';
import { colors, shadows, useTheme, themedStyles } from '../theme';

const ICONS = {
  Home: ['home', 'home-outline'],
  Categories: ['grid', 'grid-outline'],
  Cart: ['bag-handle', 'bag-handle-outline'],
  Favorites: ['heart', 'heart-outline'],
  Profile: ['person', 'person-outline'],
};

const TabItem = memo(function TabItem({ label, icon, focused, badge, onPress, onLongPress }) {
  const { colors } = useTheme();
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 180 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.6, { damping: 16, stiffness: 260 }) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.primarySoft }, pill]} />
        <Ionicons name={focused ? icon[0] : icon[1]} size={22} color={focused ? colors.primaryDark : colors.textMuted} />
        {badge ? (
          <View style={[styles.badge, { borderColor: colors.surface }]}>
            <Text variant="caption" color="textInverse" style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" color={focused ? 'primaryDark' : 'textMuted'} style={focused && styles.labelActive} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

/** Barre d'onglets sur mesure (remplace la barre par défaut de React Navigation) */
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate(route.name, route.params);
          }
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <TabItem
            key={route.key}
            label={options.title ?? route.name}
            icon={ICONS[route.name] || ['ellipse', 'ellipse-outline']}
            focused={focused}
            badge={options.tabBarBadge}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  bar: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: 16, backgroundColor: colors.primarySoft },
  labelActive: { fontFamily: 'Inter_600SemiBold' },
  badge: {
    position: 'absolute', top: -2, right: 6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: colors.wood, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
}));

export default memo(TabBar);
