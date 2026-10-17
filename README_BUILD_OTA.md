# Build APK et mises à jour OTA — app client Ihambaobab

Depuis le dossier `New_Iham_Baobab_Mobile` (compte Expo `abdoulrazak`, vérifier avec `npx eas-cli whoami`).

## Commandes

| Commande | Effet |
|---|---|
| `npm run build:apk` | APK de test interne (profil `preview`, channel `preview`) |
| `npm run build:prod` | APK de production (channel `production`) |
| `npm run update:preview` | OTA vers les APK `preview` déjà installés |
| `npm run update:production` | OTA vers les APK `production` |

À la fin du build, EAS affiche un lien et un QR code : ouvrir le lien sur le téléphone pour installer l'APK.
Si une version précédente signée autrement est installée, la désinstaller d'abord.

## OTA ou nouveau build ?

- **OTA suffit** : changements JavaScript uniquement (écrans, textes, styles, logique, `src/`).
- **Nouveau build obligatoire** : nouvelle dépendance native (ex. `expo-notifications`), `app.json` / `app.config.js`
  (permissions, liens profonds, icône, `google-services.json`), ou changement de `version`.
- L'OTA n'atteint que les APK de même `version` (`runtimeVersion: appVersion`) et du même channel.
  L'app télécharge la mise à jour au lancement et l'applique au lancement suivant.

## Notifications push Android

`google-services.json` doit contenir l'app `com.ihambaobab.mobile` (console Firebase, projet `iham-baobab-e0508`).
Sinon le build réussit quand même, mais sans push Android (avertissement affiché par `app.config.js`).
La clé FCM V1 est déjà associée à l'app sur EAS.
