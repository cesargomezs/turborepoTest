import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../expofront/app/src/context/ThemeContext'; // Verifica que la ruta de tu contexto sea correcta

interface ThemedTextInputProps extends TextInputProps {
  label?: string;
}

export default function ThemedTextInput({ label, style, ...rest }: ThemedTextInputProps) {
  const { isDark } = useAppTheme();
  
  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#000000', // Blanco en oscuro, Negro en claro
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  };

  return (
    <View style={styles.container}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      <TextInput
        placeholderTextColor={DynamicColors.subtext}
        style={[
          styles.input,
          {
            color: DynamicColors.text, // Esto soluciona la letra blanca en fondo blanco
            borderColor: DynamicColors.border,
            backgroundColor: DynamicColors.inputBg,
            outlineStyle: 'none'
          } as any, // Cast a "any" para evitar advertencias sobre outlineStyle en TypeScript
          style
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '900', color: '#FF5F6D', marginBottom: 4, textTransform: 'uppercase' },
  input: { height: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 16 }
});