import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

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
        // 1. Limpiar persistencia local (Web y Móvil)
        if (Platform.OS === 'web') {
          try {
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('forceLoginView', 'true');
          } catch (e) {
            console.log("Error limpiando web:", e);
          }
        } else {
          try {
            await AsyncStorage.clear();
            // Limpieza profunda de SecureStore (vital por la migración reciente en iOS)
            await SecureStore.deleteItemAsync('user_session'); 
            await SecureStore.deleteItemAsync('userToken'); 
          } catch (e) {
            console.log("Error limpiando móvil:", e);
          }
        }

        // 2. Cerrar sesión en el proveedor con Timeout (Evita que el Invitado se quede pegado)
        if (logout) {
          await Promise.race([
            logout(),
            new Promise(resolve => setTimeout(resolve, 800)) // Si en 800ms no responde, avanza
          ]).catch(e => console.log("Aviso logout ignorado:", e));
        }

        // 3. Enrutamiento INMEDIATO (Se debe enrutar antes de limpiar Redux para evitar bloqueos)
        if (isMounted) {
          if (Platform.OS === 'web') {
            window.location.replace('/?login=true');
          } else {
            router.replace('/?login=true');
          }
        }

        // 4. Limpiar Redux con un ligero retraso para no matar el componente en medio de la navegación
        setTimeout(() => {
          if (isMounted) {
            dispatch(setUserMetadata({} as any)); 
            dispatch(toggleAuth()); 
          }
        }, 150);
        
      } catch (error) {
        console.error("Error crítico al cerrar sesión:", error);
        // Fallback de emergencia
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
    backgroundColor: 'transparent', 
  }
});