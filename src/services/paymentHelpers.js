import axios from 'axios';
import { API_URL } from '../config/api';

// Méthodes de paiement (EXACTEMENT comme sur le WEB)
export const PaymentMethods = {
  CARD: ['Visa', 'master Card'],
  MOBILE_WALLET: ['zeyna', 'nita', 'amana'],
  MOBILE_MONEY: ['Mobile Money'],
  CASH_ON_DELIVERY: ['payé à la livraison'],
  ASSISTED_PAYMENT: ['paiement_assiste'],
};

// Générer un ID de transaction unique
export const generateUniqueID = () => {
  // Align with web format for deterministic order-reference matching.
  return String(Date.now());
};

// Formater le numéro de carte
export const formatCardNumber = (value) => {
  const cleaned = value.replace(/\s/g, '');
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join(' ') : cleaned;
};

// Valider les informations de paiement
export const validatePaymentInfo = (paymentMethod, cardDetails, mobileDetails) => {
  const errors = [];

  if (PaymentMethods.CARD.includes(paymentMethod)) {
    const cardNumber = cardDetails.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 15) {
      errors.push('Numéro de carte invalide');
    }
    if (!cardDetails.expiry ||!/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      errors.push('Date d\'expiration invalide (MM/AA)');
    }
    if (!cardDetails.cvc || cardDetails.cvc.length < 3) {
      errors.push('CVC invalide');
    }
  }

  if (PaymentMethods.MOBILE_MONEY.includes(paymentMethod) || PaymentMethods.MOBILE_WALLET.includes(paymentMethod)) {
    if (!mobileDetails.number || mobileDetails.number.length < 8) {
      errors.push('Numéro de téléphone invalide');
    }
  }

  return errors;
};

// Obtenir la description du mode de paiement
export const getPaymentDescription = (paymentMethod) => {
  const descriptions = {
    'master Card': 'Paiement sécurisé par carte MasterCard',
    'Visa': 'Paiement sécurisé par carte Visa',
    'Mobile Money': 'Paiement via Airtel, Moov, Zamani ou MTN',
    'payé à la livraison': 'Payez en espèces ou par carte à la livraison',
    'paiement_assiste': 'Un conseiller vous accompagne pour finaliser le paiement',
    'nita': 'Paiement via votre portefeuille MyNita',
    'zeyna': 'Paiement via votre portefeuille Zeyna',
    'amana': 'Paiement via votre portefeuille Amana',
  };
  return descriptions[paymentMethod] || '';
};

// Préparer le paiement (EXACTEMENT comme sur le WEB - pas d'appel API direct)
// Sur le web, on stocke juste les infos dans localStorage et on redirige vers payment-page.html
// Sur mobile, on va ouvrir un WebView avec iPay Money
export const preparePayment = async (transactionId, orderTotal, paymentMethod) => {
  try {
    console.log('💰 Préparation paiement:', { 
      reference: transactionId, 
      amount: orderTotal,
      method: paymentMethod 
    });
    
    // Retourner les infos de paiement (comme sur le web avant la redirection)
    return {
      success: true,
      amount: orderTotal,
      transactionId: transactionId,
      paymentMethod: paymentMethod,
      // Ces infos seront utilisées pour ouvrir le WebView iPay Money
      needsPaymentPage: true,
    };
  } catch (error) {
    console.error('❌ Erreur préparation paiement:', error);
    throw new Error('Erreur lors de la préparation du paiement');
  }
};

// Ces fonctions sont conservées pour compatibilité mais ne sont plus utilisées
// Le paiement se fait maintenant via iPay Money (i-pay.money) comme sur le web
export const processCardPayment = preparePayment;
export const processMobilePayment = preparePayment;

// Zeyna passe maintenant par iPay Money (pas de code de sécurité séparé)
export const requestZeynaSecurityCode = async (phoneNumber) => {
  console.log('ℹ️ Zeyna utilise maintenant iPay Money - pas de code séparé');
  return {
    success: true,
    message: 'Le paiement se fera via iPay Money',
  };
};

// Vérifier le statut d'une transaction (FORMAT EXACT DU WEB)
export const checkTransactionStatus = async (transactionId, maxAttempts = 10) => {
  console.log('🔍 Début vérification transaction:', transactionId);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`🔍 Tentative ${i + 1}/${maxAttempts}`);
      
      const response = await axios.get(`${API_URL}/payment_status_card/${transactionId}`);
      
      console.log(`✅ Statut tentative ${i + 1}:`, response.data);
      
      if (response.data.status === 'complete') {
        console.log('✅ Transaction complétée avec succès!');
        return { 
          status: 'complete', 
          isCompleted: true,
          isSuccessful: true,
          data: response.data 
        };
      }
      
      // Attendre avant le prochain essai (délai progressif comme sur le web)
      const delay = (i + 1) * 2000;
      console.log(`⏳ Attente de ${delay}ms avant la prochaine tentative...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`❌ Tentative ${i + 1} échouée:`, error.response?.data || error.message);
    }
  }
  
  console.log('⚠️ Délai de vérification dépassé');
  return { 
    status: 'pending', 
    isCompleted: false,
    isSuccessful: false,
    error: 'Délai d\'attente dépassé' 
  };
};

// Maintenant on utilise iPay Money pour tout (comme sur le web)
export const processMobileMoneyPayment = preparePayment;

// Invalider un code promo après utilisation
export const invalidatePromoCode = async (promoCodeId) => {
  if (!promoCodeId) return;
  try {
    await axios.put(`${API_URL}/api/promo-codes/${promoCodeId}/invalidate`);
  } catch (error) {
    console.error('Erreur lors de l\'invalidation du code promo:', error);
  }
};
