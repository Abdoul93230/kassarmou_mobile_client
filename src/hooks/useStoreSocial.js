import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import socialService from '../services/socialService';

/**
 * Abonnement et « j'aime » d'une boutique, avec mise à jour optimiste.
 * requireAuth() est appelé si l'utilisateur n'est pas connecté.
 */
export default function useStoreSocial(sellerId, initialStats, requireAuth) {
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id || user?._id;
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [likes, setLikes] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    setFollowers(initialStats?.followersCount || 0);
    setLikes(initialStats?.likesCount || 0);
  }, [initialStats?.followersCount, initialStats?.likesCount]);

  // État initial pour l'utilisateur connecté
  useEffect(() => {
    if (!sellerId || !userId) {
      setFollowing(false);
      setLiked(false);
      return;
    }
    let cancelled = false;
    Promise.all([socialService.getSellerFollowers(sellerId), socialService.checkStoreLike(sellerId)]).then(([f, l]) => {
      if (cancelled) return;
      const list = f?.data?.followers || f?.data?.data || [];
      setFollowing(Array.isArray(list) && list.some((x) => String(x._id || x.id) === String(userId)));
      setLiked(Boolean(l?.data?.hasLiked || l?.data?.liked));
    });
    return () => { cancelled = true; };
  }, [sellerId, userId]);

  const toggle = useCallback(
    async (kind) => {
      if (!userId) {
        requireAuth?.();
        return;
      }
      if (busy.current || !sellerId) return;
      busy.current = true;
      const isFollow = kind === 'follow';
      const was = isFollow ? following : liked;
      const setOn = isFollow ? setFollowing : setLiked;
      const setCount = isFollow ? setFollowers : setLikes;
      setOn(!was);
      setCount((c) => Math.max(0, c + (was ? -1 : 1)));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        if (isFollow) await (was ? socialService.unfollowSeller(sellerId) : socialService.followSeller(sellerId));
        else await (was ? socialService.unlikeStore(sellerId) : socialService.likeStore(sellerId));
        if (isFollow && !was) Toast.show({ type: 'success', text1: 'Vous suivez cette boutique', text2: 'Vous verrez ses nouveautés en priorité.', visibilityTime: 1800 });
      } catch {
        setOn(was);
        setCount((c) => Math.max(0, c + (was ? 1 : -1)));
        Toast.show({ type: 'error', text1: 'Action impossible', text2: 'Vérifiez votre connexion et réessayez.' });
      } finally {
        busy.current = false;
      }
    },
    [following, liked, requireAuth, sellerId, userId],
  );

  return {
    following, liked, followers, likes,
    toggleFollow: () => toggle('follow'),
    toggleLike: () => toggle('like'),
  };
}
