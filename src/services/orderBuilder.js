import { groupByStore, storeIdOf, unitPrice } from '../utils/cart';
import { PaymentMethods } from './paymentHelpers';

/** Paiements finalisés sans passer par iPay (identique au web) */
export const isOfflinePayment = (method) =>
  PaymentMethods.CASH_ON_DELIVERY.includes(method) || PaymentMethods.ASSISTED_PAYMENT.includes(method);

export const paymentStatusFor = (method) =>
  PaymentMethods.CASH_ON_DELIVERY.includes(method)
    ? 'payé à la livraison'
    : PaymentMethods.ASSISTED_PAYMENT.includes(method)
      ? 'payé par téléphone'
      : 'en_attente';

/**
 * Construit la commande au format exact attendu par le backend (parité avec
 * OrderConfirmation.tsx du web) : couleurs/tailles, frais de port par boutique, zone.
 */
export function buildOrder({
  userId, cartItems, delivery, phone, zone, location = null, shippingCalculations = {},
  subtotal, shippingFee, reduction, total, promo, pointsToUse = 0, pointsDiscount = 0,
  paymentMethod, transactionId, existingOrder,
}) {
  const groups = groupByStore(cartItems);

  // Le premier article de chaque boutique porte les frais de port de la boutique
  const seen = {};
  const prod = cartItems.map((item) => {
    const storeId = storeIdOf(item);
    const isFirst = !seen[storeId];
    seen[storeId] = true;
    const price = unitPrice(item);
    return {
      ...item,
      prix: price,
      price,
      quantity: Number(item.quantite) || 1,
      quantite: Number(item.quantite) || 1,
      sizes: item.taille ? [item.taille] : [],
      colors: item.color ? [item.color] : [],
      imageUrl: item.colorImage || item.image1,
      storeId,
      prixLivraison: isFirst ? shippingCalculations[storeId]?.totalCost || 0 : 0,
    };
  });

  const order = {
    clefUser: userId,
    nbrProduits: cartItems.map((item) => ({
      produit: item._id,
      quantite: Number(item.quantite) || 1,
      tailles: item.taille ? [item.taille] : [],
      couleurs: item.color ? [item.color] : [],
    })),
    prix: Math.max(0, total - pointsDiscount),
    prixTotal: subtotal,
    fraisLivraison: shippingFee,
    reduction,
    fraisSousTotalArticles: subtotal,
    statusPayment: paymentStatusFor(paymentMethod),
    reference: transactionId,
    livraisonDetails: {
      customerName: delivery.name.trim(),
      email: delivery.email?.trim() || null,
      // Région / quartier officiels : recalculés par le serveur depuis la zone
      region: zone?.fullPath?.split(' > ')[1] || zone?.name || '',
      quartier: zone?.name || '',
      numero: phone,
      description: delivery.landmark?.trim() || '',
      zoneId: zone?._id,
      localityName: zone?.localityName || '',
      landmark: delivery.landmark?.trim() || '',
      ...(location ? { location } : {}),
    },
    prod,
    shippingByStore: Object.values(groups).map((g) => ({
      storeId: g.storeId,
      storeName: g.storeName,
      shippingCost: shippingCalculations[g.storeId]?.totalCost || 0,
      delay: shippingCalculations[g.storeId]?.delay || null,
    })),
    ...(zone?._id && { customerZoneId: zone._id }),
    ...(promo?._id && { codePro: true, idCodePro: promo._id, codePromo: promo.code }),
    ...(pointsToUse > 0 && { pointsToUse }),
  };

  if (existingOrder?.transactionId) {
    order.oldReference = existingOrder.transactionId;
    order.newReference = transactionId;
  }
  return order;
}
