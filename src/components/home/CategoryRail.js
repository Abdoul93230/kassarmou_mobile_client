import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale, SmartImage, Text } from '../../ui';
import { GUTTER, useTheme } from '../../theme';

const SIZE = 62;
const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

/** Rangée de catégories en pastilles rondes (accès en 1 tap) */
function CategoryRail({ categories, onPressCategory, onPressAll }) {
  const { colors } = useTheme();

  const renderItem = useCallback(
    ({ item }) => (
      <PressableScale onPress={() => onPressCategory(item)} scaleTo={0.94} style={styles.item} accessibilityLabel={item.name}>
        <View style={[styles.circle, { backgroundColor: colors.primarySoft, borderColor: colors.surface }]}>
          {item.image ? (
            <SmartImage uri={item.image} width={SIZE} style={styles.img} />
          ) : (
            <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
          )}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={2} align="center" style={styles.label} textBreakStrategy="simple">{capitalize(item.name)}</Text>
      </PressableScale>
    ),
    [onPressCategory, colors],
  );

  if (!categories?.length) return null;

  return (
    <FlatList
      data={categories}
      keyExtractor={(c) => c._id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListFooterComponent={
        onPressAll ? (
          <PressableScale onPress={onPressAll} scaleTo={0.94} style={styles.item} accessibilityLabel="Toutes les catégories">
            <View style={[styles.circle, { backgroundColor: colors.sandSoft, borderColor: colors.surface }]}>
              <Ionicons name="grid-outline" size={22} color={colors.primaryDark} />
            </View>
            <Text variant="caption" color="textSecondary" align="center" style={styles.label}>Tout voir</Text>
          </PressableScale>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER - 4 },
  item: { width: SIZE + 24, alignItems: 'center', paddingHorizontal: 2 },
  circle: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  img: { width: '100%', height: '100%' },
  label: { marginTop: 6 },
});

export default memo(CategoryRail);
