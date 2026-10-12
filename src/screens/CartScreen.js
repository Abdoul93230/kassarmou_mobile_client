import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { formatPrice } from '../utils/formatPrice';
import {
  deleteArticlePanier,
  updateArticleQuantity,
  clearPanierData,
  loadCart,
  selectPanierArticles,
} from '../../src/redux/cartSlice';

import { COLORS } from '../config/constants';
import ZoneSelector from '../components/ZoneSelector';

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const articles = useSelector(selectPanierArticles);
  const user = useSelector((state) => state.auth.user);

  const [codePromo, setCodePromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [reduction, setReduction] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedStores, setExpandedStores] = useState({});
  const [expandedProducts, setExpandedProducts] = useState({});
  const [shippingCalculations, setShippingCalculations] = useState({});
  const [unavailableProducts, setUnavailableProducts] = useState(new Set());
  const [shippingZones, setShippingZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    dispatch(loadCart());
    fetchShippingZones();
    detectCustomerZone();
  }, []);

  // Auto-appliquer le code promo si présent (relance de commande - Logique ALIGNÉE WEB)
  useEffect(() => {
    const checkAppliedPromo = async () => {
      try {
        const appliedCode = await AsyncStorage.getItem('appliedPromoCode');
        const user = await AsyncStorage.getItem('user'); // Vérification utilisateur directe si besoin
        const userData = user ? JSON.parse(user) : null;

        if (appliedCode && articles?.length > 0 && !appliedPromo && userData) {
          console.log('🔄 Auto-application du code promo (Relance):', appliedCode);
          setCodePromo(appliedCode);

          // Petit délai comme sur le web pour laisser le sous-total se stabiliser
          setTimeout(async () => {
            try {
              const productIds = articles.map(item => item._id).filter(Boolean);
              const currentSubtotal = articles.reduce((acc, item) => acc + (item.prixPromo || item.prix || 0) * item.quantite, 0);

              const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
                code: appliedCode,
                orderAmount: currentSubtotal,
                userId: userData.id || userData._id,
                products: productIds,
              });

              if (response.data.valid) {
                const { discount, finalAmount, promoCode: validatedPromo } = response.data;
                setReduction(discount);
                setAppliedPromo({
                  _id: validatedPromo.id,
                  code: validatedPromo.code,
                  type: validatedPromo.type,
                  value: validatedPromo.value,
                  description: validatedPromo.description,
                  discount,
                  finalAmount,
                  isValide: true,
                });
                console.log('✅ Code promo auto-appliqué avec succès');
              }
              // On ne nettoie pas forcément tout de suite si on veut que ça persiste durant la session panier
            } catch (err) {
              console.warn("Erreur lors de l'auto-validation du code promo:", err);
            }
          }, 600);
        }
      } catch (err) {
        console.error('Erreur AsyncStorage promo:', err);
      }
    };

    checkAppliedPromo();
  }, [articles.length, user]); // Se déclenche quand le panier est chargé ou l'user identifié

  // Détecter la zone du client
  const detectCustomerZone = useCallback(async () => {
    try {
      const ipResponse = await axios.get("https://ifconfig.me/ip");
      const response = await axios.get(`${API_URL}/proxy/ip-api`, {
        headers: {
          "Client-IP": ipResponse.data,
        },
      });

      const region = response.data.regionName || "Niamey";
      const country = response.data.country || "Niger";

      try {
        const zoneResponse = await axios.get(`${API_URL}/api/shipping2/zones/search`, {
          params: { q: region, limit: 1 },
        });

        if (zoneResponse.data.success && zoneResponse?.data?.data?.length > 0) {
          setSelectedZone(zoneResponse.data.data[0]);
          return;
        }

        // Fallback: chercher par pays
        const countryResponse = await axios.get(`${API_URL}/api/shipping2/zones/search`, {
          params: { q: country, limit: 1 },
        });

        if (countryResponse.data.success && countryResponse?.data?.data?.length > 0) {
          setSelectedZone(countryResponse.data.data[0]);
        }
      } catch (zoneError) {
        console.warn("Échec de la détection de zone automatique:", zoneError);
      }
    } catch (error) {
      console.error("Erreur lors de la détection de zone:", error);
    }
  }, []);

  // Récupérer les zones d'expédition
  const fetchShippingZones = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/shipping2/zones`);
      if (response.data.success) {
        setShippingZones(response.data.zones);
      }
    } catch (error) {
      console.error('Erreur zones expédition:', error);
    }
  }, []);

  // Regrouper les articles par boutique (similaire à la version web)
  const groupedByStore = useMemo(() => {
    const storeGroups = {};

    articles?.forEach((item) => {
      const storeId = item.Clefournisseur?._id || "unknown";
      const storeName = item.Clefournisseur?.storeName || item.Clefournisseur?.name || "Boutique inconnue";
      const productId = item._id;

      // Créer le groupe boutique s'il n'existe pas
      if (!storeGroups[storeId]) {
        storeGroups[storeId] = {
          storeId,
          storeName,
          storeInfo: item.Clefournisseur || {},
          products: {},
          totalWeight: 0,
          totalValue: 0,
          shippingCost: 0,
          isAvailable: true,
        };
      }

      // Créer le groupe produit s'il n'existe pas
      if (!storeGroups[storeId].products[productId]) {
        storeGroups[storeId].products[productId] = {
          productId,
          name: item.name,
          imageUrl: item.image1 || item.imageUrl || '/placeholder-image.svg',
          variants: [],
          totalQuantity: 0,
          totalValue: 0,
          totalWeight: 0,
        };
      }

      const quantity = item.quantite || 0;

      // Ajouter la variante au produit
      storeGroups[storeId].products[productId].variants.push(item);
      storeGroups[storeId].products[productId].totalQuantity += quantity;

      // Calculer le prix de cette variante
      const variantPrice = (item.prixPromo || item.prix || 0);
      const variantTotalPrice = variantPrice * quantity;

      storeGroups[storeId].products[productId].totalValue += variantTotalPrice;

      // Calculer le poids (estimation basée sur les dimensions ou poids par défaut)
      const estimatedWeight = (item.poids || 0.5) * quantity;
      storeGroups[storeId].products[productId].totalWeight += estimatedWeight;
      storeGroups[storeId].totalWeight += estimatedWeight;
    });

    return storeGroups;
  }, [articles]);

  // Convertir en tableau pour le rendu
  const storeGroupsArray = useMemo(() => Object.values(groupedByStore), [groupedByStore]);

  // Calculer les frais d'expédition pour une boutique
  const calculateShippingForStore = useCallback(async (storeId, storeInfo, totalWeight, customerZoneId) => {
    try {
      const response = await axios.post(`${API_URL}/api/shipping2/calculate`, {
        sellerId: storeId,
        customerZoneId: customerZoneId,
        weight: totalWeight
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.data) {
        return {
          success: true,
          fixedCost: response.data.data.fixedCost || 0,
          weightCost: response.data.data.weightCost || (response.data.data.costPerKg || 250) * totalWeight,
          costPerKg: response.data.data.costPerKg || 250,
          totalCost: response.data.data.totalCost || 0,
          appliedPolicy: response.data.data.appliedPolicy || { zone: 'API Response', type: 'calculated' }
        };
      }

      throw new Error('Réponse API invalide ou incomplète');

    } catch (err) {
      console.warn(`Erreur API boutique ${storeId}, utilisation du fallback:`, err);

      // Si l'API échoue, utiliser l'ancien système comme fallback
      return {
        success: false,
        fixedCost: 1000,
        costPerKg: 250,
        weightCost: 250 * totalWeight,
        totalCost: 1000 + (250 * totalWeight),
        appliedPolicy: {
          zone: 'Politique par défaut',
          type: 'fallback'
        }
      };
    }
  }, []);

  // Calculer les frais d'expédition pour toutes les boutiques
  const calculateAllShipping = useCallback(async (grouped, customerZone) => {
    if (!customerZone) {
      console.warn('Aucune zone cliente fournie pour le calcul d\'expédition');
      return;
    }

    setLoading(true);
    const calculations = {};
    const unavailable = new Set();

    // Traitement séquentiel pour éviter la surcharge du serveur
    for (const [storeId, storeGroup] of Object.entries(grouped)) {
      try {
        const shippingResult = await calculateShippingForStore(
          storeId,
          storeGroup.storeInfo,
          storeGroup.totalWeight,
          customerZone._id
        );

        calculations[storeId] = shippingResult;

        // Si le calcul échoue complètement (coût = 0), marquer les produits comme indisponibles
        if (shippingResult.totalCost === 0) {
          Object.keys(storeGroup.products).forEach(productId => {
            unavailable.add(`${storeId}-${productId}`);
          });
        }
      } catch (error) {
        console.error(`Erreur critique pour la boutique ${storeGroup.storeName}:`, error);

        // Créer un calcul de fallback même en cas d'erreur critique
        calculations[storeId] = {
          success: false,
          fixedCost: 1000,
          costPerKg: 250,
          weightCost: 250 * storeGroup.totalWeight,
          totalCost: 1000 + (250 * storeGroup.totalWeight),
          appliedPolicy: {
            zone: 'Erreur critique - Politique par défaut',
            type: 'emergency-fallback'
          }
        };

        // Marquer tous les produits de cette boutique comme indisponibles
        Object.keys(storeGroup.products).forEach(productId => {
          unavailable.add(`${storeId}-${productId}`);
        });
      }
    }

    setShippingCalculations(calculations);
    setUnavailableProducts(unavailable);
    setShippingCalculated(true);
    setLoading(false);

    // Sauvegarder pour le checkout
    await AsyncStorage.setItem('shippingDetails', JSON.stringify({
      zone: customerZone,
      calculations,
    }));
  }, [calculateShippingForStore]);

  // Recalculer quand la zone change
  useEffect(() => {
    if (selectedZone && Object.keys(groupedByStore)?.length > 0) {
      calculateAllShipping(groupedByStore, selectedZone);
    }
  }, [selectedZone, groupedByStore, calculateAllShipping]);

  // Calculer le sous-total
  const subtotal = useMemo(() => {
    return articles?.reduce((sum, item) => {
      const price = item.prixPromo > 0
        ? item.prixPromo
        : item.prix;
      return sum + (price * item.quantite);
    }, 0);
  }, [articles]);

  // Calculer le total des frais d'expédition
  const totalShippingFee = useMemo(() => {
    return Object.values(shippingCalculations).reduce((total, calc) => {
      return total + (calc.totalCost || 0);
    }, 0);
  }, [shippingCalculations]);

  // Calculer le total
  const total = useMemo(() => {
    return subtotal - reduction + totalShippingFee;
  }, [subtotal, reduction, totalShippingFee]);

  // Toggle expansion boutique
  const toggleStoreExpansion = useCallback((storeId) => {
    setExpandedStores((prev) => ({
      ...prev,
      [storeId]: !prev[storeId],
    }));
  }, []);

  // Toggle expansion produit
  const toggleProductExpansion = useCallback((storeId, productId) => {
    const key = `${storeId}-${productId}`;
    setExpandedProducts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Obtenir le stock disponible d'un article
  const getAvailableStock = useCallback((item) => {
    // Si on a un stock de variante spécifique sauvegardé
    if (item.stockVariante !== undefined) {
      return item.stockVariante;
    }

    // Si l'article a des variantes dans ses données originales
    if (item.variants && item.variants?.length > 0) {
      // Trouver la variante correspondant à la couleur sélectionnée
      const variant = item.variants.find((v) =>
        v.color === item.color
      );
      return variant ? (variant.quantite || variant.stock || 0) : 0;
    }

    // Pour les produits sans variantes, utiliser le stock général du produit
    return item.quantite || item.stock || item.quantity_in_stock || 10;
  }, []);

  // Modifier quantité
  const handleUpdateQuantity = useCallback((item, newQuantity) => {
    const availableStock = getAvailableStock(item);
    const finalQuantity = Math.max(1, Math.min(availableStock, newQuantity));

    dispatch(updateArticleQuantity(
      item.id,
      item.color,
      item.taille,
      finalQuantity
    ));
  }, [dispatch, getAvailableStock]);

  // Supprimer article
  const handleRemoveItem = useCallback((item) => {
    Alert.alert(
      'Supprimer l\'article',
      'Voulez-vous vraiment supprimer cet article du panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteArticlePanier(
              item.id,
              item.color,
              item.taille
            ));
          },
        },
      ]
    );
  }, [dispatch]);

  // AJOUT: Fonction pour supprimer un groupe de produits complet
  const handleRemoveProductGroup = useCallback((storeId, productId) => {
    Alert.alert(
      'Supprimer le produit',
      'Voulez-vous vraiment supprimer toutes les variantes de ce produit du panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Trouver tous les articles correspondants et les supprimer un par un
            const itemsToDelete = articles.filter(
              (item) => item.Clefournisseur?._id === storeId && item._id === productId
            );
            itemsToDelete.forEach(item => {
              dispatch(deleteArticlePanier(item.id, item.color, item.taille));
            });
          },
        },
      ]
    );
  }, [dispatch, articles]);

  // Vider le panier
  const handleClearCart = useCallback(() => {
    Alert.alert(
      'Vider le panier',
      'Voulez-vous vraiment vider tout le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => dispatch(clearPanierData()),
        },
      ]
    );
  }, [dispatch]);

  // Appliquer code promo (nouveau système V2)
  const handleApplyPromo = useCallback(async () => {
    if (!codePromo.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code promo');
      return;
    }

    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour utiliser un code promo',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'checkout',
              returnScreen: 'Cart',
            }),
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // Récupérer les IDs produits du panier
      const productIds = articles?.map(item => item._id).filter(Boolean) || [];

      const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
        code: codePromo,
        orderAmount: subtotal,
        userId: user.id || user._id,
        products: productIds,
      });

      if (response.data.valid) {
        const { discount, finalAmount, promoCode } = response.data;

        if (!appliedPromo || appliedPromo.code !== promoCode.code) {
          setReduction(discount);
          setAppliedPromo({
            _id: promoCode.id,
            code: promoCode.code,
            type: promoCode.type,
            value: promoCode.value,
            description: promoCode.description,
            discount,
            finalAmount,
            isValide: true,
          });
          Alert.alert('Succès', `Code promo appliqué ! Réduction de ${formatPrice(discount)} CFA`);
        } else {
          Alert.alert('Information', 'Ce code promo est déjà appliqué.');
        }
      } else {
        Alert.alert('Erreur', response.data.message || 'Code promo invalide');
        setReduction(0);
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error?.response?.data?.message || "Ce code promo n'existe pas";
      Alert.alert('Erreur', errorMessage);
      setReduction(0);
      setAppliedPromo(null);
    } finally {
      setLoading(false);
    }
  }, [codePromo, user, subtotal, appliedPromo, navigation, articles]);

  // Auto-recalculer la réduction quand le sous-total change (ex: modification de quantité)
  useEffect(() => {
    const autoRecalculate = async () => {
      if (!appliedPromo || !user || subtotal <= 0) return;
      try {
        const productIds = articles?.map(item => item._id).filter(Boolean) || [];
        const response = await axios.post(`${API_URL}/api/promocodes/validate`, {
          code: appliedPromo.code,
          orderAmount: subtotal,
          userId: user.id || user._id,
          products: productIds,
        });
        if (response.data.valid) {
          const { discount, finalAmount, promoCode } = response.data;
          setReduction(discount);
          setAppliedPromo(prev => ({ ...prev, discount, finalAmount }));
        } else {
          // Code devenu invalide (ex: quota atteint entre-temps)
          setReduction(0);
          setAppliedPromo(null);
          setCodePromo('');
        }
      } catch (e) {
        // Ignorer silencieusement
      }
    };
    autoRecalculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(loadCart());
    setRefreshing(false);
  }, [dispatch]);

  // Procéder au paiement
  const handleCheckout = useCallback(() => {
    // Vérifier la zone de livraison
    if (!selectedZone) {
      Alert.alert(
        'Zone de livraison requise',
        'Veuillez sélectionner votre zone de livraison pour continuer',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier que les calculs d'expédition sont terminés (si des articles existent)
    if (Object.keys(groupedByStore).length > 0 && Object.keys(shippingCalculations).length === 0) {
      Alert.alert(
        'Calcul en cours',
        'Veuillez patienter pendant le calcul des frais d\'expédition',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier la connexion
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour passer commande',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('QuickAuth', {
              pendingAction: 'checkout',
              returnScreen: 'Cart',
            }),
          },
        ]
      );
      return;
    }

    // Vérifier le panier
    if (articles?.length === 0) {
      Alert.alert('Panier vide', 'Votre panier est vide');
      return;
    }

    // Navigation vers le checkout
    navigation.navigate('Checkout', {
      subtotal,
      reduction,
      shippingFee: totalShippingFee,
      total,
      selectedZone,
      appliedPromo,
      shippingCalculations,
      groupedByStore,
    });
  }, [user, articles, selectedZone, shippingCalculations, groupedByStore, subtotal, reduction, totalShippingFee, total, appliedPromo, navigation]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: variante individuelle (Temu-style)
  // ─────────────────────────────────────────────────────────────
  const renderVariant = useCallback((item, index, storeId, productId) => {
    const isUnavailable = unavailableProducts.has(`${storeId}-${productId}`);
    const availableStock = getAvailableStock(item);
    const price = item.prixPromo > 0 ? item.prixPromo : item.prix;
    const hasPromo = item.prixPromo > 0;

    return (
      <View
        key={`${item._id}-${index}`}
        style={[styles.variantRow, isUnavailable && styles.variantRowUnavailable]}
      >
        {/* Thumbnail rond */}
        <View style={styles.variantImageWrap}>
          {item.colorImage || item.image1 ? (
            <Image
              source={{ uri: item.colorImage || item.image1 }}
              style={styles.variantThumb}
            />
          ) : (
            <View style={[styles.variantThumb, styles.variantThumbPlaceholder]}>
              <Ionicons name="image-outline" size={22} color="#ccc" />
            </View>
          )}
          {isUnavailable && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableOverlayText}>Indisponible</Text>
            </View>
          )}
        </View>

        {/* Infos centre */}
        <View style={styles.variantBody}>
          {/* Tags couleur / taille */}
          <View style={styles.variantTagRow}>
            {item.color && (
              <View style={styles.variantChip}>
                <Text style={styles.variantChipText}>{item.color}</Text>
              </View>
            )}
            {item.taille && (
              <View style={styles.variantChip}>
                <Text style={styles.variantChipText}>{item.taille}</Text>
              </View>
            )}
          </View>

          {/* Prix */}
          <View style={styles.variantPriceRow}>
            <Text style={styles.variantPriceMain}>
              {formatPrice(price)} CFA
            </Text>
            {hasPromo && (
              <Text style={styles.variantPriceOld}>
                {formatPrice(item.prix)} CFA
              </Text>
            )}
          </View>

          {/* Stepper quantité */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, item.quantite <= 1 && styles.stepperBtnDisabled]}
              onPress={() => handleUpdateQuantity(item, item.quantite - 1)}
              activeOpacity={0.7}
              disabled={item.quantite <= 1}
            >
              <Ionicons
                name="remove"
                size={15}
                color={item.quantite <= 1 ? '#ccc' : COLORS.primary}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{item.quantite}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, item.quantite >= availableStock && styles.stepperBtnDisabled]}
              onPress={() => handleUpdateQuantity(item, item.quantite + 1)}
              activeOpacity={0.7}
              disabled={item.quantite >= availableStock}
            >
              <Ionicons
                name="add"
                size={15}
                color={item.quantite >= availableStock ? '#ccc' : COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton supprimer */}
        <TouchableOpacity
          style={styles.variantDeleteBtn}
          onPress={() => handleRemoveItem(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }, [unavailableProducts, getAvailableStock, handleUpdateQuantity, handleRemoveItem]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: groupe produit (toujours visible, pas d'accordion)
  // ─────────────────────────────────────────────────────────────
  const renderProduct = useCallback((product, storeId) => {
    const key = `${storeId}-${product.productId}`;
    const isUnavailable = unavailableProducts.has(key);

    return (
      <View key={product.productId} style={styles.productCard}>
        {/* En-tête produit */}
        <View style={styles.productHeader}>
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.productThumb}
          />
          <View style={styles.productHeaderInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productSubtitle}>
              {product.variants?.length} variante{product.variants?.length > 1 ? 's' : ''} · {product.totalWeight.toFixed(2)} kg
            </Text>
            {isUnavailable && (
              <View style={styles.unavailablePill}>
                <Ionicons name="warning-outline" size={12} color="#EF4444" />
                <Text style={styles.unavailablePillText}>Non livrable</Text>
              </View>
            )}
          </View>
          <View style={styles.productHeaderRight}>
            <Text style={styles.productTotalPrice}>{formatPrice(product.totalValue)} CFA</Text>
            <TouchableOpacity
              style={styles.productDeleteBtn}
              onPress={() => handleRemoveProductGroup(storeId, product.productId)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Variantes toujours visibles */}
        <View style={styles.productVariantsList}>
          {product.variants?.map((item, index) =>
            renderVariant(item, index, storeId, product.productId)
          )}
        </View>
      </View>
    );
  }, [unavailableProducts, renderVariant, handleRemoveProductGroup]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: groupe boutique (toujours déployé, pas d'accordion)
  // ─────────────────────────────────────────────────────────────
  const renderStoreGroup = useCallback((storeGroup) => {
    const shippingCalc = shippingCalculations[storeGroup.storeId];
    const hasUnavailableProducts = Object.keys(storeGroup.products).some(productId =>
      unavailableProducts.has(`${storeGroup.storeId}-${productId}`)
    );

    return (
      <View key={storeGroup.storeId} style={styles.storeCard}>
        {/* En-tête boutique */}
        <LinearGradient
          colors={['#F0FAF8', '#FFFFFF']}
          style={[styles.storeHeader, hasUnavailableProducts && styles.storeHeaderWarning]}
        >
          {/* Logo boutique */}
          <View style={styles.storeLogoWrap}>
            {storeGroup.storeInfo.logo ? (
              <Image source={{ uri: storeGroup.storeInfo.logo }} style={styles.storeLogo} />
            ) : (
              <LinearGradient
                colors={[COLORS.primary, '#1D7A6A']}
                style={styles.storeLogoFallback}
              >
                <Ionicons name="storefront" size={20} color="#fff" />
              </LinearGradient>
            )}
          </View>

          {/* Nom + badge vérifié */}
          <View style={styles.storeHeaderInfo}>
            <View style={styles.storeNameRow}>
              <Text style={styles.storeName} numberOfLines={1}>
                {storeGroup.storeName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.verifiedText}>Vérifié</Text>
              </View>
            </View>
            <Text style={styles.storeSubtitle}>
              {Object.keys(storeGroup.products).length} produit(s) · {storeGroup.totalWeight.toFixed(2)} kg
            </Text>
            {storeGroup.storeInfo.city && (
              <Text style={styles.storeLocation}>
                <Ionicons name="location-outline" size={11} color={COLORS.secondary} />
                {' '}{storeGroup.storeInfo.city}{storeGroup.storeInfo.region ? `, ${storeGroup.storeInfo.region}` : ''}
              </Text>
            )}
          </View>

          {/* Frais de livraison boutique */}
          <View style={styles.storeShippingBadge}>
            {shippingCalc ? (
              <>
                <Ionicons name="bicycle-outline" size={14} color={COLORS.primary} />
                <Text style={styles.storeShippingCost}>
                  {formatPrice(shippingCalc.totalCost)} CFA
                </Text>
              </>
            ) : loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="time-outline" size={14} color={COLORS.secondary} />
            )}
          </View>
        </LinearGradient>

        {/* Alerte livraison limitée */}
        {hasUnavailableProducts && (
          <View style={styles.storeWarningBanner}>
            <Ionicons name="warning" size={14} color="#EF4444" />
            <Text style={styles.storeWarningText}>
              Certains produits ne sont pas livrables dans votre zone
            </Text>
          </View>
        )}

        {/* Détails expédition (si calculés) */}
        {shippingCalc && (
          <View style={styles.shippingDetailsCard}>
            <View style={styles.shippingDetailsRow}>
              <View style={styles.shippingDetailsItem}>
                <Text style={styles.shippingDetailsLabel}>Coût fixe</Text>
                <Text style={styles.shippingDetailsValue}>{formatPrice(shippingCalc.fixedCost || 0)} CFA</Text>
              </View>
              <View style={styles.shippingDetailsDivider} />
              <View style={styles.shippingDetailsItem}>
                <Text style={styles.shippingDetailsLabel}>Coût poids</Text>
                <Text style={styles.shippingDetailsValue}>
                  {formatPrice(shippingCalc.weightCost || (shippingCalc.costPerKg || 0) * storeGroup.totalWeight)} CFA
                </Text>
              </View>
              <View style={styles.shippingDetailsDivider} />
              <View style={styles.shippingDetailsItem}>
                <Text style={styles.shippingDetailsLabel}>Politique</Text>
                <Text style={[styles.shippingDetailsValue, styles.shippingDetailsPolicyText]} numberOfLines={1}>
                  {shippingCalc.appliedPolicy?.zone || 'Défaut'}
                </Text>
              </View>
            </View>
            {!shippingCalc.success && (
              <View style={styles.shippingFallbackBanner}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.secondary} />
                <Text style={styles.shippingFallbackText}>Tarif par défaut appliqué</Text>
              </View>
            )}
          </View>
        )}

        {/* Produits */}
        <View style={styles.storeProductsList}>
          {Object.values(storeGroup.products).map((product) =>
            renderProduct(product, storeGroup.storeId)
          )}
        </View>
      </View>
    );
  }, [shippingCalculations, unavailableProducts, renderProduct, loading]);

  // ─────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────
  if (articles?.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#30A08B', '#1D7A6A']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerInner}>
            <Text style={styles.headerTitle}>Mon Panier</Text>
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <LinearGradient
              colors={['rgba(48,160,139,0.12)', 'rgba(48,160,139,0.04)']}
              style={styles.emptyIllustrationGradient}
            >
              <Ionicons name="cart-outline" size={88} color={COLORS.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySubtitle}>
            Parcourez nos boutiques et ajoutez{'\n'}vos articles préférés
          </Text>
          <TouchableOpacity
            style={styles.emptyShopBtn}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#30A08B', '#1D7A6A']}
              style={styles.emptyShopBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={styles.emptyShopBtnText}>Continuer mes achats</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#30A08B', '#1D7A6A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Mon Panier</Text>
            <View style={styles.headerCountBadge}>
              <Text style={styles.headerCountText}>{articles?.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerClearBtn}
            onPress={handleClearCart}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.headerClearText}>Vider</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── SCROLL ── */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── ZONE DE LIVRAISON ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={styles.sectionIconDot}>
                  <Ionicons name="location" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Zone de livraison</Text>
              </View>
              {selectedZone && (
                <View style={styles.zonePill}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} />
                  <Text style={styles.zonePillText}>Détectée</Text>
                </View>
              )}
            </View>

            <ZoneSelector
              selectedZone={selectedZone}
              onSelect={setSelectedZone}
              placeholder="Rechercher et sélectionner votre zone..."
            />

            {selectedZone ? (
              <View style={styles.zoneSelectedRow}>
                <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} />
                <Text style={styles.zoneSelectedText}>
                  Livraison vers :{' '}
                  <Text style={styles.zoneSelectedBold}>
                    {selectedZone.fullPath || selectedZone.name}
                  </Text>
                </Text>
              </View>
            ) : (
              <View style={styles.zoneWarningRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#B17236" />
                <Text style={styles.zoneWarningText}>
                  Sélectionnez votre zone pour voir les frais d'expédition
                </Text>
              </View>
            )}
          </View>

          {/* ── ARTICLES GROUPÉS PAR BOUTIQUE ── */}
          <View style={styles.sectionPadded}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: COLORS.secondary }]}>
                  <Ionicons name="bag" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>
                  Articles{' '}
                  <Text style={styles.sectionCount}>({articles?.length})</Text>
                </Text>
              </View>
            </View>
            {storeGroupsArray?.map(renderStoreGroup)}
          </View>

          {/* ── CODE PROMO ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: '#B2905F' }]}>
                  <Ionicons name="pricetag" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Code promo</Text>
              </View>
            </View>

            {!appliedPromo ? (
              <View style={styles.promoInputRow}>
                <View style={styles.promoInputWrap}>
                  <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.promoInput}
                    placeholder="Ex: BIENVENUE20"
                    placeholderTextColor="#bbb"
                    value={codePromo}
                    onChangeText={(text) => setCodePromo(text.toUpperCase().replace(/\s/g, ''))}
                    editable={!appliedPromo}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={styles.promoApplyBtn}
                  onPress={handleApplyPromo}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#30A08B', '#1D7A6A']}
                    style={styles.promoApplyBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.promoApplyBtnText}>Appliquer</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promoAppliedCard}>
                <View style={styles.promoAppliedLeft}>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.promoAppliedCode}>{appliedPromo.code}</Text>
                    <Text style={styles.promoAppliedDesc}>
                      {appliedPromo.type === 'percentage'
                        ? `-${appliedPromo.value}% de réduction`
                        : `-${formatPrice(appliedPromo.value)} CFA fixe`}
                    </Text>
                    {appliedPromo.description && (
                      <Text style={styles.promoAppliedNote}>{appliedPromo.description}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => { setAppliedPromo(null); setReduction(0); setCodePromo(''); }}
                  style={styles.promoRemoveBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── RÉSUMÉ COMMANDE ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.sectionIconDot, { backgroundColor: '#30A08B' }]}>
                  <Ionicons name="receipt" size={14} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>Résumé de la commande</Text>
              </View>
            </View>

            {/* Sous-total */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{formatPrice(subtotal)} CFA</Text>
            </View>

            {/* Réduction */}
            {reduction > 0 && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryDiscountLabel}>
                  <Ionicons name="pricetag" size={14} color="#22C55E" />
                  <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>Réduction</Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
                  -{formatPrice(reduction)} CFA
                </Text>
              </View>
            )}

            {/* Détail livraison par boutique */}
            {Object.keys(shippingCalculations).length > 0 && (
              <View style={styles.shippingBreakdown}>
                <Text style={styles.shippingBreakdownTitle}>Frais d'expédition</Text>
                {Object.entries(shippingCalculations).map(([storeId, calc]) => {
                  const store = groupedByStore[storeId];
                  return (
                    <View key={storeId} style={styles.shippingBreakdownRow}>
                      <Text style={styles.shippingBreakdownStore} numberOfLines={1}>
                        {store?.storeName}
                      </Text>
                      <Text style={styles.shippingBreakdownCost}>
                        {formatPrice(calc.totalCost)} CFA
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.shippingBreakdownTotal}>
                  <Text style={styles.shippingBreakdownTotalLabel}>Total livraison</Text>
                  <Text style={styles.shippingBreakdownTotalValue}>
                    {formatPrice(totalShippingFee)} CFA
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.summaryDivider} />

            {/* TOTAL */}
            <View style={styles.summaryTotalRow}>
              <Text style={styles.summaryTotalLabel}>TOTAL</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(total)} CFA</Text>
            </View>

            {/* Info articles / boutiques */}
            <View style={styles.summaryMeta}>
              <Ionicons name="information-circle-outline" size={14} color="#aaa" />
              <Text style={styles.summaryMetaText}>
                {articles.length} article{articles.length > 1 ? 's' : ''} · {Object.keys(groupedByStore).length} boutique{Object.keys(groupedByStore).length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* ── BARRE COMMANDER (sticky bas) ── */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutBarSummary}>
          <Text style={styles.checkoutBarLabel}>Total</Text>
          <Text style={styles.checkoutBarTotal}>{formatPrice(total)} CFA</Text>
        </View>

        {!selectedZone ? (
          <View style={[styles.checkoutBarBtn, styles.checkoutBarBtnDisabled]}>
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={styles.checkoutBarBtnText}>Choisir une zone</Text>
          </View>
        ) : loading || (Object.keys(groupedByStore).length > 0 && Object.keys(shippingCalculations).length === 0) ? (
          <View style={[styles.checkoutBarBtn, styles.checkoutBarBtnDisabled]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.checkoutBarBtnText}>Calcul en cours...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.checkoutBarBtn}
            onPress={handleCheckout}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#30A08B', '#1D7A6A']}
              style={styles.checkoutBarBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.checkoutBarBtnText}>Commander</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  // ── Conteneur global ──
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },

  // ── Header gradient teal ──
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  headerCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  headerClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerClearText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ── Sections ──
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionPadded: {
    marginHorizontal: 14,
    marginTop: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#30A08B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },

  // ── Zone de livraison ──
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48,160,139,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zonePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#30A08B',
  },
  zoneSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(48,160,139,0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  zoneSelectedText: {
    flex: 1,
    fontSize: 13,
    color: '#30A08B',
  },
  zoneSelectedBold: {
    fontWeight: '700',
  },
  zoneWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(177,114,54,0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  zoneWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#B17236',
  },

  // ── Boutique card ──
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  storeHeaderWarning: {
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  storeLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(48,160,139,0.2)',
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  storeLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(48,160,139,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#30A08B',
  },
  storeSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  storeLocation: {
    fontSize: 11,
    color: '#B2905F',
    marginTop: 1,
  },
  storeShippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48,160,139,0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  storeShippingCost: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30A08B',
  },
  storeWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.1)',
  },
  storeWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
  },

  // ── Détails expédition (dans store card) ──
  shippingDetailsCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(48,160,139,0.05)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(48,160,139,0.12)',
  },
  shippingDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shippingDetailsItem: {
    alignItems: 'center',
    flex: 1,
  },
  shippingDetailsDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(48,160,139,0.15)',
  },
  shippingDetailsLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  shippingDetailsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  shippingDetailsPolicyText: {
    fontSize: 11,
    color: '#30A08B',
  },
  shippingFallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  shippingFallbackText: {
    fontSize: 11,
    color: '#B2905F',
    fontStyle: 'italic',
  },

  // ── Products list ──
  storeProductsList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 8,
  },

  // ── Product card ──
  productCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  productHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 18,
  },
  productSubtitle: {
    fontSize: 11,
    color: '#aaa',
  },
  unavailablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  unavailablePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  productHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  productTotalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  productDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productVariantsList: {
    gap: 0,
  },

  // ── Variant row ──
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    backgroundColor: '#fff',
    gap: 10,
  },
  variantRowUnavailable: {
    opacity: 0.45,
  },
  variantImageWrap: {
    position: 'relative',
  },
  variantThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eee',
  },
  variantThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  unavailableOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239,68,68,0.8)',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    alignItems: 'center',
    paddingVertical: 2,
  },
  unavailableOverlayText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '700',
  },
  variantBody: {
    flex: 1,
    gap: 5,
  },
  variantTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  variantChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  variantChipText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  variantPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variantPriceMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.2,
  },
  variantPriceOld: {
    fontSize: 12,
    color: '#bbb',
    textDecorationLine: 'line-through',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 30,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F9FAFB',
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 28,
    textAlign: 'center',
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
    lineHeight: 28,
  },
  variantDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // ── Code promo ──
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  promoInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  promoApplyBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  promoApplyBtnGradient: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 95,
  },
  promoApplyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  promoAppliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48,160,139,0.07)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(48,160,139,0.2)',
  },
  promoAppliedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoAppliedCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  promoAppliedDesc: {
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
    marginTop: 1,
  },
  promoAppliedNote: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  promoRemoveBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // ── Résumé ──
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  summaryDiscountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  shippingBreakdown: {
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    gap: 5,
  },
  shippingBreakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 4,
  },
  shippingBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shippingBreakdownStore: {
    flex: 1,
    fontSize: 12,
    color: '#888',
    marginRight: 10,
  },
  shippingBreakdownCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  shippingBreakdownTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 5,
    paddingTop: 5,
  },
  shippingBreakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
  },
  shippingBreakdownTotalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#30A08B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryTotalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#30A08B',
    letterSpacing: 0.3,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  summaryMetaText: {
    fontSize: 12,
    color: '#aaa',
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  emptyIllustration: {
    marginBottom: 28,
  },
  emptyIllustrationGradient: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyShopBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyShopBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 28,
  },
  emptyShopBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Checkout bar sticky ──
  checkoutBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
    gap: 10,
  },
  checkoutBarSummary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  checkoutBarLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  checkoutBarTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#30A08B',
    letterSpacing: 0.3,
  },
  checkoutBarBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 52,
  },
  checkoutBarBtnDisabled: {
    backgroundColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  checkoutBarBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  checkoutBarBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
