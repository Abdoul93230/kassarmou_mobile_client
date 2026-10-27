import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { selectPanierCount } from '../redux/cartSlice';
import { fetchUserLikes } from '../redux/likesSlice';
import {
  useAddReviewMutation,
  useProductQuery,
  useProductReviewsQuery,
  useProductsByTypeQuery,
} from '../redux/catalogApi';
import useProductActions, { useIsLiked } from '../hooks/useProductActions';
import useContactStore from '../hooks/useContactStore';
import { Button, EmptyState, IconButton, PressableScale, Skeleton, Stars, Text } from '../ui';
import QuantityStepper from '../ui/QuantityStepper';
import ImageGallery from '../components/product/ImageGallery';
import VariantPicker from '../components/product/VariantPicker';
import SellerCard from '../components/product/SellerCard';
import DeliveryEstimate from '../components/product/DeliveryEstimate';
import { sellerIdOf } from '../services/shippingV3';
import ReviewsSection, { summarize } from '../components/product/ReviewsSection';
import ProductRail from '../components/home/ProductRail';
import DeepLinkingService from '../services/deepLinkingService';
import { formatPrice } from '../utils/formatPrice';
import { productImages } from '../utils/image';
import { capitalize, htmlToText } from '../utils/text';
import { colors, GUTTER, radius, shadows, useTheme, themedStyles } from '../theme';

const DESCRIPTION_PREVIEW = 220;

/** Prix tenant compte de la variante choisie */
const computePricing = (product, variant) => {
  const base = Number(variant?.price) > 0 ? Number(variant.price) : Number(product?.prix) || 0;
  const promo = Number(variant?.promoPrice) > 0 ? Number(variant.promoPrice) : Number(product?.prixPromo) || 0;
  const onSale = promo > 0 && promo < base;
  return {
    current: onSale ? promo : base,
    original: onSale ? base : null,
    discount: onSale ? Math.round(((base - promo) / base) * 100) : 0,
  };
};

export default function ProductDetailScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const contactStore = useContactStore(navigation);
  const params = route?.params || {};
  const productId = params.productId || params.product?._id;
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const galleryHeight = Math.round(width * 1.05);

  // Affichage immédiat avec le produit reçu, puis rafraîchissement silencieux via l'API
  const { data: fresh, isLoading, isError } = useProductQuery(productId, { skip: !productId });
  const product = useMemo(() => (fresh ? { ...params.product, ...fresh } : params.product), [fresh, params.product]);

  const user = useSelector((s) => s.auth.user);
  const cartCount = useSelector(selectPanierCount);
  const liked = useIsLiked(product?._id);
  const { like, addToCart } = useProductActions();

  const reviewsQuery = useProductReviewsQuery(product?._id, { skip: !product?._id });
  const reviews = reviewsQuery.data || [];
  const [addReview, { isLoading: postingReview }] = useAddReviewMutation();
  const similarQuery = useProductsByTypeQuery(product?.ClefType, { skip: !product?.ClefType });
  const similar = useMemo(() => (similarQuery.data || []).filter((p) => p._id !== product?._id), [similarQuery.data, product?._id]);

  const [variant, setVariant] = useState(null);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const galleryRef = useRef(null);
  const scrollRef = useRef(null);
  const reviewsY = useRef(0);

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product?.variants]);
  const images = useMemo(() => {
    const list = productImages(product);
    variants.forEach((v) => v.imageUrl && !list.includes(v.imageUrl) && list.push(v.imageUrl));
    return list;
  }, [product, variants]);

  // Première variante disponible sélectionnée par défaut
  useEffect(() => {
    if (variants.length && !variant) {
      const first = variants.find((v) => Number(v.stock) > 0) || variants[0];
      setVariant(first);
      setSize(first?.sizes?.[0] || null);
    }
  }, [variants, variant]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) dispatch(fetchUserLikes(userId));
  }, [dispatch, user?.id, user?._id]);

  const pricing = computePricing(product, variant);
  const stock = variant ? Number(variant.stock) : Number(product?.quantite);
  const hasStockInfo = Number.isFinite(stock);
  const outOfStock = hasStockInfo && stock <= 0;
  const maxQty = hasStockInfo && stock > 0 ? Math.min(stock, 99) : 99;
  const { avg, count } = useMemo(() => summarize(reviews), [reviews]);
  const description = useMemo(() => htmlToText(product?.description), [product?.description]);

  const onSelectVariant = useCallback(
    (v) => {
      setVariant(v);
      setSize(v?.sizes?.[0] || null);
      setQuantity(1);
      if (v?.imageUrl) galleryRef.current?.scrollTo(images.indexOf(v.imageUrl));
    },
    [images],
  );

  const handleAdd = useCallback(
    (buyNow) => {
      if (outOfStock) return;
      const ok = addToCart(product, {
        quantite: quantity,
        color: variant?.color || null,
        taille: size || null,
        silent: buyNow,
      });
      if (ok !== false && buyNow) navigation.navigate('Cart');
    },
    [addToCart, navigation, outOfStock, product, quantity, size, variant],
  );

  const handleShare = useCallback(async () => {
    try {
      const { message, url } = DeepLinkingService.generateShareMessage('product', {
        id: product._id,
        name: product.name,
        brand: product.marque,
        price: pricing.current,
        priceFormatted: `${formatPrice(pricing.current)} CFA`,
      });
      await Share.share({ message, url, title: `${product.name} - Ihambaobab` });
    } catch {
      // partage annulé
    }
  }, [pricing.current, product]);

  const requireAuth = useCallback(
    () => navigation.navigate('QuickAuth', { returnScreen: 'ProductDetail', returnParams: { product, productId: product?._id } }),
    [navigation, product],
  );

  const submitReview = useCallback(
    async ({ rating, text }) => {
      try {
        await addReview({ product, rating, text, userName: user?.name || 'Client' }).unwrap();
        return true;
      } catch {
        Toast.show({ type: 'error', text1: "Impossible de publier l'avis", text2: 'Réessayez dans un instant.' });
        return false;
      }
    },
    [addReview, product, user?.name],
  );

  // En-tête qui devient opaque en défilant au-delà de la galerie
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerBg = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [galleryHeight - 160, galleryHeight - 80], [0, 1], 'clamp'),
  }));

  // ── États de chargement / erreur ─────────────────────────────────────────────
  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.simpleHeader}>
          <IconButton name="chevron-back" onPress={() => navigation.goBack()} accessibilityLabel="Retour" />
        </View>
        {isLoading ? (
          <View style={styles.loadingBox}>
            <Skeleton height={width} radius={0} />
            <Skeleton height={20} width="70%" style={styles.mt16} />
            <Skeleton height={28} width="40%" style={styles.mt12} />
          </View>
        ) : (
          <EmptyState
            icon="search-outline"
            title="Produit introuvable"
            message={isError ? "Ce produit n'est plus disponible ou a été retiré par le vendeur." : undefined}
            actionLabel="Retour à l'accueil"
            onAction={() => navigation.navigate('MainTabs')}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
        <ImageGallery ref={galleryRef} images={images} height={galleryHeight} discount={pricing.discount} />

        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          {/* Prix */}
          <View style={styles.priceRow}>
            <Text variant="priceLg" color={pricing.original ? 'danger' : 'text'}>
              {formatPrice(pricing.current)}
              <Text variant="title" color={pricing.original ? 'danger' : 'text'}> FCFA</Text>
            </Text>
            {pricing.original ? (
              <Text variant="body" color="textMuted" style={styles.strike}>{formatPrice(pricing.original)}</Text>
            ) : null}
          </View>
          {pricing.original ? (
            <View style={[styles.saveBadge, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="pricetag" size={12} color={colors.success} />
              <Text variant="caption" color="success">
                Vous économisez {formatPrice(pricing.original - pricing.current)} FCFA
              </Text>
            </View>
          ) : null}

          {/* Titre + note */}
          <Text variant="h1" style={styles.title}>{product.name}</Text>
          <View style={styles.metaRow}>
            {product.marque ? <Text variant="smallMedium" color="primaryDark">{capitalize(product.marque)}</Text> : null}
            {count > 0 ? (
              <PressableScale
                onPress={() => scrollRef.current?.scrollTo({ y: reviewsY.current - 80, animated: true })}
                style={styles.ratingInline}
                accessibilityLabel={`Note ${avg.toFixed(1)} sur 5, ${count} avis`}
              >
                <Stars value={avg} size={13} />
                <Text variant="small" color="textSecondary">{avg.toFixed(1)} ({count})</Text>
              </PressableScale>
            ) : null}
          </View>

          {/* Stock */}
          {hasStockInfo ? (
            <View style={[styles.stock, { backgroundColor: outOfStock ? colors.dangerSoft : stock <= 5 ? colors.warningSoft : colors.successSoft }]}>
              <View style={[styles.stockDot, { backgroundColor: outOfStock ? colors.danger : stock <= 5 ? colors.warning : colors.success }]} />
              <Text variant="smallMedium" color={outOfStock ? 'danger' : stock <= 5 ? 'wood' : 'success'}>
                {outOfStock ? 'Épuisé' : stock <= 5 ? `Plus que ${stock} en stock — commandez vite` : 'En stock'}
              </Text>
            </View>
          ) : null}
        </View>

        <VariantPicker variants={variants} selected={variant} onSelect={onSelectVariant} size={size} onSelectSize={setSize} />

        {/* Quantité */}
        {!outOfStock ? (
          <View style={styles.qtyRow}>
            <Text variant="title">Quantité</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} max={maxQty} />
          </View>
        ) : null}

        {/* Livraison : d'où, vers où, frais et délai réels */}
        <DeliveryEstimate productId={product._id} sellerId={sellerIdOf(product)} quantity={quantity} style={styles.delivery} />
        <View style={[styles.infoCard, styles.infoCardTight, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text variant="title">Achat protégé</Text>
            <Text variant="small" color="textSecondary">Paiement sécurisé par mobile money ou carte. Support local 7j/7.</Text>
          </View>
        </View>

        <SellerCard
          seller={typeof product.Clefournisseur === 'object' ? product.Clefournisseur : null}
          onPress={() =>
            navigation.navigate('Boutique', {
              sellerId: product.Clefournisseur?._id,
              storeName: product.Clefournisseur?.storeName || product.Clefournisseur?.name,
            })
          }
        />
        {sellerIdOf(product) ? (
          <PressableScale
            onPress={() => contactStore({
              sellerId: String(sellerIdOf(product)),
              storeName: product.Clefournisseur?.storeName || product.Clefournisseur?.name,
              storeLogo: product.Clefournisseur?.logo,
              productId: product._id,
            })}
            scaleTo={0.98}
            style={[styles.contactBtn, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
            accessibilityLabel="Poser une question à la boutique"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primaryDark} />
            <Text variant="smallMedium" color="primaryDark">Poser une question à la boutique</Text>
          </PressableScale>
        ) : null}

        {/* Description */}
        {description ? (
          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>Description</Text>
            <Text variant="body" color="textSecondary">
              {expanded || description.length <= DESCRIPTION_PREVIEW ? description : `${description.slice(0, DESCRIPTION_PREVIEW).trim()}…`}
            </Text>
            {description.length > DESCRIPTION_PREVIEW ? (
              <PressableScale onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.readMore}>
                <Text variant="smallMedium" color="primary">{expanded ? 'Réduire' : 'Lire la suite'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {/* Caractéristiques */}
        {product.marque || product.shipping?.weight || product.shipping?.origine || variants.length ? (
          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>Caractéristiques</Text>
            <View style={[styles.specs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                product.marque && ['Marque', capitalize(product.marque)],
                product.shipping?.origine && ['Origine', product.shipping.origine],
                Number(product.shipping?.weight) > 0 && ['Poids', `${product.shipping.weight} kg`],
                variants.length && ['Couleurs', variants.map((v) => v.color).join(', ')],
              ]
                .filter(Boolean)
                .map(([k, v], i, arr) => (
                  <View key={k} style={[styles.specRow, i < arr.length - 1 && [styles.specDivider, { borderBottomColor: colors.border }]]}>
                    <Text variant="small" color="textSecondary">{k}</Text>
                    <Text variant="smallMedium" style={styles.specValue} numberOfLines={2}>{v}</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}

        <View onLayout={(e) => { reviewsY.current = e.nativeEvent.layout.y; }}>
          <ReviewsSection
            reviews={reviews}
            loading={reviewsQuery.isLoading}
            user={user}
            onRequireAuth={requireAuth}
            onSubmitReview={submitReview}
            submitting={postingReview}
          />
        </View>

        <ProductRail title="Vous aimerez aussi" icon="sparkles" products={similar} loading={similarQuery.isLoading} />
      </Animated.ScrollView>

      {/* En-tête flottant */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, styles.topBarBg, { backgroundColor: colors.surface }, headerBg]} />
        <IconButton name="chevron-back" onPress={() => navigation.goBack()} elevated accessibilityLabel="Retour" />
        <Animated.View style={[styles.topTitle, headerBg]} pointerEvents="none">
          <Text variant="title" numberOfLines={1}>{product.name}</Text>
        </Animated.View>
        <View style={styles.topActions}>
          <IconButton name="share-social-outline" onPress={handleShare} elevated accessibilityLabel="Partager" />
          <IconButton
            name={liked ? 'heart' : 'heart-outline'}
            color={liked ? colors.danger : colors.text}
            onPress={() => like(product)}
            elevated
            accessibilityLabel={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          />
          <IconButton name="bag-handle-outline" badge={cartCount} onPress={() => navigation.navigate('Cart')} elevated accessibilityLabel="Panier" />
        </View>
      </View>

      {/* Barre d'achat fixe */}
      <View style={[styles.buyBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {outOfStock ? (
          <Button title="Produit épuisé" variant="dark" full disabled size="lg" style={styles.flex} />
        ) : (
          <>
            <Button title="Ajouter" icon="bag-add-outline" variant="secondary" size="lg" onPress={() => handleAdd(false)} style={styles.flex} full />
            <Button title="Acheter" size="lg" onPress={() => handleAdd(true)} style={styles.flex} full />
          </>
        )}
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  simpleHeader: { paddingHorizontal: GUTTER, paddingVertical: 8 },
  loadingBox: { paddingHorizontal: 0 },

  sheet: {
    marginTop: -24, backgroundColor: colors.bg, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    paddingHorizontal: GUTTER, paddingTop: 22,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  saveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: colors.successSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  title: { marginTop: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' },
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 14, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  stockOk: { backgroundColor: colors.successSoft },
  stockLow: { backgroundColor: colors.warningSoft },
  stockOut: { backgroundColor: colors.dangerSoft },
  stockDot: { width: 8, height: 8, borderRadius: 4 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: GUTTER, marginTop: 24 },

  infoCard: {
    flexDirection: 'row', gap: 12, marginHorizontal: GUTTER, marginTop: 24, padding: 14,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  infoCardTight: { marginTop: 10 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: GUTTER, marginTop: 10,
    paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft,
  },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  delivery: { marginHorizontal: GUTTER, marginTop: 24 },

  section: { paddingHorizontal: GUTTER, marginTop: 32 },
  sectionTitle: { marginBottom: 10 },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  specs: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12 },
  specDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  specValue: { flex: 1, textAlign: 'right' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: GUTTER, paddingBottom: 8, gap: 10,
  },
  topBarBg: { backgroundColor: colors.surface, ...shadows.sm },
  topTitle: { flex: 1 },
  topActions: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },

  buyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10,
    paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, ...shadows.lg,
  },
}));
