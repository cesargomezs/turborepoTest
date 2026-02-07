import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import React from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // En iOS usamos un impacto ligero para una sensación premium
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } 
        // En Android, una vibración de selección suele ser más natural
        else if (Platform.OS === 'android') {
          Haptics.selectionAsync();
        }
        
        props.onPressIn?.(ev);
      }}
    />
  );
}