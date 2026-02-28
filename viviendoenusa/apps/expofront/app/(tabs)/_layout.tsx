import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs, useSegments } from 'expo-router'; 
import { Platform, useColorScheme, StyleSheet, ViewStyle } from 'react-native';

import { HapticTab } from '../../components/HapticTab';
import Header from '../../components/ui/Header';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { Media } from '../../constants/Media';
import { useTranslation } from '../../hooks/useTranslation'; 
import {
  toggleAuth,
  useMockDispatch,
  useMockSelector,
} from '../../redux/slices';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const isDark = colorScheme === 'dark';

  const segments = useSegments();
  const isServiceSubScreen = segments.includes('lawyers') || segments.includes('community') || segments.includes('donations') || segments.includes('events') || segments.includes('stores') || segments.includes('entrepreneurs');

  const activeColor = Colors[colorScheme].tint;
  const inactiveColor = Colors[colorScheme].tabIconNotSelected;

  // --- LÓGICA DE ESTILOS CORREGIDA PARA EL ERROR TS(2322) ---
  const getTabBarStyle = (): ViewStyle => {
    if (Platform.OS === 'web') {
      return {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: isDark ? 'rgba(18, 18, 18, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        borderTopWidth: 0,
        display: loggedIn ? 'flex' : 'none',
        // Usamos cast 'any' solo para el string de porcentaje que TS odia en ViewStyle
        paddingHorizontal: '25%' as any, 
      } as ViewStyle; 
    } else {
      // Usamos StyleSheet.flatten y forzamos el tipo ViewStyle
      return StyleSheet.flatten([
        {
          position: 'absolute' as const, // El 'as const' soluciona el error de "string"
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          height: 64,
        },
        Media.styles.view,
        { display: (loggedIn ? 'flex' : 'none') as any },
      ]) as ViewStyle;
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        header: ({ options }) => <Header title={options.title} />,
        headerShown: loggedIn,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        animation: 'fade', 
        tabBarStyle: getTabBarStyle(), 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home, 
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          title: t.tabs.services,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons 
              size={28} 
              name="account-group" 
              color={isServiceSubScreen ? activeColor : color} 
            />
          ),
          tabBarLabelStyle: {
            color: isServiceSubScreen ? activeColor : inactiveColor
          }
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="toggle-switch" color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="logout"
        options={{
          title: t.tabs.logout,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="logout" color={color}/>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            dispatch(toggleAuth());
            router.replace('/');
          },
        }}
      />

      {/* Pantallas ocultas */}
      <Tabs.Screen name="tabservices/lawyers" options={{ title: t.servicestab.service1, href: null }} />
      <Tabs.Screen name="tabservices/community" options={{ title: t.servicestab.service2, href: null }} />
      <Tabs.Screen name="tabservices/donations" options={{ title: t.servicestab.service3, href: null }} />
      <Tabs.Screen name="tabservices/events" options={{ title: t.servicestab.service4, href: null }} />
      <Tabs.Screen name="tabservices/stores" options={{ title: t.servicestab.service5, href: null }} />
      <Tabs.Screen name="tabservices/entrepreneurs" options={{ title: t.servicestab.service6, href: null }} />
      <Tabs.Screen name="tabservices/post/id" options={{ href: null }} />

    </Tabs>
  );
}