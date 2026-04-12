$file = "src\screens\RegisterScreen.js"
$content = Get-Content $file -Encoding UTF8 -Raw

# Pattern pour trouver et remplacer les commentaires consécutifs
$pattern = '(\s+\{/\* TODO: Google OAuth[^\n]+\*/\}\s+\{/\* <View style=\{styles\.divider\}>[\s\S]+?</View> \*/\}\s+\{/\* Inscription avec Google \*/\}\s+\{/\* <GoogleSignInButton[\s\S]+?\*/\})'

$replacement = @'

          {/* TODO: Google OAuth - À implémenter dans une prochaine mise à jour
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton 
            navigation={navigation}
            text="S'inscrire avec Google"
          />
          */}
'@

$content = $content -replace $pattern, $replacement

Set-Content $file -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ RegisterScreen.js corrigé" -ForegroundColor Green
