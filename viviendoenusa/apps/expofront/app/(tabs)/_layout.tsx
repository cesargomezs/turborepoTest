import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs, useSegments } from 'expo-router'; 
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '../../components/HapticTab';
import Header from '../../components/ui/Header';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Media } from '../../constants/Media';
import { useTranslation } from '../../hooks/useTranslation'; 
import {
  toggleAuth,
  useMockDispatch,
  useMockSelector,
} from '../../redux/slices';

// 🚀 IMPORTAMOS EL CONTEXTO GLOBAL
import { useAppTheme } from '@/app/src/context/ThemeContext'; 

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets(); 
  
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();

  // 🚀 LEEMOS EL TEMA DESDE EL CONTEXTO
  const { isDark } = useAppTheme();
  
  const segments = useSegments();
  const isServiceSubScreen = segments.includes('lawyers') || segments.includes('community') || segments.includes('donations') || segments.includes('events') || segments.includes('stores') || segments.includes('entrepreneurs') || segments.includes('support');

  // 🚀 COLORES DE ALTO CONTRASTE PARA QUE SE VEAN PERFECTO
  const activeColor = isDark ? '#4FC3F7' : '#007AFF'; // Azul brillante en oscuro
  const inactiveColor = isDark ? '#CFD8DC' : '#3c3c3c'; // Gris muy claro (casi blanco) en oscuro

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
        paddingHorizontal: '25%' as any, 
      } as ViewStyle; 
    } 
    
    const isAndroid = Platform.OS === 'android';
    const isIOS = Platform.OS === 'ios';
    
    const BASE_HEIGHT = 48;
    const bottomOffset = insets.bottom > 0 ? insets.bottom : (isAndroid ? 12 : 10);

    return StyleSheet.flatten([
      {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 0,
        borderTopWidth: 0,
        backgroundColor: 'transparent', 
        height: BASE_HEIGHT + bottomOffset, 
        paddingBottom: isIOS ? insets.bottom / 1.5 : bottomOffset,
        paddingTop: 12,
      },
      Media.styles.view,
      { display: (loggedIn ? 'flex' : 'none') as any },
    ]) as ViewStyle;
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
        tabBarLabelStyle: {
          marginBottom: Platform.OS === 'ios' ? 4 : 0,
          fontSize: 11,
          fontWeight: '600'
        }
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
              name="view-list" 
              color={isServiceSubScreen ? activeColor : color} 
            />
          ),
          tabBarLabelStyle: {
            color: isServiceSubScreen ? activeColor : inactiveColor,
            marginBottom: Platform.OS === 'ios' ? 4 : 0,
          }
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: t.tabs.jobs,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="briefcase-search" color={color} />
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
      <Tabs.Screen name="tabservices/support" options={{ title: t.servicestab.service7, href: null }} />
      <Tabs.Screen name="tabservices/post/id" options={{ href: null }} />
    </Tabs>
  );
}