# 🔧 Configuration Google OAuth pour Android

## ❌ Problème actuel

```
Accès bloqué : erreur d'autorisation
Error 400 : invalid_request
```

**Cause :** Vous utilisez un OAuth Client **Web** pour une application **Mobile**.

---

## ✅ Solution : Créer un OAuth Client Android

### Étape 1 : Google Cloud Console

1. Allez sur **https://console.cloud.google.com/**
2. Sélectionnez votre projet **"kassarmou"**
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

### Étape 2 : Configurer le Client Android

5. **Application type :** Sélectionnez **"Android"**

6. **Name :** `Kassarmou Android`

7. **Package name :** 
   ```
   com.kassarmou.mobile
   ```
   *(C'est le package dans votre app.json)*

8. **SHA-1 certificate fingerprint :**
   
   **Pour Expo Go (développement) :**
   ```
   A5:0F:C4:A2:F0:7D:E4:1C:7C:3E:D1:4E:4D:8F:5C:0A:1C:5E:7F:8B
   ```
   
   **Pour votre propre build (production) :**
   - Utilisez `eas credentials` pour obtenir votre SHA-1
   - Ou générez avec `keytool` si vous avez un keystore

9. **Cliquez sur CREATE**

10. **📋 Copiez le nouveau Client ID** qui sera créé (format: `xxxxx.apps.googleusercontent.com`)

---

### Étape 3 : Mettre à jour le code

Ouvrez `src/components/GoogleSignInButton.js` et remplacez :

```javascript
const GOOGLE_CLIENT_ID_ANDROID = 'VOTRE_NOUVEAU_CLIENT_ID_ICI';
```

Par le Client ID Android que vous venez de créer.

---

## 🔑 Récapitulatif des Client IDs

Vous aurez maintenant **2 Client IDs différents** :

### 1. Web Client ID
```
108047326596-asds4bkn872ktb270rcdes005rd0e1jr.apps.googleusercontent.com
```
- ✅ Utilisé par : Frontend Web (React)
- ✅ Redirect URI : `https://kassarmou-backend.onrender.com/api/auth/google/callback`

### 2. Android Client ID (à créer)
```
XXXXX-YYYYYY.apps.googleusercontent.com
```
- ✅ Utilisé par : App Mobile (React Native Expo)
- ✅ Package : `com.kassarmou.mobile`
- ✅ SHA-1 : Expo Go fingerprint

---

## 📱 Étape 4 : Tester

1. **Lancez l'app :**
   ```bash
   npm start
   ```

2. **Scannez le QR code** avec Expo Go

3. **Allez sur l'écran de connexion**

4. **Cliquez sur "Continuer avec Google"**

5. **Connectez-vous** - Ça devrait fonctionner ! ✅

---

## 🐛 Si ça ne marche toujours pas

### Erreur "invalid_request"
➡️ Vérifiez que vous avez bien créé un client **Android** (pas Web)

### Erreur "unauthorized_client"
➡️ Le SHA-1 ne correspond pas, utilisez celui d'Expo Go

### "The app is in testing mode"
➡️ Normal ! Ajoutez votre email dans **OAuth consent screen** → **Test users**

### Le navigateur ne se ferme pas
➡️ Utilisez `useProxy: true` dans makeRedirectUri (déjà fait)

---

## 📊 SHA-1 pour différents environnements

### Expo Go (développement)
```
A5:0F:C4:A2:F0:7D:E4:1C:7C:3E:D1:4E:4D:8F:5C:0A:1C:5E:7F:8B
```

### Build Expo (production)
Pour obtenir le SHA-1 de votre propre build :
```bash
eas credentials
```

### Debug Keystore local (si vous utilisez)
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## ✅ Checklist finale

- [ ] OAuth Client Android créé dans Google Console
- [ ] Package name : `com.kassarmou.mobile`
- [ ] SHA-1 fingerprint ajouté (Expo Go)
- [ ] Client ID Android copié
- [ ] Code mis à jour avec le nouveau Client ID
- [ ] App testée avec Expo Go
- [ ] Connexion Google fonctionne ✅

---

## 💡 Note importante

**Pour iOS**, vous devrez aussi créer un **OAuth Client iOS** avec :
- Bundle ID : `com.kassarmou.mobile`
- Pas besoin de SHA-1 pour iOS

Mais pour l'instant, concentrons-nous sur Android ! 🚀
