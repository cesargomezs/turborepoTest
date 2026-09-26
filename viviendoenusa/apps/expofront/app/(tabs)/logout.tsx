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
        // 1. Limpieza total de almacenamiento local y seguro
        if (Platform.OS === 'web') {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.log("Error limpiando web:", e);
          }
        } else {
          try {
            await AsyncStorage.clear();
            await SecureStore.deleteItemAsync('user_session'); 
            await SecureStore.deleteItemAsync('userToken'); 
          } catch (e) {
            console.log("Error limpiando móvil:", e);
          }
        }

        // 2. Limpieza inmediata en Redux para liberar los metadatos del usuario logueado
        if (isMounted) {
          dispatch(setUserMetadata({} as any)); 
          dispatch(toggleAuth()); 
        }

        // 3. Cierre de sesión del proveedor con tiempo de espera controlado
        if (logout) {
          await Promise.race([
            logout(),
            new Promise(resolve => setTimeout(resolve, 300))
          ]).catch(e => console.log("Logout omitido:", e));
        }

        // 4. Redirección limpia y definitiva al directorio raíz
        if (isMounted) {
          if (Platform.OS === 'web') {
            window.location.replace('/');
          } else {
            router.replace('/');
          }
        }
        
      } catch (error) {
        console.error("Error al salir:", error);
        router.replace('/');
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