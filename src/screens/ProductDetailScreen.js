import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  Share,
  Platform,
  StatusBar,
  Animated,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { toggleLike, fetchUserLikes } from '../redux/likesSlice';
import { addArticleToPanier, selectPanierCount } from '../redux/cartSlice';
import { getProducts } from '../redux/productsSlice';
import { formatPrice } from '../utils/formatPrice';
import DeepLinkingService from '../services/deepLinkingService';
import { API_URL } from '../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#30A08B',
  secondary: '#FC913A',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#718096',
  lightGray: '#E2E8F0',
  darkGray: '#4A5568',
  green: '#008751',
  red: '#FF6B6B',
  lightRed: '#FFE5E5',
  lightGreen: '#E6FFEA',
};

export default function ProductDetailScreen({ route, navigation }) {
  const routeParams = route?.params || {};
  const productFromParams = routeParams.product || null;
  const productId = routeParams.productId || productFromParams?._id || null;
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const likedProducts = useSelector((state) => state.likes.likedProducts || [], shallowEqual);
  const allProducts = useSelector((state) => state.products.data || [], shallowEqual);
  const types = useSelector((state) => state.products?.types || []);
  const cartItemCount = useSelector(selectPanierCount);

  const [product, setProduct] = useState(productFromParams);

  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState('1');
  const [activeTab, setActiveTab] = useState('description');
  const [showFullDescription, setShowFullDescription] = useState(false);

  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setProduct(productFromParams);
  }, [productFromParams]);

  useEffect(() => {
    const fetchProductById = async () => {
      if (product || !productId) return;

      try {
        const response = await fetch(`${API_URL}/produits/${productId}`);
        if (!response.ok) return;

        const data = await response.json();
        const resolvedProduct = data?.data || data?.product || data || null;
        if (resolvedProduct?._id) {
          setProduct(resolvedProduct);
        }
      } catch (error) {
        console.error('Erreur chargement produit deep link:', error);
      }
    };

    fetchProductById();
  }, [product, productId]);

  // Memoized similar products to avoid unnecessary rerenders
  // Mapping type._id => clefCategories
  const typeToCategory = useMemo(() => {
    const mapping = {};
    types.forEach(type => {
      mapping[type._id] = type.clefCategories;
    });
    return mapping;
  }, [types]);

  const similarProducts = useMemo(() => {
    if (!product || !product.ClefType) return [];
    if (allProducts.length === 0) return [];

    const productCategoryId = typeToCategory[product.ClefType];
    if (!productCategoryId) return [];

    // Filtrer les produits qui ont la même catégorie
    return allProducts.filter(p => {
      if (p._id === product._id) return false;
      const catId = typeToCategory[p.ClefType];
      return catId === productCategoryId;
    }).slice(0, 10);
  }, [product, allProducts, typeToCategory]);

  // Protection: Return early if product is undefined
  if (!product) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="package-variant" size={64} color={COLORS.lightGray} />
          <Text style={{ fontSize: 16, color: COLORS.gray, marginTop: 16 }}>Produit non trouvé</Text>
        </View>
      </View>
    );
  }

  // Initialize images and first variant
  useEffect(() => {
    if (product) {
      // Collect all images
      const allImages = [
        product.image1,
        product.image2,
        product.image3,
        ...product.variants?.filter((v) => v.imageUrl).map((v) => v.imageUrl) || [],
      ].filter(Boolean);

      setImages(allImages);

      // Select first variant if available
      if (product.variants && product.variants.length > 0) {
        const firstVariant = product.variants[0];
        setSelectedVariant(firstVariant);

        if (firstVariant.sizes && firstVariant.sizes.length > 0) {
          setSelectedSize(firstVariant.sizes[0]);
        }
      }

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [product]);

  // Load user likes
  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      dispatch(fetchUserLikes(userId));
    }
  }, [user, dispatch]);

  // Load products if not already loaded
  useEffect(() => {
    if (allProducts.length === 0) {
      dispatch(getProducts(() => { }));
    }
  }, [dispatch, allProducts.length]);

  // Check if product is liked
  const isLiked = product?._id ? likedProducts.includes(product._id) : false;

  // Calculate prices
  const getPrice = () => {
    const variantPrice = selectedVariant?.price || 0;
    const variantPromoPrice = selectedVariant?.promoPrice || 0;

    const basePrice = variantPrice > 0 ? variantPrice : (product?.prix || 0);
    const promoPrice = variantPromoPrice > 0 ? variantPromoPrice : (product?.prixPromo || 0);

    const finalPrice = (promoPrice > 0 && promoPrice < basePrice) ? promoPrice : basePrice;
    const hasDiscount = promoPrice > 0 && promoPrice < basePrice;
    const discountPercent = hasDiscount ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0;

    return { basePrice, finalPrice, hasDiscount, discountPercent };
  };

  const { basePrice, finalPrice, hasDiscount, discountPercent } = getPrice();

  // Handle variant selection
  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);

    if (variant.sizes && variant.sizes.length > 0) {
      setSelectedSize(variant.sizes[0]);
    } else {
      setSelectedSize(null);
    }

    // Change image if variant has one
    if (variant.imageUrl) {
      const imageIndex = images.findIndex((img) => img === variant.imageUrl);
      if (imageIndex !== -1) {
        setCurrentImageIndex(imageIndex);
        flatListRef.current?.scrollToIndex({ index: imageIndex, animated: true });
      }
    }
  };

  // Handle quantity change
  const incrementQuantity = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    setQuantityInput(newQty.toString());
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      const newQty = quantity - 1;
      setQuantity(newQty);
      setQuantityInput(newQty.toString());
    }
  };

  const handleQuantityInputChange = (text) => {
    setQuantityInput(text);
    const num = parseInt(text);
    if (!isNaN(num) && num > 0 && num <= 999) {
      setQuantity(num);
    }
  };

  const handleQuantityInputBlur = () => {
    if (!quantityInput || parseInt(quantityInput) < 1) {
      setQuantityInput('1');
      setQuantity(1);
    } else {
      setQuantityInput(quantity.toString());
    }
  };

  // Handle like toggle with animation
  const handleToggleLike = async () => {
    const userId = user?.id || user?._id;

    if (!userId) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour ajouter des favoris');
      return;
    }

    // Animate like button
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      await dispatch(toggleLike({ userId, product })).unwrap();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier les favoris');
    }
  };

  // Handle add to cart
  const handleAddToCart = (buyNow = false) => {
    console.log('Adding to cart:', { productId: product._id, selectedVariant, selectedSize, quantity });
    // Validation
    if (product.quantite <= 0) {
      Alert.alert('Indisponible', 'Ce produit n\'est pas disponible pour le moment (stock épuisé)');
      return;
    }

    if (product.variants && product.variants.length >= 2 && !selectedVariant) {
      Alert.alert('Sélection requise', `Veuillez choisir un modèle parmi les ${product.variants.length} disponibles`);
      return;
    }

    const hasMultipleSizes = product.variants?.some((v) => v.sizes && v.sizes.length >= 2);
    if (hasMultipleSizes && !selectedSize) {
      Alert.alert('Sélection requise', 'Veuillez choisir une taille');
      return;
    }

    // Create cart item avec la structure CORRECTE
    const cartItem = {
      // Étaler toutes les propriétés du produit
      ...product,
      id: product._id,
      // Ajouter les propriétés spécifiques au panier
      color: selectedVariant?.color || null,
      taille: selectedSize || null,
      quantite: quantity,

      // Propriété pour l'UI (optionnel)
      colorImage: selectedVariant?.imageUrl || product.image1,
    };

    // Utiliser l'action CORRECTE
    dispatch(addArticleToPanier(cartItem));

    if (buyNow) {
      navigation.navigate('Cart');
    } else {
      Alert.alert('Succès', 'Produit ajouté au panier !');
    }
  };

  // Handle share with deep linking
  const handleShare = async () => {
    try {
      // Générer le message de partage avec deep link universel
      const { message, url } = DeepLinkingService.generateShareMessage('product', {
        id: product._id,
        name: product.name,
        brand: product.marque,
        price: finalPrice,
        priceFormatted: `${formatPrice(finalPrice)} CFA`
      });

      await Share.share({
        message,
        url, // Pour iOS
        title: `${product.name} - Ihambaobab`,
      });
    } catch (error) {
      console.error('Erreur de partage:', error);
    }
  };

  // Render image carousel with modern design
  const renderImageItem = ({ item, index }) => (
    <Animated.View style={[styles.imageSlide, { opacity: fadeAnim }]}>
      <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />

      {/* Premium gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.1)']}
        style={styles.imageGradient}
      />

      {/* Discount badge with gradient */}
      {hasDiscount && index === 0 && (
        <LinearGradient
          colors={['#FF6B6B', '#EE5A6F', '#C44569']}
          style={styles.discountBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="tag" size={16} color={COLORS.white} />
          <Text style={styles.discountText}><Text>-</Text>{discountPercent}<Text>%</Text></Text>
        </LinearGradient>
      )}

      {/* Image counter badge */}
      <View style={styles.imageCounterBadge}>
        <MaterialCommunityIcons name="image-multiple" size={14} color={COLORS.white} />
        <Text style={styles.imageCounterText}>{index + 1}<Text>/</Text>{images.length}</Text>
      </View>
    </Animated.View>
  );

  // Render variant item with modern design
  const renderVariantItem = (variant) => {
    const isSelected = selectedVariant?.color === variant.color;

    return (
      <TouchableOpacity
        key={variant.color}
        style={[
          styles.variantItem,
          isSelected && styles.variantItemSelected,
        ]}
        onPress={() => handleVariantSelect(variant)}
        activeOpacity={0.7}
      >
        {variant.imageUrl ? (
          <View style={styles.variantImageWrapper}>
            <Image source={{ uri: variant.imageUrl }} style={styles.variantImage} />
            {isSelected && (
              <View style={styles.variantCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.colorSwatchWrapper}>
            <View style={[styles.variantColorBox, { backgroundColor: variant.colorCode || variant.color }]} />
            {isSelected && (
              <View style={styles.variantCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
              </View>
            )}
          </View>
        )}
        <Text style={[styles.variantLabel, isSelected && styles.variantLabelSelected]} numberOfLines={1}>
          {variant.color}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render size item with modern design
  const renderSizeItem = (size) => {
    const isSelected = selectedSize === size;

    return (
      <TouchableOpacity
        key={size}
        style={[
          styles.sizeButton,
          isSelected && styles.sizeButtonSelected,
        ]}
        onPress={() => setSelectedSize(size)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.sizeText,
          isSelected && styles.sizeTextSelected,
        ]}>
          {size}
        </Text>
        {isSelected && (
          <View style={styles.sizeCheckmark}>
            <Ionicons name="checkmark" size={12} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={images}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
          />

          {/* Floating Header with Gradient Background */}
          <Animated.View
            style={[
              styles.floatingHeader,
              {
                backgroundColor: scrollY.interpolate({
                  inputRange: [0, 200],
                  outputRange: ['transparent', COLORS.primary],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.5)', 'transparent']}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.floatingHeaderButton}
                  activeOpacity={0.8}
                >
                  <View style={styles.headerButtonInner}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.white} />
                  </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Cart')}
                    style={styles.floatingHeaderButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.headerButtonInner}>
                      <Ionicons name="cart-outline" size={20} color={COLORS.white} />
                      {cartItemCount > 0 && (
                        <View style={styles.cartBadge}>
                          <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShare}
                    style={styles.floatingHeaderButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.headerButtonInner}>
                      <Ionicons name="share-social" size={20} color={COLORS.white} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleLike}
                    style={styles.floatingHeaderButton}
                    activeOpacity={0.8}
                  >
                    <Animated.View style={[styles.headerButtonInner, { transform: [{ scale: likeAnimation }] }]}>
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isLiked ? '#FF6B6B' : COLORS.white}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Image indicators */}
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {/* Title and Like */}
          <View style={styles.titleRow}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <TouchableOpacity onPress={handleToggleLike} style={styles.likeButton} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <LinearGradient
                  colors={isLiked ? ['#FF6B6B', '#EE5A6F'] : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  style={styles.likeButtonGradient}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isLiked ? COLORS.white : COLORS.gray}
                  />
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Brand */}
          <Text style={styles.brand}>Marque: <Text>{product.marque}</Text></Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice} numberOfLines={1}>{formatPrice(finalPrice)} CFA</Text>
            {hasDiscount && (
              <Text style={styles.originalPrice} numberOfLines={1}>{formatPrice(basePrice)} CFA</Text>
            )}
          </View>

          {/* Availability */}
          <View style={[
            styles.availabilityBadge,
            (product.quantite > 0) ? styles.availableBadge : styles.unavailableBadge,
          ]}>
            <MaterialCommunityIcons
              name={(product.quantite > 0) ? 'check-circle' : 'close-circle'}
              size={16}
              color={COLORS.white}
            />
            <Text style={styles.availabilityText}>
              {(product.quantite > 0) ? `En stock (${product.quantite})` : 'Rupture de stock'}
            </Text>
          </View>

          {/* Seller/Store Information */}
          {product.Clefournisseur && product.Clefournisseur.isvalid && (
            <TouchableOpacity
              style={styles.storeInfoCard}
              onPress={() => {
                navigation.navigate('Boutique', {
                  sellerId: product.Clefournisseur._id,
                  storeName: product.Clefournisseur.storeName || product.Clefournisseur.name,
                });
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={styles.storeInfoGradient}
              >
                <View style={styles.storeInfoContent}>
                  <View style={styles.storeLogoContainer}>
                    <Image
                      source={{ 
                        uri: product.Clefournisseur.logo || 'https://via.placeholder.com/60'
                      }}
                      style={styles.storeLogo}
                    />
                    {product.Clefournisseur.isvalid && (
                      <View style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={16} color={COLORS.primary} />
                      </View>
                    )}
                  </View>

                  <View style={styles.storeDetails}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeLabel}>Vendu par</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray} />
                    </View>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {product.Clefournisseur.storeName || product.Clefournisseur.name}
                    </Text>
                    
                    <View style={styles.storeStatsRow}>
                      {product.Clefournisseur.rating && (
                        <View style={styles.storeStat}>
                          <Ionicons name="star" size={14} color={COLORS.secondary} />
                          <Text style={styles.storeStatText}>
                            {product.Clefournisseur.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                      {product.Clefournisseur.followersCount !== undefined && (
                        <View style={styles.storeStat}>
                          <MaterialCommunityIcons name="account-group" size={14} color={COLORS.gray} />
                          <Text style={styles.storeStatText}>
                            {product.Clefournisseur.followersCount}<Text> abonnés</Text>
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.visitStoreButton}>
                  <TouchableOpacity 
                    style={styles.visitStoreLink}
                    onPress={() => {
                      navigation.navigate('SellerDetail', {
                        sellerId: product.Clefournisseur._id,
                      });
                    }}
                  >
                    <MaterialCommunityIcons name="information" size={16} color={COLORS.primary} />
                    <Text style={styles.visitStoreText}>Profil du vendeur</Text>
                  </TouchableOpacity>
                  <View style={styles.visitStoreDivider} />
                  <TouchableOpacity 
                    style={styles.visitStoreLink}
                    onPress={() => {
                      navigation.navigate('Boutique', {
                        sellerId: product.Clefournisseur._id,
                        storeName: product.Clefournisseur.storeName || product.Clefournisseur.name,
                      });
                    }}
                  >
                    <MaterialCommunityIcons name="store" size={16} color={COLORS.primary} />
                    <Text style={styles.visitStoreText}>Voir la boutique</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Variants (Colors) */}
          {product.variants && product.variants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Text>Modèle: </Text><Text>{selectedVariant?.color || 'Choisir'}</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.variantsRow}>
                  {product.variants.map((variant) => renderVariantItem(variant))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Sizes */}
          {selectedVariant?.sizes && selectedVariant.sizes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}><Text>Taille: </Text><Text>{selectedSize || 'Choisir'}</Text></Text>
              <View style={styles.sizesRow}>
                {selectedVariant.sizes.map((size) => renderSizeItem(size))}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantité</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                onPress={decrementQuantity}
                style={styles.quantityButton}
                disabled={quantity <= 1}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? COLORS.lightGray : COLORS.primary} />
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
                onPress={incrementQuantity}
                style={styles.quantityButton}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => handleAddToCart(false)}
              // disabled={!product.isdisponible}
            >
              <LinearGradient
                colors={[COLORS.secondary, '#FFB366']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="cart" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Ajouter au panier</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyNowButton}
              onPress={() => handleAddToCart(true)}
              // disabled={!product.isdisponible}
            >
              <LinearGradient
                colors={[COLORS.primary, '#62aca2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="flash" size={20} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.buttonText}>Acheter maintenant</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsHeader}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'description' && styles.tabActive]}
                onPress={() => setActiveTab('description')}
              >
                <Text style={[styles.tabText, activeTab === 'description' && styles.tabTextActive]}>
                  Description
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'specs' && styles.tabActive]}
                onPress={() => setActiveTab('specs')}
              >
                <Text style={[styles.tabText, activeTab === 'specs' && styles.tabTextActive]}>
                  Spécifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'delivery' && styles.tabActive]}
                onPress={() => setActiveTab('delivery')}
              >
                <Text style={[styles.tabText, activeTab === 'delivery' && styles.tabTextActive]}>
                  Livraison
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'description' && (
                <View>
                  {product.description ? (
                    <RenderHtml
                      contentWidth={SCREEN_WIDTH - 32}
                      source={{ html: product.description }}
                      tagsStyles={{
                        p: { color: COLORS.darkGray, fontSize: 14, lineHeight: 22 },
                        div: { color: COLORS.darkGray, fontSize: 14, lineHeight: 22 },
                      }}
                    />
                  ) : (
                    <Text style={styles.noDataText}>Aucune description disponible</Text>
                  )}
                </View>
              )}

              {activeTab === 'specs' && (
                <View style={styles.specsTable}>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Marque</Text>
                    <Text style={styles.specValue}>{product.marque}</Text>
                  </View>

                  {product.shipping?.weight && (
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Poids</Text>
                      <Text style={styles.specValue}>{product.shipping.weight} kg</Text>
                    </View>
                  )}

                  {product.variants && product.variants.length > 0 && (
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Couleurs</Text>
                      <Text style={styles.specValue}>
                        {product.variants.map((v) => v.color).join(', ')}
                      </Text>
                    </View>
                  )}

                  {selectedVariant?.sizes && selectedVariant.sizes.length > 0 && (
                    <View style={styles.specRow}>
                      <Text style={styles.specLabel}>Tailles</Text>
                      <Text style={styles.specValue}>
                        {selectedVariant.sizes.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'delivery' && (
                <View>
                  {product.shipping?.zones && product.shipping.zones.length > 0 ? (
                    product.shipping.zones.map((zone, index) => (
                      <View key={index} style={styles.deliveryZone}>
                        <View style={styles.deliveryHeader}>
                          <MaterialCommunityIcons name="truck" size={20} color={COLORS.primary} />
                          <Text style={styles.deliveryZoneName}>{zone.name}</Text>
                        </View>
                        <Text style={styles.deliveryInfo}>
                          Transporteur: <Text>{zone.transporteurName}</Text>
                        </Text>
                        <Text style={styles.deliveryInfo}>
                          Frais de base: {formatPrice(zone.baseFee || 0)} CFA
                        </Text>
                        {zone.weightFee > 0 && (
                          <Text style={styles.deliveryInfo}>
                            <Text>+ CFA</Text>{zone.weightFee}<Text>/kg</Text>
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>Informations de livraison non disponibles</Text>
                  )}

                  <View style={styles.qualityBadge}>
                    <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.qualityTitle}>Engagement qualité</Text>
                      <Text style={styles.qualityText}>
                        Votre satisfaction est au cœur de nos priorités.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Similar Products Section */}
          {similarProducts.length > 0 && (
            <View style={styles.similarSection}>
              <View style={styles.similarHeader}>
                <View style={styles.similarHeaderLeft}>
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={styles.similarIconBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons name="fire" size={20} color={COLORS.white} />
                  </LinearGradient>
                  <View style={styles.similarTitleContainer}>
                    <Text style={styles.similarTitle}>Produits Similaires</Text>
                    <View style={styles.similarSubtitleRow}>
                      <View style={styles.similarCountBadge}>
                        <Text style={styles.similarCountText}>{similarProducts.length}</Text>
                      </View>
                      <Text style={styles.similarSubtitle}>articles de la même marque</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    const productCategoryId = typeToCategory[product.ClefType];
                    navigation.navigate('ProductListScreen', {
                      categoryId: productCategoryId,
                      categoryName: product.Categories || 'Catégorie',
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(80, 200, 120, 0.1)', 'rgba(80, 200, 120, 0.05)']}
                    style={styles.viewAllGradient}
                  >
                    <Text style={styles.viewAllText}>Voir tout</Text>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <FlatList
                horizontal
                data={similarProducts}
                keyExtractor={(item) => item._id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarList}
                snapToInterval={199}
                decelerationRate="fast"
                renderItem={({ item, index }) => {
                  const itemHasPromo = item.prixPromo > 0 && item.prixPromo < item.prix;
                  const itemDiscount = itemHasPromo ? Math.round(((item.prix - item.prixPromo) / item.prix) * 100) : 0;

                  // Generate random rating between 3.0 and 5.0
                  const rating = (3 + Math.random() * 2).toFixed(1);
                  const ratingNum = parseFloat(rating);
                  const fullStars = Math.floor(ratingNum);
                  const hasHalfStar = ratingNum % 1 >= 0.5;

                  return (
                    <Animated.View
                      style={[
                        styles.similarCardWrapper,
                        {
                          opacity: fadeAnim,
                          transform: [{
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [50, 0],
                            }),
                          }],
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.similarCard}
                        onPress={() => navigation.push('ProductDetail', { product: item })}
                        activeOpacity={0.9}
                      >
                        <View style={styles.similarImageContainer}>
                          <Image
                            source={{ uri: item.image1 }}
                            style={styles.similarImage}
                            resizeMode="cover"
                          />

                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.15)']}
                            style={styles.similarImageGradient}
                          />

                          {itemHasPromo && (
                            <LinearGradient
                              colors={['#FF6B6B', '#EE5A6F', '#C44569']}
                              style={styles.similarPromoBadge}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <MaterialCommunityIcons name="tag" size={12} color={COLORS.white} />
                              <Text style={styles.similarPromoText}><Text>-</Text>{itemDiscount}<Text>%</Text></Text>
                            </LinearGradient>
                          )}

                          {(item.quantite <= 0) && (
                            <View style={styles.outOfStockOverlay}>
                              <MaterialCommunityIcons name="close-circle" size={32} color={COLORS.white} />
                              <Text style={styles.outOfStockText}>Rupture de stock</Text>
                            </View>
                          )}

                          {/* Quick Add Button */}
                          {(item.quantite > 0) && (
                            <TouchableOpacity
                              style={styles.quickAddButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                const quickAddCartItem = {
                                  ...item, // Étaler les propriétés du produit
                                   id: item._id,
                                  quantite: 1,
                                  color: null,
                                  taille: null,
                                  colorImage: item.image1,
                                };
                                dispatch(addArticleToPanier(quickAddCartItem)); // Action correcte
                                Alert.alert('✓ Ajouté', 'Produit ajouté au panier');
                              }}
                            >
                              <LinearGradient
                                colors={[COLORS.primary, '#62aca2']}
                                style={styles.quickAddGradient}
                              >
                                <Ionicons name="cart" size={16} color={COLORS.white} />
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.similarInfo}>
                          {/* Marque Badge */}
                          {item.marque && (
                            <View style={styles.similarBrandBadge}>
                              <LinearGradient
                                colors={['rgba(76, 175, 80, 0.12)', 'rgba(76, 175, 80, 0.08)']}
                                style={styles.brandBadgeGradient}
                              >
                                <MaterialCommunityIcons name="shield-check" size={10} color={COLORS.green} />
                                <Text style={styles.brandBadgeText} numberOfLines={1}>
                                  {item.marque}
                                </Text>
                              </LinearGradient>
                            </View>
                          )}

                          {/* Product Name */}
                          <Text style={styles.similarName} numberOfLines={2}>
                            {item.name}
                          </Text>

                          {/* Rating */}
                          <View style={styles.similarRatingRow}>
                            <View style={styles.ratingStars}>
                              {[...Array(5)].map((_, i) => {
                                if (i < fullStars) {
                                  return <Ionicons key={i} name="star" size={12} color="#FFB800" />;
                                } else if (i === fullStars && hasHalfStar) {
                                  return <Ionicons key={i} name="star-half" size={12} color="#FFB800" />;
                                } else {
                                  return <Ionicons key={i} name="star-outline" size={12} color="#FFB800" />;
                                }
                              })}
                            </View>
                            <Text style={styles.ratingCount}><Text>(</Text>{rating}<Text>)</Text></Text>
                          </View>

                          {/* Price Row */}
                          <View style={styles.similarPriceRow}>
                            <View style={styles.priceColumn}>
                              <Text style={styles.similarPrice}>
                                {formatPrice(itemHasPromo ? item.prixPromo : item.prix)} CFA
                              </Text>
                              {itemHasPromo && (
                                <Text style={styles.similarOldPrice}>
                                  {formatPrice(item.prix)} CFA
                                </Text>
                              )}
                            </View>

                            {(item.quantite > 0) && (
                              <View style={styles.stockIndicator}>
                                <View style={styles.stockDotPulse}>
                                  <View style={styles.stockDot} />
                                </View>
                              </View>
                            )}
                          </View>

                          {/* Stock Badge */}
                          {(item.quantite > 0) ? (
                            <View style={styles.availableBadgeSmall}>
                              <View style={styles.availableDotSmall} />
                              <Text style={styles.availableTextSmall}>Disponible</Text>
                            </View>
                          ) : (
                            <View style={styles.unavailableBadgeSmall}>
                              <MaterialCommunityIcons name="close-circle" size={12} color="#EF4444" />
                              <Text style={styles.unavailableTextSmall}>Épuisé</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }}
              />
            </View>
          )}

          {/* Trust Badges */}
          <View style={styles.trustSection}>
            <View style={styles.trustBadge}>
              <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.green} />
              <Text style={styles.trustText}>Paiement Sécurisé</Text>
            </View>

            <View style={styles.trustBadge}>
              <MaterialCommunityIcons name="truck-fast" size={32} color={COLORS.secondary} />
              <Text style={styles.trustText}>Livraison Rapide</Text>
            </View>

            <View style={styles.trustBadge}>
              <MaterialCommunityIcons name="refresh" size={32} color={COLORS.primary} />
              <Text style={styles.trustText}>Retour Facile</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // Floating Header Styles
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  floatingHeaderButton: {
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerButtonInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  carouselContainer: {
    height: 400,
    backgroundColor: COLORS.lightGray,
    position: 'relative',
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  imageCounterBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  infoContainer: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginRight: 12,
  },
  likeButton: {
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },
  likeButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 12,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  originalPrice: {
    fontSize: 20,
    color: '#999',
    textDecorationLine: 'line-through',
    fontWeight: '400',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  availableBadge: {
    backgroundColor: COLORS.green,
  },
  unavailableBadge: {
    backgroundColor: COLORS.red,
  },
  availabilityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  storeInfoCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  storeInfoGradient: {
    padding: 16,
  },
  storeInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeLogoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  storeLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  storeDetails: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storeLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 6,
  },
  storeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeStatText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
  },
  visitStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  visitStoreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  visitStoreDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  visitStoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  variantsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  variantItem: {
    alignItems: 'center',
    marginRight: 8,
  },
  variantItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  variantImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    position: 'relative',
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  variantImage: {
    width: '100%',
    height: '100%',
  },
  colorSwatchWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    position: 'relative',
  },
  variantColorBox: {
    width: '100%',
    height: '100%',
  },
  variantCheckmark: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    elevation: 2,
  },
  variantLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
    maxWidth: 70,
    textAlign: 'center',
  },
  variantLabelSelected: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeButton: {
    minWidth: 60,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sizeButtonSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary,
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  sizeTextSelected: {
    color: COLORS.white,
  },
  sizeCheckmark: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.green,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
  },
  quantityButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    minWidth: 60,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    minWidth: 50,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 24,
    minHeight: 52,
  },
  addToCartButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 52,
  },
  buyNowButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    minHeight: 52,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 16,
    gap: 8,
    flex: 1,
    minHeight: 52,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabsContainer: {
    marginTop: 8,
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabTextActive: {
    color: COLORS.secondary,
  },
  tabContent: {
    paddingVertical: 16,
  },
  noDataText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  specsTable: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    padding: 12,
  },
  specLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  specValue: {
    flex: 2,
    fontSize: 14,
    color: COLORS.gray,
  },
  deliveryZone: {
    backgroundColor: COLORS.lightGreen,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryZoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 8,
  },
  deliveryInfo: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  qualityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  qualityText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  // Similar Products Styles
  similarSection: {
    marginTop: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.02)',
    paddingTop: 20,
  },
  similarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  similarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  similarIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  similarTitleContainer: {
    flex: 1,
  },
  similarTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  similarSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  similarCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  similarCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  similarSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  viewAllButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(80, 200, 120, 0.2)',
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  similarList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  similarCardWrapper: {
    marginRight: 14,
  },
  similarCard: {
    width: 185,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  similarImageContainer: {
    width: '100%',
    height: 185,
    backgroundColor: '#F8F9FA',
    position: 'relative',
  },
  similarImage: {
    width: '100%',
    height: '100%',
  },
  similarImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  similarPromoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  similarPromoText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickAddButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quickAddGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  outOfStockText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  similarInfo: {
    padding: 16,
    paddingTop: 14,
    gap: 9,
  },
  similarBrandBadge: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  brandBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.green,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    maxWidth: 100,
  },
  similarName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 2,
  },
  similarRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  ratingCount: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
  },
  similarPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceColumn: {
    flex: 1,
  },
  similarPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  similarOldPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
    fontWeight: '400',
  },
  stockIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockDotPulse: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  availableBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    gap: 4,
  },
  availableDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
  },
  availableTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green,
  },
  unavailableBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 4,
  },
  unavailableTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Trust Section Styles
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: COLORS.lightGray,
    marginTop: 24,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  trustBadge: {
    alignItems: 'center',
    flex: 1,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
});
