import { PixelRatio } from 'react-native';
import { API_URL } from '../config/env';

const DPR = Math.min(PixelRatio.get(), 3);
// Paliers de largeur : maximise les hits de cache (CDN + disque) au lieu d'une taille par écran
const WIDTH_STEPS = [96, 160, 240, 320, 480, 640, 828, 1080];

const snapWidth = (w) => WIDTH_STEPS.find((s) => s >= w) || WIDTH_STEPS[WIDTH_STEPS.length - 1];

/**
 * Renvoie une URL d'image optimisée pour la largeur affichée (en points).
 * Cloudinary : redimensionnement + format auto (WebP/AVIF) + qualité auto → 5 à 10x moins de data.
 */
export const optimizeImage = (src, displayWidth = 320) => {
  if (!src || typeof src !== 'string') return null;

  let url = src.trim();
  // Fichiers locaux (photo choisie, cache) : jamais réécrits
  if (/^(file|content|data|asset|ph):/i.test(url)) return url;
  if (!/^https?:\/\//i.test(url)) {
    url = `${API_URL}/${url.replace(/^\/+/, '')}`;
  }

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (url.includes('res.cloudinary.com') && idx !== -1) {
    const after = url.slice(idx + marker.length);
    // Ne pas ajouter deux fois une transformation
    if (/^(w_|c_|q_|f_)/.test(after)) return url;
    const w = snapWidth(Math.round(displayWidth * DPR));
    return `${url.slice(0, idx + marker.length)}f_auto,q_auto,c_limit,w_${w}/${after}`;
  }
  return url;
};

/** Première image disponible d'un produit */
export const productImage = (product) =>
  product?.image1 || product?.images?.[0] || product?.image || product?.imageUrl || null;

/** Toutes les images d'un produit, sans doublon */
export const productImages = (product) => {
  if (!product) return [];
  const list = [product.image1, product.image2, product.image3, ...(product.pictures || []), ...(product.images || [])]
    .filter((u) => typeof u === 'string' && u.length > 0);
  return [...new Set(list)];
};
