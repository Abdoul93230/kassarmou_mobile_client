import React from 'react';
import { Pressable, Text, View } from 'react-native';

/**
 * Filet de sécurité : une erreur d'affichage n'arrête plus toute l'app. Le client voit un message
 * et repart (l'app se réaffiche depuis l'accueil). Volontairement sans dépendance (thème, police)
 * pour fonctionner même si ce sont eux qui ont échoué.
 */
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, key: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur d\'affichage :', error?.message, info?.componentStack?.split('\n').slice(0, 6).join('\n'));
  }

  retry = () => this.setState((s) => ({ error: null, key: s.key + 1 }));

  render() {
    if (!this.state.error) return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 40 }}>🌳</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 12, textAlign: 'center' }}>
          Un petit souci d'affichage
        </Text>
        <Text style={{ fontSize: 15, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 21 }}>
          Votre panier et vos commandes sont en sécurité. Touchez le bouton pour continuer.
        </Text>
        <Pressable onPress={this.retry} style={{ marginTop: 24, backgroundColor: '#30A08B', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Revenir à l'accueil</Text>
        </Pressable>
      </View>
    );
  }
}
