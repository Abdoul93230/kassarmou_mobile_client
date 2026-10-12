import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SmartImage, Text } from '../../ui';
import { colors, radius } from '../../theme';

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
 * Galerie produit plein largeur. ref.scrollTo(index) permet d'afficher l'image d'une variante.
 */
function ImageGallery({ images, height, discount }, ref) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);

  useImperativeHandle(ref, () => ({
    scrollTo: (i) => {
      if (i >= 0 && i < images.length) {
        listRef.current?.scrollToIndex({ index: i, animated: true });
        setIndex(i);
      }
    },
  }), [images.length]);

  const renderItem = useCallback(
    ({ item, index: i }) => (
      <Pressable onPress={() => setViewer(true)} accessibilityLabel="Agrandir l'image">
        <SmartImage uri={item} width={width} priority={i === 0 ? 'high' : 'normal'} style={{ width, height }} />
      </Pressable>
    ),
    [height, width],
  );

  return (
    <View style={{ height, backgroundColor: colors.surfaceAlt }}>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => `${u}-${i}`}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      />

      {discount > 0 ? (
        <View style={styles.discount}>
          <Text variant="smallMedium" color="textInverse">-{discount}%</Text>
        </View>
      ) : null}

      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((u, i) => (
            <View key={`${u}-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      {viewer ? <FullscreenViewer images={images} startIndex={index} visible={viewer} onClose={() => setViewer(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  discount: {
    position: 'absolute', left: 16, bottom: 36, backgroundColor: colors.danger,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4,
  },
  dots: { position: 'absolute', bottom: 38, alignSelf: 'center', flexDirection: 'row', gap: 5 },
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
});

export default memo(forwardRef(ImageGallery));
