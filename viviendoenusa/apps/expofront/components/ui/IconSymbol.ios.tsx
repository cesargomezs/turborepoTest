import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle, Platform } from 'react-native';
import React from 'react';

/**
 * IconSymbol utiliza SF Symbols en iOS y requiere una alternativa en Android/Web
 * si no se configuran iconos compatibles. Para este proyecto, nos aseguramos
 * de que las props sean opcionales y el tipado sea robusto.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      // "scaleAspectFit" asegura que el icono no se deforme al cambiar el 'size'
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}