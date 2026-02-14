import React, { useState, useRef, useCallback } from 'react';
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
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { Colors } from '@/constants/Colors';

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn("Error cargando mapas:", e);
  }
}

const PRACTICE_AREAS = ['Todas', 'Familia', 'Penal', 'Inmigración', 'Accidentes'];

const DATA_SOURCE = [
  { id: 1, name: 'Neil Panchal Law', area: 'General', rating: 5.0, lat: 34.0668, lng: -117.6115, phone: '+19517036499', image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'BANDERAS LAW, PC', area: 'Inmigración', rating: 5.0, lat: 34.0668, lng: -117.5783, phone: '+19097070000', image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Law Office of Cierra Esq', area: 'Familia', rating: 4.8, lat: 34.0696, lng: -117.5782, phone: '+18883644444', image: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: 4, name: 'Centro Legal De Accidentes', area: 'Accidentes', rating: 4.9, lat: 34.0652, lng: -117.6509, phone: '+18559126909', image: 'https://randomuser.me/api/portraits/men/45.jpg' }
];

export default function LawyersScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);

  const [isFocused, setIsFocused] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      })();
      return () => {
        setIsFocused(false);
        setMapKey(prev => prev + 1);
      };
    }, [])
  );

  const openDirections = (lat: number, lng: number, name: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${name}@${latLng}`,
      android: `${scheme}${latLng}(${name})`
    });
    if (url) Linking.openURL(url);
  };

  const handleZoom = async (type: 'in' | 'out') => {
    if (!mapRef.current) return;
    const camera = await mapRef.current.getCamera();
    if (Platform.OS === 'ios') {
      camera.altitude *= type === 'in' ? 0.5 : 2;
    } else {
      camera.zoom += type === 'in' ? 1.5 : -1.5;
    }
    mapRef.current.animateCamera(camera, { duration: 400 });
  };

  const handleMarkerPress = (lawyer: any) => {
    setResults([lawyer]);
    setIsFilteredByMap(true);
    mapRef.current?.animateToRegion({
      latitude: lawyer.lat,
      longitude: lawyer.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const resetFilter = () => {
    const originalFiltered = selectedArea === 'Todas' 
      ? DATA_SOURCE 
      : DATA_SOURCE.filter(l => l.area === selectedArea);
    setResults(originalFiltered);
    setIsFilteredByMap(false);
  };

  const handleSearch = async () => {
    if (!/^\d{5}$/.test(zipCode)) {
      Alert.alert("Error", "ZIP Code inválido.");
      return;
    }
    setLoading(true);
    setIsFilteredByMap(false);
    Keyboard.dismiss();
    try {
      const geo = await Location.geocodeAsync(zipCode);
      if (geo.length > 0) {
        setShowMarkers(true);
        mapRef.current?.animateToRegion({
          latitude: geo[0].latitude,
          longitude: geo[0].longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }, 1000);
        const filtered = selectedArea === 'Todas' ? DATA_SOURCE : DATA_SOURCE.filter(l => l.area === selectedArea);
        setResults(filtered);
      }
    } catch (e) { Alert.alert("Error", "Error de búsqueda."); }
    finally { setLoading(false); }
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.centerContainer}>
            <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
              <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              
              <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                  <TouchableOpacity onPress={() => router.push('/services')} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
                  </TouchableOpacity>
                  
                  <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={() => { setMapKey(k => k + 1); setResults([]); setZipCode(''); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#fff' : '#000'} style={{marginRight: 15}} />
                    </TouchableOpacity>
                    <MaterialCommunityIcons name="scale-balance" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.4}} />
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.formContainer}>
                    {/* FILA DE BUSQUEDA COMPACTA */}
                    <View style={styles.searchRow}>
                      <TextInput
                        style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        placeholder="ZIP Code..."
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                        maxLength={5}
                        value={zipCode}
                        onChangeText={(t) => { setZipCode(t); if(t.length < 5) { setResults([]); setShowMarkers(false); } }}
                      />
                      <TouchableOpacity onPress={handleSearch} disabled={loading} style={styles.compactSearchBtn}>
                        <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.gradientBtn}>
                          {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    {/* CHIPS DE ESPECIALIDADES */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={{paddingRight: 20}}>
                      {PRACTICE_AREAS.map((area) => (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(zipCode.length === 5) handleSearch(); }} 
                          style={[styles.chip, selectedArea === area && { backgroundColor: '#0080B5', borderColor: '#0080B5' }]}>
                          <ThemedText style={[styles.chipText, selectedArea === area && { color: '#fff' }]}>{area}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.mapContainer}>
                    {isFocused && MapView ? (
                      <View style={{flex: 1}}>
                        <MapView key={`map-${mapKey}`} ref={mapRef} style={styles.map} showsUserLocation={true}
                          initialRegion={userLocation || { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
                          {showMarkers && DATA_SOURCE.map(l => (
                            <Marker key={l.id} coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.name} onPress={() => handleMarkerPress(l)} />
                          ))}
                        </MapView>
                        <View style={styles.zoomControls}>
                          <TouchableOpacity style={styles.zoomBtn} onPress={() => mapRef.current?.animateToRegion(userLocation, 1000)}><MaterialCommunityIcons name="crosshairs-gps" size={18} color="#0080B5" /></TouchableOpacity>
                          <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('in')}><MaterialCommunityIcons name="plus" size={18} color="#0080B5" /></TouchableOpacity>
                          <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('out')}><MaterialCommunityIcons name="minus" size={18} color="#0080B5" /></TouchableOpacity>
                        </View>
                      </View>
                    ) : <ActivityIndicator style={{flex: 1}} />}
                  </View>

                  {results.length > 0 && results.map((lawyer) => (
                    <View key={lawyer.id} style={[styles.lawyerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                      <Image source={{ uri: lawyer.image }} style={styles.avatar} />
                      <View style={{flex: 1, marginLeft: 12}}>
                        <ThemedText style={{fontWeight: 'bold', fontSize: 14}}>{lawyer.name}</ThemedText>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                          <ThemedText style={{fontSize: 12, marginLeft: 4, fontWeight: '600'}}>{lawyer.rating.toFixed(1)}</ThemedText>
                          <ThemedText style={{fontSize: 12, opacity: 0.5, marginLeft: 8}}>{lawyer.area}</ThemedText>
                        </View>
                      </View>
                      <View style={styles.actionGroup}>
                        <TouchableOpacity onPress={() => openDirections(lawyer.lat, lawyer.lng, lawyer.name)} style={[styles.actionBtn, {backgroundColor: '#E3F2FD'}]}><MaterialCommunityIcons name="directions" size={18} color="#1976D2" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: '#FFF3E0'}]}><MaterialCommunityIcons name="phone" size={18} color="#EF6C00" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(`whatsapp://send?phone=${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: '#E8F5E9'}]}><MaterialCommunityIcons name="whatsapp" size={18} color="#2E7D32" /></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {isFilteredByMap && <TouchableOpacity onPress={resetFilter} style={{alignItems: 'center', marginVertical: 10}}><ThemedText style={{color: '#0080B5', fontWeight: 'bold'}}>Ver todos los resultados</ThemedText></TouchableOpacity>}
                </ScrollView>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingVertical: 10, marginTop: Platform.OS === 'ios' ? -19 : 10 },
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  cardWrapper: { borderRadius: 35, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', elevation: 5 },
  cardContent: { flex: 1, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  formContainer: { marginBottom: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  customInput: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15 },
  compactSearchBtn: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  gradientBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chipsScroll: { flexDirection: 'row' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 8, borderColor: 'rgba(0,0,0,0.1)' },
  chipText: { fontSize: 12, fontWeight: '600' },
  mapContainer: { height: 210, borderRadius: 25, overflow: 'hidden', marginVertical: 10, backgroundColor: 'rgba(0,0,0,0.03)' },
  map: { ...StyleSheet.absoluteFillObject },
  zoomControls: { position: 'absolute', right: 10, bottom: 10, gap: 8 },
  zoomBtn: { backgroundColor: 'white', borderRadius: 10, width: 34, height: 34, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  lawyerCard: { flexDirection: 'row', padding: 12, borderRadius: 18, alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  actionGroup: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});