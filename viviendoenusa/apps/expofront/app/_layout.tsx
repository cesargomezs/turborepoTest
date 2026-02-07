import { ImageBackground } from 'react-native';
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
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

  return (
    <AppStateProvider store={store}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* En iOS, el ImageBackground necesita flex: 1 para expandirse */}
      <ImageBackground
        source={require('../assets/images/background.jpg')}
        resizeMode="cover"
        style={{ flex: 1 }} // Usamos style para asegurar compatibilidad total
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
    </ThemeProvider>
  </AppStateProvider>
  );
}
