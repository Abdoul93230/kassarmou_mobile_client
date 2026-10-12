import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setQuickAuthContext } from '../redux/authSlice';

/** Message lisible depuis une erreur de thunk (chaîne ou objet { message }) */
export const authErrorMessage = (error, fallback) =>
  (typeof error === 'string' ? error : error?.message) || fallback;

/**
 * Retour à l'écran d'origine après connexion/inscription,
 * en gardant toujours l'accueil en dessous (sinon « retour » quitte l'app).
 */
export default function useAuthReturn(navigation, params = {}) {
  const dispatch = useDispatch();
  const { pendingAction = null, returnScreen = null, returnParams = null } = params;

  return useCallback(() => {
    dispatch(setQuickAuthContext({ pendingAction, returnScreen, returnParams }));
    if (returnScreen && returnScreen !== 'MainTabs') {
      navigation.reset({ index: 1, routes: [{ name: 'MainTabs' }, { name: returnScreen, params: returnParams || {} }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: returnParams || {} }] });
    }
  }, [dispatch, navigation, pendingAction, returnParams, returnScreen]);
}
