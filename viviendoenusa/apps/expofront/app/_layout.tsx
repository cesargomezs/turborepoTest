import { ImageBackground, Platform, StyleSheet, View, Text } from 'react-native';
import { AuthProvider } from '../context/AuthContext'; 
import { Slot, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Provider as AppStateProvider } from 'react-redux';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import store from './store';
import '../global.css';

// 🚀 IMPORTAMOS EL THEME PROVIDER DE NAVEGACIÓN
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '../constants/Theme';

// 🚀 IMPORTAMOS NUESTRO THEME PROVIDER
import { ThemeProvider as CustomAppThemeProvider, useAppTheme } from './src/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

// 🚀 SUB-COMPONENTE PARA LEER EL ESTADO GLOBAL
function AppLayoutNavigator() {
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

// 🚀 EL ROOT LAYOUT ENVUELVE TODO ORDENADAMENTE
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.error("Error crítico cargando fuentes:", error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    if (error) {
      return (
         <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{color: 'white', fontSize: 20, fontWeight: 'bold'}}>Error cargando Assets</Text>
            <Text style={{color: 'white', marginTop: 10}}>{String(error)}</Text>
         </View>
      );
    }
    return null; 
  }

  return (
    <AuthProvider>
      <AppStateProvider store={store}>
        <CustomAppThemeProvider> 
          <AppLayoutNavigator />
        </CustomAppThemeProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    ...Platform.select({
      ios: { backgroundColor: '#000' },
      android: { backgroundColor: '#000' }
    })
  }
});