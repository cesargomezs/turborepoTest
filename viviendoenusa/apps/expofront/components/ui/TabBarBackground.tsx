import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🚀 IMPORTAMOS EL CONTEXTO GLOBAL QUE CREAMOS (Uso tu alias @)
import { useAppTheme } from '@/app/src/context/ThemeContext';

export default function BlurTabBarBackground() {
  // 🚀 LEEMOS EL TEMA EN TIEMPO REAL DIRECTO DEL CONTEXTO
  const { isDark } = useAppTheme();

  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';

  // Altura estándar de la barra de pestañas
  const DEFAULT_TAB_BAR_HEIGHT = 64;

  const webStyle = Platform.select({
    web: {
      position: 'fixed',
      left: 0,
      bottom: 0,
      width: '100vw',
      height: `${DEFAULT_TAB_BAR_HEIGHT}px`,
      backgroundColor: isDark ? 'rgba(20, 20, 20, 0.75)' : 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      zIndex: -1, 
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
    } as any,
    default: {},
  });

  return (
    <View style={styles.container}>
      {isWeb ? (
        <div style={webStyle} />
      ) : (
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={95}
          style={[
            StyleSheet.absoluteFill,
            isIOS && {
              // Corrección para iOS: Expandimos el fondo hacia abajo usando el inset
              bottom: -insets.bottom, 
              height: DEFAULT_TAB_BAR_HEIGHT + insets.bottom,
            }
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    pointerEvents: 'none', 
  },
});