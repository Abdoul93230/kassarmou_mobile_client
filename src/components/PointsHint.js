import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { fetchPublicConfig, selectConfig } from '../redux/gamificationSlice';
import { radius, useTheme, themedStyles } from '../theme';

/** Points gagnés pour un montant d'articles (même règle que le serveur, hors bonus de niveau) */
export const pointsFor = (config, amount) => {
  const rate = config?.enabled === false ? 0 : Number(config?.modules?.POINTS_PURCHASE?.ratePerThousand) || 0;
  return Math.floor(((Number(amount) || 0) / 1000) * rate);
};

/**
 * « +12 Baobab Points à la livraison ». Sans compte, on dit ce qu'un compte rapporte.
 * Rien ne s'affiche si le programme est désactivé ou si le montant ne rapporte rien.
 */
function PointsHint({ amount, earned = false, style }) {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const config = useSelector(selectConfig);
  const user = useSelector((s) => s.auth.user);
  useEffect(() => { if (!config) dispatch(fetchPublicConfig()); }, [config, dispatch]);

  const pts = pointsFor(config, amount);
  if (pts <= 0) return null;
  const bonus = Number(config?.modules?.FIRST_ORDER_BONUS?.points) || 0;
  const label = earned
    ? `+${pts} Baobab Points crédités à la livraison`
    : user
      ? `Vous gagnerez ${pts} Baobab Points avec cet achat`
      : `Avec un compte : ${pts} Baobab Points sur cet achat${bonus ? `, +${bonus} à la 1re commande` : ''}`;
  return (
    <View style={[styles.row, { backgroundColor: colors.woodSoft || colors.surfaceAlt }, style]}>
      <Ionicons name="leaf" size={15} color={colors.wood} />
      <Text variant="small" color="wood" style={styles.flex}>{label}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.md },
  flex: { flex: 1 },
}));

export default memo(PointsHint);
