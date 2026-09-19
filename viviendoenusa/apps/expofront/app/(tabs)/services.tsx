import React, { useEffect, useRef, useState } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions, Animated, Text, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useMockSelector, setUserMetadata, toggleAuth, useMockDispatch } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import AppTutorialModal from '@/components/AppTutorialModal';

// 🚀 IMPORTAMOS EL CONTEXTO GLOBAL
import { useAppTheme } from '../../context/ThemeContext';

interface ButtonConfig {
  id: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  path: string;
  colors: readonly [string, string, ...string[]];
  description: string;
  isAllowedForGuest: boolean; 
}

const BUTTONS_DATA: ButtonConfig[] = [
  { id: 1, icon: 'scale-balance', path: '/tabservices/lawyers', colors: ['#4facfe', '#00f2fe'], description: 'Asesoría legal y abogados certificados.', isAllowedForGuest: true },
  { id: 2, icon: 'account-group-outline', path: '/tabservices/community', colors: ['#FF5F6D', '#FFC371'], description: 'Conecta y participa con tu comunidad.', isAllowedForGuest: false },
  { id: 3, icon: 'hand-heart', path: '/tabservices/donations', colors: ['#00c6fb', '#005bea'], description: 'Apoya causas y organizaciones locales.', isAllowedForGuest: false },
  { id: 4, icon: 'calendar-star', path: '/tabservices/events', colors: ['#f6d365', '#fda085'], description: 'Descubre eventos y actividades próximas.', isAllowedForGuest: true },
  { id: 5, icon: 'store-plus-outline', path: '/tabservices/stores', colors: ['#667eea', '#764ba2'], description: 'Explora negocios y servicios cercanos.', isAllowedForGuest: true },
  { id: 6, icon: 'lightbulb-multiple-outline', path: '/tabservices/entrepreneurs', colors: ['#f093fb', '#f5576c'], description: 'Recursos para impulsar tu emprendimiento.', isAllowedForGuest: false },
];

// 🚀 PASOS DEL SLIDER / MINI TUTORIAL PARA INVITADOS
const GUEST_SLIDES = [
  {
    icon: 'compass-outline',
    title: 'Modo Explorador',
    desc: 'Puedes ingresar a ver y probar el funcionamiento de las opciones libres (sin candado) durante tus 4 minutos de prueba.',
    colors: ['#FF5F6D', '#FFC371']
  },
  {
    icon: 'scale-balance',
    title: 'Abogados y Eventos',
    desc: 'Explora libremente el directorio de abogados y los eventos locales programados en tu ciudad.',
    colors: ['#4facfe', '#00f2fe']
  },
  {
    icon: 'store-plus-outline',
    title: 'Tiendas y Empleos',
    desc: 'Descubre los negocios cercanos y consulta las vacantes de la bolsa de empleo sin restricciones.',
    colors: ['#667eea', '#764ba2']
  },
  {
    icon: 'lock-open-outline',
    title: '¡Crea tu Cuenta!',
    desc: 'Las secciones con candado (Red de Apoyo, Donaciones y Emprendimientos) se desbloquearán al registrarte gratis.',
    colors: ['#f6d365', '#fda085']
  }
];

export default function ServicesScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const dispatch = useMockDispatch();
  
  // 🚀 LEEMOS EL TEMA DESDE EL CONTEXTO
  const { isDark } = useAppTheme();

  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken; 

  // 🚀 Detección exclusiva de invitado
  const isGuest = userMetadata?.typeDetail === 'Guest';
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [showGuestSliderModal, setShowGuestSliderModal] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);

  const { t } = useTranslation();
  const localStyles = useUnifiedCardStyles();

  // 🚀 REDIRECCIÓN AUTOMÁTICA SEGURA SI NO HAY TOKEN NI INVITADO
  useEffect(() => {
    if (!userToken) {
      router.replace('/');
    }
  }, [userToken]);

  // Mostrar el slider de guía automáticamente SOLO la primera vez que entra el invitado
  useEffect(() => {
    if (isGuest) {
      setShowGuestSliderModal(true);
      setCurrentSlideIdx(0);
    }
  }, [isGuest]);

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

  // --- DIMENSIONES Y COLORES ---
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);
  
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#546E7A',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
  };

  const handleCardPress = (item: ButtonConfig) => {
    if (isGuest && !item.isAllowedForGuest) {
      setShowRestrictedModal(true);
      return;
    }
    router.push(item.path as any);
  };

  const handleNextSlide = () => {
    if (currentSlideIdx < GUEST_SLIDES.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    } else {
      setShowGuestSliderModal(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start' }} 
        keyboardShouldPersistTaps="handled"
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

              {/* --- ZONA: RED DE APOYO (BOTÓN ROJO DESTACADO CON CANDADO SI ES INVITADO) --- */}
              <View style={{ 
                paddingHorizontal: isLargeWeb ? 0 : 5, 
                marginTop: 0, 
                marginBottom: 10,
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isGuest) {
                      setShowRestrictedModal(true);
                      return;
                    }
                    router.push('/tabservices/support' as any);
                  }}
                  style={{
                    shadowColor: '#FF416C',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 5,
                    elevation: 6,
                    borderRadius: 25,
                    maxWidth: 350, 
                  }}
                >
                  <LinearGradient
                    colors={['#FF5F6D', '#FF416C']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 25,
                      paddingVertical: 15,
                      borderRadius: 25,
                    }}
                  >
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <MaterialCommunityIcons name="heart-pulse" size={32} color="#FFFFFF" />
                    </Animated.View>
                    <ThemedText style={{ 
                      marginLeft: 10, 
                      fontWeight: '800', 
                      fontSize: 16, 
                      color: '#FFFFFF',
                      textAlign: 'center' 
                    }}>
                      {t.supporttab?.support_btn_title || "Red de Apoyo"}
                    </ThemedText>
                    {isGuest && (
                      <MaterialCommunityIcons name="lock-outline" size={16} color="#FFF" style={{ marginLeft: 8, opacity: 0.9 }} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ height: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 5 }}>
                    <ThemedText style={localStyles.middleText}>
                        {t.servicestab?.help_question}
                    </ThemedText>
                </View>

                {/* CUADRÍCULA DE 6 BOTONES */}
                <View style={[localStyles.gridContainer, isLargeWeb && localStyles.webGridCentering]}>
                  {BUTTONS_DATA.map((item) => {
                    const isLockedForGuest = isGuest && !item.isAllowedForGuest;
                    return (
                      <TouchableOpacity 
                        key={item.id} 
                        activeOpacity={0.8} 
                        onPress={() => handleCardPress(item)}
                        style={[localStyles.shadowWrapper, isLargeWeb ? localStyles.webCard : localStyles.mobileCard, isLockedForGuest && { opacity: 0.75 }]}
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
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <ThemedText numberOfLines={1} style={[localStyles.buttonText, { flex: 1 }]}>
                                  {t.servicestab[`service${item.id}` as keyof typeof t.servicestab]}
                                </ThemedText>
                                {isLockedForGuest && (
                                  <MaterialCommunityIcons name="lock-outline" size={16} color="#FFF" style={{ marginLeft: 4, opacity: 0.9 }} />
                                )}
                              </View>
                              {isLargeWeb && (
                                <ThemedText numberOfLines={2} style={localStyles.descriptionText}>
                                  {item.description}
                                </ThemedText>
                              )}
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 🚀 MODAL DE SLIDER / MINI TUTORIAL PARA INVITADOS */}
      <Modal visible={showGuestSliderModal && isGuest} transparent animationType="fade" onRequestClose={() => setShowGuestSliderModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '90%', maxWidth: 380, backgroundColor: '#13112E', borderRadius: 32, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}>
            
            {/* Indicadores de Paginación Superior */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 30, alignItems: 'center' }}>
              {GUEST_SLIDES.map((_, i) => (
                <View 
                  key={i} 
                  style={{ 
                    height: 6, 
                    borderRadius: 3, 
                    width: currentSlideIdx === i ? 24 : 6, 
                    backgroundColor: currentSlideIdx === i ? '#FF5F6D' : 'rgba(255,255,255,0.2)' 
                  }} 
                />
              ))}
            </View>

            {/* Ícono Circular con Degradado */}
            <LinearGradient 
              colors={GUEST_SLIDES[currentSlideIdx].colors as any} 
              style={{ width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 25, shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }}
            >
              <MaterialCommunityIcons name={GUEST_SLIDES[currentSlideIdx].icon as any} size={42} color="#FFF" />
            </LinearGradient>

            {/* Títulos y Descripción */}
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 12 }}>
              {GUEST_SLIDES[currentSlideIdx].title}
            </Text>
            
            <Text style={{ fontSize: 14, color: '#B0BEC5', textAlign: 'center', lineHeight: 22, marginBottom: 35, paddingHorizontal: 5 }}>
              {GUEST_SLIDES[currentSlideIdx].desc}
            </Text>

            {/* Botones Inferiores: Omitir / Siguiente */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 15 }}>
              <TouchableOpacity 
                onPress={() => setShowGuestSliderModal(false)}
                style={{ paddingVertical: 12, paddingHorizontal: 15 }}
              >
                <Text style={{ color: '#B0BEC5', fontWeight: 'bold', fontSize: 15 }}>Omitir</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleNextSlide}
                style={{ flex: 1, borderRadius: 18, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>
                    {currentSlideIdx === GUEST_SLIDES.length - 1 ? "¡Empezar!" : "Siguiente"}
                  </Text>
                  {currentSlideIdx < GUEST_SLIDES.length - 1 && (
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFF" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* 🚀 MODAL ELEGANTE DE ACCESO RESTRINGIDO (LIMPIO, SIN ROUTER.REPLACE EXPLOSIVO) */}
      <Modal visible={showRestrictedModal} transparent animationType="fade" onRequestClose={() => setShowRestrictedModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '90%', maxWidth: 380, backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: DynamicColors.border, alignItems: 'center' }}>
            
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 95, 109, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
              <MaterialCommunityIcons name="lock-alert" size={32} color="#FF5F6D" />
            </View>

            <ThemedText style={{ fontSize: 20, fontWeight: '900', color: DynamicColors.text, textAlign: 'center', marginBottom: 8 }}>
              Contenido Exclusivo
            </ThemedText>
            
            <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, textAlign: 'center', lineHeight: 20, marginBottom: 25 }}>
              Para acceder a la Red de Apoyo, Donaciones y Emprendimientos, necesitas crear una cuenta gratuita. ¡Los accesos a Abogados, Eventos y Tiendas están totalmente abiertos para ti!
            </ThemedText>

            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => {
                  setShowRestrictedModal(false);
                  dispatch(setUserMetadata({} as any));
                  dispatch(toggleAuth());
                }}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Crear Cuenta Gratis</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowRestrictedModal(false)}
                style={{ paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: DynamicColors.subtext, fontWeight: 'bold', fontSize: 14 }}>Seguir Explorando</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* 🚀 EL TUTORIAL INVISIBLE */}
      <AppTutorialModal 
         isDark={isDark} 
         Colors={DynamicColors} 
         orangeGradient={['#FF5F6D', '#FFC371']} 
      />
    </View>
  );
}