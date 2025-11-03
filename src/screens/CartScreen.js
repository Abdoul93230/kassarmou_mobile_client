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
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import {
  removeItemFromCart,
  updateCartQuantity,
  clearCartData,
  loadCart,
} from '../redux/cartSlice';

const COLORS = {
  primary: '#30A08B',
  secondary: '#62ACA2',
  tertiary: '#94CEC8',
  background: '#F8FFFE',
  backgroundAlt: '#FFFFFF',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textLight: '#666666',
  textLighter: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#FFC107',
};

// Composant pour l'input de quantité
const QuantityInput = ({ item, onUpdateQuantity }) => {
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString());

  useEffect(() => {
    setQuantityInput(item.quantity.toString());
  }, [item.quantity]);

  const handleQuantityInputChange = (text) => {
    setQuantityInput(text);
    const num = parseInt(text);
    if (!isNaN(num) && num > 0 && num <= 999) {
      onUpdateQuantity(item, num);
    }
  };

  const handleQuantityInputBlur = () => {
    if (!quantityInput || parseInt(quantityInput) < 1) {
      setQuantityInput('1');
      onUpdateQuantity(item, 1);
    } else {
      setQuantityInput(item.quantity.toString());
    }
  };

  const handleDecrement = () => {
    const newQty = Math.max(1, item.quantity - 1);
    setQuantityInput(newQty.toString());
    onUpdateQuantity(item, newQty);
  };

  const handleIncrement = () => {
    const newQty = item.quantity + 1;
    setQuantityInput(newQty.toString());
    onUpdateQuantity(item, newQty);
  };

  return (
    <View style={styles.quantityControls}>
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={handleDecrement}
        activeOpacity={0.7}
        disabled={item.quantity <= 1}
      >
        <Ionicons 
          name="remove" 
          size={18} 
          color={item.quantity <= 1 ? COLORS.border : COLORS.primary} 
        />
      </TouchableOpacity>
      
      <TextInput
        style={styles.quantityInput}
        value={quantityInput}
        onChangeText={handleQuantityInputChange}
        onBlur={handleQuantityInputBlur}
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
      />
      
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={handleIncrement}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
};

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items: cartItems } = useSelector((state) => state.cart);
  const user = useSelector((state) => state.auth.user);

  const [codePromo, setCodePromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [reduction, setReduction] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingZones, setShippingZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [totalWeight, setTotalWeight] = useState(0);
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
  }, []);

  // Récupérer les zones d'expédition
  const fetchShippingZones = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/shipping/zones`);
      if (response.data.success) {
        setShippingZones(response.data.zones);
      }
    } catch (error) {
      console.error('Erreur zones expédition:', error);
    }
  }, []);

  // Calculer les frais d'expédition
  const calculateShipping = useCallback(async (zoneId) => {
    if (!zoneId || cartItems.length === 0) {
      setShippingFee(0);
      setTotalWeight(0);
      setShippingCalculated(false);
      return;
    }

    setLoading(true);
    try {
      const selectedZoneData = shippingZones.find(z => z._id === zoneId);
      const countryCode = selectedZoneData?.countries || 'FR';

      const response = await axios.post(`${API_URL}/api/shipping/calculate`, {
        cartItems: cartItems.map(item => ({
          _id: item.product._id,
          quantity: item.quantity,
          poid: item.product.poid || 0,
          prix: item.product.prixPromo > 0 ? item.product.prixPromo : item.product.prix,
        })),
        countryCode,
        pp: subtotal,
      });

      if (response.data.success) {
        setShippingFee(response.data.shippingDetails.coutTotal);
        setTotalWeight(response.data.shippingDetails.poidsTotal);
        setShippingCalculated(true);
        // Sauvegarder pour le checkout
        await AsyncStorage.setItem('shippingDetails', JSON.stringify({
          zone: selectedZoneData,
          ...response.data.shippingDetails,
        }));
      } else {
        Alert.alert('Erreur', 'Impossible de calculer les frais d\'expédition');
        setShippingFee(0);
        setShippingCalculated(false);
      }
    } catch (error) {
      console.error('Erreur calcul expédition:', error);
      Alert.alert('Erreur', 'Erreur lors du calcul des frais d\'expédition');
      setShippingFee(0);
      setShippingCalculated(false);
    } finally {
      setLoading(false);
    }
  }, [cartItems, shippingZones, subtotal]);

  // Grouper les articles par produit
  const groupedItems = useMemo(() => {
    const groups = {};
    
    cartItems.forEach((item) => {
      const productId = item.product._id;
      if (!groups[productId]) {
        groups[productId] = {
          productId,
          name: item.product.name,
          imageUrl: item.product.image1,
          variants: [],
          totalQuantity: 0,
        };
      }
      
      groups[productId].variants.push(item);
      groups[productId].totalQuantity += item.quantity;
    });
    
    return Object.values(groups);
  }, [cartItems]);

  // Calculer le sous-total
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.product.prixPromo > 0 
        ? item.product.prixPromo 
        : item.product.prix;
      return sum + (price * item.quantity);
    }, 0);
  }, [cartItems]);

  // Calculer le total
  const total = useMemo(() => {
    return subtotal - reduction + shippingFee;
  }, [subtotal, reduction, shippingFee]);

  // Formater le prix
  const formatPrice = useCallback((price) => {
    return price.toFixed(2);
  }, []);

  // Toggle expansion groupe
  const toggleGroup = useCallback((productId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  }, []);

  // Modifier quantité
  const handleUpdateQuantity = useCallback((item, delta) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    dispatch(updateCartQuantity(
      item.product._id,
      item.selectedColor,
      item.selectedSize,
      newQuantity
    ));
  }, [dispatch]);

  // Modifier quantité directement
  const handleSetQuantity = useCallback((item, quantity) => {
    const newQuantity = Math.max(1, Math.min(999, quantity));
    dispatch(updateCartQuantity(
      item.product._id,
      item.selectedColor,
      item.selectedSize,
      newQuantity
    ));
  }, [dispatch]);

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
            dispatch(removeItemFromCart(
              item.product._id,
              item.selectedColor,
              item.selectedSize
            ));
          },
        },
      ]
    );
  }, [dispatch]);

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
          onPress: () => dispatch(clearCartData()),
        },
      ]
    );
  }, [dispatch]);

  // Appliquer code promo
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
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getCodePromoByHashedCode`, {
        params: {
          hashedCode: codePromo,
          welcom: codePromo === 'BIENVENUE20',
          id: user.id || user._id,
        },
      });

      const promoData = response.data.data;

      if (promoData.isValide) {
        if (promoData.isWelcomeCode) {
          const calculatedReduction = Math.min(
            (subtotal * promoData.prixReduiction) / 100,
            2000
          );
          setReduction(calculatedReduction);
        } else {
          setReduction(promoData.prixReduiction);
        }

        setAppliedPromo(promoData);
        Alert.alert('Succès', 'Code promo appliqué avec succès !');
      } else {
        Alert.alert('Erreur', 'Ce code promo a expiré');
        setReduction(0);
        setAppliedPromo(null);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Code promo invalide');
      setReduction(0);
      setAppliedPromo(null);
    } finally {
      setLoading(false);
    }
  }, [codePromo, user, subtotal, navigation]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(loadCart());
    setRefreshing(false);
  }, [dispatch]);

  // Procéder au paiement
  const handleCheckout = useCallback(() => {
    // Vérifier la connexion
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour passer commande',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    // Vérifier le panier
    if (cartItems.length === 0) {
      Alert.alert('Panier vide', 'Votre panier est vide');
      return;
    }

    // Vérifier la méthode d'expédition
    if (!selectedZone || !shippingCalculated) {
      Alert.alert(
        'Méthode d\'expédition requise',
        'Veuillez sélectionner une méthode d\'expédition pour continuer',
        [{ text: 'OK' }]
      );
      return;
    }

    // Vérifier que les frais de livraison sont calculés
    if (totalWeight <= 0) {
      Alert.alert(
        'Erreur',
        'Impossible de calculer les frais d\'expédition. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigation vers le checkout
    navigation.navigate('Checkout', {
      subtotal,
      reduction,
      shippingFee,
      total,
      totalWeight,
      selectedZone,
      appliedPromo,
    });
  }, [user, cartItems, selectedZone, shippingCalculated, totalWeight, subtotal, reduction, shippingFee, total, appliedPromo, navigation]);

  // Render variant item
  const renderVariantItem = useCallback((item, index) => {
    const price = item.product.prixPromo > 0 
      ? item.product.prixPromo 
      : item.product.prix;
    const hasPromo = item.product.prixPromo > 0;

    return (
      <View key={`${item.product._id}-${index}`} style={styles.variantItem}>
        {/* Image couleur si disponible */}
        {item.colorImage && (
          <Image source={{ uri: item.colorImage }} style={styles.variantImage} />
        )}

        <View style={styles.variantDetails}>
          {/* Couleur et taille */}
          <View style={styles.variantInfo}>
            {item.selectedColor && (
              <View style={styles.variantTag}>
                <Ionicons name="color-palette" size={12} color={COLORS.textLight} />
                <Text style={styles.variantTagText}>{item.selectedColor}</Text>
              </View>
            )}
            {item.selectedSize && (
              <View style={styles.variantTag}>
                <Ionicons name="resize" size={12} color={COLORS.textLight} />
                <Text style={styles.variantTagText}>{item.selectedSize}</Text>
              </View>
            )}
          </View>

          {/* Prix */}
          <View style={styles.priceContainer}>
            {hasPromo && (
              <Text style={styles.oldPrice}>{formatPrice(item.product.prix)}€</Text>
            )}
            <Text style={[styles.price, hasPromo && styles.promoPrice]}>
              {formatPrice(price)}€
            </Text>
          </View>

          {/* Poids si disponible */}
          {item.product.poid > 0 && (
            <View style={styles.weightBadge}>
              <Ionicons name="scale-outline" size={12} color={COLORS.primary} />
              <Text style={styles.weightText}>
                {item.product.poid} Kg × {item.quantity}
              </Text>
            </View>
          )}
        </View>

        {/* Contrôles quantité */}
        <QuantityInput item={item} onUpdateQuantity={handleSetQuantity} />

        {/* Bouton supprimer */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveItem(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    );
  }, [formatPrice, handleSetQuantity, handleRemoveItem]);

  // Render group
  const renderGroup = useCallback((group) => {
    const isExpanded = expandedGroups[group.productId];

    return (
      <View key={group.productId} style={styles.groupCard}>
        {/* Header groupe */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(group.productId)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={2}>
              {group.name}
            </Text>
            <Text style={styles.groupVariants}>
              {group.variants.length} variante{group.variants.length > 1 ? 's' : ''}
            </Text>
          </View>

          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.textLight}
          />
        </TouchableOpacity>

        {/* Variantes */}
        {isExpanded && (
          <View style={styles.variantsContainer}>
            {group.variants.map(renderVariantItem)}
          </View>
        )}
      </View>
    );
  }, [expandedGroups, toggleGroup, renderVariantItem]);

  // Empty state
  if (cartItems.length === 0) {
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
              <Ionicons name="storefront" size={20} color={COLORS.white} />
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
            <Text style={styles.headerBadgeText}>{cartItems.length}</Text>
          </View>
        </View>
        
        {cartItems.length > 0 && (
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
          {/* Articles groupés */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Articles ({cartItems.length})</Text>
            {groupedItems.map(renderGroup)}
          </View>

          {/* Code promo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Code promo</Text>
            <View style={styles.promoCard}>
              <View style={styles.promoInputContainer}>
                <Ionicons name="pricetag" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.promoInput}
                  placeholder="Entrez votre code promo"
                  placeholderTextColor={COLORS.textLight}
                  value={codePromo}
                  onChangeText={setCodePromo}
                  editable={!appliedPromo}
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
                <View style={styles.promoApplied}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.promoAppliedText}>Appliqué</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAppliedPromo(null);
                      setReduction(0);
                      setCodePromo('');
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Méthode d'expédition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Méthode d'expédition</Text>
            <View style={styles.shippingCard}>
              {shippingZones.length === 0 ? (
                <View style={styles.shippingLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.shippingLoadingText}>Chargement des méthodes...</Text>
                </View>
              ) : (
                <>
                  {shippingZones.map((zone) => (
                    <TouchableOpacity
                      key={zone._id}
                      style={[
                        styles.zoneCard,
                        selectedZone === zone._id && styles.zoneCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedZone(zone._id);
                        calculateShipping(zone._id);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.zoneInfo}>
                        <Text style={styles.zoneName}>{zone.name}</Text>
                        <View style={styles.zoneDetails}>
                          <View style={styles.zoneDetail}>
                            <Ionicons name="cash-outline" size={16} color={COLORS.textLight} />
                            <Text style={styles.zoneDetailText}>
                              Frais: {formatPrice(zone.baseFee)}€
                            </Text>
                          </View>
                        </View>
                      </View>

                      {selectedZone === zone._id && (
                        <View style={styles.zoneCheckmark}>
                          {loading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                          ) : shippingCalculated ? (
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                          ) : null}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}

                  {!selectedZone && (
                    <View style={styles.shippingWarning}>
                      <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                      <Text style={styles.shippingWarningText}>
                        Veuillez sélectionner une méthode d'expédition
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Résumé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}€</Text>
              </View>

              {reduction > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: COLORS.success }]}>
                    Réduction
                  </Text>
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
                <Text style={styles.summaryValue}>
                  {shippingCalculated && shippingFee > 0 
                    ? `${formatPrice(shippingFee)}€` 
                    : selectedZone 
                    ? 'Calcul en cours...'
                    : 'Non calculé'}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}€</Text>
              </View>
            </View>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>

      {/* Bouton Commander */}
      <View style={styles.checkoutContainer}>
        <View style={styles.checkoutSummary}>
          <Text style={styles.checkoutTotalLabel}>Total</Text>
          <Text style={styles.checkoutTotalValue}>{formatPrice(total)}€</Text>
        </View>
        
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
      </View>
    </View>
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
  
  // Group styles
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  groupVariants: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  
  // Variants styles
  variantsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  variantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  variantImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  variantDetails: {
    flex: 1,
  },
  variantInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  variantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  variantTagText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  promoPrice: {
    color: COLORS.primary,
  },
  oldPrice: {
    fontSize: 14,
    color: COLORS.error,
    textDecorationLine: 'line-through',
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  weightText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 50,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
  },
  
  // Promo styles
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
  
  // Shipping zone styles
  shippingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shippingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  shippingLoadingText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  zoneCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  zoneDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  zoneDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  zoneCheckmark: {
    marginLeft: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippingWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warning + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  shippingWarningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.warning,
  },
  
  // Summary styles
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
  
  // Empty state
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
  
  // Checkout styles
  checkoutContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    paddingBottom: 30,
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
  },
  checkoutTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  
  bottomSpacing: {
    height: 40,
  },
});
