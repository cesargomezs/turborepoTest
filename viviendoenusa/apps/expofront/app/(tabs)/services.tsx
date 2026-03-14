import React from 'react';
import {
  TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, useWindowDimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { contentCardStyles as styles } from "../src/styles/contentcard";

interface ButtonConfig {
  id: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  path: string;
  colors: readonly [string, string, ...string[]];
  description: string;
}

const BUTTONS_DATA: ButtonConfig[] = [
  { id: 1, icon: 'scale-balance', path: '/tabservices/lawyers', colors: ['#4facfe', '#00f2fe'], description: 'Asesoría legal y abogados certificados.' },
  { id: 2, icon: 'account-group-outline', path: '/tabservices/community', colors: ['#FF5F6D', '#FFC371'], description: 'Conecta y participa con tu comunidad.' },
  { id: 3, icon: 'hand-heart', path: '/tabservices/donations', colors: ['#FF416C', '#FF4B2B'], description: 'Apoya causas y organizaciones locales.' },
  { id: 4, icon: 'calendar-clock', path: '/tabservices/events', colors: ['#f6d365', '#fda085'], description: 'Descubre eventos y actividades próximas.' },
  { id: 5, icon: 'store-plus-outline', path: '/tabservices/stores', colors: ['#667eea', '#764ba2'], description: 'Explora negocios y servicios cercanos.' },
  { id: 6, icon: 'lightbulb-multiple-outline', path: '/tabservices/entrepreneurs', colors: ['#f093fb', '#f5576c'], description: 'Recursos para impulsar tu emprendimiento.' },
];

export default function ServicesScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  // --- DIMENSIONES CLONADAS DE LAWYERS ---
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.72 : (loggedIn ? height * 0.69 : height * 0.65));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[
          styles.centerContainer, 
          { 
            // UBICACIÓN EXACTA: Espejo de Lawyers
            marginTop: isAndroid ? -65 : (isLargeWeb ? -100 : 0) 
          }
        ]}>
          <View style={[styles.cardWrapper, { 
            width: cardWidth, 
            height: cardHeight, 
            backgroundColor: isAndroid ? (isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0,
            borderColor: Colors.border,
            elevation: 0
           }]}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={styles.cardContent}>
              {/* HEADER ROW */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={webStyles.welcomeText}>
                      {loggedIn ? t.servicestab?.welcome_user : t.servicestab?.welcome_guest}
                    </ThemedText>
                </View>
                <MaterialCommunityIcons name="view-list" size={40} color={Colors.text} style={{ opacity: 0.15 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* ESPACIADOR DE UBICACIÓN: 
                    Este bloque de 60px simula el buscador de Lawyers para que 
                    la cuadrícula empiece exactamente a la misma altura. */}
                <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
                    <ThemedText style={[webStyles.middleText, { color: isDark ? '#BBB' : '#666' }]}>
                        ¿En qué podemos ayudarte hoy?
                    </ThemedText>
                </View>

                <View style={[webStyles.gridContainer, isLargeWeb && webStyles.webGridCentering]}>
                  {BUTTONS_DATA.map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      activeOpacity={0.8} 
                      onPress={() => router.push(item.path as any)}
                      style={[webStyles.shadowWrapper, isLargeWeb ? webStyles.webCard : webStyles.mobileCard]}
                    >
                      <LinearGradient
                        colors={item.colors as any} 
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={webStyles.gradientButton}
                      >
                        <View style={isLargeWeb ? webStyles.webLayout : webStyles.mobileLayout}>
                          <View style={isLargeWeb ? webStyles.iconContainerWeb : null}>
                            <MaterialCommunityIcons name={item.icon} size={isLargeWeb ? 26 : 34} color="white" />
                          </View>
                          
                          <View style={isLargeWeb ? webStyles.textContainerWeb : webStyles.textContainerMobile}>
                            <ThemedText numberOfLines={1} style={webStyles.buttonText}>
                              {t.servicestab[`service${item.id}` as keyof typeof t.servicestab]}
                            </ThemedText>
                            {isLargeWeb && (
                              <ThemedText numberOfLines={2} style={webStyles.descriptionText}>
                                {item.description}
                              </ThemedText>
                            )}
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const webStyles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  cardWrapper: { borderRadius: 28, overflow: 'hidden' },
  cardContent: { flex: 1, padding: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  welcomeText: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  
  middleText: { fontSize: 16, fontWeight: '600', opacity: 0.8 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  
  // ALTURAS FIJAS PARA EVITAR DESPLAZAMIENTOS
  mobileCard: { width: '47%', height: 110, marginBottom: 16 },
  webCard: { width: '31%', height: 105, marginBottom: 20, minWidth: 260 },
  
  shadowWrapper: {
    borderRadius: 24,
    ...Platform.select({ 
        ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, 
        android: { elevation: 3 },
        web: { cursor: 'pointer' } as any
    })
  },
  gradientButton: { flex: 1, borderRadius: 24, padding: 12, justifyContent: 'center' },
  
  mobileLayout: { alignItems: 'center', justifyContent: 'center' },
  webLayout: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  
  textContainerMobile: { alignItems: 'center', marginTop: 8 },
  textContainerWeb: { marginLeft: 15, flex: 1, justifyContent: 'center' },
  
  buttonText: { fontSize: 13, color: 'white', fontWeight: '800' },
  descriptionText: { color: 'white', fontSize: 11, opacity: 0.85, marginTop: 2, fontWeight: '400' },
  
  webGridCentering: { justifyContent: 'center', gap: 20 },
  iconContainerWeb: { backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: 8, borderRadius: 12 },
});