/**
 * Statuts de commande lisibles par le client, déduits de etatTraitement et statusPayment
 * (valeurs du backend : traitement, reçu par le livreur, en cours de livraison,
 * livraison reçu, livré, Traité, annulé).
 */
export const ORDER_STAGES = {
  unpaid: { key: 'unpaid', label: 'À payer', icon: 'card-outline', tone: 'warning', step: 0 },
  processing: { key: 'processing', label: 'En préparation', icon: 'cube-outline', tone: 'primary', step: 1 },
  shipping: { key: 'shipping', label: 'En livraison', icon: 'car-outline', tone: 'primary', step: 2 },
  delivered: { key: 'delivered', label: 'Livrée', icon: 'checkmark-done-outline', tone: 'success', step: 3 },
  cancelled: { key: 'cancelled', label: 'Annulée', icon: 'close-circle-outline', tone: 'danger', step: -1 },
};

const PAID_OR_DEFERRED = ['payé', 'paye', 'payé à la livraison', 'payé par téléphone', 'succeeded', 'success'];

export const orderStage = (order) => {
  const etat = String(order?.etatTraitement || '').toLowerCase();
  const pay = String(order?.statusPayment || '').toLowerCase();
  if (etat === 'annulé' || pay === 'failed' || pay === 'échec' || pay === 'echec') return ORDER_STAGES.cancelled;
  if (['livraison reçu', 'livré', 'traité'].includes(etat)) return ORDER_STAGES.delivered;
  if (['reçu par le livreur', 'en cours de livraison'].includes(etat)) return ORDER_STAGES.shipping;
  if (!PAID_OR_DEFERRED.includes(pay) && (pay === 'en_attente' || pay === 'en attente')) return ORDER_STAGES.unpaid;
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
