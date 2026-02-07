import { View, TextInput, Text, Platform, StyleSheet } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { cn } from '../utils/twcn';
import { Colors } from '../constants/Colors';
import React from 'react';

type ThemedTextInputProps = {
  label: string;
  onChangeText: (text: string) => void;
  value: string;
  isValid?: boolean;
  errorMessage?: string;
  placeholder?: string;
  className?: string;
  secureTextEntry?: boolean;
  autoComplete?: any; // Añadido para mejor UX en Web/Android
};

export default function ThemedTextInput({
  label,
  onChangeText,
  value,
  isValid = true,
  errorMessage = '',
  placeholder,
  className,
  secureTextEntry,
  autoComplete,
}: ThemedTextInputProps) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  
  const hasError = value.length > 0 && !isValid;

  return (
    <View className="w-full mb-1">
      <Text
        className={cn(
          "mb-1 font-semibold tracking-tight",
          hasError 
            ? (isDark ? "text-red-400" : "text-red-600") 
            : (isDark ? "text-gray-400" : "text-gray-600")
        )}
        style={{ fontSize: 16 }}
      >
        {label}
      </Text>
      
      <TextInput
        className={cn(
          'border-b bg-transparent', 
          isDark ? 'text-white' : 'text-black',
          'py-2 px-0 h-11 w-full',
          hasError
            ? (isDark ? 'border-red-400' : 'border-red-600')
            : (isDark ? 'border-white/20' : 'border-black/10'),
          className
        )}
        onChangeText={onChangeText}
        autoCapitalize="none"
        value={value}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#555' : '#aaa'}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        // Solución para Web: eliminamos el recuadro azul de enfoque
        style={[
          { fontSize: 18 },
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)
        ]}
      />
      
      {/* Contenedor de error con altura fija para evitar saltos de layout */}
      <View className="h-5 mt-1">
        {hasError && (
          <Text className={cn(
            "text-xs font-medium",
            isDark ? "text-red-400" : "text-red-600"
          )}>
            {errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}