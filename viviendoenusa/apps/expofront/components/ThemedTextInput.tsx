import React, { useRef, useEffect, useState } from 'react';
import { View, TextInput, Text, Platform, Animated, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';
import { cn } from '../utils/twcn';

export default function ThemedTextInput({
  label,
  onChangeText,
  value,
  isValid = true,
  errorMessage = '',
  className,
  secureTextEntry,
  autoComplete,
}: any) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  const hasError = value.length > 0 && !isValid;

  const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: (isFocused || value !== '') ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const inputTextColor = isDark ? '#FFFFFF' : '#000000';

  const labelStyle = {
    position: 'absolute' as const,
    left: 12,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, -15], 
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    paddingHorizontal: 4,
    zIndex: 1,
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1], 
      outputRange: [
        isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', 
        hasError ? '#f87171' : (isDark ? '#FFFFFF' : '#007AFF') 
      ],
    }),
  };

  return (
    <View className="w-full mb-4">
      <View className="relative">
        <Animated.Text style={[labelStyle, { fontWeight: '600' }]} pointerEvents="none">
          {label}
        </Animated.Text>
        
       
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderRadius: 12,
            height: 54,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderColor: hasError 
              ? (isDark ? '#f87171' : '#dc2626') 
              : (isFocused ? (isDark ? '#FFFFFF' : '#007AFF') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')),
            paddingLeft: 12,
            paddingRight: secureTextEntry ? 45 : 12, 
          }}
        >
          <TextInput
            className={cn('flex-1 bg-transparent h-full', className)}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            value={value}
            selectionColor={isDark ? '#FFFFFF' : '#007AFF'}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            autoComplete={autoComplete}
            style={[
              { fontSize: 16, color: inputTextColor, fontWeight: '500' },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)
            ]}
          />

          
          {secureTextEntry && (
            <TouchableOpacity 
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={{ 
                position: 'absolute', 
                right: 12,
                height: '100%',
                justifyContent: 'center'
              }}
            >
              <MaterialCommunityIcons 
                name={isPasswordVisible ? "eye-off" : "eye"} 
                size={22} 
                color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      
      <View className="h-5 mt-1 ml-2">
        {hasError && (
          <Text className={isDark ? "text-red-400 text-xs" : "text-red-600 text-xs"}>
            {errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}