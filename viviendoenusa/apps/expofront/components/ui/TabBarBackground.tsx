import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// El valor por defecto suele ser undefined en web/android, 
// pero en nuestra app queremos controlarlo.
export default undefined;

export function useBottomTabOverflow() {
  const insets = useSafeAreaInsets();
  
  // En iOS, el área de "peligro" inferior es más grande por la barra de inicio.
  // En Android/Web, suele ser más pequeña.
  if (Platform.OS === 'ios') {
    return insets.bottom > 0 ? insets.bottom : 20;
  }
  
  return 0;
}