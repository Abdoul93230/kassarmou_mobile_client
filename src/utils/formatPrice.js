/**
 * Formatage unifié des prix pour l'application Ihambaobab
 * Format CFA sans décimales avec séparation des milliers
 */

/**
 * Formate un prix en francs CFA
 * @param {number|string} price - Le prix à formater
 * @returns {string} Le prix formaté (ex: "25 000")
 */
export const formatPrice = (price) => {
  // Convertir en nombre et arrondir (pas de décimales pour CFA)
  const numPrice = typeof price === 'number' ? price : parseFloat(price) || 0;
  const rounded = Math.round(numPrice);
  
  // Formater avec séparation des milliers (espace insécable pour éviter coupure)
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
};

/**
 * Formate un prix avec le symbole CFA
 * @param {number|string} price - Le prix à formater
 * @returns {string} Le prix formaté avec symbole (ex: "25 000 CFA")
 */
export const formatPriceWithCurrency = (price) => {
  return `${formatPrice(price)}\u00A0CFA`;
};

/**
 * Formate un prix avec le symbole XOF
 * @param {number|string} price - Le prix à formater
 * @returns {string} Le prix formaté avec symbole (ex: "25 000 XOF")
 */
export const formatPriceWithXOF = (price) => {
  return `${formatPrice(price)} XOF`;
};

export default formatPrice;
