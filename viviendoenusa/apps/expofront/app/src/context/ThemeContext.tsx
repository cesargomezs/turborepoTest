import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: (theme: 'light' | 'dark') => {},
});

export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@app_theme').then(theme => {
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