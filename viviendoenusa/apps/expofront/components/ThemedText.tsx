import { Text, type TextProps, StyleSheet, Platform } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { cn } from '../utils/twcn';
import React from 'react';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  className?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'small';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  className,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Mapeo de estilos optimizado para legibilidad universal
  const typeClasses = {
    default: 'text-[16px] leading-[24px]',
    title: 'text-[32px] font-bold leading-[40px] tracking-tight',
    defaultSemiBold: 'text-[16px] font-semibold leading-[24px]',
    subtitle: 'text-[20px] font-bold leading-[28px]',
    link: 'text-[16px] leading-[24px] text-[#0a7ea4]',
    small: 'text-[13px] leading-[18px] opacity-80', // Nuevo tipo para textos secundarios
  };

  return (
    <Text
      className={cn(typeClasses[type], className)}
      style={[
        { color },
        // En la Web, los enlaces deben mostrar el puntero de mano
        type === 'link' && Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        style,
      ]}
      {...rest}
    />
  );
}