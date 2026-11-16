import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Alert } from 'react-native';
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
      // Panier en cours : on demande avant de le remplacer (payer une commande exige de ne garder qu'elle)
      const current = JSON.parse((await AsyncStorage.getItem('panier').catch(() => null)) || '[]');
      const sameCart = current.length === items.length && current.every((c) => items.some((i) => String(i._id) === String(c._id)));
      let merged = items;
      if (current.length && !sameCart) {
        const choice = await new Promise((resolve) => {
          Alert.alert(
            'Votre panier contient déjà des articles',
            mode === 'pay'
              ? 'Pour payer cette commande, votre panier actuel sera remplacé par ses articles.'
              : 'Voulez-vous ajouter les articles de cette commande à votre panier, ou le remplacer ?',
            mode === 'pay'
              ? [{ text: 'Annuler', style: 'cancel', onPress: () => resolve(null) }, { text: 'Remplacer et payer', onPress: () => resolve('replace') }]
              : [
                { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
                { text: 'Remplacer', style: 'destructive', onPress: () => resolve('replace') },
                { text: 'Ajouter', onPress: () => resolve('add') },
              ],
            { cancelable: true, onDismiss: () => resolve(null) },
          );
        });
        if (!choice) return;
        if (choice === 'add') {
          const same = (a, b) => String(a._id) === String(b._id) && (a.color || null) === (b.color || null) && (a.taille || null) === (b.taille || null);
          merged = current.map((c) => {
            const add = items.find((i) => same(i, c));
            const q = (Number(c.quantite ?? c.quantity) || 1) + (add ? add.quantite : 0);
            return add ? { ...c, quantite: q, quantity: q } : c;
          });
          items.forEach((i) => { if (!current.some((c) => same(i, c))) merged.push(i); });
        }
      }
      try {
        await AsyncStorage.setItem('panier', JSON.stringify(merged));
        await AsyncStorage.removeItem('paymentInitiated');
        if (mode === 'pay' && order?.reference) {
          await AsyncStorage.setItem('pendingOrder', JSON.stringify({
            commandeId: order._id, transactionId: order.reference, owner: order.clefUser ? String(order.clefUser) : undefined,
            // Réservés par cette commande : repris au nouvel essai (le serveur les rend puis les redébite)
            pointsUsed: Number(order.pointsUsed) || 0, codePromo: order.codePromo || null,
            timestamp: Date.now(),
          }));
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
