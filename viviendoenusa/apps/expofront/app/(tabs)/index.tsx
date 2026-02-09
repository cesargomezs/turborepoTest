import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions 
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import ThemedTextInput from '../../components/ThemedTextInput';
import { Colors } from '../../constants/Colors';
import { toggleAuth, useMockDispatch, useMockSelector } from '../../redux/slices';
import React from 'react';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const [form, setForm] = useState<{username?: string; password?: string}>();
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const isDark = colorScheme === 'dark';

  // --- CONFIGURACIÓN RESPONSIVA DINÁMICA ---
  // Si está logueado, la tarjeta es más ancha (90%) y más alta (70%)
  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.9 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.7 : height * 0.55;
  const marginTop = (Platform.OS === 'ios' ? 100 : 90);


  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          // Cambiamos la alineación vertical según el estado
          { justifyContent: loggedIn ? 'flex-start' : 'center'}
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contenedor de la Tarjeta */}
        <View style={[
          styles.centerContainer,
          // Si está logueado, le damos un margen superior para acercarlo al header
          loggedIn && { marginTop: Platform.OS === 'ios' ? -8 : 10 }
        ]}>
          
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
          >
            {/* Contenedor interno con Scroll por si el texto de Misión/Visión es largo */}
            <ScrollView 
              contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: loggedIn ? 'flex-start' : 'center', 
                padding: 30,
                paddingTop: loggedIn ? 40 : 30 
              }}
              showsVerticalScrollIndicator={false}
            >
              
              {loggedIn ? (
                /* ESTADO: USUARIO LOGUEADO (Visión y Misión arriba) */
                <View style={{ alignItems: 'flex-start', width: '100%', paddingTop: marginTop }}>
                  <MaterialCommunityIcons 
                    name="bullseye-arrow" 
                    size={40} 
                    color={Colors[colorScheme].tint} 
                    style={{ marginBottom: 10 }}
                  />
                  <ThemedText className="text-3xl font-bold mb-4">Visión</ThemedText>
                  <ThemedText className="text-center text-lg italic mb-10 leading-7">
                    "Crear comunidades más unidas, participativas y solidarias, 
                    donde cada individuo tenga las herramientas para prosperar."
                  </ThemedText>
                  
                  <View className="w-full h-[1px] bg-white/20" style={{ marginBottom: 20 }}/>

                  <MaterialCommunityIcons 
                    name="rocket-launch" 
                    size={40} 
                    color={Colors[colorScheme].tint} 
                    style={{ marginBottom: 10 }}
                  />
                  <ThemedText className="text-3xl font-bold mb-4">Misión</ThemedText>
                  <ThemedText className="text-center text-lg italic leading-7">
                    "Fortalecer las economías locales conectando a los residentes 
                    con oportunidades y servicios esenciales en su idioma."
                  </ThemedText>
                </View>
              ) : (
                /* ESTADO: LOGIN (Formulario centrado) */
                <View style={{ alignItems: 'center', width: '100%' , paddingTop:30}} >
                  <ThemedText className="text-6xl font-black text-center mb-10 tracking-tight">
                    Viviendo en USA
                  </ThemedText>
                  
                  <View className="gap-y-5" style={{ alignItems: 'flex-start' }}>
                    <ThemedTextInput
                      label="Usuario:"
                      value={form?.username ?? ''}
                      onChangeText={(text) => setForm(f => ({...f, username: text}))}
                      placeholder="Usuario..."
                    />
                    
                    <ThemedTextInput
                      label="Contraseña:"
                      value={form?.password ?? ''}
                      onChangeText={(text) => setForm(f => ({...f, password: text}))}
                      placeholder="Contraseña..."
                      secureTextEntry={true}
                    />
                  
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => dispatch(toggleAuth())}
                      className="mt-8 shadow-sm"
                    >
                    <View 
                      style={{ 
                        backgroundColor: 'transparent', // Eliminamos el color de fondo
                        borderRadius: 35,
                        borderWidth: 2, // Aumentamos un poco el grosor para que destaque sin el fondo
                        borderColor: 'rgba(255, 255, 255, 0.5)', // Borde blanco cristalino más visible
                        overflow: 'hidden',
                        height: 110, 
                        width: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      >
                      {/* Contenedor de fusión */}
                      <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        
                        {/* Imagen de fondo (Logo) */}
                        <Image
                          source={require('../../assets/images/splash-icon.png')}
                          resizeMode="contain"
                          style={{ 
                            width: 90, 
                            height: 90, 
                            position: 'absolute',
                            opacity: 0.8 // Subimos un poco la opacidad para que se vea mejor sin el fondo azul
                          }} 
                        />

                        {/* Texto centrado sobre la imagen */}
                        <Text 
                          style={{
                            color: 'black',
                            fontSize: 14,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            fontStyle: 'normal',
                            shadowColor: 'rgba(0, 0, 0, 0.3)',
                           
                          }}
                        >
                          Ingresar
                        </Text>
                      </View>
                    </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </BlurView>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20, 
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      }
    })
  }
});