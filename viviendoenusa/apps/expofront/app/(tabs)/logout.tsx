import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext'; 
import { useMockDispatch, setUserMetadata, toggleAuth } from '../../redux/slices'; 

export default function LogoutScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const dispatch = useMockDispatch();

  useEffect(() => {
    let isMounted = true;

    const procesarCierreSesion = async () => {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem('forceLoginView', 'true');
          // 🚀 Limpiamos cualquier caché o valor guardado de inputs previos en la web
          try {
            localStorage.removeItem('last_email');
          } catch (e) {}
        }

        if (logout) {
          await logout();
        }

        if (isMounted) {
          dispatch(setUserMetadata({} as any)); 
          dispatch(toggleAuth()); 
        }

        router.replace('/?login=true');
        
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        router.replace('/?login=true');
      }
    };

    procesarCierreSesion();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF5F6D" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13112E', 
  }
});