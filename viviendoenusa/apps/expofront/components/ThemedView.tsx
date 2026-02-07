import { View, type ViewProps, Platform, StyleSheet } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import React from 'react';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  transparent?: boolean;
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  transparent = false, 
  ...otherProps 
}: ThemedViewProps) {
  
  const themeBackgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor }, 
    'background'
  );

  const backgroundColor = transparent ? 'transparent' : themeBackgroundColor;

  // Creamos el estilo base
  const combinedStyles = [
    { backgroundColor },
    style,
  ];

  // Si es Web, añadimos la transición de forma que TS no se queje
  const finalStyle = Platform.OS === 'web' 
    ? [combinedStyles, { transition: 'background-color 0.3s ease' } as any] 
    : combinedStyles;

  return (
    <View 
      style={finalStyle} 
      {...otherProps} 
    />
  );
}