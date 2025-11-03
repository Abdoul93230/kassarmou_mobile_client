# 📋 Processus d'Inscription - Kassarmoumarket Mobile

## 🔄 Comparaison Web vs Mobile

### **PROJET WEB** (InscriptionWithOTP.jsx)
```
ÉTAPE 1: FORMULAIRE
├── Utilisateur remplit: nom, email (obligatoire), téléphone (optionnel), password
├── Validation du formulaire
├── Clic sur "Continuer" → Appel API: POST /api/user/send-otp
│   └── Paramètres: { email, name }
└── Réponse 200 → Transition vers ÉTAPE 2

ÉTAPE 2: VÉRIFICATION OTP
├── Affichage 6 inputs pour OTP
├── Timer 5 minutes avec possibilité de renvoyer
├── Utilisateur entre le code OTP (reçu par email)
├── Validation automatique quand 6 chiffres saisis
├── Appel API 1: POST /api/user/verify-otp (juste pour valider l'OTP)
├── Appel API 2: POST /api/user/register-with-otp
│   └── Paramètres: { name, email, phoneNumber, password, whatsapp, otpToken }
│   └── Crée l'utilisateur dans la base de données
├── Appel API 3: POST /api/user/login (connexion automatique)
│   └── Stockage token: localStorage.setItem('userEcomme', ...)
└── Réponse 200 → Transition vers ÉTAPE 3

ÉTAPE 3: SUCCÈS
├── Message de félicitations
├── Auto-redirection après 3 secondes
└── Navigation vers /Home (ou page d'origine)
```

### **PROJET MOBILE** (RegisterScreen.js)
```
ÉTAPE 1: FORMULAIRE
├── Utilisateur remplit: nom, email (obligatoire), téléphone (optionnel), password
├── Validation du formulaire
├── Clic sur "Continuer" → Redux: dispatch(sendOtp({ email, name }))
│   └── Appel API: POST /api/user/send-otp
└── Réponse 200 → setCurrentStep('otp')

ÉTAPE 2: VÉRIFICATION OTP
├── Affichage 6 inputs pour OTP
├── Timer 5 minutes (300s) avec countdown
├── Bouton "Renvoyer le code" activé après timer expiré
├── Utilisateur entre le code OTP (reçu par email)
├── Auto-vérification quand 6 chiffres saisis
├── Redux Action 1: dispatch(verifyOtp({ email, otp }))
│   └── API: POST /api/user/verify-otp → Retourne { token }
├── Redux Action 2: dispatch(registerWithOtp({ name, email, phoneNumber, password, whatsapp, otpToken }))
│   └── API: POST /api/user/register-with-otp → Crée l'utilisateur
├── Redux Action 3: dispatch(login({ email, phoneNumber, password }))
│   └── API: POST /api/user/login → Connexion auto
│   └── Stockage token: AsyncStorage.setItem('userEcomme', ...)
└── Succès → setCurrentStep('success')

ÉTAPE 3: SUCCÈS
├── Message de félicitations avec animation
├── Auto-redirection après 3 secondes
└── navigation.replace('MainTabs')
```

---

## ✅ CONCLUSION

**Le processus mobile est IDENTIQUE au web !**

Les deux implémentations suivent exactement la même logique :
1. ✅ Formulaire → Envoi OTP par email
2. ✅ Vérification OTP → Création compte + Connexion auto
3. ✅ Message succès → Redirection

---

## 🔍 Points Vérifiés

### **Formulaire (Étape 1)**
- [x] Nom (min 3 caractères)
- [x] Email (obligatoire, format valide)
- [x] Téléphone (optionnel, avec CountryCodePicker)
- [x] Mot de passe (8+ chars, majuscule, minuscule, chiffre, spécial)
- [x] Confirmation mot de passe (match)
- [x] Checkbox WhatsApp
- [x] Checkbox acceptation conditions
- [x] Validation complète avant envoi
- [x] Gestion offline (détection réseau)
- [x] Messages d'erreur clairs

### **OTP (Étape 2)**
- [x] 6 inputs auto-focus
- [x] Copier-coller automatique du code complet
- [x] Timer countdown 5 minutes
- [x] Bouton "Renvoyer" après expiration
- [x] Auto-vérification quand code complet
- [x] Vérification OTP → Création compte → Login auto
- [x] Gestion erreurs (OTP invalide, réseau, serveur)

### **Succès (Étape 3)**
- [x] Message félicitations avec animation
- [x] Affichage nom utilisateur
- [x] Affichage email
- [x] Checklist (email vérifié, compte activé, connexion auto)
- [x] Auto-redirection après 3 secondes
- [x] Navigation vers MainTabs

---

## 🎯 API Endpoints Utilisés

### **Inscription**
1. `POST /api/user/send-otp`
   - Body: `{ email, name }`
   - Réponse: `{ message: "OTP envoyé" }`

2. `POST /api/user/verify-otp`
   - Body: `{ email, otp }`
   - Réponse: `{ token: "otp-verification-token" }`

3. `POST /api/user/register-with-otp`
   - Body: `{ name, email, phoneNumber, password, whatsapp, otpToken }`
   - Réponse: `{ user: {...}, message: "Compte créé" }`

4. `POST /api/user/login`
   - Body: `{ email, phoneNumber, password }`
   - Réponse: `{ token: "jwt-token", user: {...} }`

---

## 🐛 Points à Vérifier

Si l'inscription ne fonctionne pas correctement, vérifier :

### **Frontend Mobile**
1. Redux actions bien configurées dans `authSlice.js`
2. Toasts affichent les bonnes erreurs
3. Animations ne bloquent pas la navigation
4. AsyncStorage sauvegarde bien le token
5. Navigation remplace bien la stack (pas de retour arrière possible)

### **Backend**
1. Endpoint `/api/user/send-otp` envoie bien l'email
2. Endpoint `/api/user/verify-otp` valide le code et retourne un token
3. Endpoint `/api/user/register-with-otp` accepte le otpToken
4. Les OTP ont une expiration (5-10 minutes)
5. Les emails sont bien envoyés (vérifier spam)
6. CORS configuré pour mobile

### **Tests à faire**
```bash
# 1. Remplir formulaire
# 2. Cliquer "Continuer"
# 3. Vérifier email reçu
# 4. Copier code OTP
# 5. Coller dans un des champs
# 6. Vérifier auto-validation
# 7. Attendre message succès
# 8. Vérifier redirection vers MainTabs
# 9. Vérifier token dans AsyncStorage
# 10. Fermer app → Rouvrir → Doit rester connecté
```

---

## 📝 Notes Importantes

1. **Email obligatoire** : L'email est requis car le code OTP est envoyé par email uniquement
2. **Téléphone optionnel** : Le téléphone peut être fourni mais n'est pas utilisé pour l'OTP
3. **Auto-login** : Après inscription réussie, l'utilisateur est automatiquement connecté
4. **Token persistance** : Le token JWT est sauvegardé dans AsyncStorage pour garder la session
5. **Copier-coller OTP** : Le composant OTPInput détecte automatiquement le copier-coller de codes multi-chiffres

---

## 🚀 Améliorations Possibles

- [ ] Support OTP par SMS en plus de l'email
- [ ] Afficher aperçu email dans l'étape OTP
- [ ] Bouton "Modifier email" dans l'étape OTP
- [ ] Compteur tentatives OTP (max 3-5 tentatives)
- [ ] Blacklist temporaire après trop de tentatives échouées
- [ ] Notifier par push notification quand compte créé
- [ ] Permettre inscription avec Google/Facebook
- [ ] Vérification téléphone optionnelle après inscription

---

**Date:** 2025-10-29  
**Version:** 1.0.0  
**Auteur:** GitHub Copilot
