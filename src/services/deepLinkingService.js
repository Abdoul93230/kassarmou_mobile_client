import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

/**
 * Service de Deep Linking pour Ihambaobab
 * Gère les liens universels entre l'app mobile et le site web
 */
class DeepLinkingService {
  constructor() {
    this.listeners = [];
    this.navigationRef = null;
    this.baseWebUrl = 'https://ihambaobab.com';
    this.baseApiUrl = 'https://ihambackend.onrender.com';
  }

  /**
   * Initialiser le service de deep linking
   * @param {Object} navigationRef - Référence à la navigation React Navigation
   */
  initialize(navigationRef) {
    console.log('🔗 Initialisation du Deep Linking Service');
    this.navigationRef = navigationRef;

    // Gérer l'ouverture depuis un lien (app fermée)
    Linking.getInitialURL()
      .then(url => {
        if (url) {
          console.log('📱 App ouverte depuis un lien (fermée):', url);
          // Attendre que la navigation soit prête
          setTimeout(() => this.handleDeepLink(url), 1000);
        }
      })
      .catch(err => console.error('Erreur getInitialURL:', err));

    // Gérer l'ouverture depuis un lien (app en background ou active)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('📱 App ouverte depuis un lien (background):', url);
      this.handleDeepLink(url);
    });

    this.listeners.push(subscription);
  }

  /**
   * Parser l'URL et naviguer vers l'écran approprié
   * @param {string} url - L'URL du deep link
   */
  async handleDeepLink(url) {
    try {
      console.log('🔍 Traitement du deep link:', url);
      
      const parsed = Linking.parse(url);
      console.log('📦 URL parsée:', parsed);
      
      const { hostname, path, queryParams } = parsed;
      
      // Extraire les segments du path
      const segments = path ? path.split('/').filter(Boolean) : [];
      
      if (segments.length === 0) {
        // URL racine - aller à Home
        console.log('🏠 Navigation vers Home');
        this.navigate('Home');
        return;
      }

      const [rawType, id, ...rest] = segments;
      const type = String(rawType || '').toLowerCase();

      switch (type) {
        // Routes web exactes
        case 'produitdetail':
          await this.navigateToProduct(id, queryParams);
          break;

        case 'boutique':
          this.navigateToBoutique(id, queryParams);
          break;

        case 'profile_boutiquier':
          this.navigateToSeller(id, queryParams);
          break;

        case 'categorie':
          this.navigateToCategory(id, queryParams);
          break;

        case 'search':
          this.navigateToSearch(queryParams);
          break;

        default:
          console.log('⚠️ Type de lien non géré:', type);
          this.navigate('Home');
      }
    } catch (error) {
      console.error('❌ Erreur lors du traitement du deep link:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir ce lien. Vous allez être redirigé vers l\'accueil.',
        [{ text: 'OK', onPress: () => this.navigate('Home') }]
      );
    }
  }

  /**
   * Naviguer vers l'écran de détails d'un produit
   * @param {string} productId - ID du produit
   * @param {Object} queryParams - Paramètres de requête additionnels
   */
  async navigateToProduct(productId, queryParams = {}) {
    try {
      console.log('🛍️ Chargement du produit:', productId);
      
      // Afficher un indicateur de chargement
      // Vous pouvez utiliser un modal de chargement ici

      // Charger les détails du produit depuis l'API
      const response = await fetch(
        `${this.baseApiUrl}/produits/${productId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const product = await response.json();
      console.log('✅ Produit chargé:', product.name);

      // Naviguer vers ProductDetail avec le produit
      this.navigate('ProductDetail', { product });
    } catch (error) {
      console.error('❌ Erreur chargement produit:', error);
      Alert.alert(
        'Produit introuvable',
        'Ce produit n\'existe pas ou n\'est plus disponible.',
        [{ text: 'OK', onPress: () => this.navigate('Home') }]
      );
    }
  }

  /**
   * Naviguer vers une boutique
   * @param {string} storeNameOrId - Nom de la boutique (utilisé dans l'URL web)
   * @param {Object} queryParams - Paramètres de requête additionnels
   */
  async navigateToBoutique(storeNameOrId, queryParams = {}) {
    console.log('🏪 Navigation vers boutique:', storeNameOrId);
    
    try {
      // Si c'est un nom de boutique (comme sur le web), chercher le vendeur
      // Sinon traiter comme un ID direct
      const storeName = decodeURIComponent(storeNameOrId);
      
      // Pour l'instant, on navigue directement avec le nom
      // L'app Boutique devra gérer la recherche par nom si nécessaire
      this.navigate('Boutique', { 
        storeName,
        sellerId: queryParams?.sellerId || null
      });
    } catch (error) {
      console.error('❌ Erreur navigation boutique:', error);
      this.navigate('Home');
    }
  }

  /**
   * Naviguer vers le profil d'un vendeur
   * @param {string} sellerId - ID du vendeur
   * @param {Object} queryParams - Paramètres de requête additionnels
   */
  navigateToSeller(sellerId, queryParams = {}) {
    console.log('👤 Navigation vers profil vendeur:', sellerId);
    this.navigate('SellerDetail', { sellerId });
  }

  /**
   * Naviguer vers une liste de produits par catégorie
   * @param {string} categoryId - ID de la catégorie
   * @param {Object} queryParams - Paramètres de requête (nom, filtres, etc.)
   */
  navigateToCategory(categoryId, queryParams = {}) {
    console.log('📂 Navigation vers catégorie:', categoryId);
    const categoryName = queryParams?.name || 'Catégorie';
    this.navigate('ProductListScreen', { categoryId, categoryName });
  }

  /**
   * Naviguer vers l'écran de recherche
   * @param {Object} queryParams - Paramètres de recherche (query, filtres, etc.)
   */
  navigateToSearch(queryParams = {}) {
    console.log('🔍 Navigation vers recherche:', queryParams);
    const query = queryParams?.q || '';
    this.navigate('Search', { initialQuery: query });
  }

  /**
   * Helper pour naviguer de manière sécurisée
   * @param {string} screen - Nom de l'écran
   * @param {Object} params - Paramètres de navigation
   */
  navigate(screen, params = {}) {
    const nav = this.navigationRef?.current || this.navigationRef;

    if (nav?.isReady && nav.isReady()) {
      console.log(`🧭 Navigation vers ${screen}`, params);
      nav.navigate(screen, params);
    } else {
      console.log('⏳ Navigation non prête, nouvelle tentative dans 500ms');
      setTimeout(() => this.navigate(screen, params), 500);
    }
  }

  /**
   * Générer un lien de partage universel
   * @param {string} type - Type de ressource (product, boutique, seller, category)
   * @param {string} id - ID de la ressource
   * @param {Object} additionalParams - Paramètres additionnels
   * @returns {string} URL complète
   */
  generateShareLink(type, id, additionalParams = {}) {
    let path = '';

    switch (type) {
      case 'product':
        path = `/ProduitDetail/${id}`;
        break;
      case 'boutique':
        path = `/boutique/${id}`;
        break;
      case 'seller':
        path = `/Profile_boutiquier/${id}`;
        break;
      case 'category':
        path = `/Categorie/${id}`;
        break;
      default:
        path = '/';
    }

    // Ajouter les paramètres de requête
    const params = new URLSearchParams(additionalParams).toString();
    const queryString = params ? `?${params}` : '';

    const fullUrl = `${this.baseWebUrl}${path}${queryString}`;
    console.log('🔗 Lien généré:', fullUrl);
    
    return fullUrl;
  }

  /**
   * Générer un message de partage formaté
   * @param {string} type - Type de ressource
   * @param {Object} data - Données de la ressource
   * @returns {Object} Message et URL de partage
   */
  generateShareMessage(type, data) {
    let message = '';
    let url = '';

    switch (type) {
      case 'product':
        url = this.generateShareLink('product', data.id, {
          name: data.name,
          price: data.price
        });
        message = `🛍️ Découvrez ${data.name} de ${data.brand} sur Ihambaobab!\n\n💰 Prix: ${data.priceFormatted}\n\n${url}`;
        break;

      case 'boutique':
        url = this.generateShareLink('boutique', data.id, {
          name: data.name
        });
        message = `🏪 Visitez ${data.name} sur Ihambaobab!\n\n${url}`;
        break;

      case 'seller':
        url = this.generateShareLink('seller', data.id);
        message = `👤 Découvrez le profil de ${data.name} sur Ihambaobab!\n\n${url}`;
        break;

      default:
        url = this.baseWebUrl;
        message = `🌳 Découvrez Ihambaobab - Votre marketplace préférée!\n\n${url}`;
    }

    return { message, url };
  }

  /**
   * Nettoyer les listeners lors de la destruction du service
   */
  cleanup() {
    console.log('🧹 Nettoyage du Deep Linking Service');
    this.listeners.forEach(listener => {
      if (listener && listener.remove) {
        listener.remove();
      }
    });
    this.listeners = [];
  }
}

// Export singleton
export default new DeepLinkingService();
