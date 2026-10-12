import React, { memo, useMemo } from 'react';
import { Image } from 'expo-image';
import { optimizeImage } from '../utils/image';
import { colors } from '../theme';

/**
 * Image optimisée : redimensionnement CDN, cache mémoire + disque, fondu doux.
 * width = largeur affichée en points (sert à choisir la bonne taille d'image).
 */
function SmartImage({ uri, width = 320, style, contentFit = 'cover', priority = 'normal', transition = 180, recyclingKey, ...rest }) {
  const source = useMemo(() => {
    const u = optimizeImage(uri, width);
    return u ? { uri: u } : null;
  }, [uri, width]);

  return (
    <Image
      source={source}
      style={[{ backgroundColor: colors.surfaceAlt }, style]}
      contentFit={contentFit}
      transition={transition}
      cachePolicy="memory-disk"
      priority={priority}
      recyclingKey={recyclingKey || uri}
      {...rest}
    />
  );
}

export default memo(SmartImage);
