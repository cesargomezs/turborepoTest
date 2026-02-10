import { Image, Platform, ScrollView, Text, TouchableOpacity, View ,KeyboardAvoidingView,useWindowDimensions,StyleSheet} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { cn } from '../../utils/twcn';
import { useColorScheme } from '../../hooks/useColorScheme';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useState } from 'react';
import { Colors } from '../../constants/Colors';
import { toggleAuth, useMockDispatch, useMockSelector } from '../../redux/slices';
import { BlurView } from 'expo-blur';
import React from 'react';
import ThemedContainer from '@/components/ThemedContainer';

type LoginForm = {
  username?: string;
  password?: string;
};

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';

  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const isDark = colorScheme === 'dark';

  const [form, setForm] = useState<LoginForm>();
  
  // --- CONFIGURACIÓN RESPONSIVA DINÁMICA ---
  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.9 : width * 0.85);
  // Ajustamos cardHeight para que el botón de Google tenga espacio (0.65 en vez de 0.55)
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;
  const marginTopValue = (Platform.OS === 'ios' ? 100 : 90);



  return (
    <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}>
      <ScrollView contentContainerClassName="flex-1 justify-center">
        <View style={[
            styles.centerContainer,
            loggedIn && { marginTop: Platform.OS === 'ios' ? -8 : 10 }
          ]}> 
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}>

  

                  <View style={{ alignItems: 'flex-start', width: '100%', paddingTop: marginTopValue }}>
                        <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Visión</ThemedText>
                        <ThemedText className="text-center text-lg italic mb-10 leading-7">
                          "Crear comunidades más unidas, participativas y solidarias..."
                        </ThemedText>
                        
                        <View className="w-full h-[1px] bg-white/20" style={{ marginBottom: 20 }}/>

                        <MaterialCommunityIcons 
                          name="rocket-launch" 
                          size={40} 
                          color={Colors[colorScheme].tint} 
                          style={{ marginBottom: 10 }}
                        />
                        <ThemedText type="subtitle" style={{ marginBottom: 10 }}>Misión</ThemedText>
                        <ThemedText className="text-center text-lg italic mb-10 leading-7">
                          "Fortalecer las economías locales conectando a los residentes..."
                        </ThemedText>
                      </View>

          </BlurView>
        </View>
      </ScrollView>
        
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20, 
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      web: { boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 }
    })
  }
});