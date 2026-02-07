import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

// 1. Mapeo expandido con nombres comunes que usas en tu App
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'expand-more': 'expand-more',
  'expand-less': 'expand-less',
  'calendar': 'event',
  'translate': 'translate',
  'home': 'home',
} as const;

// 2. Permitimos que acepte cualquier nombre de MaterialIcons como fallback 
// para que no tengas que mapear absolutamente todo.
export type IconSymbolName = keyof typeof MAPPING | React.ComponentProps<typeof MaterialIcons>['name'];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // 3. Lógica de selección: Si existe en el mapa, lo traduce; si no, usa el nombre directo.
  const iconName = (MAPPING[name as keyof typeof MAPPING] || name) as React.ComponentProps<typeof MaterialIcons>['name'];

  return (
    <MaterialIcons 
      color={color} 
      size={size} 
      name={iconName} 
      style={style} 
    />
  );
}