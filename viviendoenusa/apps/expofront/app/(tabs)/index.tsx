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
  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.9 : width * 0.85);
  // Ajustamos cardHeight para que el botón de Google tenga espacio (0.65 en vez de 0.55)
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;
  const marginTopValue = (Platform.OS === 'ios' ? 100 : 90);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer,
          { justifyContent: loggedIn ? 'flex-start' : 'center'}
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.centerContainer,
          loggedIn && { marginTop: Platform.OS === 'ios' ? -8 : 10 }
        ]}>
          
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
          >
            <ScrollView 
              contentContainerStyle={{ 
                flexGrow: 1, 
                justifyContent: loggedIn ? 'flex-start' : 'center', 
                padding: 25,
                paddingTop: loggedIn ? 40 : 30 
              }}
              showsVerticalScrollIndicator={false}
            >
              
              {loggedIn ? (
                /* ESTADO: USUARIO LOGUEADO */
                <View style={{ alignItems: 'flex-start', width: '100%', paddingTop: marginTopValue }}>
                  <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Visión</ThemedText>
                  <ThemedText className="text-center text-lg italic mb-10 leading-7">
                    "Crear comunidades más unidas, participativas y solidarias..."
                  </ThemedText>
                  
                  <View className="w-full h-[1px] bg-white/20" style={{ marginBottom: 20 }}/>

                  <MaterialCommunityIcons 
                    name="rocket-launch" 
                    size={40} 
                    color={Colors[colorScheme].tint} 
                    style={{ marginBottom: 10 }}
                  />
                  <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Misión</ThemedText>
                  <ThemedText className="text-center text-lg italic mb-10 leading-7">
                    "Fortalecer las economías locales conectando a los residentes..."
                  </ThemedText>
                </View>
              ) : (
                /* ESTADO: LOGIN */
                <View style={{ width: '100%' }}>
                  <ThemedText 
                    type="header" 
                    style={{ 
                      textAlign: 'center', 
                      alignSelf: 'center', 
                      marginBottom: 30, 
                      marginTop: 20,
                    }}
                  >
                    Viviendo en USA
                  </ThemedText>
                  
                  <View className="gap-y-6" style={{ alignItems: 'flex-start', width: '100%' }}>
                    
                    <View className="w-full h-[1px] bg-white/20" style={{ marginBottom: 10 }} />

                    <View style={{ width: '100%', gap: 15 }}>
                      <ThemedTextInput 
                        label="Usuario:"
                        value={form?.username ?? ''}
                        onChangeText={(text: any) => setForm(f => ({...f, username: text}))}
                        placeholder="Usuario..."
                      />
                      
                      <ThemedTextInput
                        label="Contraseña:"
                        value={form?.password ?? ''}
                        onChangeText={(text: any) => setForm(f => ({...f, password: text}))}
                        placeholder="Contraseña..."
                        secureTextEntry={true}
                      />
                    </View>

                    {/* BOTÓN INGRESAR (Fusión Imagen/Texto) */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => dispatch(toggleAuth())}
                      style={{ 
                        width: '100%', 
                        marginTop: 20,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <View style={{ height: 100, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <Image
                          source={require('../../assets/images/splash-icon.png')}
                          resizeMode="contain"
                          style={{ width: 100, height: 100, position: 'absolute' }} 
                        />
                        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
                          Ingresar
                        </ThemedText>
                      </View>
                    </TouchableOpacity>

                    {/* SEPARADOR "O" */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 10 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                      <ThemedText style={{ marginHorizontal: 15, opacity: 0.6, fontSize: 14 }}>o</ThemedText>
                      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    </View>

                    {/* BOTÓN GMAIL (Google) */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => console.log('Login Google')}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 25,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        paddingVertical: 14,
                      }}
                    >
                      <MaterialCommunityIcons name="google" size={20} color="orange" style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontWeight: '600', fontSize: 16 }}>
                        Continuar con Google
                      </ThemedText>
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
      web: { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 }
    })
  }
});