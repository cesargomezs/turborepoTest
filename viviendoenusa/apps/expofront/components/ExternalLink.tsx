import { Link } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { cn } from '../utils/twcn';

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
      style={[styles.link, rest.style]}
      className={cn("text-blue-400 active:opacity-50", className)}
      onPress={async (event) => {
        if (Platform.OS !== 'web') {
          event.preventDefault();
          await openBrowserAsync(href);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  link: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
        textDecorationLine: 'none',
      },
    }),
  },
});