import axios from 'axios';
import { API_URL } from '../config/api';

// Utilitaires pour les méthodes de paiement
export const PaymentMethods = {
  CARD: ['Visa', 'master Card', 'stripe'],
  MOBILE_WALLET: ['zeyna', 'nita', 'amana'],
  MOBILE_MONEY: ['mobile_money'],
  CASH_ON_DELIVERY: ['cash', 'payé à la livraison'],
};

// Générer un ID de transaction unique
export const generateTransactionId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Valider les informations de paiement
export const validatePaymentInfo = (paymentMethod, cardDetails, mobileDetails) => {
  const errors = [];

  if (PaymentMethods.CARD.includes(paymentMethod)) {
    // Validation carte bancaire
    if (!cardDetails || !cardDetails.number || cardDetails.number.length < 13) {
      errors.push('Numéro de carte invalide');
    }

    // Validation spécifique Visa
    if (paymentMethod === 'Visa' && cardDetails?.number) {
      const visaRegex = /^4[0-9]{12}(?:[0-9]{3})?$/;
      if (!visaRegex.test(cardDetails.number.replace(/\s/g, ''))) {
        errors.push('Numéro de carte Visa invalide');
      }
    }

    // Validation spécifique MasterCard
    if (paymentMethod === 'master Card' && cardDetails?.number) {
      const mastercardRegex = /^5[1-5][0-9]{14}$/;
      if (!mastercardRegex.test(cardDetails.number.replace(/\s/g, ''))) {
        errors.push('Numéro de carte MasterCard invalide');
      }
    }

    if (!cardDetails?.expiry || cardDetails.expiry.length < 4) {
      errors.push('Date d\'expiration invalide');
    }

    if (!cardDetails?.cvc || cardDetails.cvc.length < 3) {
      errors.push('CVC invalide (3 chiffres requis)');
    }
  }

  if (PaymentMethods.MOBILE_MONEY.includes(paymentMethod) || PaymentMethods.MOBILE_WALLET.includes(paymentMethod)) {
    // Validation Mobile Money/Wallets
    if (!mobileDetails || !mobileDetails.number || mobileDetails.number.length < 8) {
      errors.push('Numéro de téléphone invalide (minimum 8 chiffres)');
    }

    if (!mobileDetails?.operateur) {
      errors.push('Veuillez sélectionner un indicatif');
    }
  }

  return errors;
};

// Formater le numéro de carte (espaces tous les 4 chiffres)
export const formatCardNumber = (value) => {
  const cleaned = value.replace(/\s/g, '');
  const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  return formatted;
};

// Vérifier le statut d'une transaction
export const checkTransactionStatus = async (transactionId) => {
  try {
    const response = await axios.get(`${API_URL}/getOrderPaymentStatus/${transactionId}`);

    return {
      success: response.status === 200 || response.status === 201,
      data: response.data,
    };
  } catch (error) {
    console.error('Erreur vérification statut:', error);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Vérification progressive avec délais exponentiels
export const startProgressiveChecks = async (transactionId, onStatusChange, maxChecks = 10) => {
  let checkCount = 0;
  const initialDelay = 10000; // 10 secondes

  const check = async () => {
    if (checkCount >= maxChecks) {
      onStatusChange({
        status: 'timeout',
        message: 'Le délai de vérification a expiré',
      });
      return;
    }

    checkCount++;
    const result = await checkTransactionStatus(transactionId);

    if (result.success) {
      onStatusChange({
        status: 'success',
        data: result.data,
      });
      return;
    }

    // Délai exponentiel: 10s, 15s, 22.5s, 33.75s, etc.
    const delay = initialDelay * Math.pow(1.5, checkCount - 1);
    
    setTimeout(check, delay);
  };

  // Démarrer la première vérification après 10 secondes
  setTimeout(check, initialDelay);
};

// Demander un code de sécurité pour Zeyna
export const requestZeynaSecurityCode = async (phoneNumber) => {
  try {
    const response = await axios.post(`${API_URL}/requestZeynaCashSecurityCode`, {
      msisdn: phoneNumber,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Erreur demande code Zeyna:', error);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Traiter le callback de paiement
export const handlePaymentCallback = async (callbackData) => {
  try {
    const response = await axios.post(`${API_URL}/payment_callback2`, callbackData);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Erreur callback paiement:', error);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

// Traiter un paiement par carte bancaire
export const processCardPayment = async (transactionId, cardDetails, amount, customerName) => {
  try {
    const paymentData = {
      amount: amount,
      currency: 'XOF',
      reference: transactionId,
      customer_name: customerName,
      customer_email: cardDetails.email || 'client@ihambaobab.com',
      card_number: cardDetails.number.replace(/\s/g, ''),
      card_expiry: cardDetails.expiry,
      card_cvc: cardDetails.cvc,
      description: `Commande Ihambaobab - ${transactionId}`,
    };

    console.log('💳 Traitement paiement carte:', { reference: transactionId, amount });

    const response = await axios.post(`${API_URL}/payment_card`, paymentData);

    return {
      success: true,
      data: response.data,
      redirectUrl: response.data.redirectUrl || response.data.authorization_url,
      reference: transactionId,
    };
  } catch (error) {
    console.error('❌ Erreur paiement carte:', error);
    throw new Error(error.response?.data?.message || 'Erreur lors du traitement du paiement par carte');
  }
};

// Traiter un paiement mobile (Mobile Money, Wallets)
export const processMobilePayment = async (transactionId, paymentMethod, mobileDetails, amount) => {
  try {
    const phoneNumber = '+' + mobileDetails.operateur + mobileDetails.number;

    const paymentData = {
      option: paymentMethod, // zeyna, nita, amana, mobile_money
      phoneNumber: phoneNumber,
      country: 'niger',
      amount: amount,
      externalRef: transactionId,
      staType: paymentMethod,
      description: `Commande Ihambaobab - ${transactionId}`,
    };

    console.log('📱 Traitement paiement mobile:', { 
      method: paymentMethod, 
      phone: phoneNumber, 
      amount 
    });

    let endpoint = `${API_URL}/processSTAPayment`;
    
    // Endpoint spécifique selon la méthode
    if (paymentMethod === 'mobile_money') {
      endpoint = `${API_URL}/payment_mobile_money`;
    }

    const response = await axios.post(endpoint, paymentData);

    return {
      success: true,
      data: response.data,
      code_validation: response.data.code_validation,
      message: response.data.message || 'Paiement initié avec succès',
      reference: transactionId,
    };
  } catch (error) {
    console.error('❌ Erreur paiement mobile:', error);
    throw new Error(error.response?.data?.message || 'Erreur lors du traitement du paiement mobile');
  }
};

// [DEPRECATED] Le backend V2 gère l'usage des codes promo automatiquement à la création de commande
// Cette fonction est conservée pour rétrocompatibilité mais ne fait plus rien
export const invalidatePromoCode = async (codePromoId) => {
  // Le backend gère désormais l'invalidation atomiquement via applyPromoToOrder
  console.log('[DEPRECATED] invalidatePromoCode appelé - le backend V2 gère cela automatiquement');
};

// Descriptions des méthodes de paiement
export const getPaymentDescription = (method) => {
  const descriptions = {
    stripe: 'Paiement sécurisé par carte bancaire. Votre commande sera traitée immédiatement.',
    'master Card': 'Paiement sécurisé MasterCard. Traitement immédiat de votre commande.',
    Visa: 'Paiement sécurisé Visa. Traitement immédiat de votre commande.',
    mobile_money: 'Vous recevrez un code par SMS sur votre téléphone pour valider le paiement.',
    zeyna: 'Paiement sécurisé avec Zeyna. Un code de sécurité vous sera envoyé par SMS.',
    nita: 'Paiement rapide avec MyNita. Confirmation instantanée.',
    amana: 'Paiement sécurisé avec Amana. Validation immédiate.',
    cash: 'Payez en espèces ou par carte à la livraison. Un agent vous contactera sous 24-48h.',
    'payé à la livraison': 'Payez en espèces ou par carte à la livraison. Un agent vous contactera sous 24-48h.',
  };

  return descriptions[method] || 'Sélectionnez un mode de paiement';
};

export default {
  PaymentMethods,
  generateTransactionId,
  validatePaymentInfo,
  formatCardNumber,
  checkTransactionStatus,
  startProgressiveChecks,
  requestZeynaSecurityCode,
  handlePaymentCallback,
  invalidatePromoCode,
  getPaymentDescription,
  processCardPayment,
  processMobilePayment,
};
