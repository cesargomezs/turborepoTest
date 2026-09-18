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
          // 🚀 Destrucción total del almacenamiento web para evitar sesiones fantasma
          try {
            localStorage.clear();
            sessionStorage.clear();
            
            // Forzamos la bandera de vista de login
            localStorage.setItem('forceLoginView', 'true');
          } catch (e) {
            console.log("Error limpiando almacenamiento web:", e);
          }
        }

        // Ejecutamos el cierre de sesión del proveedor de autenticación
        if (logout) {
          await logout();
        }

        if (isMounted) {
          dispatch(setUserMetadata({} as any)); 
          dispatch(toggleAuth()); 
        }

        // 🚀 Recarga limpia en web para limpiar cualquier estado en memoria de React
        if (Platform.OS === 'web') {
          window.location.replace('/?login=true');
        } else {
          router.replace('/?login=true');
        }
        
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        if (Platform.OS === 'web') {
          window.location.replace('/?login=true');
        } else {
          router.replace('/?login=true');
        }
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