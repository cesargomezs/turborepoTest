import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ViewStyle,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';

const PRACTICE_AREAS = [
  'Todas', 'Familia', 'Penal', 'Laboral', 'Inmigración', 'Bienes Raíces', 'Fiscal'
];

export default function LawyersScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  const handleSearch = () => {
    if (!zipCode) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: 'center' }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />

          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
               <TouchableOpacity onPress={() => router.back()}>
                 <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
               </TouchableOpacity>
               <MaterialCommunityIcons 
                 size={40} 
                 name="scale-balance" 
                 style={{ opacity: 0.4 }} 
                 color={Colors[colorScheme].tabIconNotSelected} 
               />
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                <ThemedText style={styles.labelCustom}>Código Postal</ThemedText>
                <TextInput
                  style={[styles.customInput, { 
                    color: isDark ? '#fff' : '#000', 
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'
                  }]}
                  placeholder="Ej: 90001"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  value={zipCode}
                  onChangeText={setZipCode}
                />

                <ThemedText style={styles.labelCustom}>Área</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {PRACTICE_AREAS.map((area) => (
                    <TouchableOpacity 
                      key={area} 
                      onPress={() => setSelectedArea(area)}
                      style={[
                        styles.chip, 
                        selectedArea === area && { backgroundColor: '#0080B5', borderColor: '#0080B5' },
                        { borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }
                      ]}
                    >
                      <ThemedText style={[styles.chipText, selectedArea === area && { color: '#fff' }]}>
                        {area}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity onPress={handleSearch} activeOpacity={0.8} style={styles.searchButtonWrapper}>
                  <LinearGradient
                    colors={['#FF5F6D', '#FFC371']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.gradientSearchButton}
                  >
                    {loading ? <ActivityIndicator color="#fff" /> : 
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="magnify" size={20} color="white" />
                        <ThemedText style={styles.btnText}>BUSCAR</ThemedText>
                      </View>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* CONTENEDOR DEL MAPA */}
              <View style={styles.mapContainer}>
                <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <MaterialCommunityIcons name="map-marker-radius" size={40} color={isDark ? '#0080B5' : '#FF5F6D'} style={{ opacity: 0.6 }} />
                    <ThemedText style={styles.mapText}>Vista de mapa próximamente</ThemedText>
                    {/* Aquí integrarías <MapView /> de react-native-maps */}
                </View>
              </View>

            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {Platform.OS === 'web' ? renderMainContent() : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingVertical: 11*
    0, marginTop: Platform.OS === 'ios' ? -19 : 10 },
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cardWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  } as ViewStyle,
  cardContent: { flex: 1, padding: 20, zIndex: 10 },
  formContainer: { width: '100%' },
  labelCustom: { fontSize: 13, fontWeight: '700', marginBottom: 5, marginLeft: 5, opacity: 0.8 },
  customInput: {
    height: 45, // Reducido de 55
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 12,
  },
  chipsScroll: { flexDirection: 'row', marginBottom: 15 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6, // Reducido de 10
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  searchButtonWrapper: { borderRadius: 15, overflow: 'hidden', height: 48 }, // Reducido de 60
  gradientSearchButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  
  // Estilos del Mapa
  mapContainer: {
    marginTop: 20,
    width: '100%',
    height: 180, // Espacio para el mapa
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  mapText: { fontSize: 12, opacity: 0.4, fontWeight: '600' }
});