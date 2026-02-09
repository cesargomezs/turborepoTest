import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * COMPONENTE PRINCIPAL: Fondo con desenfoque (Glassmorphism)
 * Se usa en la propiedad 'tabBarBackground' de <Tabs.Navigator>
 */
export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  // Estilo específico para Web para soportar backdrop-filter
  const webStyle = Platform.select({
    web: {
      backgroundColor: isDark ? 'rgba(25, 25, 25, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      width: '100%',
    } as any,
    default: {},
  });

  return (
    <View style={styles.container}>
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={Platform.OS === 'ios' ? 85 : 95}
        style={[StyleSheet.absoluteFill, webStyle]}
      />
      
      {/* Línea superior sutil para dar definición */}
      <View 
        style={[
          styles.borderTop, 
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} 
      />
    </View>
  );
}

/**
 * HOOK EXPORTADO: Calcula el espacio del TabBar
 * Úsalo en tus pantallas como: const padding = useBottomTabOverflow();
 */
export function useBottomTabOverflow() {
  const insets = useSafeAreaInsets();
  
  try {
    // Intentamos obtener la altura real definida por el Navigator
    const tabHeight = useBottomTabBarHeight();
    return tabHeight;
  } catch (e) {
    // Si se usa fuera del Tab Navigator (ej. pantallas de login o modales)
    if (Platform.OS === 'ios') {
      return insets.bottom > 0 ? insets.bottom : 20;
    }
    return 65; // Altura estándar para Web/Android
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', 
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        zIndex: 1,
      }
    })
  },
  borderTop: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    position: 'absolute',
    top: 0,
  }
});