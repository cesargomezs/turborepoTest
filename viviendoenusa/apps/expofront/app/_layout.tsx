import { ImageBackground, Platform, StyleSheet, View, Dimensions, ViewStyle } from 'react-native';

import { useEffect } from 'react';
import { Provider as AppStateProvider } from 'react-redux';
import { ThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '../constants/Theme';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import store from './store';
import { useColorScheme } from '../hooks/useColorScheme';

import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
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

  const backgroundWebStyle = Platform.select({
    web: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1, // Se asegura de estar detrás de todo
    } as any,
    default: {
      flex: 1,
    }
  });

  // Definimos el estilo de la web como un objeto plano para evitar el error de tipos
  const webBackgroundStyle = Platform.OS === 'web' ? {
    height: '100vh' as any,
    width: '100vw' as any,
    position: 'fixed' as any,
  } : {};

 return (
    <AppStateProvider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Contenedor Maestro para asegurar el llenado de pantalla en Web */}
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
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'}  />
          </ImageBackground>
        </View>
      </ThemeProvider>
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    // Estilos base para iOS/Android
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