import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs, useSegments } from 'expo-router'; 
import { Platform, StyleSheet, ViewStyle, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { HapticTab } from '../../components/HapticTab';
import Header from '../../components/ui/Header';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Media } from '../../constants/Media';
import { useTranslation } from '../../hooks/useTranslation'; 
import {
  toggleAuth,
  useMockDispatch,
  useMockSelector,
  setUserMetadata
} from '../../redux/slices';

import { useAppTheme } from '../../context/ThemeContext'; 

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets(); 
  
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const isGuest = useMockSelector((state: any) => 
    state.mockAuth?.userMetadata?.typeDetail === 'Guest' || 
    state.mockAuth?.user?.typeDetail === 'Guest'
  );

  const dispatch = useMockDispatch();
  const { isDark } = useAppTheme();
  
  const segments = useSegments();
  const isServiceSubScreen = segments.includes('lawyers') || segments.includes('community') || segments.includes('donations') || segments.includes('events') || segments.includes('stores') || segments.includes('entrepreneurs') || segments.includes('support');

  const activeColor = isDark ? '#4FC3F7' : '#007AFF'; 
  const inactiveColor = isDark ? '#CFD8DC' : '#3c3c3c'; 

  useEffect(() => {
    let guestTimer: any;
    
    if (loggedIn && isGuest) {
      guestTimer = setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert("Tu tiempo de exploración ha terminado. ¡Regístrate gratis para seguir descubriendo Viviendo en USA!");
          dispatch(setUserMetadata({} as any));
          dispatch(toggleAuth());
          window.location.replace('/?login=true'); 
        } else {
          Alert.alert(
            "¡Tiempo Expirado!",
            "Tu tiempo de exploración ha terminado. ¡Regístrate gratis para seguir descubriendo Viviendo en USA!",
            [{
              text: "Crear Cuenta",
              onPress: () => {
                dispatch(setUserMetadata({} as any));
                dispatch(toggleAuth());
                router.replace('/?login=true');
              }
            }]
          );
        }
      }, 4 * 60 * 1000); 
    }
    return () => clearTimeout(guestTimer);
  }, [loggedIn, isGuest, dispatch]);

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
        paddingHorizontal: '20%' as any, 
      } as ViewStyle; 
    } 

    const iosPaddingBottom = insets.bottom > 0 ? insets.bottom - 8 : 10;
    const iosHeight = insets.bottom > 0 ? 55 + iosPaddingBottom : 65;

    // 🚀 Reducimos el offset a 24px para que baje más y quede al ras de los botones de Android
    const androidBottomOffset = Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 24) : 0;

    return StyleSheet.flatten([
      Media.styles.view,
      {
        position: 'absolute' as const,
        bottom: androidBottomOffset, // Baja la barra cerca de la botonera
        left: 0,
        right: 0,
        elevation: 0,
        borderTopWidth: 4,
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        backgroundColor: 'transparent', // Mantiene el efecto cristal intacto
        height: 58,
        paddingBottom: Platform.OS === 'android' ? 6 : iosPaddingBottom,
        paddingTop: 4,
      },
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
        tabBarBackground: TabBarBackground, // Activa el efecto cristal
        animation: 'fade', 
        tabBarStyle: getTabBarStyle(),
        tabBarLabelStyle: {
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t?.tabs?.home || 'Inicio', 
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          title: t?.tabs?.services || 'Servicios',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons 
              size={28} 
              name="view-list" 
              color={isServiceSubScreen ? activeColor : color} 
            />
          ),
          tabBarLabelStyle: {
            color: isServiceSubScreen ? activeColor : inactiveColor,
            marginBottom: Platform.OS === 'ios' ? 0 : 2,
          }
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: t?.tabs?.jobs || 'Empleos',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="briefcase-search" color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="logout"
        options={{
          title: isGuest ? (t?.hometab?.login || 'Entrar') : (t?.tabs?.logout || 'Salir'),
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name={isGuest ? "login" : "logout"} color={color}/>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (Platform.OS === 'web') {
              window.location.href = '/logout';
            }
          },
        }}
      />

      <Tabs.Screen name="tabservices/lawyers" options={{ title: t?.servicestab?.service1 || 'Abogados', href: null }} />
      <Tabs.Screen name="tabservices/community" options={{ title: t?.servicestab?.service2 || 'Comunidad', href: null }} />
      <Tabs.Screen name="tabservices/donations" options={{ title: t?.servicestab?.service3 || 'Donaciones', href: null }} />
      <Tabs.Screen name="tabservices/events" options={{ title: t?.servicestab?.service4 || 'Eventos', href: null }} />
      <Tabs.Screen name="tabservices/stores" options={{ title: t?.servicestab?.service5 || 'Tiendas', href: null }} />
      <Tabs.Screen name="tabservices/entrepreneurs" options={{ title: t?.servicestab?.service6 || 'Emprendedores', href: null }} />
      <Tabs.Screen name="tabservices/support" options={{ title: t?.servicestab?.service7 || 'Soporte', href: null }} />
      <Tabs.Screen name="tabservices/post/id" options={{ href: null }} />
      <Tabs.Screen name="ResetPassword" options={{ href: null }} />
    </Tabs>
  );
}