import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// 🚀 1. IMPORTAMOS REDUX PARA AVISARLE A LA INTERFAZ QUE HAY SESIÓN
import { toggleAuth, setUserMetadata, useMockDispatch } from '../redux/slices'; // Ajusta esta ruta si te marca error

interface AuthContextType {
  user: any | null;
  token: string | null;
  login: (userData: any, userToken: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 2. INICIAMOS EL DESPACHADOR
  const dispatch = useMockDispatch();

  useEffect(() => {
    const loadSession = async () => {
      try {
        let storedToken = null;
        let storedUser = null;

        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          if (userStr) storedUser = JSON.parse(userStr);
        } else {
          storedToken = await SecureStore.getItemAsync('token');
          const userStr = await SecureStore.getItemAsync('user');
          if (userStr) storedUser = JSON.parse(userStr);
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          
          // 🚀 3. EL FIX MAESTRO: Le pasamos los datos a Redux al arrancar
          dispatch(setUserMetadata({ ...storedUser, token: storedToken }));
          dispatch(toggleAuth());
        }
      } catch (error) {
        console.error("Error cargando la sesión", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [dispatch]);

  const login = async (userData: any, userToken: string) => {
    setToken(userToken);
    setUser(userData);

    if (Platform.OS === 'web') {
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      await SecureStore.setItemAsync('token', userToken);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);

    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};