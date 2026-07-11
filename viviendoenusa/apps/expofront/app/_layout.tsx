import { ImageBackground, Platform, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { Provider as AppStateProvider } from 'react-redux';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import store from './store';
import '../global.css';

// 🚀 1. IMPORTAMOS EL THEME PROVIDER DE NAVEGACIÓN (Original)
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '../constants/Theme';

// 🚀 2. IMPORTAMOS NUESTRO THEME PROVIDER CON UN "ALIAS" PARA QUE NO CHOQUEN
import { ThemeProvider as CustomAppThemeProvider, useAppTheme } from './src/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

// 🚀 3. CREAMOS UN SUB-COMPONENTE PARA LEER EL ESTADO GLOBAL
function AppLayoutNavigator() {
  // Aquí leemos si el usuario seleccionó dark o light en el modal
  const { isDark } = useAppTheme();

  const backgroundWebStyle = Platform.select({
    web: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
    } as any,
    default: {
      flex: 1,
    }
  });

  // 👇 MANTUVIMOS TU DISEÑO EXACTAMENTE IGUAL AL QUE TE FUNCIONA
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ImageBackground
          source={require('../assets/images/background.jpg')}
          resizeMode="cover"
          style={[styles.background, backgroundWebStyle]}
        >
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: 'transparent' }, 
              headerShown: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </ImageBackground>
      </View>
    </NavigationThemeProvider>
  );
}

// 🚀 4. EL ROOT LAYOUT AHORA ENVUELVE TODO ORDENADAMENTE
export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppStateProvider store={store}>
      {/* Nuestro tema envuelve al de navegación */}
      <CustomAppThemeProvider> 
        <AppLayoutNavigator />
      </CustomAppThemeProvider>
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    ...Platform.select({
      ios: {
        backgroundColor: '#000',
      },
      android: {
        backgroundColor: '#000',
      }
    })
  }
});