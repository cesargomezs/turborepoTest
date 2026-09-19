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

// 🚀 IMPORTAMOS EL CONTEXTO GLOBAL
import { useAppTheme } from '../../context/ThemeContext'; 

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets(); 
  
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  
  // 🚀 Verificamos si el usuario actual es un Invitado (Guest)
  const isGuest = useMockSelector((state: any) => 
    state.mockAuth?.userMetadata?.typeDetail === 'Guest' || 
    state.mockAuth?.user?.typeDetail === 'Guest'
  );

  const dispatch = useMockDispatch();

  // 🚀 LEEMOS EL TEMA DESDE EL CONTEXTO
  const { isDark } = useAppTheme();
  
  const segments = useSegments();
  const isServiceSubScreen = segments.includes('lawyers') || segments.includes('community') || segments.includes('donations') || segments.includes('events') || segments.includes('stores') || segments.includes('entrepreneurs') || segments.includes('support');

  // 🚀 COLORES DE ALTO CONTRASTE
  const activeColor = isDark ? '#4FC3F7' : '#007AFF'; 
  const inactiveColor = isDark ? '#CFD8DC' : '#3c3c3c'; 

  // 🚀 TEMPORIZADOR DE INVITADO (4 MINUTOS)
  useEffect(() => {
    let guestTimer: any;
    
    // Si está logueado y es invitado, arranca el reloj
    if (loggedIn && isGuest) {
      guestTimer = setTimeout(() => {
        // Alerta de que se acabó el tiempo
        if (Platform.OS === 'web') {
          window.alert("Tu tiempo de exploración ha terminado. ¡Regístrate gratis para seguir descubriendo Viviendo en USA!");
          // Destruimos la sesión simulada
          dispatch(setUserMetadata({} as any));
          dispatch(toggleAuth());
          window.location.replace('/?login=true'); // Lo mandamos directo al login
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
      }, 4 * 60 * 1000); // 4 minutos exactos en milisegundos (240,000 ms)
    }

    // Limpiamos el temporizador si el componente se desmonta o el usuario sale antes
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
            marginBottom: Platform.OS === 'ios' ? 4 : 0,
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
      
      {/* 🚀 PESTAÑA DINÁMICA: "Salir" para usuarios, "Entrar" para invitados */}
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
            // 🚀 Permitimos que navegue libremente al archivo logout.tsx sin bloquearlo
            if (Platform.OS === 'web') {
              window.location.href = '/logout';
            }
          },
        }}
      />

      {/* Pantallas ocultas */}
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