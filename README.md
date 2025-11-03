# Kassarmou Mobile Client

Application mobile e-commerce Kassarmou développée avec React Native et Expo.

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Expo Go app sur votre téléphone (iOS/Android)

### Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

### Lancer l'application

```bash
# Sur Android
npm run android

# Sur iOS (nécessite macOS)
npm run ios

# Sur le web
npm run web
```

## 📱 Fonctionnalités

- ✅ Navigation avec React Navigation (Stack + Bottom Tabs)
- ✅ Gestion d'état avec Redux Toolkit
- ✅ Authentification (Login/Register avec OTP)
- ✅ Catalogue produits avec recherche et filtres
- ✅ Panier d'achat
- ✅ Système de favoris (likes)
- ✅ Gestion des commandes
- ✅ Messagerie en temps réel (Socket.io)
- ✅ Paiements Stripe
- ✅ Notifications Toast

## 🏗️ Architecture

```
src/
├── screens/          # Écrans de l'application
├── components/       # Composants réutilisables
├── navigation/       # Configuration React Navigation
├── redux/           # Store Redux et slices
├── services/        # Services API
├── config/          # Configuration (API, constantes)
├── utils/           # Utilitaires
└── assets/          # Images, fonts, etc.
```

## 🔧 Configuration

Modifiez `src/config/api.js` pour pointer vers votre backend :

```javascript
export const BackendUrl = __DEV__ 
  ? 'http://localhost:5000'  // Développement
  : 'https://votre-backend.com';  // Production
```

## 📦 Dépendances principales

- React Native (via Expo SDK 54)
- React Navigation 6
- Redux Toolkit
- Axios
- Socket.io-client
- Stripe React Native
- React Native Toast Message
- AsyncStorage

## 🎨 Design

L'application reprend le design du projet web Kassarmou avec :
- Interface moderne et responsive
- Couleurs de marque
- Animations fluides
- UX optimisée mobile

## 📝 TODO

- [ ] Implémenter tous les écrans (actuellement squelettes)
- [ ] Ajouter l'inscription avec OTP
- [ ] Implémenter le détail produit complet
- [ ] Ajouter le système de paiement Stripe
- [ ] Implémenter la messagerie temps réel
- [ ] Ajouter les notifications push
- [ ] Tests unitaires et E2E
- [ ] Optimisation des performances

## 👨‍💻 Développeur

Adamou Abdoul Razak

## 📄 License

ISC
