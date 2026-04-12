# 📦 AAB vs APK - Comprendre la Différence

## 🎯 TLDR (Résumé Court)

| Format | Usage | Commande |
|--------|-------|----------|
| **AAB** 📱 | **Play Store UNIQUEMENT** | `eas build --profile production --platform android` |
| **APK** 🧪 | Test local sur téléphone | `eas build --profile preview --platform android` |

---

## 📚 Explications Détaillées

### 🔴 AAB (Android App Bundle) - Pour Play Store

**C'est quoi ?**
- Format **obligatoire** pour publier sur Google Play Store depuis août 2021
- Fichier `.aab` qui contient tout le code de votre app
- Google génère automatiquement des APK optimisés pour chaque appareil

**Avantages** :
✅ Taille d'installation réduite (15% en moyenne)
✅ Play Store génère des APK spécifiques pour chaque type d'appareil
✅ Utilisateurs téléchargent uniquement ce dont ils ont besoin
✅ Support des Dynamic Feature Modules
✅ Obligatoire pour nouvelles apps sur Play Store

**Inconvénients** :
❌ Ne peut PAS être installé directement sur un téléphone
❌ Doit passer par le Play Store

**Quand l'utiliser ?**
- ✅ Publication sur Google Play Store
- ✅ Build de production final
- ❌ PAS pour tester sur votre téléphone

---

### 🟢 APK (Android Package Kit) - Pour Test Local

**C'est quoi ?**
- Format classique Android
- Fichier `.apk` que vous pouvez installer directement
- Contient tout le code pour tous les types d'appareils

**Avantages** :
✅ Peut être installé directement sur n'importe quel téléphone Android
✅ Parfait pour tester avant publication
✅ Peut être distribué hors Play Store (site web, email, etc.)
✅ Fonctionne avec adb install

**Inconvénients** :
❌ Taille plus importante que AAB
❌ Non-optimisé pour chaque appareil spécifique
❌ Refusé par Play Store pour nouvelles apps

**Quand l'utiliser ?**
- ✅ Tester sur votre téléphone avant publication
- ✅ Distribution interne (entreprise)
- ✅ Test beta avec testeurs externes
- ❌ PAS pour publier sur Play Store

---

## 🚀 CONFIGURATION ACTUELLE

Votre `eas.json` est maintenant configuré comme suit :

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": {
        "buildType": "apk"  // ← APK pour test local
      }
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle"  // ← AAB pour Play Store
      }
    }
  }
}
```

---

## 📋 WORKFLOW RECOMMANDÉ

### Étape 1 : Développement & Test Local (APK)

```bash
# Build APK pour tester sur votre téléphone
eas build --profile preview --platform android

# Après le build (10-15 min)
# 1. Télécharger l'APK depuis https://expo.dev
# 2. Transférer sur votre téléphone
# 3. Installer et tester tout le flux
```

**Tester** :
- ✅ Inscription/Connexion
- ✅ Navigation et affichage produits
- ✅ Ajout au panier
- ✅ Application code promo
- ✅ Paiement Stripe (avec vraie carte de test)
- ✅ Confirmation commande
- ✅ Affichage des commandes

---

### Étape 2 : Publication Play Store (AAB)

Une fois que tout fonctionne parfaitement :

```bash
# Build AAB pour Play Store
eas build --profile production --platform android

# Après le build (10-15 min)
# 1. Télécharger l'AAB depuis https://expo.dev
# 2. Aller sur Google Play Console
# 3. Uploader l'AAB dans Production
# 4. Remplir les métadonnées (screenshots, descriptions)
# 5. Soumettre pour révision
```

---

## ⚡ COMMANDES RAPIDES

### Pour Tester (APK)
```bash
eas build --profile preview --platform android
```

### Pour Publier (AAB)
```bash
eas build --profile production --platform android
```

### Voir les Builds en Cours
```bash
eas build:list
```

### Télécharger Directement
```bash
# Après le build, voir l'URL de téléchargement
eas build:view
```

---

## 🔍 Comment Identifier le Format ?

### Fichier AAB
```
kassarmou-mobile-123abc456.aab
```
- Extension : `.aab`
- Nom : Contient généralement un hash
- Taille : Plus petit que l'APK équivalent
- Usage : Upload sur Play Console

### Fichier APK
```
kassarmou-mobile-preview-123abc456.apk
```
- Extension : `.apk`
- Nom : Contient souvent "preview" ou "debug"
- Taille : Plus gros (contient tout)
- Usage : Installation directe

---

## ❓ FAQ

### Q1 : Pourquoi mon AAB ne s'installe pas sur mon téléphone ?
**R** : C'est normal ! Les fichiers AAB ne peuvent PAS être installés directement. Utilisez un APK pour tester localement.

### Q2 : Puis-je publier un APK sur le Play Store ?
**R** : Uniquement pour les apps existantes créées avant août 2021. Pour les nouvelles apps, l'AAB est **obligatoire**.

### Q3 : Comment tester mon app avant de publier sur Play Store ?
**R** : Build un APK avec le profil `preview`, installez-le sur votre téléphone et testez tout.

### Q4 : L'AAB est-il plus gros que l'APK ?
**R** : Non, c'est l'inverse ! L'AAB génère des APK optimisés plus petits pour chaque appareil.

### Q5 : Puis-je avoir les deux formats ?
**R** : Oui ! Build un APK (preview) pour tester, puis un AAB (production) pour publier.

---

## 🎯 CHECKLIST DE PUBLICATION

### Phase 1 : Test Local avec APK
- [ ] `eas build --profile preview --platform android`
- [ ] Télécharger et installer l'APK
- [ ] Tester sur appareil physique
- [ ] Vérifier tous les flux critiques
- [ ] Corriger les bugs éventuels

### Phase 2 : Publication avec AAB
- [ ] `eas build --profile production --platform android`
- [ ] Télécharger l'AAB depuis Expo
- [ ] Créer l'app dans Play Console
- [ ] Uploader l'AAB
- [ ] Ajouter screenshots + graphique
- [ ] Remplir descriptions
- [ ] Ajouter politique de confidentialité
- [ ] Soumettre pour révision

### Phase 3 : Après Publication
- [ ] Surveiller les crashs dans Play Console
- [ ] Répondre aux avis utilisateurs
- [ ] Planifier les mises à jour

---

## 🆘 TROUBLESHOOTING

### Erreur : "APK not allowed"
**Cause** : Vous essayez d'uploader un APK sur Play Store pour une nouvelle app
**Solution** : Build un AAB avec `eas build --profile production --platform android`

### Erreur : "Cannot install AAB"
**Cause** : Vous essayez d'installer un AAB directement sur votre téléphone
**Solution** : Build un APK avec `eas build --profile preview --platform android`

### Build trop long
**Cause** : EAS Build compile dans le cloud
**Solution** : Patience ! Ça prend 10-15 minutes. Pendant ce temps, préparez vos screenshots.

---

## 📊 COMPARAISON TECHNIQUE

| Caractéristique | APK | AAB |
|-----------------|-----|-----|
| **Extension** | .apk | .aab |
| **Taille fichier** | Plus gros | Plus petit |
| **Installation directe** | ✅ Oui | ❌ Non |
| **Play Store** | ❌ Refusé (nouvelles apps) | ✅ Requis |
| **Optimisation** | Générique | Spécifique par appareil |
| **Compression** | Moins efficace | Très efficace |
| **Support multi-APK** | Non | Oui |
| **Profil EAS** | `preview` | `production` |

---

## 🎓 EN RÉSUMÉ

### Pour DÉVELOPPER et TESTER :
```bash
eas build --profile preview --platform android
# → Génère un APK
# → Installe sur ton téléphone
# → Teste l'app
```

### Pour PUBLIER sur PLAY STORE :
```bash
eas build --profile production --platform android
# → Génère un AAB
# → Upload dans Play Console
# → Google le transforme en APK optimisés
```

---

## ✅ PRÊT À LANCER !

Votre configuration est correcte :
- ✅ `preview` → APK pour test
- ✅ `production` → AAB pour Play Store

**Prochaine action recommandée** :

1. **(Optionnel) Tester d'abord** :
   ```bash
   eas build --profile preview --platform android
   ```

2. **Publier sur Play Store** :
   ```bash
   eas build --profile production --platform android
   ```

🚀 **Lancez la commande quand vous êtes prêt !**
