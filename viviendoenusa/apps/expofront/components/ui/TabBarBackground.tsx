import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';


export default function BlurTabBarBackground() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
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
      
      <View 
        style={[
          styles.borderTop, 
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} 
      />
    </View>
  );
}

export function useBottomTabOverflow() {
  const insets = useSafeAreaInsets();
  
  try {
    const tabHeight = useBottomTabBarHeight();
    return tabHeight;
  } catch (e) {
    if (Platform.OS === 'ios') {
      return insets.bottom > 0 ? insets.bottom : 20;
    }
    return 65; 
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