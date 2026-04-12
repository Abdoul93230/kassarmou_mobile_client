const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'screens', 'RegisterScreen.js');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Trouver et remplacer les lignes 834-846
const lines = content.split('\n');

// Identifier la section à remplacer (lignes autour de 834)
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('TODO: Google OAuth') && lines[i].includes('*/}')) {
    startIdx = i;
  }
  if (startIdx !== -1 && lines[i].includes('Lien Connexion')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  // Remplacer les lignes
  const replacement = [
    '          {/* TODO: Google OAuth - À implémenter dans une prochaine mise à jour',
    '          <View style={styles.divider}>',
    '            <View style={styles.dividerLine} />',
    '            <Text style={styles.dividerText}>OU</Text>',
    '            <View style={styles.dividerLine} />',
    '          </View>',
    '',
    '          <GoogleSignInButton ',
    '            navigation={navigation}',
    '            text="S\'inscrire avec Google"',
    '          />',
    '          */}',
    ''
  ];
  
  lines.splice(startIdx, endIdx - startIdx, ...replacement);
  
  // Écrire le fichier
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('✅ RegisterScreen.js corrigé avec succès!');
  console.log(`   Lignes modifiées: ${startIdx + 1} à ${endIdx + 1}`);
} else {
  console.log('❌ Impossible de trouver la section à modifier');
  console.log(`   startIdx: ${startIdx}, endIdx: ${endIdx}`);
}
