import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
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

  const handleUsername = (text: string): void => {
    setForm((f) => ({ ...f, username: text }));
  };
  const handlePassword = (text: string): void => {
    setForm((f) => ({ ...f, password: text }));
  };

  return (
    <View className="flex-1 justify-center">
      {loggedIn ? (
        <BlurView
          className={cn(
            'p-6  mx-4 mt-24 rounded-3xl shadow gap-6 overflow-hidden'
          )}
          tint="systemChromeMaterial"
          intensity={100}
        >
          <View className="items-end">
            <MaterialCommunityIcons
              size={60}
              name="home"
              color={Colors[colorScheme].text}
            />
          </View>
          <View className="items-center">
            <ThemedText className="text-2xl mb-8">Visión</ThemedText>
            <ThemedText className="mb-24 text-base italic">
              "Crear comunidades más unidas, participativas y solidarias, donde
              cada residente se sienta conectado, seguro y orgulloso de su
              barrio."
            </ThemedText>
            <ThemedText className="text-2xl mb-8">Misión</ThemedText>
            <ThemedText className="mb-24 text-base italic">
              "Fortalecer las economías locales conectando a los residentes con
              los comercios y servicios de su barrio, promoviendo el consumo
              local y facilitando un ecosistema de intercambio y colaboración."
            </ThemedText>
          </View>
        </BlurView>
      ) : (
        <BlurView
          className={cn(
            'p-8 py-24 justify-center items-center mx-4 rounded-3xl',
            'shadow gap-8 overflow-hidden'
          )}
          tint="systemChromeMaterial"
          intensity={100}
        >
          <ThemedText className="text-3xl font-extrabold mb-8">
            Viviendo en USA
          </ThemedText>
          <View className="w-full">
            <ThemedTextInput
              label="Usuario o Correo:"
              errorMessage="Introduzca un nombre de usuario válido."
              isValid={!!form?.username}
              value={form?.username ?? ''}
              onChangeText={handleUsername}
              placeholder="Usuario..."
            />
            <ThemedTextInput
              label="Contraseña:"
              errorMessage="Introduzca un nombre de usuario válido."
              isValid={!!form?.password}
              value={form?.password ?? ''}
              onChangeText={handlePassword}
              placeholder="Contraseña..."
              secureTextEntry={true}
            />
            <TouchableOpacity
              className="mx-auto"
              aria-label="Botón de Ingreso"
              onPress={() => dispatch(toggleAuth())}
            >
              <Image
                source={require('../../assets/images/splash-icon.png')}
                alt="Earth showing the Americas"
                resizeMode="contain"
                className="w-36 h-36"
              />
              <View className="w-36 h-36 justify-center items-center absolute">
                <Text className="text-white text-xl font-bold shadow">
                  Ingreso
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </View>
  );
}
