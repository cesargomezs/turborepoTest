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
        tint={isDark ? 'dark' : 'light'}
        intensity={Platform.OS === 'ios' ? 85 : 95}
        style={StyleSheet.absoluteFill}
      />
      
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