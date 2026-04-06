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
              console.warn('Erreur lors de l’auto-validation du code promo:', err);
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

  // Render variante de produit (AMÉLIORÉ - style web)
  const renderVariant = useCallback((item, index, storeId, productId) => {
    const isUnavailable = unavailableProducts.has(`${storeId}-${productId}`);
    const availableStock = getAvailableStock(item);
    const price = item.prixPromo > 0 
      ? item.prixPromo 
      : item.prix;
    const hasPromo = item.prixPromo > 0;

    return (
      <View key={`${item._id}-${index}`} style={[
        styles.variantRow, 
        isUnavailable && styles.variantRowUnavailable
      ]}>
        {/* Image et détails */}
        <View style={styles.variantMainInfo}>
          {item.colorImage || item.image1 ? (
            <Image 
              source={{ uri: item.colorImage || item.image1 }} 
              style={styles.variantThumbnail} 
            />
          ) : (
            <View style={[styles.variantThumbnail, styles.placeholderThumbnail]}>
              <Ionicons name="image-outline" size={20} color={COLORS.textLighter} />
            </View>
          )}
          
          <View style={styles.variantInfo}>
            {/* Tags couleur et taille */}
            <View style={styles.variantTags}>
              {item.color && (
                <View style={styles.variantTag}>
                  <Text style={styles.variantTagText}>{item.color}</Text>
                </View>
              )}
              {item.taille && (
                <View style={styles.variantTag}>
                  <Text style={styles.variantTagText}>{item.taille}</Text>
                </View>
              )}
              {isUnavailable && (
                <View style={styles.unavailableTag}>
                  <Text style={styles.unavailableTagText}>Non disponible</Text>
                </View>
              )}
            </View>

            {/* Prix */}
            <View style={styles.variantPrices}>
              {hasPromo && (
                <Text style={styles.variantOldPrice} numberOfLines={1}>{formatPrice(item.prix)} CFA</Text>
              )}
              <Text style={[styles.variantPrice, hasPromo && styles.variantPromoPrice]} numberOfLines={1}>
                {formatPrice(price)} CFA
              </Text>
            </View>
          </View>
        </View>

        {/* Contrôles */}
        <View style={styles.variantControls}>
          <View style={styles.quantityControlsCompact}>
            <TouchableOpacity
              style={[
                styles.quantityBtnCompact,
                item.quantite <= 1 && styles.quantityBtnDisabled
              ]}
              onPress={() => handleUpdateQuantity(item, item.quantite - 1)}
              activeOpacity={0.7}
              disabled={item.quantite <= 1}
            >
              <Ionicons 
                name="remove" 
                size={16} 
                color={item.quantite <= 1 ? COLORS.border : COLORS.primary} 
              />
            </TouchableOpacity>
            
            <Text style={styles.quantityValue}>{item.quantite}</Text>
            
            <TouchableOpacity
              style={[
                styles.quantityBtnCompact,
                item.quantite >= availableStock && styles.quantityBtnDisabled
              ]}
              onPress={() => handleUpdateQuantity(item, item.quantite + 1)}
              activeOpacity={0.7}
              disabled={item.quantite >= availableStock}
            >
              <Ionicons 
                name="add" 
                size={16} 
                color={item.quantite >= availableStock ? COLORS.border : COLORS.primary} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.stockIndicator}>Stock: {availableStock}</Text>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleRemoveItem(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [unavailableProducts, getAvailableStock, formatPrice, handleUpdateQuantity, handleRemoveItem]);

  // Render groupe produit (MODIFIÉ)
  const renderProduct = useCallback((product, storeId) => {
    const key = `${storeId}-${product.productId}`;
    const isExpanded = expandedProducts[key];
    const isUnavailable = unavailableProducts.has(key);

    return (
      <View key={product.productId} style={styles.productCard}>
        <TouchableOpacity
          style={styles.productHeader}
          onPress={() => toggleProductExpansion(storeId, product.productId)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.productMeta}>
              <Text style={styles.productVariants}>
                {product.variants?.length} variante{product.variants?.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.productWeight}>
                Poids: {product.totalWeight.toFixed(2)} kg
              </Text>
            </View>
            {isUnavailable && (
              <View style={styles.unavailableBadge}>
                <Ionicons name="warning-outline" size={14} color={COLORS.error} />
                <Text style={styles.unavailableBadgeText}>Non livrable</Text>
              </View>
            )}
          </View>

          <View style={styles.productPriceContainer}>
            <Text style={styles.productPrice}>{formatPrice(product.totalValue)} CFA</Text>
            <View style={styles.productHeaderActions}>
              {/* AJOUT: Bouton pour supprimer le produit complet */}
              <TouchableOpacity
                style={styles.deleteProductButton}
                onPress={() => handleRemoveProductGroup(storeId, product.productId)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textLight}
              />
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.variantsContainer}>
            {product.variants?.map((item, index) => 
              renderVariant(item, index, storeId, product.productId)
            )}
          </View>
        )}
      </View>
    );
  }, [expandedProducts, unavailableProducts, toggleProductExpansion, renderVariant, formatPrice, handleRemoveProductGroup]);

  // Render groupe boutique
  const renderStoreGroup = useCallback((storeGroup) => {
    const isExpanded = expandedStores[storeGroup.storeId];
    const shippingCalc = shippingCalculations[storeGroup.storeId];
    const hasUnavailableProducts = Object.keys(storeGroup.products).some(productId =>
      unavailableProducts.has(`${storeGroup.storeId}-${productId}`)
    );

    return (
      <View key={storeGroup.storeId} style={styles.storeCard}>
        <TouchableOpacity
          style={[
            styles.storeHeader,
            hasUnavailableProducts && styles.storeHeaderWarning
          ]}
          onPress={() => toggleStoreExpansion(storeGroup.storeId)}
          activeOpacity={0.8}
        >
          <View style={styles.storeInfo}>
            <View style={styles.storeIcon}>
              {storeGroup.storeInfo.logo ? (
                <Image
                  source={{ uri: storeGroup.storeInfo.logo }}
                  style={styles.storeLogo}
                />
              ) : (
                <Ionicons name="storefront-outline" size={24} color={COLORS.white} />
              )}
            </View>
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>{storeGroup.storeName}</Text>
              <Text style={styles.storeLocation}>
                {storeGroup.storeInfo.city || 'N/A'}, {storeGroup.storeInfo.region || 'N/A'}
              </Text>
              <View style={styles.storeMeta}>
                <Text style={styles.storeMetaText}>
                  {Object.keys(storeGroup.products)?.length} produit(s)
                </Text>
                <Text style={styles.storeMetaText}>•</Text>
                <Text style={styles.storeMetaText}>
                  {storeGroup.totalWeight.toFixed(2)} kg
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.storeRight}>
            {hasUnavailableProducts && (
              <View style={styles.storeWarningBadge}>
                <Ionicons name="warning-outline" size={14} color={COLORS.error} />
                <Text style={styles.storeWarningText}>Livraison limitée</Text>
              </View>
            )}
            
            {shippingCalc && (
              <View style={styles.shippingInfo}>
                <Text style={styles.shippingCost}>{formatPrice(shippingCalc.totalCost)} CFA</Text>
                <View style={styles.shippingLabel}>
                  <Ionicons name="car-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.shippingLabelText}>expédition</Text>
                </View>
              </View>
            )}
            
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textLight}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.storeContent}>
            {/* Informations d'expédition */}
            {shippingCalc && (
              <View style={styles.shippingDetailsCard}>
                <View style={styles.shippingDetailsHeader}>
                  <Text style={styles.shippingDetailsTitle}>Détails d'expédition</Text>
                  {shippingCalc.success ? (
                    <View style={styles.shippingStatusSuccess}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={styles.shippingStatusText}>Disponible</Text>
                    </View>
                  ) : (
                    <View style={styles.shippingStatusWarning}>
                      <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                      <Text style={styles.shippingStatusText}>Politique par défaut</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.shippingDetailsGrid}>
                  <View style={styles.shippingDetailItem}>
                    <Text style={styles.shippingDetailLabel}>Coût fixe:</Text>
                    <Text style={styles.shippingDetailValue}>
                      {formatPrice(shippingCalc.fixedCost || 0)} CFA
                    </Text>
                  </View>
                  <View style={styles.shippingDetailItem}>
                    <Text style={styles.shippingDetailLabel}>Coût poids:</Text>
                    <Text style={styles.shippingDetailValue}>
                      {formatPrice(
                        shippingCalc.weightCost || 
                        ((shippingCalc.costPerKg || 0) * storeGroup.totalWeight)
                      )} CFA
                    </Text>
                  </View>
                  <View style={[styles.shippingDetailItem, styles.shippingDetailFull]}>
                    <Text style={styles.shippingDetailLabel}>Politique appliquée:</Text>
                    <Text style={styles.shippingDetailValue}>
                      {shippingCalc.appliedPolicy?.zone || 'Zone par défaut'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {Object.values(storeGroup.products)?.map((product) =>
              renderProduct(product, storeGroup.storeId)
            )}
          </View>
        )}
      </View>
    );
  }, [expandedStores, shippingCalculations, unavailableProducts, toggleStoreExpansion, renderProduct, formatPrice]);

  // Empty state
  if (articles?.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.tertiary]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Mon Panier</Text>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={[COLORS.primary + '20', COLORS.tertiary + '20']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="cart-outline" size={80} color={COLORS.primary} />
            </LinearGradient>
          </View>
          
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>
            Découvrez nos produits et ajoutez-les à votre panier
          </Text>
          
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('MainTabs')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.tertiary]}
              style={styles.shopButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="storefront-outline" size={20} color={COLORS.white} />
              <Text style={styles.shopButtonText}>Découvrir les produits</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.tertiary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mon Panier</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{articles?.length}</Text>
          </View>
        </View>
        
        {articles?.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.white} />
            <Text style={styles.clearButtonText}>Vider</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

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
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Sélecteur de zone - maintenant dans le scroll */}
          <View style={styles.section}>
            <View style={styles.zoneSectionHeader}>
              <View style={styles.zoneTitleContainer}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Zone de livraison</Text>
              </View>
              {selectedZone && (
                <View style={styles.zoneSelectedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                  <Text style={styles.zoneSelectedBadgeText}>Sélectionné</Text>
                </View>
              )}
            </View>

            <ZoneSelector
              selectedZone={selectedZone}
              onSelect={setSelectedZone}
              placeholder="Rechercher et sélectionner votre zone..."
            />

            {selectedZone ? (
              <View style={styles.selectedZoneInfo}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.selectedZoneText}>
                  Livraison vers: <Text style={styles.selectedZoneTextBold}>{selectedZone.fullPath || selectedZone.name}</Text>
                </Text>
              </View>
            ) : (
              <View style={styles.zoneWarning}>
                <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
                <Text style={styles.zoneWarningText}>
                  Sélectionnez votre zone pour voir les frais d'expédition
                </Text>
              </View>
            )}
          </View>
      
          {/* Articles groupés par boutique */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Articles ({articles?.length})</Text>
            {storeGroupsArray?.map(renderStoreGroup)}
          </View>

          {/* Code promo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Code promo</Text>
            <View style={styles.promoCard}>
              <View style={styles.promoInputContainer}>
                <Ionicons name="pricetag" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.promoInput}
                  placeholder="EX: BIENVENUE20"
                  placeholderTextColor={COLORS.textLight}
                  value={codePromo}
                  onChangeText={(text) => setCodePromo(text.toUpperCase().replace(/\s/g, ''))}
                  editable={!appliedPromo}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              
              {!appliedPromo ? (
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApplyPromo}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.tertiary]}
                    style={styles.applyButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.applyButtonText}>Appliquer</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                  <View style={{ gap: 8 }}>
                  <View style={styles.promoApplied}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoAppliedText}>Code {appliedPromo.code} appliqué</Text>
                      <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '600' }}>
                        {appliedPromo.type === 'percentage'
                          ? `-${appliedPromo.value}% de réduction`
                          : `-${formatPrice(appliedPromo.value)} CFA fixe`}
                      </Text>
                      {appliedPromo.description && (
                         <Text style={{ fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' }}>
                           {appliedPromo.description}
                         </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setAppliedPromo(null);
                        setReduction(0);
                        setCodePromo('');
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Résumé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)} CFA</Text>
              </View>

              {reduction > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.success }]}>
                    Réduction
                  </Text>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    -{formatPrice(reduction)} CFA
                  </Text>
                </View>
              )}
              
              {/* Détail des frais d'expédition par boutique */}
              {Object.keys(shippingCalculations)?.length > 0 && (
                <View style={styles.shippingDetails}>
                  <Text style={styles.shippingDetailsTitle}>Frais d'expédition:</Text>
                  {Object.entries(shippingCalculations)?.map(([storeId, calc]) => {
                    const store = groupedByStore[storeId];
                    return (
                      <View key={storeId} style={styles.shippingDetailRow}>
                        <Text style={styles.shippingStoreName}>{store?.storeName}</Text>
                        <Text style={styles.shippingStoreCost}>
                          {formatPrice(calc.totalCost)} CFA
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.shippingTotalRow}>
                    <Text style={styles.shippingTotalLabel}>Total expédition</Text>
                    <Text style={styles.shippingTotalValue}>
                      {formatPrice(totalShippingFee)} CFA
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue} numberOfLines={1}>{formatPrice(total)} CFA</Text>
              </View>
              
              {/* Info sur le nombre d'articles */}
              <View style={styles.summaryInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={styles.summaryInfoText}>
                  {articles.length} article{articles.length > 1 ? 's' : ''} • {Object.keys(groupedByStore).length} boutique{Object.keys(groupedByStore).length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>

      {/* Bouton Commander - TOUJOURS VISIBLE */}
      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutSummary}>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <Text style={styles.checkoutTotalValue} numberOfLines={1}>{formatPrice(total)}\u00a0CFA</Text>
        </View>
        
        {!selectedZone ? (
          // Pas de zone sélectionnée
          <View style={[styles.checkoutButton, styles.checkoutButtonDisabled]}>
            <View style={styles.checkoutButtonDisabledContent}>
              <Ionicons name="location-outline" size={20} color={COLORS.white} />
              <Text style={styles.checkoutButtonText}>Sélectionner une zone</Text>
            </View>
          </View>
        ) : loading || (Object.keys(groupedByStore).length > 0 && Object.keys(shippingCalculations).length === 0) ? (
          // Calcul en cours
          <View style={[styles.checkoutButton, styles.checkoutButtonDisabled]}>
            <View style={styles.checkoutButtonDisabledContent}>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.checkoutButtonText}>Calcul en cours...</Text>
            </View>
          </View>
        ) : (
          // Bouton actif - Prêt à passer commande
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.tertiary]}
              style={styles.checkoutButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.checkoutButtonText}>Procéder au paiement</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Styles généraux ---
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Espace pour le bouton de paiement
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  
  // --- Styles pour le sélecteur de zone (dans le scroll) ---
  zoneSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  zoneTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoneSelectedBadgeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  selectedZoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  selectedZoneText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
  },
  selectedZoneTextBold: {
    fontWeight: '700',
  },
  zoneWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  zoneWarningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
  },
  
  // --- Styles pour les groupes de boutiques ---
  storeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  storeHeaderWarning: {
    backgroundColor: COLORS.error + '05',
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeIcon: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  storeLocation: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeMetaText: {
    fontSize: 12,
    color: COLORS.textLighter,
  },
  storeRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  storeWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  storeWarningText: {
    fontSize: 12,
    color: COLORS.error,
  },
  shippingInfo: {
    alignItems: 'flex-end',
  },
  shippingCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  shippingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shippingLabelText: {
    fontSize: 12,
    color: COLORS.textLighter,
  },
  storeContent: {
    padding: 16,
    paddingTop: 8,
  },
  
  // --- Styles pour les détails d'expédition ---
  shippingDetailsCard: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  shippingDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shippingDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shippingStatusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shippingStatusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shippingStatusText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  shippingDetailsGrid: {
    gap: 4,
  },
  shippingDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shippingDetailFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  shippingDetailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  shippingDetailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  
  // --- Styles pour les groupes de produits ---
  productCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productVariants: {
    fontSize: 12,
    color: COLORS.textLighter,
  },
  productWeight: {
    fontSize: 12,
    color: COLORS.textLighter,
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  unavailableBadgeText: {
    fontSize: 12,
    color: COLORS.error,
  },
  productPriceContainer: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  productHeaderActions: {
    alignItems: 'center',
    gap: 10,
  },
  deleteProductButton: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: COLORS.error + '10',
  },
  variantsContainer: {
    padding: 12,
    paddingTop: 8,
  },
  
  // --- Styles pour les variantes (version web adaptée) ---
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
    backgroundColor: COLORS.white,
    minHeight: 80,
  },
  variantRowUnavailable: {
    opacity: 0.5,
  },
  variantMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  variantThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: COLORS.background,
    flexShrink: 0,
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  variantInfo: {
    flex: 1,
    minWidth: 0,
  },
  variantTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 4,
  },
  variantTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  variantTagText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  unavailableTag: {
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unavailableTagText: {
    fontSize: 10,
    color: COLORS.error,
    fontWeight: '600',
  },
  variantPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  variantOldPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  variantPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  variantPromoPrice: {
    color: '#E74C3C',
  },
  variantControls: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    flexShrink: 0,
    minWidth: 80,
  },
  quantityControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityBtnCompact: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  quantityBtnDisabled: {
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  quantityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 25,
    textAlign: 'center',
  },
  stockIndicator: {
    fontSize: 10,
    color: COLORS.textLighter,
    textAlign: 'right',
  },
  deleteButton: {
    padding: 5,
    borderRadius: 14,
    backgroundColor: COLORS.error + '10',
  },
  
  // --- Styles pour le code promo ---
  promoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  promoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  promoInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  applyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  promoAppliedText: {
    fontSize: 15,
    color: COLORS.success,
    fontWeight: '600',
  },
  
  // --- Styles pour le résumé ---
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
  shippingDetailsSection: {
    marginVertical: 8,
  },
  shippingDetailsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 6,
  },
  shippingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginLeft: 8,
  },
  shippingStoreName: {
    fontSize: 12,
    color: COLORS.textLighter,
    flex: 1,
    marginRight: 8,
  },
  shippingStoreCost: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  shippingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '50',
  },
  shippingTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  shippingTotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
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
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
  },
  summaryInfoText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  shippingDetailsSection: {
    marginVertical: 8,
  },
  
  // --- Styles pour l'état vide ---
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 200,
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  shopButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // --- Styles pour le bouton de paiement ---
  checkoutContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  checkoutSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkoutTotalLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  checkoutTotalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  checkoutButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 48,
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.textLighter,
  },
  checkoutButtonDisabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.textLighter,
    minHeight: 48,
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomSpacing: {
    height: 40,
  },
});