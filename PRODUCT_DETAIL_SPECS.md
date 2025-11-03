# 📱 Spécifications - Page Détails Produit Mobile

## 🎯 Vue d'ensemble
Créer une page de détails produit moderne et complète pour l'application mobile, basée sur la version web, avec toutes les fonctionnalités essentielles.

---

## 📋 Fonctionnalités Principales

### 1. **Galerie d'Images**
- ✅ Carrousel d'images swipeable (image principale + variantes)
- ✅ Navigation précédent/suivant
- ✅ Miniatures cliquables en bas
- ✅ Badge de promotion (-X%)
- ✅ Zoom sur l'image (optionnel)

### 2. **Informations Produit**
- ✅ Nom du produit
- ✅ Marque
- ✅ Prix (normal + promo si applicable)
- ✅ Badge disponibilité (En stock / Rupture de stock)
- ✅ Note moyenne + nombre d'avis
- ✅ Bouton favori (cœur) avec animation

### 3. **Variantes**
- ✅ **Couleurs** : Miniatures cliquables (images ou couleurs)
- ✅ **Tailles** : Boutons de sélection (S, M, L, XL, etc.)
- ✅ Affichage de la variante sélectionnée
- ✅ Mise à jour du prix selon la variante

### 4. **Sélecteur de Quantité**
- ✅ Boutons +/- pour ajuster la quantité
- ✅ Affichage de la quantité actuelle
- ✅ Validation : minimum 1, maximum stock disponible

### 5. **Actions**
- ✅ **Ajouter au panier** : Ajoute au panier et affiche un toast
- ✅ **Acheter maintenant** : Ajoute au panier et navigue vers checkout
- ✅ **Ajouter aux favoris** : Toggle like avec Redux
- ✅ **Partager** : Options de partage (WhatsApp, Facebook, etc.)

### 6. **Onglets d'Informations**
- ✅ **Description** : Description HTML du produit
- ✅ **Spécifications** : Tableau avec marque, poids, couleurs, tailles
- ✅ **Avis** : Liste des commentaires clients avec notes

### 7. **Livraison**
- ✅ Zones de livraison disponibles
- ✅ Transporteur + frais de livraison
- ✅ Garantie qualité

### 8. **Navigation**
- ✅ Breadcrumb (Accueil > Produits > Nom du produit)
- ✅ Bouton retour dans le header

### 9. **Notifications**
- ✅ Toast pour ajout au panier
- ✅ Toast pour erreurs (variante/taille non sélectionnée)
- ✅ Toast pour ajout aux favoris

---

## 🗂️ Structure des Données

### **Produit**
```javascript
{
  _id: String,
  name: String,
  marque: String,
  prix: Number,
  prixPromo: Number,
  image1: String,
  image2: String,
  image3: String,
  description: String (HTML),
  isdisponible: Boolean,
  quantite: Number,
  stocks: Number,
  variants: [
    {
      color: String,
      colorCode: String,
      imageUrl: String,
      price: Number,
      promoPrice: Number,
      sizes: [String],
      stock: Number
    }
  ],
  shipping: {
    weight: Number,
    zones: [
      {
        name: String,
        transporteurName: String,
        baseFee: Number,
        weightFee: Number
      }
    ]
  }
}
```

---

## 🎨 Design Mobile

### **Layout**
1. **ScrollView** principal
2. **Header** : Image carousel + badges
3. **Section Info** : Nom, prix, notes, favoris
4. **Section Variantes** : Couleurs + Tailles
5. **Section Quantité** : Sélecteur +/-
6. **Section Actions** : 2 boutons (Ajouter au panier + Acheter)
7. **Onglets** : Description, Spécifications, Avis
8. **Section Livraison** : Infos transport
9. **Section Partage** : Boutons sociaux

### **Couleurs**
- Primary: `#30A08B` (Vert)
- Secondary: `#FC913A` (Orange)
- Blanc: `#FFFFFF`
- Gris: `#718096`
- Vert foncé: `#006B3F`

---

## 🔄 Logique Métier

### **Sélection de Variante**
1. Si le produit a des variantes (≥2), l'utilisateur DOIT choisir une couleur
2. Si la variante a plusieurs tailles (≥2), l'utilisateur DOIT choisir une taille
3. Le prix s'adapte selon la variante sélectionnée
4. L'image change selon la variante sélectionnée

### **Ajout au Panier**
```javascript
// Validation
if (!product.isdisponible) → Erreur "Produit non disponible"
if (variants.length >= 2 && !selectedVariant) → Erreur "Choisir un modèle"
if (hasMultipleSizes && !selectedSize) → Erreur "Choisir une taille"

// Ajout
const productToAdd = {
  ...product,
  colors: [selectedVariant.color],
  sizes: [selectedSize],
  quantity: quantity,
  imageUrl: selectedVariant.imageUrl || product.image1,
  price: discountedPrice || originalPrice
}

// Si produit existe déjà → incrémenter quantité
// Sinon → ajouter nouveau produit
```

### **Calcul Prix**
```javascript
// Prix de base
const basePrice = selectedVariant?.price || product.prix

// Prix promo
const promoPrice = selectedVariant?.promoPrice || product.prixPromo

// Prix final
const finalPrice = (promoPrice > 0 && promoPrice < basePrice) 
  ? promoPrice 
  : basePrice

// Pourcentage de réduction
const discount = Math.round(((basePrice - promoPrice) / basePrice) * 100)
```

---

## 📦 Composants à Créer

### **Fichiers**
```
src/screens/ProductDetailScreen.js (PRINCIPAL)
```

### **Dépendances**
- `react-native` : View, Text, ScrollView, TouchableOpacity, Image, FlatList
- `@expo/vector-icons` : Ionicons, MaterialCommunityIcons
- `expo-linear-gradient` : LinearGradient (boutons)
- `react-native-render-html` : Pour afficher la description HTML
- `redux` : toggleLike, addToCart
- `react-navigation` : navigation.navigate()

---

## ✅ Checklist de Développement

- [ ] Créer ProductDetailScreen.js
- [ ] Implémenter carrousel d'images
- [ ] Implémenter sélection variantes (couleurs)
- [ ] Implémenter sélection tailles
- [ ] Implémenter sélecteur de quantité
- [ ] Implémenter bouton ajout au panier
- [ ] Implémenter bouton acheter maintenant
- [ ] Implémenter toggle favoris
- [ ] Implémenter onglets (Description, Specs, Avis)
- [ ] Implémenter affichage HTML description
- [ ] Implémenter section livraison
- [ ] Implémenter partage social
- [ ] Gérer les validations (variante, taille)
- [ ] Gérer les toasts de notification
- [ ] Tester avec EAS Update

---

## 🚀 Prêt pour le développement !
