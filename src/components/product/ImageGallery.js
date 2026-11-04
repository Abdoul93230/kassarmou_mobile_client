import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AppState, FlatList, Modal, Pressable, StatusBar, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SmartImage, Text } from '../../ui';
import { radius, useTheme, themedStyles } from '../../theme';

const AUTOPLAY_MS = 4000; // défilement automatique
const RESUME_MS = 6000; // reprise après un geste de l'utilisateur
const REPEAT = 200; // la liste répète les images : on peut glisser sans fin dans les deux sens

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
 * Galerie produit plein largeur : défile toute seule, se glisse au doigt dans les deux sens
 * et tourne en boucle (après la dernière image vient la première, sans saut ni blocage).
 * La boucle repose sur une liste qui répète les images (virtualisée : seules 3 pages sont rendues).
 * ref.scrollTo(index) affiche l'image d'une variante.
 */
function ImageGallery({ images = [], height, discount }, ref) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const listRef = useRef(null);
  const n = images.length;
  const loop = n > 1;
  const start = loop ? n * Math.floor(REPEAT / 2) : 0; // départ au milieu : de la marge des deux côtés
  const page = useRef(start); // page affichée dans la liste répétée
  const pausedUntil = useRef(0);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);

  const imagesKey = images.join('|'); // même contenu = même liste (un rechargement de l'article ne remet rien à zéro)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => (loop ? Array.from({ length: n * REPEAT }, (_, i) => images[i % n]) : images), [imagesKey]);

  // Autre article (images différentes) : retour à la première image
  const lastKey = useRef(imagesKey);
  useEffect(() => {
    if (lastKey.current === imagesKey) return;
    lastKey.current = imagesKey;
    page.current = start;
    setIndex(0);
    listRef.current?.scrollToOffset({ offset: start * width, animated: false });
  }, [imagesKey, start, width]);

  const goTo = useCallback((p, animated = true) => {
    page.current = p;
    setIndex(((p % n) + n) % n);
    listRef.current?.scrollToOffset({ offset: p * width, animated });
  }, [n, width]);

  useImperativeHandle(ref, () => ({
    scrollTo: (i) => {
      if (i < 0 || i >= n) return;
      pausedUntil.current = Date.now() + RESUME_MS;
      // Page la plus proche montrant cette image
      const base = page.current - (((page.current % n) + n) % n);
      goTo(loop ? base + i : i);
    },
  }), [goTo, loop, n]);

  // Défilement automatique (en pause hors écran, en arrière-plan, plein écran ouvert, ou juste après un geste)
  useEffect(() => {
    if (!loop || !focused || viewer) return undefined;
    const id = setInterval(() => {
      if (AppState.currentState !== 'active' || Date.now() < pausedUntil.current) return;
      goTo(page.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [focused, goTo, loop, viewer]);

  const onScrollBeginDrag = useCallback(() => {
    pausedUntil.current = Date.now() + RESUME_MS;
  }, []);

  const onMomentumScrollEnd = useCallback((e) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    page.current = p;
    setIndex(((p % n) + n) % n);
    // Très loin d'un bord après beaucoup de glissements : on se recentre (même image, invisible)
    if (loop && (p < n * 5 || p > n * (REPEAT - 5))) goTo(start + (((p % n) + n) % n), false);
  }, [goTo, loop, n, start, width]);

  const renderItem = useCallback(
    ({ item, index: i }) => (
      <Pressable onPress={() => setViewer(true)} accessibilityLabel="Agrandir l'image">
        <SmartImage uri={item} width={width} priority={Math.abs(i - start) <= 1 ? 'high' : 'normal'} style={{ width, height }} />
      </Pressable>
    ),
    [height, start, width],
  );

  return (
    <View style={{ height, backgroundColor: colors.surfaceAlt }}>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {discount > 0 ? (
        <View style={styles.discount}>
          <Text variant="smallMedium" color="textInverse">-{discount}%</Text>
        </View>
      ) : null}

      {n > 1 ? (
        <View style={styles.badge360}>
          <Ionicons name="images-outline" size={13} color="#fff" />
          <Text variant="caption" color="textInverse" style={styles.badge360Text}>{index + 1}/{n}</Text>
        </View>
      ) : null}

      {n > 1 ? (
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
