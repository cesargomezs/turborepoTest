import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { cn } from '../utils/twcn';
import React from 'react';

export function Collapsible({ 
  children, 
  title, 
  className 
}: PropsWithChildren & { title: string; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    // Usamos View con bg-transparent para no tapar el fondo del _layout
    <View className={cn("mb-4 bg-transparent", className)}>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.7}
        className="py-2"
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          // Animación simple del icono
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText type="defaultSemiBold" className="text-lg">
          {title}
        </ThemedText>
      </TouchableOpacity>

      {isOpen && (
        <View 
          className="mt-2 ml-6 overflow-hidden bg-transparent"
          style={styles.content}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    // Podrías añadir una animación aquí con Reanimated más adelante
  },
});