import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ITSupportFab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[
        styles.fabContainer, 
        { bottom: isIOS ? insets.bottom + 75 : 85 } // Se ajusta limpiamente para no chocar con la barra de navegación
      ]} 
      onPress={onPress}
    >
      <LinearGradient 
        colors={['#FF5F6D', '#FFC371']} 
        style={styles.gradientBadge}
      >
        <MaterialCommunityIcons name="headset" size={26} color="#FFF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
    elevation: 999,
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  gradientBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  }
});