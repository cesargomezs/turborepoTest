import { Platform, View, ScrollView, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '../utils/twcn';
import React from 'react';

interface ThemedContainerProps {
  children: React.ReactNode;
  className?: string;
  useScroll?: boolean;
  ignoreInsets?: boolean; 
}

export default function ThemedContainer({
  children,
  className,
  useScroll = true,
  ignoreInsets = false,
}: ThemedContainerProps) {
  const insets = useSafeAreaInsets();

  // Usamos KeyboardAvoidingView para que el teclado no tape los inputs en iOS
  const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

  const content = (
    <View 
      className={cn("w-full max-w-[500px] self-center px-4", className)} 
      style={{ flex: useScroll ? 0 : 1, justifyContent: 'center' }}
    >
      {children}
    </View>
  );

  return (
    <Wrapper 
      behavior={Platform.OS === 'ios' ? "padding" : undefined} 
      style={{ flex: 1 }}
    >
      <View 
        style={{ 
          flex: 1, 
          paddingTop: ignoreInsets ? 0 : insets.top,
          paddingBottom: ignoreInsets ? 0 : insets.bottom,
        }}
      >
        {useScroll ? (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            // Esto ayuda a que el centrado sea real en todas las pantallas
            centerContent={true} 
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.nonScrollContent}>
            {content}
          </View>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', // Centra la tarjeta verticalmente
    alignItems: 'center',     // Centra la tarjeta horizontalmente
    paddingVertical: 40,      // Espacio extra para que no toque los bordes
  },
  nonScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});