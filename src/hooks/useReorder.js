import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { loadCart } from '../redux/cartSlice';
import { orderToCartItems } from '../utils/orders';

/**
 * Remet les articles d'une commande dans le panier.
 * mode 'pay'   : reprise de paiement (même commande mise à jour, code promo conservé — parité web)
 * mode 'again' : nouvelle commande identique
 */
export default function useReorder(navigation) {
  const dispatch = useDispatch();

  return useCallback(
    async (order, mode = 'again') => {
      const items = orderToCartItems(order);
      if (!items.length) {
        Toast.show({ type: 'error', text1: 'Articles indisponibles', text2: 'Cette commande ne contient plus d’articles récupérables.' });
        return;
      }
      try {
        await AsyncStorage.setItem('panier', JSON.stringify(items));
        await AsyncStorage.removeItem('paymentInitiated');
        if (mode === 'pay' && order?.reference) {
          await AsyncStorage.setItem('pendingOrder', JSON.stringify({ commandeId: order._id, transactionId: order.reference, timestamp: Date.now() }));
          if (order.codePromo) await AsyncStorage.setItem('appliedPromoCode', order.codePromo);
          else await AsyncStorage.removeItem('appliedPromoCode');
        } else {
          await AsyncStorage.multiRemove(['pendingOrder', 'appliedPromoCode']);
        }
        await dispatch(loadCart()); // le panier affiché reflète immédiatement les articles
        navigation.navigate('Cart');
      } catch {
        Toast.show({ type: 'error', text1: 'Action impossible', text2: 'Réessayez dans un instant.' });
      }
    },
    [dispatch, navigation],
  );
}
