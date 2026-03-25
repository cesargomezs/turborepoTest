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
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { getContentCardStyles } from 'app/src/styles/contentcommunity';

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
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const localStyles = useUnifiedCardStyles();
  const baseStyles = getContentCardStyles(isDark);

  // --- AJUSTE DE COLORES PARA MÁXIMA CONSISTENCIA ---
  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    // Borde con más presencia (igual que en Comunidad)
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -120 : (isIOS ? -85 : -100);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: isWeb ? 'flex-start' : 'center', 
            paddingTop: isWeb ? 40 : 0 
        }} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[baseStyles.centerContainer, { marginTop: verticalOffset }]}>
          
          {/* --- FIX: CONTENEDOR DE BORDE MAESTRO --- */}
          <View style={{
            width: cardWidth, 
            height: cardHeight, 
            borderRadius: 28,
            borderWidth: 1.5, // Borde forzado para que se vea igual que en la imagen 1
            borderColor: Colors.border,
            borderStyle: 'solid',
            overflow: 'hidden',
            backgroundColor: isAndroid 
              ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)') 
              : (isWeb ? (isDark ? '#141414' : '#FFFFFF') : 'transparent'),
            
            // Sombras profundas
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 20,
          }}>
            
            {/* BLUR PARA EFECTO CRISTAL EN IOS/WEB */}
            {!isAndroid && (
              <BlurView 
                intensity={isDark ? 90 : 70} 
                tint={isDark ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill} 
              />
            )}
            
            <View style={baseStyles.cardContent}>
              {/* HEADER ROW */}
              <View style={localStyles.headerRow}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={localStyles.welcomeText}>
                      {loggedIn ? t.servicestab?.welcome_user : t.servicestab?.welcome_guest}
                    </ThemedText>
                </View>
                <MaterialCommunityIcons name="view-list" size={40} color={Colors.text} style={{ opacity: 0.15 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* ESPACIADOR DE ALINEACIÓN */}
                <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
                    <ThemedText style={localStyles.middleText}>
                        {t.servicestab?.help_question}
                    </ThemedText>
                </View>

                {/* GRID DE BOTONES */}
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
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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
    </KeyboardAvoidingView>
  );
}