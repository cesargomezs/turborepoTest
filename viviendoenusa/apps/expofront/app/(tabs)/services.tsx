import React from 'react';
import {
  TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, useWindowDimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';

interface ButtonConfig {
  id: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  path: string;
  colors: readonly [string, string, ...string[]];
  description?: string;
}

const BUTTONS_DATA: ButtonConfig[] = [
  // 1. Abogados: Azul profesional (Confianza)
  { id: 1, icon: 'scale-balance', path: '/tabservices/lawyers', colors: ['#4facfe', '#00f2fe'] as const, description: 'Asesoría legal y abogados certificados.' },
  // 2. Comunidad: Naranja/Coral (Energía social)
  { id: 2, icon: 'account-group-outline', path: '/tabservices/community', colors: ['#FF5F6D', '#FFC371'] as const, description: 'Conecta y participa con tu comunidad.' },
  // 3. Donaciones: Rojo vibrante (El corazón)
  { id: 3, icon: 'hand-heart', path: '/tabservices/donations', colors: ['#FF416C', '#FF4B2B'] as const, description: 'Apoya causas y organizaciones locales.' },
  // 4. Eventos: Amarillo/Dorado (Brillo)
  { id: 4, icon: 'calendar-clock', path: '/tabservices/events', colors: ['#f6d365', '#fda085'] as const, description: 'Descubre eventos y actividades próximas.' },
  // 5. Tiendas: Violeta/Indigo (Comercio)
  { id: 5, icon: 'store-plus-outline', path: '/tabservices/stores', colors: ['#667eea', '#764ba2'] as const, description: 'Explora negocios y servicios cercanos.' },
  // 6. Emprendimientos: Rosa/Fucsia (Creatividad)
  { id: 6, icon: 'lightbulb-multiple-outline', path: '/tabservices/entrepreneurs', colors: ['#f093fb', '#f5576c'] as const, description: 'Recursos para impulsar tu emprendimiento.' },
];

export default function ServicesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.72 : (loggedIn ? height * 0.69 : height * 0.65));

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  const renderServiceCard = (item: ButtonConfig) => (
    <TouchableOpacity 
      key={item.id} 
      activeOpacity={0.8} 
      onPress={() => router.push(item.path as any)}
      style={[styles.shadowWrapper, isLargeWeb ? webStyles.webCard : styles.mobileCard]}
    >
      <LinearGradient
        colors={item.colors as unknown as [string, string, ...string[]]} 
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[
            styles.gradientButton, 
            isLargeWeb ? { flexDirection: 'row', paddingHorizontal: 20, justifyContent: 'flex-start' } : { flexDirection: 'column' }
        ]}
      >
        <View style={isLargeWeb ? webStyles.iconContainerWeb : null}>
            <MaterialCommunityIcons name={item.icon} size={isLargeWeb ? 32 : 38} color="white" />
        </View>

        <View style={isLargeWeb ? { marginLeft: 15, flex: 1, alignItems: 'flex-start' } : { alignItems: 'center', marginTop: 10 }}>
          <ThemedText style={[styles.buttonText, isLargeWeb && { fontSize: 16 }]}>
            {t.servicestab[`service${item.id}` as keyof typeof t.servicestab]}
          </ThemedText>
          {isLargeWeb && (
            <ThemedText style={webStyles.descriptionText}>{item.description}</ThemedText>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          { 
            justifyContent: 'flex-start',
            paddingTop: isLargeWeb ? 80 : 20 
          }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.centerContainer, 
          { 
            marginTop: isAndroid ? 29 : (isLargeWeb ? -43 : 5) 
          }
        ]}>
          <View style={[styles.cardWrapper, { 
            width: cardWidth, 
            height: cardHeight,
            backgroundColor: isAndroid ? (isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0, 
            borderColor: Colors.border,
            elevation: 0,
            borderRadius: 28,
            overflow: 'hidden'
          }]}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={styles.cardContent}>
              <View style={[styles.headerRow, isLargeWeb && { marginBottom: 20 }]}>
                <View style={isLargeWeb ? { flex: 1, alignItems: 'center', marginLeft: 40 } : { flex: 1 }}>
                    <ThemedText style={styles.welcomeText}>
                      {loggedIn ? t.servicestab?.welcome_user : t.servicestab?.welcome_guest}
                    </ThemedText>
                </View>
                
                {/* ICONO SIDEBAR: Usamos un nombre compatible con TypeScript */}
                <MaterialCommunityIcons 
                  name={isLargeWeb ? "view-list" : "view-list"} 
                  size={isLargeWeb ? 40 : 40} 
                  color={Colors.text} 
                  style={{ opacity: 0.2 }} 
                />
              </View>
              {isLargeWeb && (
                <View style={{ alignItems: 'center', marginBottom: 50 }}>
                      <ThemedText style={{ color: isDark ? '#BBB' : '#666', marginTop: 8, alignItems:'center', fontSize: 17, fontWeight: '500' }}>
                        ¿En qué podemos ayudarte hoy?
                      </ThemedText>
                </View>
             )}

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[
                    styles.gridContainer, 
                    isLargeWeb && webStyles.webGridCentering
                ]}>
                  {BUTTONS_DATA.map(renderServiceCard)}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingVertical: 20 },
  centerContainer: { width: '100%', alignItems: 'center' },
  cardWrapper: { borderRadius: 28 },
  cardContent: { flex: 1, padding: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mobileCard: { width: '47%', height: 130, marginBottom: 18 },
  shadowWrapper: {
    borderRadius: 28,
    ...Platform.select({ 
        ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, 
        android: { elevation: 3 },
        web: { cursor: 'pointer' } as any
    })
  },
  gradientButton: { flex: 1, borderRadius: 28, justifyContent: 'center', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  buttonText: { fontSize: 11, color: 'white', fontWeight: '800', textAlign: 'center' },
});

const webStyles = StyleSheet.create({
  webGridCentering: { 
    justifyContent: 'center', 
    gap: 30, 
    paddingHorizontal: 40 
  },
  webCard: { 
    width: '30%', 
    height: 125, 
    minWidth: 320 
  },
  iconContainerWeb: { 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    padding: 12, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  descriptionText: { 
    color: 'white', 
    fontSize: 12, 
    opacity: 0.9, 
    marginTop: 4, 
    fontWeight: '400', 
    textAlign: 'left' 
  },
});