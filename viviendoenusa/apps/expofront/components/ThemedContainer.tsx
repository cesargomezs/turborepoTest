import { Platform, View, ScrollView, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../utils/twcn';
import React from 'react';

interface ThemedContainerProps {
  children: React.ReactNode;
  className?: string;
  useScroll?: boolean;
  /** Permite desactivar el padding del safe area si la pantalla tiene su propio header */
  ignoreInsets?: boolean; 
}

export default function ThemedContainer({
  children,
  className,
  useScroll = true,
  ignoreInsets = false,
}: ThemedContainerProps) {
  const insets = useSafeAreaInsets();

  // Envoltorio para manejar el teclado en formularios (vital para Android/iOS)
  const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

  const content = (
    <View 
      className={cn("w-full max-w-xl self-center px-6", className)} 
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );

  return (
    <Wrapper 
      behavior="padding" 
      style={{ flex: 1, backgroundColor: 'transparent' }}
    >
      <View 
        style={{ 
          flex: 1, 
          paddingTop: ignoreInsets ? 0 : insets.top,
          paddingBottom: ignoreInsets ? 0 : insets.bottom 
        }}
      >
        {useScroll ? (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Mejora el scroll en Web
            scrollEventThrottle={16}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    // Centra el contenido (como el Login) si no ocupa toda la pantalla
    justifyContent: 'center', 
    paddingVertical: 20,
  }
});