import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText'; // Ajusta la ruta si es necesario

// Clave para guardar en el dispositivo si ya vio el tutorial
const TUTORIAL_STORAGE_KEY = '@has_seen_v2_tutorial';

interface AppTutorialModalProps {
  isDark: boolean;
  Colors: any;
  orangeGradient: readonly [string, string, ...string[]];
}

export default function AppTutorialModal({ isDark, Colors, orangeGradient }: AppTutorialModalProps) {
  const { width, height } = useWindowDimensions();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;

  // 1. Verificar si es la primera vez que abre la app tras esta actualización
  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (hasSeen !== 'true') {
          setIsVisible(true);
        }
      } catch (error) {
        console.error('Error leyendo AsyncStorage para el tutorial:', error);
      }
    };
    checkTutorialStatus();
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTutorial();
    }
  };

  const finishTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setIsVisible(false);
    } catch (error) {
      console.error('Error guardando el estado del tutorial:', error);
      setIsVisible(false); // Lo cerramos aunque falle el guardado
    }
  };

  // 2. Contenido de las diapositivas
  const tutorialSteps = [
    {
      icon: 'map-search-outline',
      title: 'Encuentra lo que necesitas',
      description: 'Ingresa tu Código Postal en la barra superior. Al instante, verás en el mapa interactivo y en la lista inferior todos los profesionales, negocios o eventos disponibles en esa zona.'
    },
    {
      icon: 'account-group-outline',
      title: 'Interactúa con tu Comunidad',
      description: 'Toca cualquier tarjeta para ver detalles completos, obtener la ruta exacta en tu GPS, llamar directamente o leer las reseñas de otros usuarios.'
    },
    {
      icon: 'plus-circle-outline',
      title: 'Súmate a la Red',
      description: 'Cualquier usuario puede publicar. Solo presiona el botón flotante (+) en la esquina inferior para sugerir un Abogado, Trabajo, Evento o Negocio. ¡El proceso es el mismo para todos!'
    },
    {
      icon: 'qrcode-scan',
      title: 'Planes y Cupones',
      description: 'Al registrar un perfil, podrás elegir un Plan de Suscripción (pagando seguro escaneando nuestro QR de Zelle) o ingresar un Código de Cupón si dispones de uno. ¡Nosotros nos encargamos del resto!'
    }
  ];

  if (!isVisible) return null;

  const currentData = tutorialSteps[currentStep];

  return (
    <Modal visible={isVisible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Fondo con desenfoque para dar el toque "Apple" */}
        {!isAndroid && <BlurView intensity={isDark ? 80 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
        
        <View style={[
          styles.modalContainer, 
          { 
            backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFFFFF') : (isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)'),
            borderColor: Colors.border,
            width: isLargeWeb ? 500 : '85%',
          }
        ]}>
          
          {/* Indicadores de progreso (Puntitos) */}
          <View style={styles.paginationContainer}>
            {tutorialSteps.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: currentStep === index ? '#FF5F6D' : Colors.iconInactive,
                    width: currentStep === index ? 24 : 8 
                  }
                ]} 
              />
            ))}
          </View>

          {/* Ícono dinámico gigante */}
          <View style={styles.iconContainer}>
            <LinearGradient colors={orangeGradient as any} style={styles.iconGradient}>
              <MaterialCommunityIcons name={currentData.icon as any} size={60} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Textos explicativos */}
          <ThemedText style={[styles.title, { color: Colors.text }]}>
            {currentData.title}
          </ThemedText>
          <ThemedText style={[styles.description, { color: Colors.subtext }]}>
            {currentData.description}
          </ThemedText>

          {/* Botones de acción */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={finishTutorial} style={styles.skipButton}>
              <ThemedText style={{ color: Colors.subtext, fontWeight: '700' }}>Omitir</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNext} style={styles.nextButtonWrapper}>
              <LinearGradient colors={orangeGradient as any} style={styles.nextButton}>
                <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>
                  {currentStep === tutorialSteps.length - 1 ? '¡Empezar!' : 'Siguiente'}
                </ThemedText>
                {currentStep < tutorialSteps.length - 1 && (
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 32,
    padding: 30,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    marginBottom: 25,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  nextButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  }
});