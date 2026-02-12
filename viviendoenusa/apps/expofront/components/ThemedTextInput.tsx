import React, { useRef, useEffect, useState } from 'react';
import { View, TextInput, Text, Platform, Animated, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';

export default function ThemedTextInput({ label, onChangeText, value = "", isValid = true, errorMessage = '', secureTextEntry, autoComplete }: any) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const hasError = value && value.length > 0 && !isValid;

  const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value !== '') ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const inputTextColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        {/* SOLO iOS/Android: Etiqueta animada */}
        {Platform.OS !== 'web' && (
          <Animated.Text 
            pointerEvents="none"
            style={[styles.label, {
              top: animatedIsFocused.interpolate({ inputRange: [0, 1], outputRange: [16, -10] }),
              fontSize: animatedIsFocused.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }]}
          >
            {label}
          </Animated.Text>
        )}

        <View style={[styles.outline, { 
          borderColor: isFocused ? (isDark ? '#FFF' : '#007AFF') : 'rgba(128,128,128,0.2)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' 
        }]}>
          <TextInput
            style={[styles.input, { color: inputTextColor }]}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            value={value}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            autoComplete={autoComplete}
            // WEB: Usamos placeholder nativo para evitar capas que bloqueen
            placeholder={Platform.OS === 'web' ? label : ""}
            placeholderTextColor="gray"
          />

          {secureTextEntry && (
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eye}>
              <MaterialCommunityIcons name={isPasswordVisible ? "eye-off" : "eye"} size={22} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 15 },
  inputWrapper: { width: '100%', position: 'relative' },
  label: { position: 'absolute', left: 12, zIndex: 0, fontWeight: '600' },
  outline: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, height: 54 },
  input: { 
    flex: 1, 
    height: '100%', 
    paddingHorizontal: 12, 
    fontSize: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  } as TextStyle,
  eye: { paddingHorizontal: 12 }
});