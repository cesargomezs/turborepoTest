import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

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
  // NUEVO COLOR CIAN PARA DONACIONES: Transmite confianza y ayuda desinteresada
  { id: 3, icon: 'hand-heart', path: '/tabservices/donations', colors: ['#00c6fb', '#005bea'], description: 'Apoya causas y organizaciones locales.' },
  { id: 4, icon: 'calendar-star', path: '/tabservices/events', colors: ['#f6d365', '#fda085'], description: 'Descubre eventos y actividades próximas.' },
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

  const localStyles = useUnifiedCardStyles();

  // --- ANIMACIÓN: CORAZÓN LATIENDO ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  // --- LÓGICA DE DIMENSIONES Y COLORES ---
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);
  
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start' }} 
        keyboardShouldPersistTaps="handled"
        // BLOQUEO DE SCROLL EXTERIOR: Solo habilitado en Web
        scrollEnabled={isWeb}
      >
        <View style={[localStyles.centerContainer, { marginTop: verticalOffset }]}>
          
          <View style={{
            width: cardWidth, 
            height: cardHeight, 
            overflow: 'hidden', 
            borderRadius: 28,
            backgroundColor: isAndroid 
              ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)') 
              : 'transparent',
            borderWidth: isAndroid ? 1 : 0,
            borderColor: borderColor,
          }}>
            
            {!isAndroid && (
              <BlurView 
                intensity={isDark ? 100 : 75} 
                tint={isDark ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill} 
              />
            )}
            
            <View style={localStyles.cardContent}>
              <View style={localStyles.headerRow}>
                <View style={{ flex: 1 }}>
                </View>
                <MaterialCommunityIcons 
                  name="view-list" 
                  size={40} 
                  color={textColor} 
                  style={{ opacity: 0.2 }} 
                />
              </View>

              {/* --- ZONA: RED DE APOYO (BOTÓN ROJO SOS DESTACADO) --- */}
              <View style={{ paddingHorizontal: isLargeWeb ? 0 : 5, marginTop: 5, marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                  
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/tabservices/support' as any)}
                    style={{
                      shadowColor: '#FF416C',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  >
                    <LinearGradient
                      colors={['#FF416C', '#FF4B2B']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 26,
                        paddingVertical: 14,
                        borderRadius: 24,
                      }}
                    >
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <MaterialCommunityIcons name="heart-pulse" size={24} color="#FFFFFF" />
                      </Animated.View>
                      <ThemedText style={{ marginLeft: 10, fontWeight: '900', fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 }}>
                        {t.supporttab?.support_btn_title }
                      </ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>

                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                    <ThemedText style={localStyles.middleText}>
                        {t.servicestab?.help_question}
                    </ThemedText>
                </View>

                {/* CUADRÍCULA DE 6 BOTONES */}
                <View style={[localStyles.gridContainer, isLargeWeb && localStyles.webGridCentering]}>
                  {BUTTONS_DATA.map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      activeOpacity={0.8} 
                      onPress={() => router.push(item.path as any)}
                      style={[localStyles.shadowWrapper, isLargeWeb ? localStyles.webCard : localStyles.mobileCard]}
                    >
                      <LinearGradient
                        colors={item.colors as any} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }}
                        style={localStyles.gradientButton}
                      >
                        <View style={isLargeWeb ? localStyles.webLayout : localStyles.mobileLayout}>
                          <View style={isLargeWeb ? localStyles.iconContainerWeb : null}>
                            <MaterialCommunityIcons name={item.icon} size={isLargeWeb ? 26 : 34} color="white" />
                          </View>
                          
                          <View style={isLargeWeb ? localStyles.textContainerWeb : localStyles.textContainerMobile}>
                            <ThemedText numberOfLines={1} style={localStyles.buttonText}>
                              {t.servicestab[`service${item.id}` as keyof typeof t.servicestab]}
                            </ThemedText>
                            {isLargeWeb && (
                              <ThemedText numberOfLines={2} style={localStyles.descriptionText}>
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
    </View>
  );
}