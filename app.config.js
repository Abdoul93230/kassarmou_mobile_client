/**
 * Configuration dynamique : complète app.json.
 *
 * Notifications push Android (FCM) : google-services.json doit contenir l'app
 * « com.ihambaobab.mobile » (projet Firebase iham-baobab-e0508). Tant que le fichier
 * est absent ou ne contient que l'app vendeur, on ne le branche pas : le build réussit,
 * seules les push Android sont inactives (un avertissement s'affiche).
 */
const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES = './google-services.json';

function hasFirebaseClient(pkg) {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, GOOGLE_SERVICES), 'utf8'));
    return (json.client || []).some((c) => c?.client_info?.android_client_info?.package_name === pkg);
  } catch {
    return false;
  }
}

module.exports = ({ config }) => {
  const pkg = config.android?.package;
  if (hasFirebaseClient(pkg)) {
    config.android = { ...config.android, googleServicesFile: GOOGLE_SERVICES };
  } else {
    console.warn(`⚠️  ${GOOGLE_SERVICES} sans l'app ${pkg} : notifications push Android désactivées pour ce build.`);
  }
  return config;
};
