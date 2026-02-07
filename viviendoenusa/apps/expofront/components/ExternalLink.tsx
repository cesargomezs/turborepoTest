import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { cn } from '../utils/twcn';
import React from 'react';

// Omitimos href de las props originales para redefinirlo como string obligatorio
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { 
  href: string;
  className?: string; 
};

export function ExternalLink({ href, className, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      // Aplicamos estilos base para que no herede subrayados extraños en Web
      style={[styles.link, rest.style]}
      className={cn("text-blue-400 active:opacity-50", className)}
      onPress={async (event) => {
        if (Platform.OS !== 'web') {
          // Evitamos que abra el navegador externo (Safari/Chrome)
          event.preventDefault();
          // Abrimos el navegador "In-App" para no sacar al usuario de nuestra app
          await openBrowserAsync(href);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  link: {
    // En Web, los links suelen tener estilos por defecto que queremos controlar
    ...Platform.select({
      web: {
        cursor: 'pointer',
        textDecorationLine: 'none',
      },
    }),
  },
});