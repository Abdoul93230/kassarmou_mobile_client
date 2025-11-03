# 🎨 Guide des Couleurs - Kassarmou Mobile

## 🌈 Palette Simplifiée (4 couleurs uniquement)

### 1️⃣ Couleur Primaire - Teal
```javascript
primary: '#30A08B'
```
**🎯 Usage principal :**
- Logo et branding Kassarmou
- Boutons principaux (Commander, Valider, etc.)
- Headers et navigation
- Liens et éléments interactifs
- Messages de succès
- Icônes importantes

**Exemple :**
```jsx
<TouchableOpacity style={{ backgroundColor: COLORS.primary }}>
  <Text style={{ color: COLORS.white }}>Commander</Text>
</TouchableOpacity>
```

---

### 2️⃣ Couleur Secondaire - Orange
```javascript
secondary: '#FC913A'
```
**🎯 Usage principal :**
- Badges promotions et réductions
- Prix des produits
- Boutons d'action secondaires
- Alertes et notifications importantes
- Icônes d'alerte
- Call-to-action

**Exemple :**
```jsx
<View style={styles.promoBadge}>
  <Text style={{ color: COLORS.white }}>-30%</Text>
</View>

<Text style={{ color: COLORS.secondary, fontWeight: 'bold' }}>
  15 000 FCFA
</Text>
```

---

### 3️⃣ Couleur Tertiaire - Teal Clair
```javascript
tertiary: '#62aca2'
```
**🎯 Usage principal :**
- Arrière-plans de sections
- Informations complémentaires
- Badges informationnels
- Effets de hover/focus
- Dégradés avec primary

**Exemple :**
```jsx
<View style={{ backgroundColor: COLORS.tertiary }}>
  <Text>Section informative</Text>
</View>
```

---

### 4️⃣ Blanc et Noir
```javascript
white: '#FFFFFF'
black: '#000000'
```
**🎯 Usage principal :**
- **Blanc** : Arrière-plans cards, texte sur couleurs foncées
- **Noir** : Texte principal, titres, icônes

---

## 📋 Guide d'Utilisation

### ✅ Bonnes Pratiques

#### Bouton Principal
```jsx
const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: COLORS.primary,    // Teal
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,                // Blanc
    fontWeight: 'bold',
  }
});
```

#### Badge Promo
```jsx
const styles = StyleSheet.create({
  promoBadge: {
    backgroundColor: COLORS.secondary,  // Orange
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  promoText: {
    color: COLORS.white,                // Blanc
    fontWeight: 'bold',
  }
});
```

#### Prix Produit
```jsx
<Text style={{ color: COLORS.secondary, fontWeight: 'bold' }}>
  25 000 FCFA
</Text>
```

#### Card Produit
```jsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,      // Blanc
    borderRadius: 10,
    shadowColor: COLORS.black,          // Noir
    shadowOpacity: 0.1,
  },
  productName: {
    color: COLORS.black,                // Noir
    fontSize: 16,
  },
  price: {
    color: COLORS.secondary,            // Orange
    fontWeight: 'bold',
  }
});
```

---

## 🎨 Variations et Opacités

### Arrière-plans Légers
```jsx
// Primary light
backgroundColor: 'rgba(48, 160, 139, 0.1)'  // primary à 10%

// Secondary light  
backgroundColor: 'rgba(252, 145, 58, 0.1)'  // secondary à 10%

// Tertiary light
backgroundColor: 'rgba(98, 172, 162, 0.1)'  // tertiary à 10%
```

### Messages d'État
```jsx
// Succès (utilise primary)
const styles = StyleSheet.create({
  successMessage: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  successText: {
    color: COLORS.primary,
  }
});

// Alerte/Erreur (utilise secondary)
const styles = StyleSheet.create({
  errorMessage: {
    backgroundColor: COLORS.secondaryLight,
    borderColor: COLORS.secondary,
    borderWidth: 1,
  },
  errorText: {
    color: COLORS.secondary,
  }
});
```

---

## 🖼️ Exemples Complets

### 1. Card Produit Complète
```jsx
import { COLORS } from '../config/constants';

const ProductCard = ({ product }) => (
  <View style={styles.card}>
    <Image source={{ uri: product.image }} style={styles.image} />
    
    {/* Badge promo en orange */}
    {product.prixPromo > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PROMO</Text>
      </View>
    )}
    
    {/* Nom en noir */}
    <Text style={styles.name}>{product.name}</Text>
    
    {/* Prix en orange */}
    <Text style={styles.price}>{product.prix} FCFA</Text>
    
    {/* Bouton en teal */}
    <TouchableOpacity style={styles.button}>
      <Text style={styles.buttonText}>Voir</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
  },
  badge: {
    backgroundColor: COLORS.secondary,  // Orange
    padding: 5,
    borderRadius: 5,
  },
  badgeText: {
    color: COLORS.white,
  },
  name: {
    color: COLORS.black,                // Noir
    fontSize: 16,
  },
  price: {
    color: COLORS.secondary,            // Orange
    fontWeight: 'bold',
    fontSize: 18,
  },
  button: {
    backgroundColor: COLORS.primary,    // Teal
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: COLORS.white,
    textAlign: 'center',
  }
});
```

### 2. Header Navigation
```jsx
<View style={styles.header}>
  {/* Logo en teal */}
  <Text style={styles.logo}>KASSARMOU</Text>
  
  {/* Icônes en noir */}
  <Ionicons name="search" size={24} color={COLORS.black} />
</View>

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.white,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    color: COLORS.primary,              // Teal
    fontSize: 24,
    fontWeight: 'bold',
  }
});
```

### 3. Boutons
```jsx
{/* Bouton principal - Teal */}
<TouchableOpacity style={styles.primaryButton}>
  <Text style={styles.primaryButtonText}>Acheter</Text>
</TouchableOpacity>

{/* Bouton secondaire - Orange */}
<TouchableOpacity style={styles.secondaryButton}>
  <Text style={styles.secondaryButtonText}>Ajouter au panier</Text>
</TouchableOpacity>

{/* Bouton outline - Teal */}
<TouchableOpacity style={styles.outlineButton}>
  <Text style={styles.outlineButtonText}>Annuler</Text>
</TouchableOpacity>

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: COLORS.primary,    // Teal
    padding: 15,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,  // Orange
    padding: 15,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  outlineButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,        // Teal
    padding: 15,
    borderRadius: 8,
  },
  outlineButtonText: {
    color: COLORS.primary,              // Teal
    textAlign: 'center',
    fontWeight: 'bold',
  }
});
```

---

## 📊 Récapitulatif

| Couleur | Code | Usage Principal |
|---------|------|----------------|
| 🟢 **Primary** | `#30A08B` | Boutons principaux, logo, succès |
| 🟠 **Secondary** | `#FC913A` | Prix, promos, alertes, CTA |
| 🔵 **Tertiary** | `#62aca2` | Arrière-plans, infos |
| ⚪ **White** | `#FFFFFF` | Fonds, texte sur foncé |
| ⚫ **Black** | `#000000` | Texte principal, titres |

---

## 📱 Import

```javascript
import { COLORS } from '../config/constants';

// Utilisation
<View style={{ backgroundColor: COLORS.primary }}>
  <Text style={{ color: COLORS.white }}>Texte</Text>
</View>
```

---

## ✅ Règles à Respecter

1. ✅ **Toujours utiliser les constantes** `COLORS.*` au lieu des codes hex
2. ✅ **Primary (#30A08B)** pour les actions principales
3. ✅ **Secondary (#FC913A)** pour les prix et promotions
4. ✅ **Tertiary (#62aca2)** pour les informations
5. ✅ **White/Black** pour les textes et arrière-plans
6. ❌ **Ne PAS** ajouter d'autres couleurs

---

**Dernière mise à jour** : Octobre 29, 2025  
**Palette** : 4 couleurs principales uniquement

## 🌈 Palette Principale

### Couleur Primaire - Teal
```javascript
primary: '#30A08B'        // Couleur de marque principale
primaryLight: '#E6F2EF'   // Version claire pour arrière-plans
```
**Usage :**
- Logo et branding
- Boutons principaux
- Liens et éléments interactifs
- Headers et navigation

**Exemple :**
```jsx
<TouchableOpacity style={{ backgroundColor: COLORS.primary }}>
  <Text style={{ color: '#FFF' }}>Commander</Text>
</TouchableOpacity>
```

---

### Couleur Secondaire - Rouge Corail
```javascript
secondary: '#FF6969'      // Accent et actions importantes
```
**Usage :**
- Badges promotions
- Prix et réductions
- Boutons d'action secondaires
- Icônes importantes
- Scroll to top button

**Exemple :**
```jsx
<View style={styles.promoBadge}>
  <Text style={{ color: '#FFF' }}>-30%</Text>
</View>

const styles = StyleSheet.create({
  promoBadge: {
    backgroundColor: COLORS.secondary,
    padding: 5,
    borderRadius: 5,
  }
});
```

---

### Couleur Tertiaire - Teal Clair
```javascript
tertiary: '#62aca2'       // Arrière-plans et ambiance
```
**Usage :**
- Arrière-plan du body (comme sur le web)
- Sections spéciales
- Dégradés

---

## 🎯 Couleurs Fonctionnelles

### États de Succès
```javascript
success: '#70CC72'        // Vert
```
**Usage :**
- Messages de confirmation
- Commandes validées
- Paiements réussis
- Icônes de succès

---

### États d'Erreur
```javascript
error: '#FE4365'          // Rouge
```
**Usage :**
- Messages d'erreur
- Validation de formulaires
- Alertes critiques
- Commandes annulées

---

### Avertissements
```javascript
warning: '#FC913A'        // Orange
```
**Usage :**
- Alertes importantes
- Stock limité
- Actions à confirmer

---

### Informations
```javascript
info: '#669AE1'           // Bleu
```
**Usage :**
- Messages informatifs
- Tooltips
- Badges informationnels

---

## 🖌️ Couleurs Supplémentaires

### Violet
```javascript
purple: '#C49CDE'
```
**Usage :** Éléments décoratifs, catégories spéciales

### Bleu Clair
```javascript
lightblue: '#62C2E4'
```
**Usage :** Éléments décoratifs, icônes

### Marrons
```javascript
brown: '#B2905F'
darkBrown: '#B17236'
```
**Usage :** Catégories de produits spécifiques

---

## 📝 Couleurs de Texte

```javascript
text: '#333333'           // Texte principal
textLight: '#666666'      // Texte secondaire
textMuted: '#999999'      // Texte désactivé
```

**Hiérarchie typographique :**
- **Titres** : `#333333` (text)
- **Corps de texte** : `#666666` (textLight)
- **Texte désactivé** : `#999999` (textMuted)

---

## 🖼️ Couleurs d'Interface

```javascript
background: '#FFFFFF'     // Fond blanc
backgroundAlt: '#F5F5F5'  // Fond gris clair
border: '#E0E0E0'        // Bordures
gray: '#EEEEEE'          // Éléments gris
darkGray: '#596778'      // Gris foncé
```

---

## 🌓 Transparences

```javascript
overlay: 'rgba(0, 0, 0, 0.5)'
modalBackground: 'rgba(0, 0, 0, 0.7)'
```

**Usage :**
- Modals et overlays
- Loading screens
- Popups

---

## 💡 Exemples d'Utilisation

### Card Produit
```jsx
import { COLORS } from '../config/constants';

const ProductCard = ({ product }) => (
  <View style={styles.card}>
    <Image source={{ uri: product.image }} style={styles.image} />
    {product.prixPromo > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PROMO</Text>
      </View>
    )}
    <Text style={styles.name}>{product.name}</Text>
    <Text style={styles.price}>{product.prix} FCFA</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    backgroundColor: COLORS.secondary,
    padding: 5,
  },
  badgeText: {
    color: COLORS.white,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
  },
  price: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
});
```

### Bouton Principal
```jsx
<TouchableOpacity style={styles.primaryButton}>
  <Text style={styles.buttonText}>Acheter maintenant</Text>
</TouchableOpacity>

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
```

### Message de Succès
```jsx
<View style={styles.successMessage}>
  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
  <Text style={styles.successText}>Commande validée !</Text>
</View>

const styles = StyleSheet.create({
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}20`, // 20 = 12% d'opacité
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  successText: {
    color: COLORS.success,
    marginLeft: 10,
    fontWeight: '600',
  },
});
```

---

## 🎨 Gradients et Effets

### Dégradé Principal
```jsx
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[COLORS.primary, COLORS.tertiary]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradient}
>
  <Text>Contenu avec dégradé</Text>
</LinearGradient>
```

### Ombres
```jsx
const styles = StyleSheet.create({
  cardWithShadow: {
    backgroundColor: COLORS.background,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5, // Android
  },
});
```

---

## 📱 Accessibilité

### Contraste des Couleurs

**Bon contraste** (conforme WCAG AA) :
- ✅ Texte noir (#333333) sur fond blanc (#FFFFFF)
- ✅ Texte blanc (#FFFFFF) sur primary (#30A08B)
- ✅ Texte blanc (#FFFFFF) sur secondary (#FF6969)

**Attention** :
- ⚠️ Éviter textLight (#666666) sur backgroundAlt (#F5F5F5)
- ⚠️ Utiliser textMuted (#999999) uniquement pour texte non essentiel

---

## 🔄 Comparaison Web vs Mobile

| Élément | Web | Mobile |
|---------|-----|--------|
| Couleur principale | #30A08B | #30A08B ✅ |
| Accent | #FF6969 | #FF6969 ✅ |
| Arrière-plan | #62aca2 | #FFFFFF (cards) |
| Texte | #333333 | #333333 ✅ |

---

## 📦 Import et Usage

```javascript
// Dans vos composants
import { COLORS } from '../config/constants';

// Utilisation
<View style={{ backgroundColor: COLORS.primary }}>
  <Text style={{ color: COLORS.white }}>Texte</Text>
</View>
```

---

**Dernière mise à jour** : Octobre 29, 2025  
**Source** : Projet web Kassarmou (kassarmou_Front_Client)
