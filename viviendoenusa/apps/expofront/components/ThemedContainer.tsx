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

  // Wrapper para manejar el teclado en iOS
  const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

  // Definimos la estructura del contenido (el cuadro/tarjeta)
  // max-w-[500px] asegura que en tablets o web no se estire demasiado
  const content = (
    <View 
      className={cn("w-full max-w-[500px] self-center px-4", className)} 
      style={{ 
        flex: useScroll ? 0 : 1, 
        justifyContent: 'center' 
      }}
    >
      {children}
    </View>
  );

  return (
    <Wrapper 
      behavior={Platform.OS === 'ios' ? "padding" : undefined} 
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
            scrollEventThrottle={16}
            centerContent={true}
          >
            {/* Renderizado único de content */}
            {content}
          </ScrollView>
        ) : (
          <View style={styles.nonScrollContent}>
            {/* Renderizado único de content */}
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
    ...Platform.select({
      web: {
        overflowY: 'auto' as any,
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    // Estas dos líneas son la clave para que se vea como en tus capturas (centrado)
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 40,
  },
  nonScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});