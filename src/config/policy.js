/**
 * Engagements Ihambaobab affichés au client. Une seule source : la fiche produit et l'aide lisent ce fichier,
 * pour ne jamais afficher deux politiques différentes. N'y écrire que ce qui est réellement appliqué.
 */
export const RETURN_DAYS = 7;

export const RETURN_POLICY =
  `Vous avez ${RETURN_DAYS} jours après la livraison pour signaler un article défectueux, cassé ou non conforme à l'annonce. `
  + 'Écrivez au support depuis la commande : la référence est jointe automatiquement.';

export const GUARANTEES = [
  { icon: 'refresh-outline', title: `Retour sous ${RETURN_DAYS} jours`, text: "Article défectueux, cassé ou non conforme à l'annonce." },
  { icon: 'keypad-outline', title: 'Remise par code personnel', text: 'Le livreur ne valide la livraison qu’avec votre code.' },
  { icon: 'card-outline', title: 'Rien n’est débité si le paiement échoue', text: 'Code promo et points vous sont rendus.' },
  { icon: 'chatbubbles-outline', title: 'Support dans l’application', text: 'Une équipe au Niger vous répond.' },
];
