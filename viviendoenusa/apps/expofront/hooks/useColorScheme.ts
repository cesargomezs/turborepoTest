import { ColorSchemeName, useColorScheme as _useColorScheme } from 'react-native';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const colorScheme = _useColorScheme();
  return colorScheme ?? 'light';
}