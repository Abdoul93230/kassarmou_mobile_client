import { useCallback } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { toggleLike } from '../redux/likesSlice';
import { addArticleToPanier } from '../redux/cartSlice';
import { productImage } from '../utils/image';

/** true si ce produit est aimé — ne re-rend que la carte concernée */
export const useIsLiked = (productId) =>
  useSelector((state) => state.likes.likedProducts.includes(productId));

/**
 * Actions communes à toutes les cartes/écrans produit.
 * Le like redirige vers l'authentification rapide si l'utilisateur n'est pas connecté.
 */
export default function useProductActions() {
  const dispatch = useDispatch();
  const store = useStore();
  const navigation = useNavigation();

  const openProduct = useCallback(
    (product) => navigation.navigate('ProductDetail', { product, productId: product?._id }),
    [navigation],
  );

  const like = useCallback(
    (product) => {
      const user = store.getState().auth.user;
      const userId = user?.id || user?._id;
      if (!userId) {
        navigation.navigate('QuickAuth', { returnScreen: 'ProductDetail', returnParams: { product } });
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      dispatch(toggleLike({ userId, product }));
    },
    [dispatch, navigation, store],
  );

  /** Ajout rapide (sans variante). Si le produit a des variantes, on ouvre la fiche pour choisir. */
  const addToCart = useCallback(
    (product, { quantite = 1, color = null, taille = null, silent = false } = {}) => {
      const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
      if (hasVariants && !color && !taille) {
        openProduct(product);
        return false;
      }
      dispatch(
        addArticleToPanier({
          ...product,
          id: product._id,
          stockDisponible: Number(product.quantite),
          quantite,
          color,
          taille,
          colorImage: (color && product.variants?.find((v) => v.color === color)?.imageUrl) || productImage(product),
        }),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!silent) {
        Toast.show({
          type: 'success',
          text1: 'Ajouté au panier',
          text2: product?.name,
          visibilityTime: 1600,
          onPress: () => {
            Toast.hide();
            navigation.navigate('Cart');
          },
        });
      }
      return true;
    },
    [dispatch, navigation, openProduct],
  );

  return { openProduct, like, addToCart };
}
