/**
 * Calculs panier purs (sans dépendance React Native) — partagés par le panier, le checkout
 * et la construction de commande. Testables en Node.
 */

/** Identifiant boutique, que Clefournisseur soit peuplé (objet) ou non (id) */
export const storeIdOf = (item) =>
  (item?.Clefournisseur && typeof item.Clefournisseur === 'object' ? item.Clefournisseur._id : item?.Clefournisseur) || 'unknown';

/** Prix unitaire réel d'un article du panier (variante incluse, promo seulement si inférieure) */
export const unitPrice = (item) => {
  const variant = Array.isArray(item?.variants) ? item.variants.find((v) => v.color === item.color) : null;
  const base = Number(variant?.price) > 0 ? Number(variant.price) : Number(item?.prix) || 0;
  const promo = Number(variant?.promoPrice) > 0 ? Number(variant.promoPrice) : Number(item?.prixPromo) || 0;
  return promo > 0 && promo < base ? promo : base;
};

/** Prix barré éventuel */
export const originalPrice = (item) => {
  const variant = Array.isArray(item?.variants) ? item.variants.find((v) => v.color === item.color) : null;
  const base = Number(variant?.price) > 0 ? Number(variant.price) : Number(item?.prix) || 0;
  return unitPrice(item) < base ? base : null;
};

/** Poids d'un article (kg) : shipping.weight du produit, sinon estimation */
export const itemWeight = (item) => Number(item?.shipping?.weight) || Number(item?.poids) || 0.5;

/** Stock disponible pour la ligne (variante si couleur choisie) */
export const availableStock = (item) => {
  if (Array.isArray(item?.variants) && item.variants.length && item.color) {
    const v = item.variants.find((x) => x.color === item.color);
    if (v && Number.isFinite(Number(v.stock))) return Math.max(0, Number(v.stock));
  }
  // stockDisponible est mémorisé à l'ajout (quantite = quantité commandée dans le panier)
  const q = Number(item?.stockDisponible);
  return Number.isFinite(q) && q > 0 ? q : 99;
};

/** Regroupe les articles par boutique (une boutique = un colis = des frais de port) */
export const groupByStore = (articles) => {
  const groups = {};
  (articles || []).forEach((item) => {
    const storeId = storeIdOf(item);
    const seller = typeof item.Clefournisseur === 'object' ? item.Clefournisseur : null;
    if (!groups[storeId]) {
      groups[storeId] = {
        storeId,
        storeName: seller?.storeName || seller?.name || 'Boutique',
        storeInfo: seller || {},
        items: [],
        totalWeight: 0,
        totalValue: 0,
      };
    }
    const qty = Number(item.quantite) || 0;
    groups[storeId].items.push(item);
    groups[storeId].totalWeight += itemWeight(item) * qty;
    groups[storeId].totalValue += unitPrice(item) * qty;
  });
  return groups;
};

