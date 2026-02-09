import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { cn } from '../../utils/twcn';
import { useColorScheme } from '../../hooks/useColorScheme.web';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useState } from 'react';
import React from 'react';
import ThemedContainer from '@/components/ThemedContainer';

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
      <ThemedContainer
        className={cn(
          'p-8 py-24 justify-center items-center mx-4 rounded-3xl',
          colorScheme === 'dark' ? 'border-zinc-500' : 'border-zinc-400',
          'border-[1px] border-solid shadow gap-8'
        )} children={undefined}        
      >
        
      </ThemedContainer>
    </ScrollView>
  );
}
