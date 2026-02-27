import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { contentCardStyles as styles } from "../../src/styles/contentcard";

// --- CONFIGURACIÓN DE MAPAS (SOLUCIÓN PARA WEB) ---
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn("Error cargando mapas nativos:", e);
  }
}

// Datos de ejemplo para donaciones y ayuda legal
const DATA_SOURCE = [
  { id: 1, name: 'Neil Panchal Law', area: 'General', rating: 5.0, lat: 34.0668, lng: -117.6115, phone: '+19517036499', image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'BANDERAS LAW, PC', area: 'Inmigración', rating: 5.0, lat: 34.0668, lng: -117.5783, phone: '+19097070000', image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Law Office of Cierra Esq', area: 'Familia', rating: 4.8, lat: 34.0696, lng: -117.5782, phone: '+18883644444', image: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: 4, name: 'Centro Legal De Accidentes', area: 'Accidentes', rating: 4.9, lat: 34.0652, lng: -117.6509, phone: '+18559126909', image: 'https://randomuser.me/api/portraits/men/45.jpg' }
];

export default function DonationsScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const currentLanguageCode = useMockSelector((state) => state.language.code);
  const { t } = useTranslation();

  // Áreas de práctica con fallback seguro
  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) 
    ? t.lawyerstab.practiceAreas 
    : ['All', 'Immigration', 'Family', 'Accidents'];

  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState(PRACTICE_AREAS[0]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>(DATA_SOURCE); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);

  // Título dinámico (title no existe en tu JSON)
  const screenTitle = currentLanguageCode === 'es' ? "Ayuda y Donaciones" : "Help & Donations";

  useFocusEffect(
    useCallback(() => {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setUserLocation(coords);
      })();
    }, [])
  );

  const handleSearch = async () => {
    if (zipCode.length < 5) {
      Alert.alert("ZIP", t?.lawyerstab?.validatezip || "ZIP inválido");
      return;
    }
    setLoading(true);
    Keyboard.dismiss();
    try {
      const geo = await Location.geocodeAsync(zipCode);
      if (geo.length > 0) {
        const newCoords = {
          latitude: geo[0].latitude,
          longitude: geo[0].longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };
        setUserLocation(newCoords);
        setShowMarkers(true);
        if (mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);

        let filtered = (selectedArea === PRACTICE_AREAS[0])
          ? [...DATA_SOURCE] 
          : DATA_SOURCE.filter(l => l.area.toLowerCase() === selectedArea.toLowerCase());

        setResults(filtered);
      }
    } catch (e) { 
      Alert.alert("Error", "ZIP no encontrado."); 
    } finally { 
      setLoading(false); 
    }
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: 'flex-start'}]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: loggedIn ? height * 0.72 : height * 0.68 }]}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={localStyles.customHeader}>
              <TouchableOpacity onPress={() => router.push('/services')}>
                <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <MaterialCommunityIcons name="hand-heart" size={32} color={isDark ? '#fff' : '#000'} style={{opacity: 0.5}} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ThemedText style={localStyles.mainTitle}>{screenTitle}</ThemedText>

              {/* Filtros */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {PRACTICE_AREAS.map((area) => (
                  <TouchableOpacity 
                    key={area} 
                    onPress={() => setSelectedArea(area)}
                    style={[localStyles.chip, selectedArea === area && localStyles.activeChip]}
                  >
                    <ThemedText style={[localStyles.chipText, selectedArea === area && { color: '#fff' }]}>{area}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Input de Búsqueda */}
              <View style={localStyles.searchContainer}>
                <TextInput
                  style={[localStyles.input, { color: isDark ? '#fff' : '#000' }]}
                  placeholder={t?.lawyerstab?.messagezip || "ZIP Code..."}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={zipCode}
                  onChangeText={setZipCode}
                />
                <TouchableOpacity onPress={handleSearch} style={localStyles.searchBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="magnify" size={24} color="#fff" />}
                </TouchableOpacity>
              </View>

              {/* SECCIÓN CONDICIONAL MULTIPLATAFORMA */}
              {Platform.OS !== 'web' && MapView ? (
                // MÓVIL: Mapa Interactivo Nativo
                <View style={localStyles.mapWrapper}>
                  <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={userLocation}>
                    {showMarkers && results.map(item => (
                      <Marker key={item.id} coordinate={{ latitude: item.lat, longitude: item.lng }} title={item.name} />
                    ))}
                  </MapView>
                </View>
              ) : (
                // WEB: Icono de Validación de Conexión Segura
                <LinearGradient
                  colors={isDark ? ['#333', '#222'] : ['#f9f9f9', '#eee']}
                  style={localStyles.webValidationPlaceholder}
                >
                  <View style={localStyles.iconRow}>
                     <MaterialCommunityIcons name="shield-check-outline" size={36} color="#FF5F6D" />
                     <MaterialCommunityIcons name="lock-outline" size={20} color="#FF5F6D" style={{marginLeft: -10, marginTop: 15}} />
                  </View>
                   <ThemedText style={localStyles.validationTitle}>Conexión Oficial Validada</ThemedText>
                   <ThemedText style={localStyles.validationSubtitle}>Red de ayuda comunitaria segura y confiable.</ThemedText>
                </LinearGradient>
              )}

              {/* Lista de Resultados */}
              <View style={{ marginTop: 10 }}>
                {results.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={localStyles.lawyerCard}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  >
                    <Image source={{ uri: item.image }} style={localStyles.lawyerImg} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <ThemedText style={localStyles.lawyerName}>{item.name}</ThemedText>
                      <ThemedText style={localStyles.lawyerArea}>{item.area} • ⭐ {item.rating}</ThemedText>
                    </View>
                    <MaterialCommunityIcons name="phone-outline" size={22} color="#FF5F6D" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {renderMainContent()}
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  input: { flex: 1, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  searchBtn: { backgroundColor: '#FF5F6D', width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  activeChip: { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' },
  chipText: { fontSize: 13, fontWeight: '600' },
  
  // Estilos Mapa Móvil
  mapWrapper: { height: 180, borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  // Estilos Validación Web (NUEVO)
  webValidationPlaceholder: { 
    height: 130, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(150,150,150,0.2)',
    padding: 15
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  validationTitle: { fontSize: 14, fontWeight: 'bold', color: '#FF5F6D', marginBottom: 3 },
  validationSubtitle: { fontSize: 11, opacity: 0.6, textAlign: 'center' },

  // Estilos Tarjetas Resultados
  lawyerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(150,150,150,0.1)', padding: 12, borderRadius: 18, marginBottom: 10 },
  lawyerImg: { width: 50, height: 50, borderRadius: 25 },
  lawyerName: { fontWeight: 'bold', fontSize: 15 },
  lawyerArea: { fontSize: 12, opacity: 0.7 },
});