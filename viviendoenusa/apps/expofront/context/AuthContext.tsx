import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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

  // Al abrir la app, revisamos si ya hay una sesión guardada
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
        }
      } catch (error) {
        console.error("Error cargando la sesión", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

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

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};