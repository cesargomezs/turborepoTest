import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
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
              // Esta es la corrección para iOS:
              // Expandimos el fondo hacia abajo usando el inset, 
              // pero mantenemos el origen en el lugar correcto.
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
    // Importante para que no bloquee los toques en los iconos
    pointerEvents: 'none', 
  },
});