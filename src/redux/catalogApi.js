import { createApi } from '@reduxjs/toolkit/query/react';
import apiClient from '../config/api';

/**
 * Couche de données catalogue (RTK Query) :
 * cache partagé entre écrans, déduplication des requêtes, pagination infinie.
 * Toutes les requêtes passent par apiClient (URL centralisée, token, retries).
 */
const axiosBaseQuery = async ({ url, method = 'get', data, params }) => {
  try {
    const res = await apiClient({ url, method, data, params });
    return { data: res.data };
  } catch (error) {
    return {
      error: {
        status: error.response?.status || 'FETCH_ERROR',
        data: error.response?.data?.message || error.message,
      },
    };
  }
};

export const PAGE_SIZE = 20;

/**
 * Règle d'or côté client : seuls les produits PUBLIÉS et non supprimés sont affichés,
 * quelle que soit la réponse du serveur. (Le fil d'accueil ne renvoie pas isPublished :
 * il est déjà filtré côté serveur, d'où la tolérance pour un champ absent.)
 */
export const isVisibleProduct = (p) =>
  !!p && !p.isDeleted && (p.isPublished === undefined || p.isPublished === 'Published');

const visibleOnly = (list) => (Array.isArray(list) ? list.filter(isVisibleProduct) : []);

/** Normalise toutes les réponses paginées du backend : { items, page, pages, total } */
const toPage = (res, fallbackPage = 1) => {
  const items = res?.data ?? res?.products ?? (Array.isArray(res) ? res : []);
  return {
    items: visibleOnly(items),
    page: Number(res?.page) || fallbackPage,
    pages: Number(res?.pages) || 1,
    total: Number(res?.total) || (Array.isArray(items) ? items.length : 0),
  };
};

const infinitePaging = {
  initialPageParam: 1,
  getNextPageParam: (lastPage, _all, lastPageParam) =>
    lastPage.page < lastPage.pages && lastPage.items.length > 0 ? lastPageParam + 1 : undefined,
};

export const catalogApi = createApi({
  reducerPath: 'catalogApi',
  baseQuery: axiosBaseQuery,
  keepUnusedDataFor: 300, // 5 min : retour instantané sur un écran déjà visité
  refetchOnReconnect: true,
  tagTypes: ['Reviews', 'Orders'],
  endpoints: (build) => ({
    /** Liste de produits (une page) — rails de l'accueil. args : { sort, promo, category, type, limit } */
    products: build.query({
      query: ({ limit = 12, ...filters } = {}) => ({ url: '/ProductsClients', params: { page: 1, limit, ...filters } }),
      transformResponse: (res) => toPage(res).items,
    }),

    /** Liste infinie filtrable — args : { sort, promo, category, type, minPrice, maxPrice } */
    productFeed: build.infiniteQuery({
      query: ({ queryArg, pageParam }) => ({
        url: '/ProductsClients',
        params: { ...queryArg, page: pageParam, limit: PAGE_SIZE },
      }),
      transformResponse: (res) => toPage(res),
      infiniteQueryOptions: infinitePaging,
    }),

    /** Recherche plein texte paginée */
    // queryArg : terme (texte) ou { term, minPrice, maxPrice, sort }
    search: build.infiniteQuery({
      query: ({ queryArg, pageParam }) => {
        const a = typeof queryArg === 'string' ? { term: queryArg } : queryArg || {};
        return {
          url: `/searchProductByName/${encodeURIComponent(a.term || '')}`,
          params: {
            page: pageParam,
            limit: PAGE_SIZE,
            ...(a.minPrice > 0 ? { minPrice: a.minPrice } : {}),
            ...(a.maxPrice > 0 ? { maxPrice: a.maxPrice } : {}),
            ...(a.sort && a.sort !== 'relevance' ? { sort: a.sort } : {}),
          },
        };
      },
      transformResponse: (res) => toPage(res),
      infiniteQueryOptions: infinitePaging,
    }),

    /** Fil « Pour vous » (sélection variée) */
    homeFeed: build.query({
      query: (limit = 20) => ({ url: '/ProductsHome', params: { limit } }),
      transformResponse: (res) => toPage(res).items,
    }),

    /** Produit seul (liens partagés, deep links) */
    product: build.query({
      query: (id) => ({ url: `/ProductClient/${id}` }),
      transformResponse: (res) => (isVisibleProduct(res?.data) ? res.data : null),
    }),

    /** Avis d'un produit (plus récents d'abord) */
    productReviews: build.query({
      query: (id) => ({ url: `/getAllCommenteProduitById/${id}` }),
      transformResponse: (res) =>
        (Array.isArray(res?.data) ? res.data : []).sort(
          (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0),
        ),
      providesTags: (_r, _e, id) => [{ type: 'Reviews', id }],
    }),

    /** Publier un avis — même format que le web */
    addReview: build.mutation({
      query: ({ product, rating, text, userName }) => ({
        url: '/createCommenteProduit',
        method: 'post',
        data: {
          description: text,
          clefProduct: product._id,
          clefType: product.ClefType,
          etoil: rating,
          userName,
        },
      }),
      invalidatesTags: (_r, _e, { product }) => [{ type: 'Reviews', id: product._id }],
    }),

    /** Produits d'un même type (produits similaires) */
    productsByType: build.query({
      query: (type) => ({ url: `/searchProductByType/${type}`, params: { page: 1, limit: 12 } }),
      transformResponse: (res) => toPage(res).items,
    }),

    /** Boutiques visibles par les clients */
    stores: build.query({
      query: () => ({ url: '/getSellersClients' }),
      transformResponse: (res) => (Array.isArray(res?.data) ? res.data : []),
    }),

    /** Vendeur public (par id) */
    store: build.query({
      query: (sellerId) => ({ url: `/getSellerClients/${sellerId}` }),
      transformResponse: (res) => res?.data || null,
    }),

    /** Vendeur public (par nom de boutique — liens ihambaobab.com/boutique/<nom>) */
    storeByName: build.query({
      query: (name) => ({ url: `/getSellerByNameClients/${encodeURIComponent(name)}` }),
      transformResponse: (res) => res?.data || null,
    }),

    /** Bannières marketing de la boutique */
    storeBanners: build.query({
      query: (sellerId) => ({ url: `/api/marketing/Bannerss/${sellerId}` }),
      transformResponse: (res) => (Array.isArray(res?.data) ? res.data.filter((b) => b.active !== false && b.image) : []),
    }),

    /** Sous-catégories proposées par la boutique */
    storeTypes: build.query({
      query: (sellerId) => ({ url: `/getAllTypeBySeller/${sellerId}` }),
      transformResponse: (res) => (Array.isArray(res?.data) ? res.data : []),
    }),

    /** Statistiques sociales (abonnés, j'aime, note) */
    storeStats: build.query({
      query: (sellerId) => ({ url: `/api/sellers/${sellerId}/stats` }),
      transformResponse: (res) => res?.stats || null,
    }),

    /** Produits aimés par l'utilisateur (plus récents d'abord, produits retirés exclus) */
    likedProducts: build.query({
      query: (userId) => ({ url: `/likesClient/user/${userId}` }),
      transformResponse: (res) =>
        (Array.isArray(res?.data) ? res.data : [])
          .filter((l) => l?.produit?._id && isVisibleProduct(l.produit) && l.produit.isPublished === 'Published')
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .map((l) => l.produit),
    }),

    /** Commandes du client connecté (jeton requis), plus récentes d'abord */
    myOrders: build.query({
      query: (userId) => ({ url: `/getCommandesByClefUser/${userId}` }),
      transformResponse: (res) =>
        (Array.isArray(res?.commandes) ? res.commandes : []).sort(
          (a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0),
        ),
      providesTags: ['Orders'],
    }),

    /** Détail d'une commande */
    order: build.query({
      query: (id) => ({ url: `/getCommandesById/${id}` }),
      transformResponse: (res) => res?.commande || res?.data || null,
      providesTags: ['Orders'],
    }),

    /** Produits d'une boutique */
    storeProducts: build.query({
      query: (sellerId) => ({ url: `/searchProductBySupplierClients/${sellerId}`, params: { limit: 100 } }),
      transformResponse: (res) => toPage(res).items,
    }),
  }),
});

export const {
  useProductsQuery,
  useProductFeedInfiniteQuery,
  useSearchInfiniteQuery,
  useHomeFeedQuery,
  useProductQuery,
  useProductReviewsQuery,
  useAddReviewMutation,
  useProductsByTypeQuery,
  useStoresQuery,
  useStoreProductsQuery,
  useLikedProductsQuery,
  useMyOrdersQuery,
  useOrderQuery,
  useStoreQuery,
  useStoreByNameQuery,
  useStoreBannersQuery,
  useStoreTypesQuery,
  useStoreStatsQuery,
} = catalogApi;

/** Aplatit les pages d'une infiniteQuery en une liste unique sans doublon */
export const flattenPages = (data) => {
  if (!data?.pages) return [];
  const seen = new Set();
  const out = [];
  for (const page of data.pages) {
    for (const item of page.items) {
      if (item?._id && !seen.has(item._id)) {
        seen.add(item._id);
        out.push(item);
      }
    }
  }
  return out;
};
