import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Platform, useColorScheme, View } from 'react-native';

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

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconNotSelected,
        header: ({ options }) => <Header title={options.title} />,
        headerShown: loggedIn,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        // Animación de deslizamiento lateral al entrar en servicios
        animation: 'fade', 
        tabBarStyle: [
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            borderTopWidth: 0,
            backgroundColor: 'transparent',
            height: 64,
          },
          Media.styles.view,
          { display: loggedIn ? 'flex' : 'none' },
        ],
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

      {/* ESTA ES LA CARPETA (tabs)/services 
          Al poner href: null desaparece del menú inferior, pero sigue existiendo
      */}
      <Tabs.Screen
        name="services"
        options={{
          title: t.tabs.services,
          tabBarIcon: ({ color }) => (
          <MaterialCommunityIcons size={28} name="account-group" color={color} />
          ),
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

      <Tabs.Screen 
        name="lawyers" 
        options={{ 
          title: t.servicestab.service1,
          href: null, 
        }} 
      />


    
    </Tabs>
  );
}