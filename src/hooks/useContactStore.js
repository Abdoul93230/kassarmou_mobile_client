import { useCallback } from 'react';
import { useSelector } from 'react-redux';

/**
 * Ouvre la conversation avec une boutique ; sans compte, passe d'abord par la connexion
 * puis revient directement dans la conversation.
 * params : { sellerId, storeName?, storeLogo?, productId?, orderId? }
 */
export default function useContactStore(navigation) {
  const user = useSelector((s) => s.auth.user);
  return useCallback((params) => {
    if (!params?.sellerId) return;
    if (!user) {
      navigation.navigate('QuickAuth', { returnScreen: 'StoreChat', returnParams: params, pendingAction: 'contact-store' });
      return;
    }
    navigation.navigate('StoreChat', params);
  }, [navigation, user]);
}
