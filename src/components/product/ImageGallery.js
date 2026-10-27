import React, { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SmartImage, Text } from '../../ui';
import { colors, radius, useTheme, themedStyles } from '../../theme';

/** Visionneuse plein écran (fond noir, défilement, fermeture) */
const FullscreenViewer = memo(function FullscreenViewer({ images, startIndex, visible, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.viewer}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${u}-${i}`}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <SmartImage uri={item} width={width} contentFit="contain" style={{ width, height, backgroundColor: 'black' }} />
          )}
        />
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + 10 }]} accessibilityLabel="Fermer">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        {images.length > 1 ? (
          <View style={[styles.viewerCounter, { bottom: insets.bottom + 24 }]}>
            <Text variant="smallMedium" color="textInverse">{index + 1} / {images.length}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
});

/**
 * Galerie produit plein largeur cyclique à 360° fluide et sans blocage.
 * ref.scrollTo(index) permet d'afficher l'image d'une variante.
 */
function ImageGallery({ images = [], height, discount }, ref) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const isLoop = images && images.length > 1;

  // Données cycliques : [dernière, ...toutes, première] pour rotation continue 360°
  const loopImages = useMemo(() => {
    if (!images || images.length <= 1) return images || [];
    return [images[images.length - 1], ...images, images[0]];
  }, [images]);

  useImperativeHandle(ref, () => ({
    scrollTo: (i) => {
      if (i >= 0 && i < images.length) {
        const target = isLoop ? i + 1 : i;
        listRef.current?.scrollToOffset({ offset: target * width, animated: true });
        setIndex(i);
      }
    },
  }), [images.length, isLoop, width]);

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const rawIndex = Math.round(offsetX / width);

      if (!isLoop) {
        setIndex(rawIndex);
        return;
      }

      // Si l'utilisateur glisse avant la 1ère image (index 0) -> saut silencieux vers la fin
      if (rawIndex <= 0) {
        listRef.current?.scrollToOffset({ offset: images.length * width, animated: false });
        setIndex(images.length - 1);
      }
      // Si l'utilisateur glisse après la dernière image -> saut silencieux vers le début
      else if (rawIndex >= images.length + 1) {
        listRef.current?.scrollToOffset({ offset: 1 * width, animated: false });
        setIndex(0);
      } else {
        setIndex(rawIndex - 1);
      }
    },
    [images.length, isLoop, width],
  );

  const renderItem = useCallback(
    ({ item, index: i }) => (
      <Pressable onPress={() => setViewer(true)} delayPressIn={120} accessibilityLabel="Agrandir l'image">
        <SmartImage uri={item} width={width} priority={i <= 1 ? 'high' : 'normal'} style={{ width, height }} />
      </Pressable>
    ),
    [height, width],
  );

  return (
    <View style={{ height, backgroundColor: colors.surfaceAlt }}>
      <FlatList
        ref={listRef}
        data={loopImages}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: isLoop ? width : 0, y: 0 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
      />

      {discount > 0 ? (
        <View style={styles.discount}>
          <Text variant="smallMedium" color="textInverse">-{discount}%</Text>
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={styles.badge360}>
          <Ionicons name="sync-outline" size={13} color="#fff" />
          <Text variant="caption" color="textInverse" style={styles.badge360Text}>
            {index + 1}/{images.length} · 360°
          </Text>
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      {viewer ? <FullscreenViewer images={images} startIndex={index} visible={viewer} onClose={() => setViewer(false)} /> : null}
    </View>
  );
}

const styles = themedStyles((colors) => ({
  discount: {
    position: 'absolute', left: 16, bottom: 36, backgroundColor: colors.danger,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4,
  },
  badge360: {
    position: 'absolute', right: 16, bottom: 36,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  badge360Text: { fontWeight: '600', fontSize: 11 },
  dots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 18, backgroundColor: colors.textInverse },
  viewer: { flex: 1, backgroundColor: 'black' },
  close: {
    position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  viewerCounter: {
    position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6,
  },
}));

export default memo(forwardRef(ImageGallery));
