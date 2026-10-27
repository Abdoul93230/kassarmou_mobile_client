import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PressableScale, SmartImage, Text } from '../../ui';
import { colors, gradients, GUTTER, radius, useTheme, themedStyles } from '../../theme';

const AUTOPLAY_MS = 5000;
const GAP = 10;

const Dot = memo(function Dot({ active }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 18 : 6, { duration: 220 }),
    opacity: withTiming(active ? 1 : 0.4, { duration: 220 }),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, style]} />;
});

/** Carrousel de bannières avec aperçu de la suivante, défilement auto et indicateurs animés */
function BannerCarousel({ banners, onPressBanner }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const itemWidth = width - GUTTER * 2;
  const height = Math.round(itemWidth * 9 / 16); // bannières au format 16:9
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const interacting = useRef(false);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const id = setInterval(() => {
      if (interacting.current) return;
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * (itemWidth + GAP), animated: true });
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [banners.length, itemWidth]);

  const onMomentumEnd = useCallback(
    (e) => {
      interacting.current = false;
      setIndex(Math.round(e.nativeEvent.contentOffset.x / (itemWidth + GAP)));
    },
    [itemWidth],
  );

  const renderItem = useCallback(
    ({ item, index: i }) => (
      <PressableScale onPress={() => onPressBanner?.(item)} scaleTo={0.985} style={[styles.card, { width: itemWidth, height, backgroundColor: colors.surfaceAlt }]}>
        <SmartImage uri={item.image} width={itemWidth} style={StyleSheet.absoluteFill} priority={i === 0 ? 'high' : 'normal'} />
        {item.pub ? (
          <LinearGradient colors={gradients.imageFade} style={styles.fade}>
            <Text variant="h3" color="textInverse" numberOfLines={2}>{item.pub}</Text>
          </LinearGradient>
        ) : null}
      </PressableScale>
    ),
    [colors.surfaceAlt, height, itemWidth, onPressBanner],
  );

  if (!banners.length) return null;

  return (
    <View>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(b, i) => b._id || String(i)}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        onScrollBeginDrag={() => { interacting.current = true; }}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: itemWidth + GAP, offset: (itemWidth + GAP) * i, index: i })}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => <Dot key={b._id || i} active={i === index} />)}
        </View>
      ) : null}
    </View>
  );
}

const Separator = () => <View style={{ width: GAP }} />;

const styles = themedStyles((colors) => ({
  content: { paddingHorizontal: GUTTER },
  card: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 40 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
}));

export default memo(BannerCarousel);
