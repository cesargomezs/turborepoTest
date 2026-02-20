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
  ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
// AJUSTE 1: Se agrega useSegments a las importaciones de expo-router
import { useRouter, useFocusEffect, useSegments } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { contentCardStyles as styles } from "../../src/styles/contentcard";

// --- CONFIGURACIÓN DE MAPAS ---
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

const DATA_SOURCE = [
  { id: 1, name: 'Neil Panchal Law', area: 'General', rating: 5.0, lat: 34.0668, lng: -117.6115, phone: '+19517036499', image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'BANDERAS LAW, PC', area: 'Inmigración', rating: 5.0, lat: 34.0668, lng: -117.5783, phone: '+19097070000', image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Law Office of Cierra Esq', area: 'Familia', rating: 4.8, lat: 34.0696, lng: -117.5782, phone: '+18883644444', image: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: 4, name: 'Centro Legal De Accidentes', area: 'Accidentes', rating: 4.9, lat: 34.0652, lng: -117.6509, phone: '+18559126909', image: 'https://randomuser.me/api/portraits/men/45.jpg' }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export default function LawyersScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  // AJUSTE 2: Se define la constante segments para habilitar isCommunityScreen
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');
 

  // 1. ÁREAS DE PRÁCTICA CON FALLBACK SEGURO
  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) 
    ? t.lawyerstab.practiceAreas 
    : t.lawyerstab.practiceAreas;

  const allFilterText = PRACTICE_AREAS[0];

  const [isFocused, setIsFocused] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState(allFilterText);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setSelectedArea(allFilterText);
  }, [allFilterText]);

  const isZipValid = zipCode.length === 5;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
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
      return () => setIsFocused(false);
    }, [])
  );

  const handleZoom = (type: 'in' | 'out') => {
    mapRef.current?.getCamera().then((camera: any) => {
      if (Platform.OS === 'ios') {
        camera.altitude *= type === 'in' ? 0.5 : 2;
      } else {
        camera.zoom += type === 'in' ? 1 : -1;
      }
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
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

  const handleSearch = async () => {
    if (!isZipValid) return;
    setLoading(true);
    setIsFilteredByMap(false);
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
        mapRef.current?.animateToRegion(newCoords, 1000);

        let filtered = (selectedArea === 'Todas' || selectedArea === 'All' || selectedArea === allFilterText)
          ? [...DATA_SOURCE] 
          : DATA_SOURCE.filter(l => l.area === selectedArea);

        filtered.sort((a, b) => 
          getDistance(newCoords.latitude, newCoords.longitude, a.lat, a.lng) - 
          getDistance(newCoords.latitude, newCoords.longitude, b.lat, b.lng)
        );

        setResults(filtered);
      }
    } catch (e) { 
      Alert.alert("Error", "ZIP no encontrado."); 
    } finally { 
      setLoading(false); 
    }
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: loggedIn ? 'flex-start' : 'center'}]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.push('/services')}>
                <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <View style={styles.headerIcons}>
                <TouchableOpacity onPress={() => { setMapKey(k => k + 1); setResults([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); }}>
                  <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#fff' : '#000'} style={{marginRight: 15}} />
                </TouchableOpacity>
                <MaterialCommunityIcons name="store-plus-outline" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.4}} />
              </View>
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formContainer}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                    placeholder={t.lawyerstab?.messagezip}
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    maxLength={5}
                    value={zipCode}
                    onChangeText={setZipCode}
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity onPress={handleSearch} disabled={loading || !isZipValid} style={[styles.compactSearchBtn, { opacity: isZipValid ? 1 : 0.5 }]}>
                    <LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#888', '#555']} style={styles.gradientBtn}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {PRACTICE_AREAS.map((area: string) => (
                    <TouchableOpacity 
                      key={area} 
                      onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(); }} 
                      style={[styles.chip, selectedArea === area && { backgroundColor: '#0080B5', borderColor: '#0080B5' }]}
                    >
                      <ThemedText style={[styles.chipText, selectedArea === area && { color: '#fff' }]}>{area}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.mapContainer}>
                {isFocused && MapView ? (
                  <>
                    <MapView key={`map-${mapKey}`} ref={mapRef} style={styles.map} showsUserLocation={true}
                      initialRegion={userLocation || { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.1, longitudeDelta: 0.1 }}>
                      {showMarkers && DATA_SOURCE.map(l => (
                        <Marker 
                          key={l.id} 
                          coordinate={{ latitude: l.lat, longitude: l.lng }} 
                          title={l.name}
                          onPress={() => handleMarkerPress(l)} 
                        />
                      ))}
                    </MapView>
                    <View style={styles.zoomControls}>
                      <TouchableOpacity style={styles.zoomBtn} onPress={() => mapRef.current?.animateToRegion(userLocation, 1000)}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#0080B5" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('in')}>
                        <MaterialCommunityIcons name="plus" size={18} color="#0080B5" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoom('out')}>
                        <MaterialCommunityIcons name="minus" size={18} color="#0080B5" />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : <ActivityIndicator style={{flex: 1}} />}
              </View>

              <View style={styles.resultsWrapper}>
                {results.length > 0 && (
                  <ThemedText style={{ fontSize: 13, marginBottom: 4, opacity: 0.7, fontWeight: '600' }}>
                    {results.length} {results.length === 1 ? t.lawyerstab.resultone : t.lawyerstab.resultdomore }
                  </ThemedText>
                )}

                {isFilteredByMap && (
                  <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ marginBottom: 10, padding: 8, backgroundColor: 'rgba(0,128,181,0.1)', borderRadius: 10, alignItems: 'center' }}>
                    <ThemedText style={{ color: '#0080B5', fontWeight: 'bold', fontSize: 12 }}>{t.lawyerstab.viewallresults}</ThemedText>
                  </TouchableOpacity>
                )}
                {results.map((lawyer) => {
                  const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
                  return (
                    <View key={lawyer.id} style={[styles.lawyerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                      <Image source={{ uri: lawyer.image }} style={styles.avatar} />
                      <View style={{flex: 1, marginLeft: 12}}>
                        <ThemedText style={{fontWeight: 'bold', fontSize: 14}}>{lawyer.name}</ThemedText>
                        <View style={styles.ratingDistRow}>
                          <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                          <ThemedText style={styles.smallText}>{lawyer.rating.toFixed(1)}</ThemedText>
                          {dist !== null && <ThemedText style={[styles.smallText, {color: '#0080B5'}]}> • {dist} mi</ThemedText>}
                        </View>
                        <ThemedText style={{fontSize: 11, opacity: 0.5}}>{lawyer.area}</ThemedText>
                      </View>
                      <View style={styles.actionGroup}>
                        <TouchableOpacity onPress={() => Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${lawyer.name}@${lawyer.lat},${lawyer.lng}` : `geo:0,0?q=${lawyer.lat},${lawyer.lng}(${lawyer.name})`)} style={[styles.actionBtn, {backgroundColor: '#E3F2FD'}]}>
                          <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: '#FFF3E0'}]}>
                          <MaterialCommunityIcons name="phone" size={18} color="#EF6C00" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {Platform.OS === 'web' ? renderMainContent() : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}