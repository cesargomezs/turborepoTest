import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({
  isDark: true, // 🚀 CAMBIO 1: El contexto inicial ahora es true
  toggleTheme: (theme: 'light' | 'dark') => {},
});

export const ThemeProvider = ({ children }: any) => {
  // 🚀 CAMBIO 2: El estado de React arranca en true (Modo Oscuro activado)
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@app_theme').then(theme => {
      // Si el usuario ya había guardado una preferencia, la respeta.
      // Si entra por primera vez (theme es null), se queda en el true que le pusimos arriba.
      if (theme) setIsDark(theme === 'dark');
    });
  }, []);

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setIsDark(newTheme === 'dark');
    AsyncStorage.setItem('@app_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);