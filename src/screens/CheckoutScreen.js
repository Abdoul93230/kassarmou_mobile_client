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
import { clearCartData } from '../redux/cartSlice';
import { API_URL } from '../config/api';
import CountryCodePicker from '../components/CountryCodePicker';
import { useStripe } from '@stripe/stripe-react-native';
import StripeCardInput from '../components/StripeCardInput';

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
  const cartItems = useSelector((state) => state.cart.items);
  const { confirmPayment } = useStripe();

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

  // États pour le formulaire de livraison
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+227',
    region: '',
    quartier: '',
    description: '',
    appart: '',
    codePost: '',
  });

  // États pour le paiement
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'stripe', 'paypal'
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: delivery, 2: payment, 3: confirmation
  const [cardDetails, setCardDetails] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState(null);

  // Charger les informations de livraison sauvegardées
  useEffect(() => {
    if (user) {
      loadSavedDeliveryInfo();
    }
  }, [user]);

  const loadSavedDeliveryInfo = async () => {
    try {
      // D'abord essayer de charger depuis l'API
      if (user) {
        try {
          const response = await axios.get(`${API_URL}/api/shippingAddressRoutes/me`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });

          if (response.data.address) {
            const address = response.data.address;
            console.log('✅ Adresse chargée depuis API:', address);
            
            // Parser le numéro pour séparer l'indicatif du numéro
            let countryCode = '+227'; // Valeur par défaut
            let phoneNumber = '';
            
            if (address.numero) {
              // Si le numéro commence par +, séparer l'indicatif
              if (address.numero.startsWith('+')) {
                // Trouver où l'indicatif se termine (après +XXX)
                // Les indicatifs font entre 1 et 4 chiffres après le +
                const numStr = address.numero.substring(1); // Enlever le +
                
                // Chercher les premiers chiffres qui forment l'indicatif
                // Pour +227, on prend 227, le reste c'est le numéro
                let indicatifLength = 3; // Par défaut 3 chiffres (comme 227)
                
                // Détecter la longueur de l'indicatif
                if (numStr.startsWith('1')) indicatifLength = 1; // USA/Canada
                else if (numStr.startsWith('33') || numStr.startsWith('44') || numStr.startsWith('49')) indicatifLength = 2;
                else if (numStr.startsWith('212') || numStr.startsWith('213') || numStr.startsWith('227')) indicatifLength = 3;
                
                countryCode = '+' + numStr.substring(0, indicatifLength);
                phoneNumber = numStr.substring(indicatifLength);
              } else {
                // Si pas d'indicatif, utiliser le numéro tel quel
                phoneNumber = address.numero;
              }
            }
            
            setDeliveryInfo({
              name: address.name || '',
              email: address.email || '',
              phone: phoneNumber,
              countryCode: countryCode,
              region: address.region || '',
              quartier: address.quartier || '',
              description: address.description || '',
              appart: address.appart || '',
              codePost: address.codePost || '',
            });
            return;
          }
        } catch (apiError) {
          console.log('ℹ️ Aucune adresse sauvegardée, préremplissage avec les données utilisateur');
          // Si pas d'adresse dans l'API, utiliser les infos de base de l'utilisateur
          setDeliveryInfo({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phoneNumber || '',
            countryCode: '+227',
            region: '',
            quartier: '',
            description: '',
            appart: '',
            codePost: '',
          });
          return;
        }
      }

      // Fallback: charger depuis AsyncStorage
      const saved = await AsyncStorage.getItem('deliveryInfo');
      if (saved) {
        const parsedInfo = JSON.parse(saved);
        console.log('✅ Adresse chargée depuis AsyncStorage:', parsedInfo);
        setDeliveryInfo(parsedInfo);
      }
    } catch (error) {
      console.error('❌ Erreur chargement infos livraison:', error);
      // En cas d'erreur, préremplir avec les infos utilisateur de base
      if (user) {
        setDeliveryInfo({
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phoneNumber || '',
          countryCode: '+227',
          region: '',
          quartier: '',
          description: '',
          appart: '',
          codePost: '',
        });
      }
    }
  };

  const saveDeliveryInfo = async () => {
    try {
      await AsyncStorage.setItem('deliveryInfo', JSON.stringify(deliveryInfo));
    } catch (error) {
      console.error('Erreur sauvegarde infos livraison:', error);
    }
  };

  // Valider le formulaire de livraison
  const validateDeliveryInfo = () => {
    const { name, email, phone, region, quartier } = deliveryInfo;

    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return false;
    }

    if (!phone.trim() || phone.length < 8) {
      Alert.alert('Erreur', 'Le numéro de téléphone doit contenir au moins 8 chiffres');
      return false;
    }

    if (!region.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre pays');
      return false;
    }

    if (!quartier.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre ville, village ou commune');
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
      if (paymentMethod === 'stripe') {
        handleStripePayment();
      } else {
        handlePlaceOrder();
      }
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
        await dispatch(clearCartData());
        await AsyncStorage.removeItem('shippingDetails');
        await AsyncStorage.removeItem('pendingOrder');
        await AsyncStorage.removeItem('deliveryInfo');
        
        Alert.alert('Succès', 'Paiement effectué avec succès !');
        setStep(3);

        // Rediriger vers les commandes après 3 secondes
        setTimeout(() => {
          navigation.navigate('OrdersScreen'); // Ou 'Home' si pas d'écran de commandes
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
        await dispatch(clearCartData());
        await AsyncStorage.removeItem('shippingDetails');

        // Afficher la confirmation
        setStep(3);
        
        // Rediriger vers l'écran d'accueil après 3 secondes
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
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

  // Formater le prix
  const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
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
            placeholder="Entrez votre nom complet"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.name}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, name: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Entrez votre email"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.email}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Téléphone *</Text>
        <View style={styles.phoneRow}>
          <CountryCodePicker
            value={deliveryInfo.countryCode}
            onSelect={(code) => setDeliveryInfo({ ...deliveryInfo, countryCode: code })}
          />
          <View style={styles.phoneInputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Numéro sans indicatif"
              placeholderTextColor={COLORS.textLight}
              value={deliveryInfo.phone}
              onChangeText={(text) => {
                const cleaned = text.replace(/\D/g, '');
                setDeliveryInfo({ ...deliveryInfo, phone: cleaned });
              }}
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pays *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre pays"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.region}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, region: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ville | Village | Commune *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="home-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre ville, village ou commune"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.quartier}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, quartier: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Appart | Immeuble | Etage | Nom de résidence *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Ex: Appt 2B, 3ème étage, Résidence XYZ"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.appart}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, appart: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Code Postal *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.input}
            placeholder="Votre code postal"
            placeholderTextColor={COLORS.textLight}
            value={deliveryInfo.codePost}
            onChangeText={(text) => setDeliveryInfo({ ...deliveryInfo, codePost: text })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Instructions de livraison</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Sonner 2 fois, grande porte bleue..."
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

  // Render payment methods
  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mode de paiement</Text>

      {/* Paiement à la livraison - Désactivé temporairement */}
      {/* <TouchableOpacity
        style={[styles.paymentCard, paymentMethod === 'cash' && styles.paymentCardSelected]}
        onPress={() => setPaymentMethod('cash')}
        activeOpacity={0.7}
      >
        <View style={styles.paymentIcon}>
          <Ionicons 
            name="cash-outline" 
            size={28} 
            color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textLight} 
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Paiement à la livraison</Text>
          <Text style={styles.paymentDescription}>
            Payez en espèces lors de la réception
          </Text>
        </View>
        {paymentMethod === 'cash' && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        )}
      </TouchableOpacity> */}

      {/* Carte bancaire */}
      <TouchableOpacity
        style={[styles.paymentCard, paymentMethod === 'stripe' && styles.paymentCardSelected]}
        onPress={() => setPaymentMethod('stripe')}
        activeOpacity={0.7}
      >
        <View style={styles.paymentIcon}>
          <Ionicons 
            name="card-outline" 
            size={28} 
            color={paymentMethod === 'stripe' ? COLORS.primary : COLORS.textLight} 
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Carte bancaire</Text>
          <Text style={styles.paymentDescription}>
            Paiement sécurisé par Stripe
          </Text>
        </View>
        {paymentMethod === 'stripe' && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        )}
      </TouchableOpacity>

      {/* PayPal - Désactivé temporairement */}
      {/* <TouchableOpacity
        style={[styles.paymentCard, paymentMethod === 'paypal' && styles.paymentCardSelected]}
        onPress={() => setPaymentMethod('paypal')}
        activeOpacity={0.7}
      >
        <View style={styles.paymentIcon}>
          <Ionicons 
            name="logo-paypal" 
            size={28} 
            color={paymentMethod === 'paypal' ? COLORS.primary : COLORS.textLight} 
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>PayPal</Text>
          <Text style={styles.paymentDescription}>
            Paiement via votre compte PayPal
          </Text>
        </View>
        {paymentMethod === 'paypal' && (
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        )}
      </TouchableOpacity> */}

      {/* Stripe Card Input */}
      {paymentMethod === 'stripe' && (
        <View style={styles.stripeCardContainer}>
          <StripeCardInput
            onCardChange={(details) => {
              setCardDetails(details);
              if (details.error) {
                setCardError(details.error.message);
              } else {
                setCardError(null);
              }
            }}
            error={cardError}
          />
        </View>
      )}

      {/* PayPal Note - Désactivé */}
      {/* {paymentMethod === 'paypal' && (
        <View style={styles.paymentNote}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.paymentNoteText}>
            Disponible prochainement
          </Text>
        </View>
      )} */}
    </View>
  );

  // Render order summary
  const renderOrderSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Résumé de la commande</Text>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Articles ({cartItems.length})</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}€</Text>
        </View>

        {reduction > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Réduction</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              -{formatPrice(reduction)}€
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
          <Text style={styles.summaryValue}>{formatPrice(shippingFee)}€</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}€</Text>
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
            Total payé: {formatPrice(total)}€
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
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
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
