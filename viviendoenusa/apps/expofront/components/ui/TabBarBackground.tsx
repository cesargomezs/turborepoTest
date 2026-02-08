import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  const webStyle = Platform.select({
    web: {
      backgroundColor: isDark ? 'rgba(25, 25, 25, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      width: '100%', // Asegura el ancho en navegadores
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
      
      {/* Línea superior responsiva */}
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
    // absoluteFillObject hace que ocupe todo el espacio que el TabBar le asigne
    ...StyleSheet.absoluteFillObject,
    width: '100%', 
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  borderTop: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    position: 'absolute',
    top: 0,
  }
});