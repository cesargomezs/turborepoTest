import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { cn } from '../../utils/twcn';
import { ThemedText } from '../ThemedText';
import React from 'react';

export default function Header({ title }: { title?: string }) {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();

  // En Android, el desenfoque a veces necesita un color de fondo semitransparente para verse bien
  const blurBackgroundColor = theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';

  return (
    <View style={{ height: (Platform.OS === 'ios' ? 130 : 110) + insets.top }}>
      <BlurView
        tint={theme === 'dark' ? 'dark' : 'light'}
        intensity={Platform.OS === 'ios' ? 80 : 100} // Android necesita más intensidad
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'android' && { backgroundColor: blurBackgroundColor }
        ]}
        className="justify-end pb-4 px-6"
      >
        <View className="flex-row items-center justify-between">
          <View className='flex-row items-center gap-3'>
            {/* Avatar con tamaño adaptable */}
            <View className={cn(
              "w-12 h-12 rounded-full border",
              theme === 'dark' ? "border-white/20" : "border-black/10"
            )}>
              <Image
                source={require('../../assets/images/cesar.webp')}
                className="rounded-full" // Tailwind para otros estilos
                style={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: 50 // La mitad del ancho/alto para círculo perfecto
                }}
              />
            </View>
            
            <View>
              <ThemedText className="text-xl font-bold leading-tight">Hola, Cesar</ThemedText>
              {title && (
                <ThemedText 
                  className="text-xs font-medium uppercase tracking-wider opacity-60"
                  style={{ color: Colors[theme].tabIconDefault }}
                >
                  {title}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Botón de traducción universal */}
          <View className={cn(
            "p-2 rounded-xl",
            theme === 'dark' ? "bg-white/10" : "bg-black/5"
          )}>
            <MaterialCommunityIcons
              size={24}
              color={Colors[theme].text}
              name="translate"
            />
          </View>
        </View>
      </BlurView>
    </View>
  );
}