/**
 * Statuts de commande lisibles par le client, déduits de etatTraitement et statusPayment
 * (valeurs du backend : traitement, reçu par le livreur, en cours de livraison,
 * livraison reçu, livré, Traité, annulé).
 */
export const ORDER_STAGES = {
  unpaid: { key: 'unpaid', label: 'À payer', icon: 'card-outline', tone: 'warning', step: 0, note: 'Paiement en attente' },
  // Même parcours que « À payer » (onglet, bouton Payer) : le client peut réessayer
  payFailed: { key: 'unpaid', label: 'Paiement non abouti', icon: 'alert-circle-outline', tone: 'danger', step: 0, note: 'Paiement non abouti : vous pouvez réessayer' },
  processing: { key: 'processing', label: 'En préparation', icon: 'cube-outline', tone: 'primary', step: 1 },
  shipping: { key: 'shipping', label: 'En livraison', icon: 'car-outline', tone: 'primary', step: 2 },
  delivered: { key: 'delivered', label: 'Livrée', icon: 'checkmark-done-outline', tone: 'success', step: 3 },
  cancelled: { key: 'cancelled', label: 'Annulée', icon: 'close-circle-outline', tone: 'danger', step: -1 },
};

// Mêmes règles que le site (iham_baobab_web_nextjs/src/lib/orderStatus.ts)
const PAY_WAITING = ['en_attente', 'en attente', 'en cours', 'pending'];
const PAY_FAILED = ['échec', 'echec', 'failed'];
const DELIVERED = ['livraison reçu', 'livré', 'livrée', 'traité'];
const low = (v) => String(v || '').toLowerCase();

export const orderStage = (order) => {
  const etat = low(order?.etatTraitement);
  const livraison = low(order?.statusLivraison);
  const pay = low(order?.statusPayment);
  if (etat.includes('annul') || livraison.includes('annul')) return ORDER_STAGES.cancelled;
  // L'avancement de la livraison prime sur le paiement (paiement à la livraison, etc.)
  if (DELIVERED.includes(etat) || ['livré', 'livrée'].includes(livraison)) return ORDER_STAGES.delivered;
  if (['reçu par le livreur', 'en cours de livraison'].includes(etat)) return ORDER_STAGES.shipping;
  if (PAY_FAILED.includes(pay)) return ORDER_STAGES.payFailed;
  if (PAY_WAITING.includes(pay)) return ORDER_STAGES.unpaid;
  return ORDER_STAGES.processing;
};

/** Nombre d'articles d'une commande */
export const orderItemsCount = (order) =>
  (order?.nbrProduits || []).reduce((s, n) => s + (Number(n.quantite) || 0), 0) || (order?.prod || []).length;

/** Aperçu des produits (snapshot prod enregistré à la commande) */
export const orderPreview = (order) => (Array.isArray(order?.prod) ? order.prod : []);

export const orderDate = (order) => new Date(order?.date || order?.createdAt || Date.now());

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Une commande est-elle encore à payer en ligne ? */
export const isAwaitingPayment = (order) => orderStage(order).key === 'unpaid';

/**
 * Reconstitue des articles de panier à partir du snapshot « prod » d'une commande
 * (anciens et nouveaux formats : quantity/quantite, sizes/taille, colors/color).
 */
export const orderToCartItems = (order) =>
  orderPreview(order)
    .filter((p) => p && (p._id || p.id))
    .map((p) => ({
      ...p,
      id: p.id || p._id,
      _id: p._id || p.id,
      quantite: Number(p.quantite || p.quantity) || 1,
      quantity: Number(p.quantite || p.quantity) || 1,
      color: p.color || (Array.isArray(p.colors) ? p.colors[0] : null) || null,
      taille: p.taille || (Array.isArray(p.sizes) ? p.sizes[0] : null) || null,
      colorImage: p.colorImage || p.imageUrl || p.image1 || p.image,
    }));
