import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { API_URL } from '../config/api';
import { COLORS } from '../config/constants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const user = useSelector(state => state.auth.user);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/ordersRoutes/${orderId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      console.log('Order details response:', response.data);
      setOrder(response.data.commande);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err.response?.data?.message || 'Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'PPP', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price) => {
    return `€${price?.toFixed(2)}`;
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'en cours':
        return COLORS.warning;
      case 'validée':
      case 'livrée':
        return COLORS.success;
      case 'annulée':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };

  const handlePaymentRetry = async () => {
    try {
      if (order?.prod) {
        // Sauvegarder le panier depuis order.prod dans AsyncStorage
        // Le format sera automatiquement converti par loadCart dans Redux
        await AsyncStorage.setItem('panier', JSON.stringify(order.prod));

        if (order?.reference && order?._id) {
          await AsyncStorage.setItem(
            'pendingOrder',
            JSON.stringify({
              commandeId: order._id,
              transactionId: order.reference,
              timestamp: new Date().getTime(),
            })
          );

          await AsyncStorage.setItem(
            'paymentInitiated',
            JSON.stringify({
              transactionId: order.reference,
              commandeId: order._id,
              timestamp: new Date().getTime(),
            })
          );
        }

        // Afficher un message de confirmation
        Alert.alert(
          'Reprendre le paiement',
          'Vous allez être redirigé vers le panier pour finaliser le paiement de cette commande.',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Continuer',
              onPress: () => {
                // Rediriger vers le panier
                navigation.navigate('Cart');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur lors de la préparation du paiement:', error);
      Alert.alert('Erreur', 'Impossible de préparer le paiement. Veuillez réessayer.');
    }
  };

  const shouldShowPaymentButton = () => {
    if (!order) return false;
    return (
      order.statusPayment === 'échec' ||
      (order.statusPayment !== 'payé à la livraison' && order.statusPayment !== 'payé')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>{error || 'Commande non trouvée'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrderDetails}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#30A08B" />
      <View style={styles.statusBarBackground} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Détails de la commande</Text>
          <Text style={styles.headerSubtitle}>#{order.reference || order._id?.slice(0, 8)}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusCardHeader}>
            <View>
              <Text style={styles.orderIdText}>Commande #{order._id?.slice(0, 8)}</Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.dateText}>Commandé le {formatDate(order.date)}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(order.etatTraitement) }]}>
              <Text style={styles.statusBadgeText}>{order.etatTraitement || 'En attente'}</Text>
            </View>
          </View>
          
          <View style={styles.statusDivider} />
          
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Ionicons name="card-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statusItemLabel}>Paiement</Text>
              <Text style={styles.statusItemValue}>{order.statusPayment || 'En attente'}</Text>
            </View>
            
            <View style={styles.statusItemDivider} />
            
            <View style={styles.statusItem}>
              <Ionicons name="bicycle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.statusItemLabel}>Livraison</Text>
              <Text style={styles.statusItemValue}>{order.statusLivraison || 'En cours'}</Text>
            </View>
          </View>
        </View>

        {/* Payment Retry Button */}
        {shouldShowPaymentButton() && (
          <TouchableOpacity 
            style={styles.paymentRetryButton}
            onPress={handlePaymentRetry}
          >
            <Ionicons name="card" size={20} color={COLORS.white} />
            <Text style={styles.paymentRetryButtonText}>Faire le paiement</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* Delivery Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Informations de livraison</Text>
          </View>
          
          {order.livraisonDetails ? (
            <View style={styles.cardContent}>
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Ionicons name="person" size={20} color={COLORS.primary} />
                  <View style={styles.infoCardText}>
                    <Text style={styles.infoCardLabel}>Nom du client</Text>
                    <Text style={styles.infoCardValue}>{order.livraisonDetails.customerName || 'Non renseigné'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="mail" size={20} color={COLORS.primary} />
                  <View style={styles.infoCardText}>
                    <Text style={styles.infoCardLabel}>Email</Text>
                    <Text style={styles.infoCardValue}>{order.livraisonDetails.email || 'Non renseigné'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <View style={styles.infoCardText}>
                    <Text style={styles.infoCardLabel}>Région</Text>
                    <Text style={styles.infoCardValue}>{order.livraisonDetails.region || 'Non renseigné'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="home" size={20} color={COLORS.primary} />
                  <View style={styles.infoCardText}>
                    <Text style={styles.infoCardLabel}>Quartier</Text>
                    <Text style={styles.infoCardValue}>{order.livraisonDetails.quartier || 'Non renseigné'}</Text>
                  </View>
                </View>
                
                <View style={styles.infoCard}>
                  <Ionicons name="call" size={20} color={COLORS.primary} />
                  <View style={styles.infoCardText}>
                    <Text style={styles.infoCardLabel}>Téléphone</Text>
                    <Text style={styles.infoCardValue}>{order.livraisonDetails.numero || 'Non renseigné'}</Text>
                  </View>
                </View>
                
                {order.livraisonDetails.description && (
                  <View style={[styles.infoCard, { gridColumnStart: 1, gridColumnEnd: 3 }]}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                    <View style={styles.infoCardText}>
                      <Text style={styles.infoCardLabel}>Description</Text>
                      <Text style={styles.infoCardValue}>{order.livraisonDetails.description}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateSmall}>
              <Text style={styles.emptyText}>Aucune information de livraison</Text>
            </View>
          )}
        </View>

        {/* Ordered Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube" size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Articles commandés</Text>
          </View>
          
          <View style={styles.cardContent}>
            {order.prod && order.prod.length > 0 ? (
              order.prod.map((product, index) => {
                // Déterminer l'URL de l'image (peut être imageUrl, image, ou images[0])
                const imageUri = product.imageUrl || product.image || (product.images && product.images[0]) || null;
                
                return (
                  <View key={index} style={styles.productCard}>
                    {imageUri ? (
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={() => console.log('Erreur de chargement image:', imageUri)}
                      />
                    ) : (
                      <View style={[styles.productImage, styles.productImagePlaceholder]}>
                        <Ionicons name="image-outline" size={32} color={COLORS.textLight} />
                      </View>
                    )}
                    
                    <View style={styles.productDetails}>
                      <Text style={styles.productName} numberOfLines={2}>{product.name || 'Produit'}</Text>
                      
                      <View style={styles.productMeta}>
                        {product.size && (
                          <View style={styles.productMetaItem}>
                            <Text style={styles.productMetaLabel}>Taille:</Text>
                            <Text style={styles.productMetaValue}>{product.size}</Text>
                          </View>
                        )}
                        {product.color && (
                          <View style={styles.productMetaItem}>
                            <Text style={styles.productMetaLabel}>Couleur:</Text>
                            <Text style={styles.productMetaValue}>{product.color}</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.productFooter}>
                        <View style={styles.productQuantityBadge}>
                          <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.productQuantityText}>x{product.quantity || 1}</Text>
                        </View>
                        <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyStateSmall}>
                <Ionicons name="cube-outline" size={48} color={COLORS.border} />
                <Text style={styles.emptyText}>Aucun article</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment & Delivery Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={22} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Statut de la commande</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.statusDetailGrid}>
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusDetailLabel}>Paiement</Text>
                <View style={[styles.statusDetailBadge, { backgroundColor: getStatusBadgeColor(order.statusPayment) + '20' }]}>
                  <View style={[styles.statusDetailDot, { backgroundColor: getStatusBadgeColor(order.statusPayment) }]} />
                  <Text style={[styles.statusDetailText, { color: getStatusBadgeColor(order.statusPayment) }]}>
                    {order.statusPayment || 'En attente'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusDetailLabel}>Livraison</Text>
                <View style={[styles.statusDetailBadge, { backgroundColor: getStatusBadgeColor(order.statusLivraison) + '20' }]}>
                  <View style={[styles.statusDetailDot, { backgroundColor: getStatusBadgeColor(order.statusLivraison) }]} />
                  <Text style={[styles.statusDetailText, { color: getStatusBadgeColor(order.statusLivraison) }]}>
                    {order.statusLivraison || 'En cours'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusDetailLabel}>Traitement</Text>
                <View style={[styles.statusDetailBadge, { backgroundColor: getStatusBadgeColor(order.etatTraitement) + '20' }]}>
                  <View style={[styles.statusDetailDot, { backgroundColor: getStatusBadgeColor(order.etatTraitement) }]} />
                  <Text style={[styles.statusDetailText, { color: getStatusBadgeColor(order.etatTraitement) }]}>
                    {order.etatTraitement || 'En attente'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Total */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Sous-total</Text>
            <Text style={styles.priceValue}>{formatPrice(order.prix)}</Text>
          </View>
          
          {order.shipping && order.shipping.coutTotal > 0 && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Frais de livraison</Text>
                <Text style={styles.priceValue}>{formatPrice(order.shipping.coutTotal)}</Text>
              </View>
              <View style={styles.priceDivider} />
            </>
          )}
          
          <View style={styles.priceTotalRow}>
            <View>
              <Text style={styles.priceTotalLabel}>Total</Text>
              {order.shipping && order.shipping.coutTotal > 0 && (
                <Text style={styles.priceTotalSubtext}>TTC, livraison comprise</Text>
              )}
            </View>
            <Text style={styles.priceTotalValue}>{formatPrice(order.prixTotal || order.prix)}</Text>
          </View>
        </View>

        {/* Help Button */}
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => Alert.alert('Aide', 'Contactez le support pour toute question concernant votre commande.')}
        >
          <Ionicons name="help-circle" size={22} color={COLORS.white} />
          <Text style={styles.helpButtonText}>Besoin d'aide ?</Text>
        </TouchableOpacity>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 50 : 0,
    backgroundColor: '#30A08B',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.backgroundAlt,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#30A08B',
    paddingTop: Platform.OS === 'ios' ? 72 : 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  
  // ScrollView
  scrollView: {
    flex: 1,
  },
  
  // Status Card
  statusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  statusGrid: {
    flexDirection: 'row',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statusItemDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  statusItemLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  statusItemValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Payment Retry Button
  paymentRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.warning,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  paymentRetryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Card
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardContent: {
    padding: 16,
  },
  
  // Info Grid
  infoGrid: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCardText: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  
  // Product Card
  productCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  productMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  productMetaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  productMetaLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  productMetaValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQuantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  productQuantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  // Status Detail
  statusDetailGrid: {
    gap: 12,
  },
  statusDetailItem: {
    gap: 8,
  },
  statusDetailLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  statusDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  statusDetailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDetailText: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Price Card
  priceCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  priceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  priceTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  priceTotalSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  priceTotalValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  // Help Button
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Empty State
  emptyStateSmall: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
});
