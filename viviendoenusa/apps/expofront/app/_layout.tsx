// apps/expofront/app/_layout.tsx

import { ImageBackground } from 'react-native';
import { useEffect } from 'react';
import { Provider as AppStateProvider } from 'react-redux';


import { ThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '../constants/Theme';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';


import store from './store'; // Asegúrate de que la ruta sea correcta
import { useColorScheme } from '@/hooks/useColorScheme';

import '../global.css'; 

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
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <ImageBackground
            source={require('../assets/images/background.jpg')}
            alt="a woman carrying a variety of tropical fruits on her head"
            resizeMode="cover"
            className="flex-1"
          ></ImageBackground>
      <Stack>
        {/* Usamos Screen name="(tabs)" porque tus archivos están en esa carpeta */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      </ThemeProvider>
    </AppStateProvider>
  );
}