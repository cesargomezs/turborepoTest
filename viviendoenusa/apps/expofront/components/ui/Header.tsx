import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View, Image, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';
import React from 'react';

export default function Header({ title }: { title?: string }) {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  return (
    <View style={{ width: '100%', backgroundColor: 'transparent' }}>
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={Platform.OS === 'ios' ? 85 : 100}
        style={{ paddingTop: insets.top }}
        className="border-b border-white/10"
      >
        {/* 1. FILA PRINCIPAL (Avatar, Nombre e Icono) */}
        <View 
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            width: '100%',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 5, // Reducimos para que el "inicio" no quede muy lejos
          }}
        >
          {/* GRUPO IZQUIERDO */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View 
              style={{ 
                width: 55, 
                height: 55, 
                borderRadius: 27.5, 
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }}
            >
              <Image
                source={require('../../assets/images/cesar.webp')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View style={{ marginLeft: 12 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                Hola, Cesar
              </ThemedText>
            </View>
          </View>

          {/* GRUPO DERECHO (Botón) */}
          <TouchableOpacity 
            activeOpacity={0.7}
            style={{ 
              width: 44, 
              height: 44, 
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MaterialCommunityIcons
              size={22}
              color={Colors[theme].text}
              name="translate"
            />
          </TouchableOpacity>
        </View>

        {/* 2. PIE DE PÁGINA DEL HEADER (Texto "inicio" centrado) */}
        <View 
          style={{ 
            width: '100%', 
            alignItems: 'center', 
            paddingBottom: 10, // Espacio final antes de la línea divisoria
          }}
        >
          <ThemedText 
        className="text-center text-2xl"
        style={{ color: Colors[theme].tabIconDefault }}
          >
            {title}
          </ThemedText>
        </View>
      </BlurView>
    </View>
  );
}