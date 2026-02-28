import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';

// --- INTERFAZ PARA EVITAR ERRORES DE TYPESCRIPT EN GRADIENTES ---
interface ButtonConfig {
  id: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  path: string;
  colors: readonly [string, string, ...string[]]; // Tupla estricta para LinearGradient
}

const BUTTONS_DATA: ButtonConfig[] = [
  // 1. Azul turquesa a azul intenso
  { id: 1, icon: 'scale-balance', path: '/tabservices/lawyers', colors: ['#FF5F6D', '#FFC371'] as const },
  { id: 2, icon: 'account-group-outline', path: '/tabservices/community', colors: ['#FF5F6D', '#FFC371'] as const },
  { id: 3, icon: 'hand-heart', path: '/tabservices/donations', colors: ['#FF5F6D', '#FFC371'] as const },
  { id: 4, icon: 'calendar-clock', path: '/tabservices/events', colors: ['#FF5F6D', '#FFC371'] as const },
  { id: 5, icon: 'store-plus-outline', path: '/tabservices/stores', colors: ['#FF5F6D', '#FFC371'] as const },
  { id: 6, icon: 'lightbulb-multiple-outline', path: '/tabservices/entrepreneurs', colors: ['#FF5F6D', '#FFC371'] as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  // Dimensiones de la tarjeta (Tus originales)
  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: 'center' }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none" 
          />

          <View style={styles.cardContent}>
            <MaterialCommunityIcons 
              size={40} 
              name="account-group" 
              style={{ textAlign: 'right', width: '100%', opacity: 0.4 }} 
              color={Colors[colorScheme].tabIconNotSelected} 
            />

            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, justifyContent: loggedIn ? 'flex-start' : 'center' }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.gridContainer}>
                {BUTTONS_DATA.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    activeOpacity={0.8} 
                    onPress={() => router.push(item.path as any)}
                    style={styles.shadowWrapper}
                  >
                    <LinearGradient
                      // Solución al error TS(2769): Forzamos el tipo de la tupla
                      colors={item.colors as unknown as [string, string, ...string[]]} 
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientButton}
                    >
                      <MaterialCommunityIcons 
                        name={item.icon} 
                        size={40} 
                        color="white" 
                        style={styles.iconShadow} 
                      />
                      <ThemedText style={styles.buttonText}>
                        {t.servicestab[`service${item.id}` as keyof typeof t.servicestab]}
                      </ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {Platform.OS === 'web' ? (
        renderMainContent()
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>{renderMainContent()}</View>
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { 
    flexGrow: 1, 
    paddingVertical: 20, 
    marginTop: Platform.OS === 'ios' ? -19 : 0 
  },
  centerContainer: { 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1 
  },
  cardWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 15 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 20 
      },
      android: { elevation: 12 },
    }),
  } as ViewStyle,
  cardContent: { 
    flex: 1, 
    padding: 25, 
    zIndex: 10  
  },
  gridContainer: {
    flexDirection: 'row',
    paddingTop: 40, // Ajustado para que no choque con el icono superior
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shadowWrapper: {
    width: '46%', 
    height: 120, 
    borderRadius: 30,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        // Corrección para sombras en web modernas
        boxShadow: '0px 8px 20px rgba(0,0,0,0.15)',
      }
    }),
  },
  gradientButton: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonText: {
    fontSize: 12, 
    marginTop: 8, 
    color: 'white',
    textAlign: 'center',
    fontWeight: '600'
  },
});