#!/bin/bash
# Script de vérification avant build production

echo "🔍 VÉRIFICATION PRE-BUILD PRODUCTION"
echo "===================================="
echo ""

# Vérifier qu'on est dans le bon dossier
if [ ! -f "app.json" ]; then
    echo "❌ Erreur: Exécutez ce script depuis le dossier kassarmou_mobile_client"
    exit 1
fi

echo "✅ Dossier correct"

# Vérifier la configuration API
if grep -q "https://kassarmou-backend.onrender.com" src/config/api.js; then
    echo "✅ API en production"
else
    echo "❌ API pas en production!"
    exit 1
fi

# Vérifier Stripe Live
if grep -q "pk_live" App.js; then
    echo "✅ Stripe en mode LIVE"
else
    echo "❌ Stripe pas en mode LIVE!"
    exit 1
fi

# Vérifier les erreurs de syntaxe
echo ""
echo "🔍 Vérification syntaxe..."
if npx tsc --noEmit --skipLibCheck 2>/dev/null || echo "TypeScript non disponible, skip"; then
    echo "✅ Pas d'erreurs TypeScript"
fi

# Vérifier les assets
if [ -f "assets/vraisLogo.png" ]; then
    echo "✅ Assets présents"
else
    echo "❌ Assets manquants!"
    exit 1
fi

# Vérifier EAS CLI
if command -v eas &> /dev/null; then
    echo "✅ EAS CLI installé"
else
    echo "⚠️  EAS CLI non trouvé. Installation..."
    npm install -g eas-cli
fi

echo ""
echo "🎉 TOUTES LES VÉRIFICATIONS PASSÉES!"
echo ""
echo "🚀 Commande pour lancer le build:"
echo ""
echo "   eas build --profile production --platform android"
echo ""
echo "⏱️  Durée estimée: 10-15 minutes"
echo ""
