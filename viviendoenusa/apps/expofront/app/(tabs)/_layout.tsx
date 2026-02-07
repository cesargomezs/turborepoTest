import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

import { HapticTab } from '../../components/HapticTab';
import Header from '../../components/ui/Header';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { Media } from '../../constants/Media';
import {
  toggleAuth,
  useMockDispatch,
  useMockSelector,
} from '../../redux/slices';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        header: ({ options }) => <Header title={options.title} />,
        headerShown: loggedIn,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: [
          Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {
              position: 'absolute',
            },
          }),
          Media.styles.view,
          { display: loggedIn ? 'flex' : 'none' },
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Servicios',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="cog" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="toggle-switch" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Cerrar sesión',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons size={28} name="logout" color={color} />
          ),
        }}
        listeners={{
          tabPress: () => {
            // `name` of index screen is simply "/" not "/index"
            router.navigate('/');
            dispatch(toggleAuth());
          },
        }}
      />
    </Tabs>
  );
}
