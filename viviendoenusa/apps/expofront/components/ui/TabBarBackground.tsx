import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  // ESTA ES LA CLAVE: Estilos directos de CSS para Web
  const webStyle = Platform.select({
    web: {
      position: 'fixed', // Fixed lo saca de cualquier contenedor centrado
      left: 0,
      bottom: 0,
      width: '100vw', // 100% del ancho de la ventana del navegador
      height: '64px', // Ajusta a la altura de tu barra
      backgroundColor: isDark ? 'rgba(20, 20, 20, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: -1, // Se coloca detrás de los botones
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    } as any,
    default: {},
  });

  return (
    <View style={styles.container}>
      {/* En Web usamos un View normal porque BlurView de expo a veces 
          tiene restricciones de layout; el CSS inyectado arriba hace el trabajo */}
      {Platform.OS === 'web' ? (
        <div style={webStyle} />
      ) : (
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={85}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // En web, dejamos que el div con fixed maneje todo el espacio
    backgroundColor: 'transparent',
  },
});