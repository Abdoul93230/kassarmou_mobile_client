# 📋 Navigation ProductListScreen - Documentation

## 🎯 Vue d'ensemble

La page `ProductListScreen` est une page versatile qui peut afficher des produits filtrés soit par **catégorie** soit par **marque**.

---

## 📦 Paramètres Acceptés

```javascript
{
  categoryId: string,    // ID de la catégorie (optionnel)
  categoryName: string,  // Nom de la catégorie (optionnel)
  marque: string,        // Nom de la marque (optionnel)
  title: string         // Titre à afficher (optionnel, fallback sur categoryName ou marque)
}
```

---

## 🔀 Cas d'Utilisation

### **1️⃣ Navigation par Catégorie** (depuis CategoryScreen)

```javascript
// CategoryScreen.js - Ligne 81
navigation.navigate('ProductListScreen', {
  categoryId: category._id,      // Ex: "507f1f77bcf86cd799439011"
  categoryName: category.name,   // Ex: "Cosmétiques"
});
```

**Filtrage appliqué :**
```javascript
filtered = products.filter(p => p.ClefCategorie === categoryId);
```

**UI affichée :**
- Badge: 🏷️ **Catégorie**
- Titre: **Cosmétiques**
- Stats: **25 produits**

---

### **2️⃣ Navigation par Marque** (depuis ProductDetailScreen)

```javascript
// ProductDetailScreen.js - Ligne 783
navigation.navigate('ProductListScreen', { 
  marque: product.marque,           // Ex: "Kassarmou"
  title: product.marque || 'Produits'
});
```

**Filtrage appliqué :**
```javascript
filtered = products.filter(p => p.marque === marque);
```

**UI affichée :**
- Badge: 🛡️ **Marque**
- Titre: **Kassarmou**
- Stats: **10 produits**

---

## 🧩 Structure du Code

### **ProductListScreen.js**

#### **1. Extraction des paramètres (Ligne 65-69)**
```javascript
const { categoryId, categoryName, marque, title } = route.params || {};

// Determine the display title
const displayTitle = title || categoryName || 'Produits';
```

#### **2. Chargement initial (Ligne 91-97)**
```javascript
useEffect(() => {
  console.log('📦 [ProductListScreen] Params:', { categoryName, categoryId, marque, title });
  dispatch(getProducts());
  
  if (user?.id) {
    dispatch(fetchUserLikes(user.id));
  }
}, [dispatch, categoryId, marque, user?.id]);
```

#### **3. Filtrage des produits (Ligne 99-116)**
```javascript
useEffect(() => {
  if (products.length > 0) {
    let filtered = products;
    
    // Filter by category if categoryId is provided
    if (categoryId) {
      filtered = filtered.filter((product) => product.ClefCategorie === categoryId);
      console.log('📦 [ProductListScreen] Filtered by category:', filtered.length);
    }
    
    // Filter by marque if marque is provided
    if (marque) {
      filtered = filtered.filter((product) => product.marque === marque);
      console.log('🏷️ [ProductListScreen] Filtered by marque:', marque, 'Count:', filtered.length);
    }
    
    applyFiltersAndSort(filtered);
  }
}, [products, categoryId, marque, sortBy, searchQuery]);
```

#### **4. UI Adaptative - Badge (Ligne 572-580)**
```javascript
<View style={styles.categoryBadge}>
  <MaterialCommunityIcons 
    name={marque ? "shield-check" : "tag"}  // Icône dynamique
    size={16} 
    color="#FFFFFF" 
  />
  <Text style={styles.categoryBadgeText}>
    {marque ? 'Marque' : 'Catégorie'}  // Label dynamique
  </Text>
</View>
```

#### **5. UI Adaptative - Titre (Ligne 582-584)**
```javascript
<Text style={styles.heroTitle} numberOfLines={2}>
  {displayTitle}  // Affiche marque ou categoryName
</Text>
```

#### **6. Message Vide Personnalisé (Ligne 374-379)**
```javascript
<Text style={styles.emptySubtitle}>
  {marque 
    ? `Aucun produit de la marque "${marque}" disponible pour le moment`
    : 'Aucun produit disponible dans cette catégorie pour le moment'
  }
</Text>
```

---

## 🔍 Logs de Débogage

Quand tu navigues vers ProductListScreen, tu verras ces logs :

### **Navigation par Catégorie :**
```
📂 [CategoryScreen] Navigate to category: Cosmétiques
📦 [ProductListScreen] Params: {categoryName: "Cosmétiques", categoryId: "507f...", marque: undefined, title: undefined}
📦 [ProductListScreen] Filtered by category: 25
```

### **Navigation par Marque :**
```
🔍 [ProductDetail] Navigating to ProductListScreen with marque: Kassarmou
📦 [ProductListScreen] Params: {categoryName: undefined, categoryId: undefined, marque: "Kassarmou", title: "Kassarmou"}
🏷️ [ProductListScreen] Filtered by marque: Kassarmou Count: 10
```

---

## ✅ Validation de l'Implémentation

### **Points vérifiés :**

- ✅ Route `ProductListScreen` existe dans AppNavigator.js (Ligne 176)
- ✅ Paramètres `categoryId` et `categoryName` fonctionnent (CategoryScreen)
- ✅ Paramètres `marque` et `title` ajoutés (ProductDetailScreen)
- ✅ Filtrage par catégorie : `product.ClefCategorie === categoryId`
- ✅ Filtrage par marque : `product.marque === marque`
- ✅ Badge et titre adaptatifs selon le type de navigation
- ✅ Message vide personnalisé
- ✅ Logs de débogage complets

### **Structure des Produits :**
```javascript
{
  _id: "6824aaeefe39504ab9ff99f7",
  name: "Kouka Colorée",
  marque: "Kassarmou",           // ← Champ utilisé pour le filtrage
  ClefCategorie: "507f...",      // ← Champ utilisé pour le filtrage catégorie
  prix: 35.50,
  prixPromo: 0,
  isdisponible: true,
  image1: "https://...",
  // ... autres champs
}
```

---

## 🚀 Comment Tester

1. **Test Catégorie :**
   - Va sur l'onglet "Catégories"
   - Clique sur une catégorie (ex: "Cosmétiques")
   - Vérifie que tous les produits de cette catégorie s'affichent

2. **Test Marque :**
   - Va sur la page d'accueil
   - Clique sur un produit
   - Scroll jusqu'à "Produits Similaires"
   - Clique sur "Voir tout"
   - Vérifie que tous les produits de la même marque s'affichent

3. **Test Recherche :**
   - Dans ProductListScreen, clique sur l'icône 🔍
   - Tape un mot-clé
   - Vérifie que les résultats sont filtrés

4. **Test Tri :**
   - Clique sur l'icône de tri
   - Sélectionne "Prix croissant"
   - Vérifie que les produits sont triés

---

## 🎨 UI/UX

### **Header Hero Section :**
```
┌──────────────────────────────────────┐
│  ← [Retour]                   [🔍] [⊞] │
│                                      │
│  🛡️ Marque                           │
│  Kassarmou                           │
│                                      │
│  📦 10 produits  |  🏷️ 3 en promo    │
└──────────────────────────────────────┘
```

### **Sticky Bar (au scroll) :**
```
┌──────────────────────────────────────┐
│  ← Kassarmou               [🔍] [⊞]  │
└──────────────────────────────────────┘
```

### **Grille de Produits :**
```
┌──────────┬──────────┐
│ Produit 1│ Produit 2│
│ €35.50   │ €42.00   │
└──────────┴──────────┘
┌──────────┬──────────┐
│ Produit 3│ Produit 4│
│ €28.00   │ €55.00   │
└──────────┴──────────┘
```

---

## 🔧 Maintenance Future

### **Pour ajouter un nouveau type de filtre :**

1. Ajouter le paramètre dans `route.params`
2. Ajouter le filtrage dans le `useEffect` (ligne 99)
3. Adapter le badge/titre si nécessaire (ligne 572)
4. Ajouter un log de débogage
5. Mettre à jour le message vide

**Exemple - Filtrage par Prix :**
```javascript
// 1. Extraction
const { categoryId, categoryName, marque, title, maxPrice } = route.params || {};

// 2. Filtrage
if (maxPrice) {
  filtered = filtered.filter(p => p.prix <= maxPrice);
  console.log('💰 Filtered by maxPrice:', maxPrice, 'Count:', filtered.length);
}

// 3. UI
<MaterialCommunityIcons 
  name={maxPrice ? "cash" : marque ? "shield-check" : "tag"}
/>
```

---

## 📝 Notes Importantes

- **Performance :** Le filtrage se fait côté client, pas côté API
- **Ordre des filtres :** Catégorie → Marque → Recherche → Tri
- **Fallback :** Si aucun paramètre, affiche tous les produits
- **Navigation :** Utilise `navigation.navigate` (pas `push`) pour éviter l'empilement

---

**Dernière mise à jour :** 30 octobre 2025
**Version :** 1.0.0
**Auteur :** Équipe Kassarmou Mobile
