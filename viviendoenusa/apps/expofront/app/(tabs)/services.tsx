import React, { useState } from 'react';
import {
  Image,
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

import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import ThemedTextInput from '../../components/ThemedTextInput';
import { Colors } from '../../constants/Colors';
import { toggleAuth, useMockDispatch, useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient'; // Importación necesaria
import { useRouter } from 'expo-router'; // Importación necesaria


interface ButtonConfig {
  id: number;
  icon: any;
  colors: readonly [string, string, ...string[]]; // Esto coincide con lo que pide el error
}
// 1. Definimos la configuración de cada botón (Iconos y Colores)
//{ id: 1, icon: 'scale-balance', colors: ['#20B2AA', '#0080B5'] as const},color azul turquesa, azul intenso
const BUTTONS_DATA = [
  { id: 1, icon: 'scale-balance', path: '/tabs/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
  { id: 2, icon: 'account-group-outline', path: '/services/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
  { id: 3, icon: 'hand-heart', path: '/services/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
  { id: 4, icon: 'calendar-clock', path: '/services/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
  { id: 5, icon: 'store-plus-outline', path: '/services/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
  { id: 6, icon: 'lightbulb-multiple-outline', path: '/services/lawyers' , colors: ['#FF5F6D', '#FFC371'] as const},
];

export default function HomeScreen() {
  const router = useRouter(); // Inicializamos el router
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const [form, setForm] = useState<{username?: string; password?: string}>({ username: '', password: '' });
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const { t } = useTranslation();

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;
  const marginTopValue = Platform.OS === 'ios' ? 5 : 5;

  // Renderizamos el contenido principal para poder usarlo con o sin Touchable
  const renderMainContent = () => (
    <ScrollView 
    contentContainerStyle={[styles.scrollContainer, { justifyContent: 'center' }]}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          
          {/* El BlurView no debe bloquear eventos en Web */}
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none" 
          />

          <View style={styles.cardContent}>

            <MaterialCommunityIcons size={40} name="account-group" style={{ display: 'flex', textAlign: 'right', width: '100%' , opacity:0.4}} color={Colors[colorScheme].tabIconNotSelected} />
                <ScrollView contentContainerStyle={[
                  styles.scrollContainer,
                  { justifyContent: loggedIn ? 'flex-start' : 'center'}
                ]}>

                <View style={styles.gridContainer}>
                      {/* 2. Usamos .map para generar los botones sin repetir código */}
                      {BUTTONS_DATA.map((item) => (
                        <TouchableOpacity 
                          key={item.id} // Siempre usa una key única
                          activeOpacity={0.8} 
                          onPress={() => router.push(item.path as any)}
                          style={styles.shadowWrapper}
                        >
                          <LinearGradient
                            colors={item.colors as readonly string[]} 
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientButton}
                          >
                            <MaterialCommunityIcons 
                              name={item.icon as any} 
                              size={40} 
                              color="white" 
                              style={styles.iconShadow} 
                            />
                            <ThemedText style={styles.buttonText}>
                              {/* Acceso dinámico a las traducciones: service1, service2, etc. */}
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
      {/* CAMBIO CLAVE: En Web, TouchableWithoutFeedback rompe el foco de los inputs.
          Solo lo activamos en Android/iOS.
      */}
      {Platform.OS === 'web' ? (
        renderMainContent()
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

// ... Estilos (mantener tus estilos actuales)
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingVertical: 11*
    0, marginTop: Platform.OS === 'ios' ? -19 : 10 },
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  cardWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  } as ViewStyle,
  cardContent: { flex: 1, padding: 25, zIndex: 10  },
  infoSection: { alignItems: 'flex-start', width: '100%' , marginTop: 20},
  sectionTitle: { marginTop: 5, marginBottom: 10 },
  descriptionText: { fontSize: 16, textAlign: 'left', lineHeight: 24, opacity: 0.9, marginBottom: 20 },
  separator: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 5 },
  miniSeparator: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
  loginWrapper: { flex: 1, justifyContent: 'center' },
  loginHeader: { textAlign: 'center', marginBottom: 20 },
  formContainer: { width: '100%' },
  inputGap: { gap: 15 },
  loginButton: { marginTop: 20, width: '100%', height: 80, justifyContent: 'center' },
  imageBtnContent: { alignItems: 'center', justifyContent: 'center' },
  btnImage: { width: 100, height: 100, position: 'absolute', opacity: 0.8 },
  btnText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  orText: { marginHorizontal: 15, opacity: 0.6 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 14 },
  googleBtnText: { fontWeight: '600', fontSize: 16 },

  buttonContainer: {
    width: 85,
    height: 85,
    borderRadius: 25,
    // Sombras
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 8px 20px rgba(0,0,0,0.3)',
      }
    }),
  },
  screenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Fondo claro para resaltar la sombra
  },
  gradientButton: {
    flex: 1,
    borderRadius: 30, // Bordes redondeados modernos
    justifyContent: 'center',
    alignItems: 'center',
    // Borde muy fino de luz para el efecto de cristal
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconShadow: {
    // Sombra pequeña al icono para que parezca que flota sobre el degradado
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },buttonText: {
    fontSize: 12, 
    marginTop: 6, 
    color: 'white', // O tu variable Colors[colorScheme].textBotton
    textAlign: 'center',
    fontWeight: '600'
  },buttonRow: {
    flexDirection: 'row', // Alinea en horizontal
    justifyContent: 'center', // Centra el conjunto
    alignItems: 'center',
    gap: 20, // Espacio entre los botones (disponible en versiones modernas de RN)
    marginVertical: 20,
    width: '100%',
    marginTop: 25,
  },
  buttonRowFirts: {
    flexDirection: 'row', // Alinea en horizontal
    justifyContent: 'center', // Centra el conjunto
    alignItems: 'center',
    gap: 40, // Espacio entre los botones (disponible en versiones modernas de RN)
    marginVertical: 20,
    marginHorizontal: 20,
    width: '100%',
    marginTop: 70,
  },gridContainer: {
    flexDirection: 'row',
    paddingTop: 80,
    marginBottom: 20,
    flexWrap: 'wrap', // Esto hace que los botones bajen a la siguiente línea
    justifyContent: 'space-between', // O space-evenly para que queden alineados
  },
  shadowWrapper: {
    // Usar un porcentaje ayuda a que siempre quepan 2 por fila
    width: '44%', 
    height: 120, // Altura fija o aspectRatio: 1
    borderRadius: 30,
    marginBottom: 10, // Margen de respaldo por si gap no se aplica
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px 10px 18px rgba(0,0,0,0.18)',
      }
    }),
  },
});

