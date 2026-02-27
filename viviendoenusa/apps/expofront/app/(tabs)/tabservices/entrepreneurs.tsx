import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
// AJUSTE 1: Se agrega useSegments a las importaciones de expo-router
import { useRouter, useFocusEffect, useSegments } from 'expo-router'; 
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';

import { contentCardStyles as styles } from "../../src/styles/contentcard";

export default function EntrepreneursScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  // AJUSTE 2: Se define la constante segments para habilitar isCommunityScreen
  const segments = useSegments();
  const isCommunityScreen = segments.includes('entrepreneurs');

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: loggedIn ? 'flex-start' : 'center'}]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.push('/services')}>
                <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <View style={styles.headerIcons}>
                <MaterialCommunityIcons name="lightbulb-multiple-outline" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.2}} />
              </View>
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {/* --- FORMULARIO DE BÚSQUEDA Y FILTROS */}



            {/* --- FIN */}  
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
    >
      {Platform.OS === 'web' ? renderMainContent() : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}