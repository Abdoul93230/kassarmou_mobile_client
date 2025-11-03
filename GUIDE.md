# Guide de développement - Kassarmou Mobile

## ✅ Ce qui est fait

### 1. Structure du projet
- ✅ Projet Expo SDK 54 créé sans TypeScript
- ✅ Architecture complète des dossiers (screens, components, redux, navigation, etc.)
- ✅ Toutes les dépendances installées

### 2. Configuration
- ✅ Configuration API avec Axios et intercepteurs
- ✅ Configuration des constantes (couleurs, clés Stripe, etc.)
- ✅ Fichier .env.example créé

### 3. Redux Store
- ✅ Store Redux configuré avec 4 slices :
  - **productsSlice** : Gestion des produits, catégories, bannières
  - **likesSlice** : Gestion des favoris
  - **authSlice** : Authentification (login, register, verify)
  - **cartSlice** : Gestion du panier avec AsyncStorage

### 4. Navigation
- ✅ React Navigation configuré avec :
  - Bottom Tabs (5 onglets : Home, Catégories, Panier, Favoris, Profil)
  - Stack Navigator pour les écrans détaillés
  - Badge sur le panier avec le nombre d'articles

### 5. Écrans créés
- ✅ **HomeScreen** : Complètement fonctionnel avec :
  - Chargement des produits
  - Bannières défilantes
  - Catégories
  - Section promotions
  - Grille de produits
  - Pull to refresh
- ✅ **LoginScreen** : Formulaire de connexion complet
- ✅ **Autres écrans** : Squelettes créés (à implémenter)

### 6. Serveur de développement
- ✅ Application lancée sur le port 8083
- ✅ QR code disponible pour tester sur téléphone

## 📋 Prochaines étapes recommandées

### Priorité 1 : Écrans essentiels
1. **RegisterScreen** - Inscription avec OTP (comme projet web)
2. **ProductDetailScreen** - Détail produit complet avec :
   - Images défilantes
   - Variantes (couleurs, tailles)
   - Ajout au panier
   - Bouton favoris
   - Commentaires
3. **CartScreen** - Panier d'achat avec :
   - Liste des produits
   - Modification quantités
   - Calcul du total
   - Bouton commander

### Priorité 2 : Fonctionnalités utilisateur
4. **ProfileScreen** - Profil utilisateur avec :
   - Informations personnelles
   - Adresses de livraison
   - Paramètres
   - Déconnexion
5. **OrdersScreen** - Liste des commandes
6. **OrderDetailScreen** - Détail d'une commande avec suivi
7. **CheckoutScreen** - Page de paiement Stripe

### Priorité 3 : Autres fonctionnalités
8. **CategoryScreen** - Liste produits par catégorie avec filtres
9. **SearchScreen** - Recherche de produits
10. **FavoritesScreen** - Liste des produits favoris
11. **MessagesScreen** - Messagerie temps réel avec Socket.io

## 🔧 Comment développer

### 1. Tester sur votre téléphone
```bash
# Scanner le QR code avec l'app Expo Go
# Disponible sur Play Store (Android) ou App Store (iOS)
```

### 2. Développer un écran
```javascript
// Exemple : src/screens/ProductDetailScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import apiClient from '../config/api';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    loadProduct();
  }, [productId]);
  
  const loadProduct = async () => {
    try {
      const response = await apiClient.get(`/api/productsRoutes/${productId}`);
      setProduct(response.data);
    } catch (error) {
      console.error(error);
    }
  };
  
  // ... Votre UI
}
```

### 3. Utiliser Redux
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { addItemToCart } from '../redux/cartSlice';

// Dans votre composant
const dispatch = useDispatch();
const user = useSelector(state => state.auth.user);

const handleAddToCart = () => {
  dispatch(addItemToCart({
    product: productData,
    quantity: 1,
  }));
};
```

### 4. Appels API
```javascript
import apiClient from '../config/api';

// GET
const response = await apiClient.get('/api/productsRoutes');

// POST
const response = await apiClient.post('/api/user/login', {
  email: 'test@test.com',
  password: '123456',
});
```

## 🐛 Problèmes connus

### Version Stripe
```bash
# Avertissement : @stripe/stripe-react-native version mismatch
# Solution : Mettre à jour ou ignorer (ne bloque pas le développement)
npx expo install @stripe/stripe-react-native@0.50.3
```

### Port déjà utilisé
Le port 8081 était occupé, l'app tourne sur 8083. Pas de problème.

## 📱 Tester l'application

### Sur téléphone physique
1. Télécharger **Expo Go** depuis :
   - Play Store (Android)
   - App Store (iOS)
2. Scanner le QR code dans le terminal
3. L'app se charge automatiquement

### Sur émulateur
```bash
# Android (nécessite Android Studio)
npm run android

# iOS (nécessite macOS et Xcode)
npm run ios
```

### Sur navigateur web
```bash
npm run web
# Ou appuyer sur 'w' dans le terminal Expo
```

## 🎨 Adapter le design du projet web

Pour reproduire un composant du projet web :

1. **Identifier le composant web** dans `kassarmou_Front_Client/src/components/`
2. **Adapter le JSX** :
   - `<div>` → `<View>`
   - `<span>`, `<p>`, `<h1>` → `<Text>`
   - `<img>` → `<Image>`
   - `<button>` → `<TouchableOpacity>` ou `<Pressable>`
3. **Adapter le CSS** :
   - CSS → StyleSheet.create()
   - className → style
   - flexbox fonctionne pareil !

Exemple :
```javascript
// Web
<div className="product-card">
  <img src={product.image} />
  <h3>{product.name}</h3>
</div>

// Mobile
<View style={styles.productCard}>
  <Image source={{ uri: product.image }} style={styles.image} />
  <Text style={styles.name}>{product.name}</Text>
</View>
```

## 🚀 Commandes utiles

```bash
# Démarrer le serveur
npm start

# Nettoyer le cache
npx expo start -c

# Installer une nouvelle dépendance
npx expo install nom-du-package

# Mettre à jour les dépendances Expo
npx expo install --fix

# Build pour production
eas build --platform android
eas build --platform ios
```

## 📞 Backend

L'app est configurée pour utiliser le backend existant :
- **Dev** : http://localhost:5000
- **Prod** : https://kassarmou-backend.onrender.com

Modifier dans `src/config/api.js` si besoin.

## ✨ Fonctionnalités à venir

- [ ] Notifications push avec Expo Notifications
- [ ] Partage de produits
- [ ] Mode sombre
- [ ] Langues multiples (FR/EN)
- [ ] Cache des images
- [ ] Mode hors ligne
- [ ] Deep linking
- [ ] Analytics

## 📚 Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native](https://reactnative.dev/)

---

**Bon développement ! 🎉**
