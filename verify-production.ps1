# Script de verification avant build production
# PowerShell version

Write-Host ""
Write-Host "VERIFICATION PRE-BUILD PRODUCTION" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$allChecks = $true

# Verifier qu'on est dans le bon dossier
if (-not (Test-Path "app.json")) {
    Write-Host "[X] Erreur: Executez ce script depuis le dossier kassarmou_mobile_client" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dossier correct" -ForegroundColor Green

# Verifier la configuration API
$apiConfig = Get-Content "src\config\api.js" -Raw
if ($apiConfig -match "https://kassarmou-backend.onrender.com") {
    Write-Host "[OK] API en production" -ForegroundColor Green
} else {
    Write-Host "[X] API pas en production!" -ForegroundColor Red
    $allChecks = $false
}

# Verifier Stripe Live
$appJs = Get-Content "App.js" -Raw
if ($appJs -match "pk_live") {
    Write-Host "[OK] Stripe en mode LIVE" -ForegroundColor Green
} else {
    Write-Host "[X] Stripe pas en mode LIVE!" -ForegroundColor Red
    $allChecks = $false
}

# Verifier les assets
if (Test-Path "assets\vraisLogo.png") {
    Write-Host "[OK] Assets presents" -ForegroundColor Green
} else {
    Write-Host "[X] Assets manquants!" -ForegroundColor Red
    $allChecks = $false
}

# Verifier package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
Write-Host "[OK] Version: $($packageJson.version)" -ForegroundColor Green

# Verifier app.json
$appJson = Get-Content "app.json" -Raw | ConvertFrom-Json
Write-Host "[OK] Package Android: $($appJson.expo.android.package)" -ForegroundColor Green
Write-Host "[OK] Version Code: $($appJson.expo.android.versionCode)" -ForegroundColor Green

# Verifier EAS CLI
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if ($easInstalled) {
    Write-Host "[OK] EAS CLI installe" -ForegroundColor Green
} else {
    Write-Host "[!] EAS CLI non trouve" -ForegroundColor Yellow
    $install = Read-Host "Voulez-vous installer EAS CLI maintenant? (o/n)"
    if ($install -eq "o" -or $install -eq "O") {
        npm install -g eas-cli
    }
}

Write-Host ""
if ($allChecks) {
    Write-Host "==> TOUTES LES VERIFICATIONS PASSEES!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Commandes disponibles:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   # Build production APK" -ForegroundColor White
    Write-Host "   eas build --profile production --platform android" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   # Build et soumission automatique" -ForegroundColor White
    Write-Host "   eas build --profile production --platform android --auto-submit" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Duree estimee: 10-15 minutes" -ForegroundColor Cyan
    Write-Host ""
    
    $startBuild = Read-Host "Voulez-vous lancer le build maintenant? (o/n)"
    if ($startBuild -eq "o" -or $startBuild -eq "O") {
        Write-Host ""
        Write-Host "==> Lancement du build..." -ForegroundColor Green
        eas build --profile production --platform android
    }
} else {
    Write-Host "[X] Certaines verifications ont echoue" -ForegroundColor Red
    Write-Host "    Corrigez les erreurs avant de lancer le build" -ForegroundColor Yellow
    exit 1
}

