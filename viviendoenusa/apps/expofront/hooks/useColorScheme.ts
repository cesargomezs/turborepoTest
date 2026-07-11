// 🚀 IMPORTAMOS NUESTRO CONTEXTO
import { useAppTheme } from '@/app/src/context/ThemeContext';

export function useColorScheme() {
  const { isDark } = useAppTheme();
  // Engañamos a toda la app para que use nuestro botón en lugar del sistema
  return isDark ? 'dark' : 'light';
}