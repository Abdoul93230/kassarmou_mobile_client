import { useEffect, useState } from 'react';
import { loadSellerOrigin } from '../services/shippingV3';

/** Ville d'expédition d'une boutique, chargée en lot avec les autres cartes de l'écran */
export default function useSellerOrigin(sellerId) {
  const [origin, setOrigin] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!sellerId) {
      setOrigin(null);
      return undefined;
    }
    loadSellerOrigin(sellerId).then((v) => alive && setOrigin(v));
    return () => { alive = false; };
  }, [sellerId]);
  return origin;
}
