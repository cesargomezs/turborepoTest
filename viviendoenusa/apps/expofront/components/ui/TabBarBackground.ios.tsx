import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';

  return (
    <BlurView
      // En Android 'systemChromeMaterial' puede fallar, mejor usar el tema directo
      tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : (theme === 'dark' ? 'dark' : 'light')}
      intensity={Platform.OS === 'ios' ? 100 : 80} // Un poco menos de intensidad en Android mejora el rendimiento
      style={[
        StyleSheet.absoluteFill,
        // En Android a veces el BlurView necesita un color de respaldo si no hay hardware suficiente
        Platform.OS === 'android' && { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  const { bottom } = useSafeAreaInsets();
  
  try {
    const tabHeight = useBottomTabBarHeight();
    // Retornamos el exceso. Si la TabBar es más alta que el área segura, 
    // necesitamos ese padding extra para que el contenido no quede oculto.
    return Math.max(0, tabHeight - bottom);
  } catch (e) {
    // Si no estamos en un Tab Navigator, el overflow es 0
    return 0;
  }
}