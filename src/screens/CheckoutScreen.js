import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearPanierData, clearCartData } from '../redux/cartSlice';
import { API_URL } from '../config/api';
import { formatPrice } from '../utils/formatPrice';
import SecurityCodeModal from '../components/SecurityCodeModal';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import PaymentDetailsForm from '../components/PaymentDetailsForm';
import {
  PaymentMethods,
  generateUniqueID,
  formatCardNumber,
  validatePaymentInfo,
  getPaymentDescription,
  preparePayment,
  invalidatePromoCode,
} from '../services/paymentHelpers';

const COLORS = {
  primary: '#FF6B35',
  secondary: '#004E89',
  tertiary: '#FF9F1C',
  success: '#06D6A0',
  error: '#EF476F',
  warning: '#FCA311',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: '#2D3436',
  textLight: '#636E72',
  border: '#DFE6E9',
};

export default function CheckoutScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const cartItems = useSelector((state) => state.panier?.articles || []);

  // Récupérer les paramètres depuis le panier
  const {
    subtotal = 0,
    reduction = 0,
    shippingFee = 0,
    total = 0,
    totalWeight = 0,
    selectedZone = null,
    appliedPromo = null,
  } = route.params || {};

  // États pour le formulaire de livraison (EXACTEMENT comme sur le WEB)
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    email: '',
    numero: '',
    region: '',
    quartier: '',
    description: '',
  });

  // États pour le paiement (EXACTEMENT comme sur le WEB)
  const [paymentMethod, setPaymentMethod] = useState(''); // '', 'master Card', 'Visa', 'Mobile Money', 'payé à la livraison', 'nita', 'zeyna', 'amana'
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: delivery, 2: payment, 3: confirmation
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
  });
  const [mobileDetails, setMobileDetails] = useState({
    number: '',
    operateur: '227',
  });
  const [securityCodeModal, setSecurityCodeModal] = useState({
    isOpen: false,
    code: '',
    error: '',
  });
  const [handleSecuritySubmit, setHandleSecuritySubmit] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState(null);

  // Charger les informations de livraison sauvegardées (EXACTEMENT comme sur le WEB)
  useEffect(() => {
    const loadDeliveryInfo = async () => {
      try {
        const userId = user?.id || user?._id;
        if (!userId) {
          console.log('❌ Aucun utilisateur connecté');
          return;
        }

        // Récupérer l'adresse de livraison depuis l'API (EXACTEMENT comme sur le WEB)
        const response = await axios.get(`${API_URL}/getAddressByUserKey/${userId}`);

        if (response.data.address) {
          const address = response.data.address;
          console.log('✅ Adresse chargée depuis API:', address);
          
          setDeliveryInfo({
            name: address.name || '',
            email: address.email || '',
            numero: address.numero || '',
            region: address.region || '',
            quartier: address.quartier || '',
            description: address.description || '',
          });
        } else {
          console.log('ℹ️ Aucune adresse sauvegardée');
        }
      } catch (error) {
        console.log('❌ Erreur lors du chargement de l\'adresse:', error);
        // En cas d'erreur, ne rien faire (laisser les champs vides)
      }
    };

    if (user) {
      loadDeliveryInfo();
    }
  }, [user]);

  const saveDeliveryInfo = async () => {
    try {
      // Sauvegarder localement
      await AsyncStorage.setItem('deliveryInfo', JSON.stringify(deliveryInfo));
      
      // Envoyer au backend (comme sur le web)
      if (user && (user.id || user._id)) {
        const userId = user.id || user._id;
        await axios.post(`${API_URL}/createOrUpdateAddress`, {
          ...deliveryInfo,
          email: deliveryInfo.email !== "" ? deliveryInfo.email : null,
          clefUser: userId,
        });
      }
    } catch (error) {
      console.error('Erreur sauvegarde infos livraison:', error);
    }
  };

  // Valider le formulaire de livraison
  const validateDeliveryInfo = () => {
    const { name, email, numero, region, quartier } = deliveryInfo;

    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return false;
    }

    if (!numero.trim() || numero.length < 8) {
      Alert.alert('Erreur', 'Le numéro de téléphone doit contenir au moins 8 chiffres');
      return false;
    }

    if (!region.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre région');
      return false;
    }

    if (!quartier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre quartier');
      return false;
    }

    return true;
  };

  // Passer à l'étape suivante
  const handleNextStep = async () => {
    if (step === 1) {
      if (validateDeliveryInfo()) {
        await saveDeliveryInfo();
        setStep(2);
      }
    } else if (step === 2) {
      if (!paymentMethod) {
        Alert.alert('Erreur', 'Veuillez sélectionner un mode de paiement');
        return;
      }
      handlePaymentSubmit();
    }
  };

  // Créer la commande et initialiser le paiement Stripe
  const initializeStripePayment = async () => {
    try {
      // Récupérer les détails d'expédition
      const shippingDetails = await AsyncStorage.getItem('shippingDetails');
      const parsedShippingDetails = shippingDetails ? JSON.parse(shippingDetails) : null;

      if (!parsedShippingDetails) {
        Alert.alert('Erreur', 'Informations d\'expédition manquantes');
        return null;
      }

      // Vérifier s'il existe une commande en attente
      const pendingOrderJson = await AsyncStorage.getItem('pendingOrder');
      const pendingOrder = pendingOrderJson ? JSON.parse(pendingOrderJson) : null;

      // Préparer les données de la commande
      const orderData = {
        clefUser: user.id || user._id,
        nbrProduits: cartItems.map((item) => ({
          produit: item.product._id,
          quantite: item.quantity,
          tailles: item.selectedSize ? [item.selectedSize] : [],
          couleurs: item.selectedColor ? [item.selectedColor] : [],
        })),
        livraisonDetails: {
          customerName: deliveryInfo.name,
          email: deliveryInfo.email,
          numero: `${deliveryInfo.countryCode}${deliveryInfo.phone}`,
          region: deliveryInfo.region,
          quartier: deliveryInfo.quartier,
          description: deliveryInfo.description,
          appart: deliveryInfo.appart,
          codePost: deliveryInfo.codePost,
        },
        shippingDetails: parsedShippingDetails,
        prix: subtotal - reduction,
        prixTotal: total,
        reduction: reduction,
        codePro: appliedPromo ? true : false,
        idCodePro: appliedPromo ? appliedPromo._id : null,
        statusPayment: 'en cours',
        statusLivraison: 'en cours',
        reference: `CMD-${Date.now()}`,
        prod: cartItems.map((item) => ({
          id: item.product._id,
          name: item.product.name,
          image: item.colorImage || item.product.image1,
          price: item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix,
          quantity: item.quantity,
        })),
      };

      let commandeId;

      // Si une commande en attente existe, mettre à jour au lieu de créer
      if (pendingOrder && pendingOrder.commandeId) {
        console.log('📝 Mise à jour de la commande existante:', pendingOrder.commandeId);
        orderData.id = pendingOrder.commandeId;
        
        const updateResponse = await axios.put(
          `${API_URL}/api/ordersRoutes/updateCommande`,
          orderData
        );
        
        console.log('✅ Commande mise à jour:', updateResponse.data);
        commandeId = updateResponse.data.commande._id;
      } else {
        // Créer une nouvelle commande
        console.log('📦 Création de la commande avec orderData:', orderData);
        const orderResponse = await axios.post(`${API_URL}/api/ordersRoutes/create`, orderData);

        console.log('✅ Commande créée:', orderResponse.data);

        if (!orderResponse.data.commande) {
          throw new Error('Impossible de créer la commande');
        }

        commandeId = orderResponse.data.commande._id;
        
        // Sauvegarder la commande en attente
        await AsyncStorage.setItem('pendingOrder', JSON.stringify({
          commandeId,
          reference: orderData.reference,
          timestamp: Date.now(),
        }));
      }

      setCreatedOrderId(commandeId);

      console.log('💳 Initialisation du paiement Stripe pour commande:', commandeId);
      console.log('📍 URL:', `${API_URL}/api/payment/create-payment-intent`);
      console.log('📝 Payload:', {
        commandeId,
        customer_email: deliveryInfo.email || user?.email || '',
        userId: user.id || user._id,
      });

      // Initialiser le paiement Stripe
      const paymentResponse = await axios.post(
        `${API_URL}/api/payment/create-payment-intent`,
        {
          commandeId,
          customer_email: deliveryInfo.email || user?.email || '',
          userId: user.id || user._id,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      console.log('✅ Réponse du paiement:', paymentResponse.data);

      if (paymentResponse.data.success) {
        return paymentResponse.data.clientSecret;
      } else {
        throw new Error(paymentResponse.data.message || 'Erreur lors de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Erreur initialisation paiement:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      });
      throw error;
    }
  };

  // Gérer le paiement Stripe
  const handleStripePayment = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Erreur', 'Veuillez entrer des informations de carte valides');
      return;
    }

    console.log('🚀 Début du paiement Stripe');
    setLoading(true);

    try {
      // Initialiser le paiement et créer la commande
      const secret = await initializeStripePayment();

      console.log('🔐 Client Secret reçu:', secret ? 'Oui' : 'Non');

      if (!secret) {
        throw new Error('Impossible d\'initialiser le paiement');
      }

      console.log('💳 Confirmation du paiement avec Stripe...');

      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await confirmPayment(secret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: deliveryInfo.name,
            email: deliveryInfo.email,
            phone: `${deliveryInfo.countryCode}${deliveryInfo.phone}`,
          },
        },
      });

      console.log('📊 Résultat confirmation:', { error, paymentIntentStatus: paymentIntent?.status });

      if (error) {
        Alert.alert(
          'Erreur de paiement',
          error.message || 'Le paiement a échoué. Veuillez réessayer.'
        );
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'Succeeded') {
        // Paiement réussi
        console.log('✅ Paiement réussi ! Nettoyage des données...');
        
        // Vider le panier et supprimer toutes les données temporaires
        await dispatch(clearPanierData());
        await AsyncStorage.removeItem('shippingDetails');
        await AsyncStorage.removeItem('pendingOrder');
        await AsyncStorage.removeItem('deliveryInfo');
        
        Alert.alert('Succès', 'Paiement effectué avec succès !');
        setStep(3);

        // Rediriger vers les commandes après 3 secondes
        setTimeout(() => {
          navigation.navigate('Orders');
        }, 3000);
      }
    } catch (error) {
      console.error('Erreur paiement Stripe:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || error.message || 'Une erreur est survenue lors du paiement'
      );
    } finally {
      setLoading(false);
    }
  };

  // Passer une commande (paiement à la livraison)
  // Fonction principale de soumission du paiement (EXACTEMENT comme sur le WEB)
  const handlePaymentSubmit = async () => {
    setLoading(true);

    try {
      // 1. Validation utilisateur
      const userId = user?.id || user?._id;
      if (!userId) {
        Alert.alert('Erreur', 'Veuillez vous connecter pour continuer');
        setLoading(false);
        return;
      }

      // 2. Validation des informations de paiement
      const paymentErrors = validatePaymentInfo(paymentMethod, cardDetails, mobileDetails);
      if (paymentErrors.length > 0) {
        Alert.alert('Erreur', paymentErrors.join(', '));
        setLoading(false);
        return;
      }

      // 3. Vérification du panier
      if (!cartItems || cartItems.length === 0) {
        Alert.alert('Erreur', 'Votre panier est vide');
        setLoading(false);
        return;
      }

      // 4. Génération de l'ID de transaction
      const transactionId = generateUniqueID();
      const existingOrder = JSON.parse((await AsyncStorage.getItem('pendingOrder')) || 'null');

      // 4. Nettoyage et Normalisation des produits (Parité WEB)
      const cleanedProducts = cartItems.map((item) => {
        // Déterminer le prix unitaire correct (après promo si applicable)
        const unitPrice = item.prixPromo > 0 ? item.prixPromo : item.prix;
        
        return {
          _id: item._id || item.product?._id,
          name: item.name || item.product?.name,
          image: item.image1 || item.imageUrl || item.product?.image1, 
          imageUrl: item.image1 || item.imageUrl || item.product?.image1, // WEB KEY
          prix: unitPrice, // WEB KEY
          price: unitPrice, // MOBILE KEY
          quantity: item.quantity || item.quantite || 1,
          size: item.selectedSize,
          color: item.selectedColor,
          storeId: item.Clefournisseur?._id || item.createdBy,
          storeName: item.Clefournisseur?.storeName || item.Clefournisseur?.name,
          ClefType: item.ClefType,
          weight: item.poids || item.shipping?.weight || 0,
        };
      });

      // 5. Création de la commande (FORMAT EXACT DU WEB)
      const orderData = {
        clefUser: userId,
        nbrProduits: cartItems.map((item) => ({
          produit: item._id || item.product?._id,
          quantite: item.quantity,
          tailles: item.sizes || (item.selectedSize ? [item.selectedSize] : []),
          couleurs: item.colors || (item.selectedColor ? [item.selectedColor] : []),
        })),
        prix: total,
        statusPayment: PaymentMethods.CASH_ON_DELIVERY.includes(paymentMethod)
          ? 'payé à la livraison'
          : PaymentMethods.ASSISTED_PAYMENT.includes(paymentMethod)
            ? 'payé par téléphone'
            : 'en_attente',
        reference: transactionId,
        livraisonDetails: {
          customerName: deliveryInfo.name,
          email: deliveryInfo.email || null,
          region: deliveryInfo.region,
          quartier: deliveryInfo.quartier,
          numero: deliveryInfo.numero,
          description: deliveryInfo.description,
        },
        prod: cleanedProducts, // Produits nettoyés sans les objets imbriqués lourds
        ...(appliedPromo && {
          codePro: true,
          idCodePro: appliedPromo._id,
          codePromo: appliedPromo.code,
          reduction: appliedPromo.discount || reduction,
        }),
        prix: total, // Grand Total (comme le champ 'prix' sur le web)
        prixTotal: subtotal, // Sous-total HT/Remise (PARITÉ WEB)
        fraisLivraison: shippingFee,
        reduction: reduction,
        fraisSousTotalArticles: subtotal, // Alias déjà présent
      };

      if (existingOrder?.transactionId) {
        orderData.oldReference = existingOrder.transactionId;
        orderData.newReference = transactionId;
      }

      console.log('📦 Données commande envoyées:', JSON.stringify(orderData, null, 2));

      // 6. Sauvegarder l'adresse de livraison
      await axios.post(`${API_URL}/createOrUpdateAddress`, {
        ...deliveryInfo,
        email: deliveryInfo.email !== '' ? deliveryInfo.email : null,
        clefUser: userId,
      });

      // 7. Créer ou mettre à jour la commande (parité web pour repaiement)
      const orderResponse = existingOrder?.transactionId
        ? await axios.put(`${API_URL}/updateCommande`, orderData)
        : await axios.post(`${API_URL}/createCommande`, orderData);
      
      if (!orderResponse.data.commande) {
        throw new Error('Impossible de créer la commande');
      }

      setCreatedOrderId(orderResponse.data.commande._id);

      // 8. Traiter le paiement (sauf cash) - EXACTEMENT comme sur le WEB
      if (!PaymentMethods.CASH_ON_DELIVERY.includes(paymentMethod)) {
        try {
          // Préparer le paiement (comme sur le web avant la redirection vers payment-page.html)
          const paymentInfo = await preparePayment(transactionId, total, paymentMethod);

          console.log('💳 Informations de paiement préparées:', paymentInfo);

          // Sur le web : window.location.href = "/payment-page.html"
          // Sur mobile : navigation vers PaymentWebViewScreen avec iPay Money
          navigation.navigate('PaymentWebView', {
            amount: paymentInfo.amount,
            transactionId: paymentInfo.transactionId,
            paymentMethod: paymentInfo.paymentMethod,
          });

          // Ne pas vider le panier ici car l'utilisateur n'a pas encore payé
          // Le panier sera vidé après confirmation du paiement (dans PaymentWebViewScreen)
          // comme sur le web où on ne vide le panier qu'après le callback

          // Ne pas continuer le flux ici, l'utilisateur va vers la page de paiement
          return;
        } catch (error) {
          console.error('❌ Erreur préparation paiement:', error);
          throw error;
        }
      }

      // 9. Le backend V2 gère l'invalidation du code promo automatiquement
      // Plus besoin d'appeler invalidatePromoCode manuellement

      // 10. Vider le panier
      await dispatch(clearCartData());

      // 11. Succès
      setStep(3);
      setLoading(false);

      // Redirection après 3 secondes
      setTimeout(() => {
        if (PaymentMethods.CASH_ON_DELIVERY.includes(paymentMethod)) {
          navigation.navigate('Orders');
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      }, 3000);

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || error.message || 'Une erreur est survenue lors du traitement de votre commande'
      );
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);

    try {
      // Récupérer les détails d'expédition
      const shippingDetails = await AsyncStorage.getItem('shippingDetails');
      const parsedShippingDetails = shippingDetails ? JSON.parse(shippingDetails) : null;

      if (!parsedShippingDetails) {
        Alert.alert('Erreur', 'Informations d\'expédition manquantes');
        setLoading(false);
        return;
      }

      // Préparer les données de la commande selon le format backend
      const orderData = {
        clefUser: user.id || user._id,
        nbrProduits: cartItems.map((item) => ({
          produit: item.product._id,
          quantite: item.quantity,
          tailles: item.selectedSize ? [item.selectedSize] : [],
          couleurs: item.selectedColor ? [item.selectedColor] : [],
        })),
        livraisonDetails: {
          customerName: deliveryInfo.name,
          email: deliveryInfo.email,
          numero: deliveryInfo.numero,
          region: deliveryInfo.region,
          quartier: deliveryInfo.quartier,
          description: deliveryInfo.description,
        },
        shippingDetails: parsedShippingDetails,
        prix: subtotal - reduction,
        prixTotal: total,
        reduction: reduction,
        codePro: appliedPromo ? true : false,
        idCodePro: appliedPromo ? appliedPromo._id : null,
        statusPayment: paymentMethod === 'cash' ? 'en cours' : 'en attente',
        statusLivraison: 'en cours',
        reference: `CMD-${Date.now()}`,
        prod: cartItems.map((item) => ({
          id: item.product._id,
          name: item.product.name,
          image: item.colorImage || item.product.image1,
          price: item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix,
          quantity: item.quantity,
        })),
      };

      // Envoyer la commande au backend
      const response = await axios.post(`${API_URL}/api/ordersRoutes/create`, orderData);

      if (response.data.commande) {
        // Vider le panier
        await dispatch(clearPanierData());
        await AsyncStorage.removeItem('shippingDetails');

        // Afficher la confirmation
        setStep(3);
        
        // Rediriger vers l'écran d'accueil après 3 secondes
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }, 3000);
      } else {
        Alert.alert('Erreur', 'Impossible de créer la commande. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur création commande:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Une erreur est survenue lors de la création de la commande'
      );
    } finally {
      setLoading(false);
    }
  };

  // Render delivery form
  const renderDeliveryForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations de livraison</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom complet *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre nom complet"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.name}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, name: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre email"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.email}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Numéro de téléphone *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre numéro de téléphone"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.numero}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, numero: text })}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Région *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre région"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.region}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, region: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Quartier *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="home-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre quartier"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.quartier}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, quartier: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Instructions de livraison</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Instructions supplémentaires pour la livraison"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.description}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, description: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );

  // Render payment methods (EXACTEMENT comme sur le WEB)
  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mode de paiement</Text>
      
      <PaymentMethodSelector
        selectedMethod={paymentMethod}
        onSelectMethod={setPaymentMethod}
      />

      {paymentMethod && (
        <PaymentDetailsForm
          paymentMethod={paymentMethod}
          cardDetails={cardDetails}
          setCardDetails={setCardDetails}
          mobileDetails={mobileDetails}
          setMobileDetails={setMobileDetails}
          formatCardNumber={formatCardNumber}
          getPaymentDescription={getPaymentDescription}
        />
      )}
    </View>
  );

  // Render order summary
  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Résumé de la commande</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Articles ({cartItems.length})</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)} CFA</Text>
        </View>

        {reduction > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Réduction</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              -{formatPrice(reduction)} CFA
            </Text>
          </View>
        )}

        {totalWeight > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Poids total</Text>
            <Text style={styles.summaryValue}>{totalWeight.toFixed(2)} kg</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Frais de livraison</Text>
          <Text style={styles.summaryValue}>{formatPrice(shippingFee)} CFA</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue} numberOfLines={1}>{formatPrice(total)} CFA</Text>
        </View>
      </View>
    </View>
  );

  // Render confirmation
  const renderConfirmation = () => (
    <View style={styles.confirmationContainer}>
      <View style={styles.confirmationIconContainer}>
        <LinearGradient
          colors={[COLORS.success + '20', COLORS.success + '10']}
          style={styles.confirmationIconGradient}
        >
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </LinearGradient>
      </View>

      <Text style={styles.confirmationTitle}>Paiement réussi !</Text>
      <Text style={styles.confirmationText}>
        Votre commande a été confirmée et payée avec succès.{'\n'}
        Un email de confirmation vous sera envoyé.
      </Text>

      <View style={styles.confirmationDetails}>
        {createdOrderId && (
          <View style={styles.confirmationDetailRow}>
            <Ionicons name="receipt-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.confirmationDetailText}>
              Commande: {createdOrderId.substring(0, 8)}...
            </Text>
          </View>
        )}

        <View style={styles.confirmationDetailRow}>
          <Ionicons name="cube-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.confirmationDetailText}>
            {cartItems.length} article{cartItems.length > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.confirmationDetailRow}>
          <Ionicons name="cash-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.confirmationDetailText}>
            Total payé: {formatPrice(total)}\u00a0CFA
          </Text>
        </View>

        <View style={styles.confirmationDetailRow}>
          <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.confirmationDetailText}>
            {deliveryInfo.region}, {deliveryInfo.quartier}
          </Text>
        </View>

        <View style={styles.confirmationDetailRow}>
          <Ionicons name="time-outline" size={20} color={COLORS.textLight} />
          <Text style={styles.confirmationDetailText}>
            Livraison sous 2-5 jours
          </Text>
        </View>

        <View style={styles.confirmationDetailRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
          <Text style={[styles.confirmationDetailText, { color: COLORS.success, fontWeight: '600' }]}>
            Paiement sécurisé par Stripe
          </Text>
        </View>
      </View>

      <ActivityIndicator size="small" color={COLORS.primary} style={styles.confirmationLoader} />
      <Text style={styles.confirmationRedirect}>
        Redirection en cours...
      </Text>
    </View>
  );

  // Step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
          {step > 1 ? (
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          ) : (
            <Text style={styles.stepNumber}>1</Text>
          )}
        </View>
        <Text style={styles.stepLabel}>Livraison</Text>
      </View>

      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
          {step > 2 ? (
            <Ionicons name="checkmark" size={20} color={COLORS.white} />
          ) : (
            <Text style={styles.stepNumber}>2</Text>
          )}
        </View>
        <Text style={styles.stepLabel}>Paiement</Text>
      </View>

      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
          <Text style={styles.stepNumber}>3</Text>
        </View>
        <Text style={styles.stepLabel}>Confirmation</Text>
      </View>
    </View>
  );

  // Render logic based on step
  if (step === 3) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.tertiary]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Commande confirmée</Text>
        </LinearGradient>
        {renderConfirmation()}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.tertiary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commander</Text>
        <View style={styles.backButton} />
      </LinearGradient>

      {/* Step indicator */}
      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {step === 1 && renderDeliveryForm()}
        {step === 2 && renderPaymentMethods()}
        {renderOrderSummary()}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNextStep}
          disabled={loading || (step === 2 && paymentMethod === 'stripe' && !cardDetails?.complete)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              loading || (step === 2 && paymentMethod === 'stripe' && !cardDetails?.complete)
                ? [COLORS.textLight, COLORS.textLight]
                : [COLORS.primary, COLORS.tertiary]
            }
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {step === 1 ? 'Continuer' : 'Confirmer le paiement'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modal pour le code de sécurité Zeyna */}
      <SecurityCodeModal
        isOpen={securityCodeModal.isOpen}
        onClose={() => {
          setSecurityCodeModal({ isOpen: false, code: '', error: '' });
          setHandleSecuritySubmit(null);
          setLoading(false);
        }}
        onSubmit={handleSecuritySubmit}
        error={securityCodeModal.error}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    marginLeft: 0,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  paymentCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentNoteText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
  },
  stripeCardContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  confirmationIconContainer: {
    marginBottom: 24,
  },
  confirmationIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  confirmationText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  confirmationDetails: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmationDetailText: {
    fontSize: 15,
    color: COLORS.text,
  },
  confirmationLoader: {
    marginTop: 32,
  },
  confirmationRedirect: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
});
