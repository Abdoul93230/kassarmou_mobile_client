import React, { memo } from 'react';
import { Text as RNText } from 'react-native';
import { type, useTheme } from '../theme';

/**
 * Texte typé du design system.
 * <Text variant="h1">Titre</Text> · <Text variant="small" color="textSecondary">…</Text>
 */
function Text({ variant = 'body', color = 'text', align, style, children, ...rest }) {
  const { colors } = useTheme();
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[type[variant], { color: colors[color] || color }, align && { textAlign: align }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

export default memo(Text);
