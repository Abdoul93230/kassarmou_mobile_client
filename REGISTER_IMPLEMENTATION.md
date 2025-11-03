# RegisterScreen - Documentation d'implémentation

## Structure
Le RegisterScreen suit le même flux que le projet web :
1. **Formulaire d'inscription** → 2. **Vérification OTP** → 3. **Succès**

## API Endpoints utilisés
- `POST /api/user/send-otp` - Envoi du code OTP par email
- `POST /api/user/verify-otp` - Vérification du code OTP
- `POST /api/user/register-with-otp` - Création du compte après vérification

## Champs du formulaire
- **name** (obligatoire) - Nom complet, minimum 3 caractères
- **email** (obligatoire) - Pour la vérification OTP
- **phoneNumber** (optionnel) - Avec indicatif pays via CountryCodePicker
- **password** (obligatoire) - Minimum 8 caractères avec validation stricte
- **passwordConf** (obligatoire) - Confirmation du mot de passe
- **whatsapp** (boolean) - Case à cocher si le numéro est aussi WhatsApp

## Validation du mot de passe
```javascript
const validatePassword = (password) => {
  // Minimum 8 caractères
  // Au moins une majuscule
  // Au moins une minuscule
  // Au moins un chiffre
  // Au moins un caractère spécial
};
```

## États du composant
```javascript
const [currentStep, setCurrentStep] = useState('form'); // 'form', 'otp', 'success'
const [formData, setFormData] = useState({...});
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);
```

## Composants réutilisés
- CustomInput - Champs de formulaire
- LoadingButton - Boutons avec état de chargement
- CountryCodePicker - Sélection d'indicatif téléphonique
- OTPInput - Saisie du code à 6 chiffres

## Flux utilisateur
1. L'utilisateur remplit le formulaire d'inscription
2. Clic sur "Continuer" → Validation du formulaire
3. Si valide → Appel API `send-otp` → Envoi d'email
4. Affichage de l'écran OTP avec timer de 5 minutes
5. Saisie du code OTP à 6 chiffres
6. Vérification automatique quand les 6 chiffres sont saisis
7. Si valide → Création du compte → Connexion automatique → Succès
8. Redirection vers la page de connexion après 3 secondes

## Gestion des erreurs
- Affichage des erreurs de validation sous chaque champ
- Toast pour les erreurs API
- Possibilité de renvoyer le code OTP après expiration
- Bouton retour pour modifier l'email

## À implémenter dans RegisterScreen.js
Le fichier est actuellement un skeleton. Vous pouvez :
1. Copier la structure depuis ForgotPasswordScreen/ResetPasswordScreen
2. Adapter avec les 3 étapes (Form, OTP, Success)
3. Intégrer OTPInput component
4. Gérer la logique d'inscription avec OTP

## Exemple de structure
```jsx
<SafeAreaView>
  {currentStep === 'form' && <RegistrationForm />}
  {currentStep === 'otp' && <OTPVerificationStep />}
  {currentStep === 'success' && <SuccessStep />}
</SafeAreaView>
```

## Référence projet web
Voir : `kassarmou_Front_Client/src/components/inscription/InscriptionWithOTP.jsx`
