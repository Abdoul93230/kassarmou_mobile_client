# 🔧 Fix - Navigation pendant l'Inscription

## 🐛 Problème Identifié

**Symptôme** : Après avoir soumis le formulaire d'inscription et envoyé l'OTP, l'utilisateur était redirigé vers la page de connexion au lieu de voir l'étape de vérification OTP.

**Cause racine** : Dans `AppNavigator.js`, la condition `if (loading)` affichait le SplashScreen pendant **TOUTES** les opérations Redux qui mettent `loading: true`, y compris `sendOtp`, `verifyOtp`, et `registerWithOtp`.

### Séquence du bug :

```
1. Utilisateur sur RegisterScreen (étape 1 - formulaire)
2. Clic "Continuer" → dispatch(sendOtp())
3. Redux: sendOtp.pending → state.loading = true
4. AppNavigator détecte loading = true
5. AppNavigator affiche <SplashScreen />
6. RegisterScreen disparaît temporairement
7. Redux: sendOtp.fulfilled → state.loading = false
8. AppNavigator cache <SplashScreen />
9. Mais React Navigation a perdu le contexte de RegisterScreen
10. Navigation repart à zéro → Affiche Login (premier écran de la stack)
11. ❌ RegisterScreen (étape 2 - OTP) ne s'affiche jamais
```

---

## ✅ Solution Implémentée

### **Changement dans `AppNavigator.js`**

**AVANT** :
```javascript
function AppNavigator() {
  const { isAuthenticated, loading, user } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(verifyAuth());
  }, [dispatch]);

  // ❌ PROBLÈME: Affiche SplashScreen pour TOUTES les opérations
  if (loading) {
    return <SplashScreen />;
  }

  return <NavigationContainer>...</NavigationContainer>;
}
```

**APRÈS** :
```javascript
function AppNavigator() {
  const { isAuthenticated, loading, user } = useSelector(state => state.auth);
  const [initialCheckDone, setInitialCheckDone] = React.useState(false);

  useEffect(() => {
    // ✅ Vérifier l'authentification au démarrage UNE SEULE FOIS
    const checkAuth = async () => {
      await dispatch(verifyAuth());
      setInitialCheckDone(true);
    };
    checkAuth();
  }, [dispatch]);

  // ✅ Affiche SplashScreen pendant la vérification INITIALE uniquement
  if (!initialCheckDone) {
    return <SplashScreen />;
  }

  return <NavigationContainer>...</NavigationContainer>;
}
```

### **Pourquoi ça fonctionne** :

1. **`initialCheckDone`** : Flag local qui indique si la vérification AUTH initiale est terminée
2. **SplashScreen affiché UNIQUEMENT** au démarrage de l'app (avant `initialCheckDone = true`)
3. **Pendant l'inscription** : Les actions Redux `sendOtp`, `verifyOtp`, `registerWithOtp` mettent `loading: true` mais le SplashScreen n'est PLUS affiché car `initialCheckDone = true`
4. **RegisterScreen reste monté** pendant tout le processus 3 étapes
5. **Navigation interne** dans RegisterScreen (`setCurrentStep('otp')`) fonctionne correctement

---

## 🎯 Flux Corrigé

### **Inscription Complète** :

```
ÉTAPE 1: FORMULAIRE (currentStep = 'form')
├── Utilisateur remplit formulaire
├── Validation complète
├── Clic "Continuer"
├── dispatch(sendOtp({ email, name }))
│   ├── Redux: sendOtp.pending → loading = true
│   ├── ✅ AppNavigator ne réagit PAS (initialCheckDone = true)
│   ├── ✅ RegisterScreen reste affiché
│   ├── API: POST /api/user/send-otp
│   └── Redux: sendOtp.fulfilled → loading = false
├── setCurrentStep('otp')
└── ✅ Affichage ÉTAPE 2

ÉTAPE 2: VÉRIFICATION OTP (currentStep = 'otp')
├── 6 inputs pour code OTP
├── Timer 5 minutes
├── Utilisateur colle/tape le code
├── Auto-vérification quand complet
├── dispatch(verifyOtp({ email, otp }))
│   ├── Redux: verifyOtp.pending → loading = true
│   ├── ✅ AppNavigator ne réagit PAS
│   ├── ✅ RegisterScreen reste affiché
│   ├── API: POST /api/user/verify-otp → { token }
│   └── Redux: verifyOtp.fulfilled → loading = false
├── dispatch(registerWithOtp({ ..., otpToken }))
│   ├── Redux: registerWithOtp.pending → loading = true
│   ├── ✅ AppNavigator ne réagit PAS
│   ├── API: POST /api/user/register-with-otp
│   └── Redux: registerWithOtp.fulfilled → loading = false
├── dispatch(login({ email, password }))
│   ├── Redux: login.pending → loading = true
│   ├── API: POST /api/user/login → { token, user }
│   ├── Redux: login.fulfilled → isAuthenticated = true
│   └── ✅ AppNavigator détecte isAuthenticated = true
├── setCurrentStep('success')
└── ✅ Affichage ÉTAPE 3

ÉTAPE 3: SUCCÈS (currentStep = 'success')
├── Message félicitations
├── Auto-redirection après 3s
├── navigation.replace('MainTabs')
└── ✅ AppNavigator affiche MainTabs (isAuthenticated = true)
```

---

## 🧪 Tests à Effectuer

### **Test 1: Inscription Normale**
```
1. Ouvrir l'app
2. Aller sur "Créer un compte"
3. Remplir le formulaire complet
4. Cliquer "Continuer"
5. ✅ Vérifier que l'étape OTP s'affiche (6 champs)
6. Vérifier email et copier code OTP
7. Coller le code dans un champ
8. ✅ Vérifier auto-validation
9. ✅ Vérifier affichage message succès
10. ✅ Vérifier redirection vers MainTabs après 3s
```

### **Test 2: Réseau Lent**
```
1. Activer simulation "Slow 3G" sur mobile
2. Remplir formulaire d'inscription
3. Cliquer "Continuer"
4. ✅ Vérifier que l'écran ne change pas pendant l'envoi
5. ✅ Vérifier que le LoadingButton affiche le loading
6. Attendre réponse serveur
7. ✅ Vérifier transition vers étape OTP
```

### **Test 3: Erreur Réseau**
```
1. Remplir formulaire
2. Désactiver WiFi/Mobile data
3. Cliquer "Continuer"
4. ✅ Vérifier message d'erreur "Pas de connexion"
5. ✅ Vérifier que l'écran reste sur étape 1
6. Réactiver réseau
7. Cliquer "Continuer" à nouveau
8. ✅ Vérifier que l'étape OTP s'affiche
```

### **Test 4: Code OTP Invalide**
```
1. Compléter étape 1 → Recevoir OTP
2. Dans étape 2, entrer un code incorrect (ex: 000000)
3. ✅ Vérifier message d'erreur "Code OTP invalide"
4. ✅ Vérifier que les champs OTP se vident
5. ✅ Vérifier que l'écran reste sur étape 2
6. Entrer le bon code
7. ✅ Vérifier création compte + succès
```

### **Test 5: Timer OTP Expiré**
```
1. Compléter étape 1
2. Sur étape 2, attendre 5 minutes (timer expire)
3. ✅ Vérifier bouton "Renvoyer le code" apparaît
4. Cliquer "Renvoyer"
5. ✅ Vérifier nouveau code envoyé
6. ✅ Vérifier timer reset à 5 minutes
7. Entrer nouveau code
8. ✅ Vérifier validation fonctionne
```

---

## 📊 Comparaison Avant/Après

| Scénario | AVANT (Bug) | APRÈS (Fix) |
|----------|-------------|-------------|
| Envoi OTP | SplashScreen s'affiche → Retour Login | Reste sur RegisterScreen, affiche étape OTP |
| Vérification OTP | N/A (jamais atteint) | Fonctionne correctement |
| Création compte | N/A | Fonctionne, puis auto-login |
| Navigation | Cassée, retour Login | Fluide entre les 3 étapes |
| UX | ❌ Confusion utilisateur | ✅ Processus clair |

---

## 🔍 Autres Améliorations Possibles

### **1. Loading States Plus Granulaires**
Au lieu d'un seul `loading` global, avoir :
```javascript
{
  loadingAuth: false,      // Vérification initiale uniquement
  loadingLogin: false,     // Action login
  loadingOtp: false,       // Actions OTP
  loadingRegister: false,  // Action register
}
```

### **2. Navigation Guards**
Empêcher navigation manuelle vers Login pendant l'inscription :
```javascript
<Stack.Screen 
  name="Login" 
  component={LoginScreen}
  options={{
    gestureEnabled: false, // Désactiver swipe back
  }}
/>
```

### **3. État Persistant Inscription**
Sauvegarder état inscription dans AsyncStorage :
```javascript
// Si app crash pendant OTP, restaurer état
AsyncStorage.setItem('registrationState', JSON.stringify({
  step: 'otp',
  email: 'user@example.com',
  timestamp: Date.now(),
}));
```

---

## 📝 Résumé

**Problème** : AppNavigator affichait SplashScreen pendant TOUTES les opérations Redux, cassant la navigation interne de RegisterScreen.

**Solution** : N'afficher SplashScreen QUE pendant la vérification AUTH initiale au démarrage de l'app.

**Résultat** : Processus d'inscription fonctionne correctement avec les 3 étapes visibles et navigables.

---

**Date:** 2025-10-29  
**Status:** ✅ RÉSOLU  
**Testé:** ❌ EN ATTENTE DE TEST UTILISATEUR
