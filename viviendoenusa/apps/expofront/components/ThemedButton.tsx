import {
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { cn } from '../utils/twcn';

type ThemedButtonProps = TouchableOpacityProps & {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'glass';
  loading?: boolean; // Útil para llamadas a Firebase/API
  className?: string;
};

export default function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...rest
}: ThemedButtonProps) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const getVariantStyles = () => {
    if (disabled || loading) return isDark ? 'bg-white/10' : 'bg-black/10';
    
    switch (variant) {
      case 'primary':
        return isDark ? 'bg-[#fff]' : 'bg-[#005a8d]';
      case 'secondary':
        return isDark ? 'bg-white/20' : 'bg-black/5';
      case 'outline':
        return `border-2 ${isDark ? 'border-[#0a7ea4]' : 'border-[#005a8d]'} bg-transparent`;
      case 'glass':
        return isDark ? 'bg-white/10 border border-white/20' : 'bg-black/5 border border-black/10';
      default:
        return '';
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#666' : '#999';
    if (variant === 'outline' || variant === 'glass') {
      return isDark ? '#ffffff' : '#000000';
    }
    return '#ffffff';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      className={cn(
        "rounded-2xl items-center justify-center self-center",
        isLargeScreen ? "px-12 py-4" : "px-8 py-3",
        getVariantStyles(),
        className
      )}
      style={[
        styles.shadow,
        Platform.OS === 'web' && ({ cursor: (disabled || loading) ? 'not-allowed' : 'pointer' } as any)
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={{
            color: getTextColor(),
            fontSize: isLargeScreen ? 18 : 16,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }
    }),
  },
});