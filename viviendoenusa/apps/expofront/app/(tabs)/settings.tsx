import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { cn } from '../../utils/twcn';
import { useColorScheme } from '../../hooks/useColorScheme.web';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useState } from 'react';
import React from 'react';

type LoginForm = {
  username?: string;
  password?: string;
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [form, setForm] = useState<LoginForm>();

  const handleUsername = (text: string): void => {
    setForm((f) => ({ ...f, username: text }));
  };
  const handlePassword = (text: string): void => {
    setForm((f) => ({ ...f, password: text }));
  };

  return (
    <ScrollView contentContainerClassName="flex-1 justify-center">
      <ThemedView
        className={cn(
          'p-8 py-24 justify-center items-center mx-4 rounded-3xl',
          colorScheme === 'dark' ? 'border-zinc-500' : 'border-zinc-400',
          'border-[1px] border-solid shadow gap-8'
        )}
        lightColor="#fffc"
        darkColor="#0009"
      >
        <ThemedText type="title">Ingreso</ThemedText>
        <View className='w-full'>
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
          <TouchableOpacity className="mx-auto" aria-label='Botón de Ingreso'>
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
      </ThemedView>
    </ScrollView>
  );
}
