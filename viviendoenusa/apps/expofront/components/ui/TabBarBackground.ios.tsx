import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  return (
    <View style={styles.container}>
      <BlurView
        // Usamos tintas consistentes con el Header
        tint={isDark ? 'dark' : 'light'}
        // La intensidad 85-90 da ese look de cristal moderno
        intensity={Platform.OS === 'ios' ? 85 : 95}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Línea divisoria superior muy sutil (como la del Header) */}
      <View 
        style={[
          styles.borderTop, 
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // En la web y android necesitamos asegurar que el desbordamiento esté oculto
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  borderTop: {
    height: StyleSheet.hairlineWidth, // Línea ultra fina profesional
    width: '100%',
    position: 'absolute',
    top: 0,
  }
});