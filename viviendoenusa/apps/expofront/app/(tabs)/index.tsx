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
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { cn } from '../../utils/twcn';
import { useColorScheme } from '../../hooks/useColorScheme';
import ThemedTextInput from '../../components/ThemedTextInput';
import { Colors } from '../../constants/Colors';
import {
  toggleAuth,
  useMockDispatch,
  useMockSelector,
} from '../../redux/slices';
import React from 'react';

type LoginForm = {
  username?: string;
  password?: string;
};

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [form, setForm] = useState<LoginForm>();
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();

  return (
    // KeyboardAvoidingView evita que el teclado tape los inputs en iOS
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contenedor con fondo transparente para dejar ver el ImageBackground del _layout */}
        <View className="flex-1 justify-center items-center bg-transparent p-4">
          
          {loggedIn ? (
            <BlurView
              intensity={80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              className="w-full max-w-[500px] p-8 rounded-[40px] overflow-hidden border border-white/20 shadow-2xl"
            >
              <View className="items-end mb-4">
                <MaterialCommunityIcons
                  size={40}
                  name="home-variant"
                  color={Colors[colorScheme].text}
                />
              </View>
              
              <View className="items-center space-y-6">
                <ThemedText className="text-3xl font-bold mb-2">Visión</ThemedText>
                <ThemedText className="text-center text-lg italic leading-6 mb-8">
                  "Crear comunidades más unidas, participativas y solidarias..."
                </ThemedText>
                
                <ThemedText className="text-3xl font-bold mb-2">Misión</ThemedText>
                <ThemedText className="text-center text-lg italic leading-6">
                  "Fortalecer las economías locales conectando a los residentes..."
                </ThemedText>
              </View>
            </BlurView>
          ) : (
            <BlurView
              intensity={90}
              tint={colorScheme === 'dark' ? 'dark' : 'extraLight'}
              className="w-full max-w-[400px] p-10 rounded-[50px] overflow-hidden border border-white/30 shadow-2xl"
            >
              <ThemedText className="text-4xl font-black text-center mb-10 tracking-tight">
                Viviendo en USA
              </ThemedText>
              
              <View className="w-full gap-y-4">
                <ThemedTextInput
                  label="Usuario o Correo:"
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
                  className="mt-8 bg-[#007AFF] py-4 rounded-2xl active:opacity-80 shadow-lg"
                  onPress={() => dispatch(toggleAuth())}
                >
                  <Image
                    source={require('../../assets/images/splash-icon.png')}
                    alt="Earth showing the Americas"
                    resizeMode="contain"
                    style={{ width: 144, height: 144 }} // 36 * 4 = 144px
                    className="self-center" 
                  />
                  <Text className="text-white text-center text-xl font-bold">
                    Ingresar
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}