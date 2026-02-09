import { Text, type TextProps, StyleSheet, Platform } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { cn } from '../utils/twcn';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  className?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'small' | 'header';
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

  return (
    <Text
      className={cn(className)}
      style={[
        { color },
        styles[type], 
        type === 'link' && Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  link: {
    lineHeight: 24,
    fontSize: 16,
    color: '#0a7ea4',
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  header: {
    fontSize: 22, 
    fontWeight: '900', 
    lineHeight: 50,
    letterSpacing: -1,
  },
});