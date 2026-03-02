import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, useWindowDimensions, Keyboard,
  TextInput, ActivityIndicator, Image, Linking, Alert
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

import MapComponent from '@/components/Map';

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

  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;

  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) ? t.lawyerstab.practiceAreas : [];
  const allFilterText = PRACTICE_AREAS[0] || '';

  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState(allFilterText);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>(isWeb ? DATA_SOURCE : []); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(isWeb);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => { if (allFilterText) setSelectedArea(allFilterText); }, [allFilterText]);
  const isZipValid = zipCode.length === 5;

  useFocusEffect(useCallback(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      let initialCoords = { latitude: 34.0668, longitude: -117.6115, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        initialCoords = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      }
      setUserLocation(initialCoords);
    })();
  }, []));

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (Platform.OS === 'ios') camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const handleSearch = async (forcedArea?: string) => {
    const areaToSearch = typeof forcedArea === 'string' ? forcedArea : selectedArea;
    setLoading(true);
    setIsFilteredByMap(false);
    if (!isWeb) Keyboard.dismiss();

    try {
      let newCoords = userLocation;
      if (!isWeb && isZipValid) {
        const geo = await Location.geocodeAsync(zipCode);
        if (geo.length > 0) {
          newCoords = { latitude: geo[0].latitude, longitude: geo[0].longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 };
        }
      }
      if (newCoords) {
        setUserLocation(newCoords);
        setShowMarkers(true);
        if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);
        let filtered = (areaToSearch === allFilterText) ? [...DATA_SOURCE] : DATA_SOURCE.filter(l => l.area === areaToSearch);
        filtered.sort((a, b) => getDistance(newCoords.latitude, newCoords.longitude, a.lat, a.lng) - getDistance(newCoords.latitude, newCoords.longitude, b.lat, b.lng));
        setResults(filtered);
      }
    } catch (e) { 
      if(!isWeb) Alert.alert("Error", "Búsqueda no disponible."); 
    } finally { setLoading(false); }
  };

  const LawyerCard = ({ lawyer }: { lawyer: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    return (
      <View style={[styles.lawyerCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', marginBottom: 10 }]}>
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
          <TouchableOpacity 
            onPress={() => Linking.openURL(Platform.OS === 'ios' ? `maps://app?daddr=${lawyer.lat},${lawyer.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${lawyer.lat},${lawyer.lng}`)} 
            style={[styles.actionBtn, {backgroundColor: '#E3F2FD'}]}
          >
            <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: '#FFF3E0'}]}>
            <MaterialCommunityIcons name="phone" size={18} color="#EF6C00" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const cardWidth = isLargeWeb ? '90%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.73 : (loggedIn ? height * 0.69 : height * 0.65);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {/* ScrollView principal ajustado para Web */}
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          { 
            // En web grande, alineamos al inicio (arriba) en lugar de centrar
            justifyContent: isLargeWeb ? 'flex-start' : (loggedIn ? 'flex-start' : 'center'),
            paddingTop: isLargeWeb ? 5 : 0 // Sube el contenido casi al tope del header
          }
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.centerContainer, isLargeWeb && { justifyContent: 'flex-start' }]}>
          <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight, marginTop: isLargeWeb ? 5 : 0 }]}>
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={styles.cardContent}>
              
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} /></TouchableOpacity>
                <View style={styles.headerIcons}>
                  <TouchableOpacity onPress={() => { setMapKey(k => k + 1); setResults(isWeb ? DATA_SOURCE : []); setZipCode(''); setShowMarkers(isWeb); setIsFilteredByMap(false); }}>
                    <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#fff' : '#000'} style={{marginRight: 15}} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="scale-balance" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.2}} />
                </View>
              </View>

              {!isLargeWeb ? (
                /* --- IOS: DISEÑO ORIGINAL --- */
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.formContainer}>
                    <View style={styles.searchRow}>
                      <TextInput
                        style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                        placeholder={t.lawyerstab?.messagezip || "ZIP Code"}
                        keyboardType="numeric" maxLength={5} value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()}
                      />
                      <TouchableOpacity onPress={() => handleSearch()} disabled={loading || !isZipValid} style={[styles.compactSearchBtn, { opacity: isZipValid ? 1 : 0.5 }]}>
                        <LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#888', '#555']} style={styles.gradientBtn}>
                          {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {PRACTICE_AREAS.map((area) => (
                        <TouchableOpacity key={area} onPress={() => setSelectedArea(area)} style={[styles.chip, selectedArea === area && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                          <ThemedText style={[styles.chipText, selectedArea === area && { color: '#fff' }]}>{area}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.mapContainer}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={DATA_SOURCE} mapKey={mapKey} onZoom={handleZoom} onMarkerPress={(l: any) => { setResults([l]); setIsFilteredByMap(true); }} />
                  </View>
                  <View style={styles.resultsWrapper}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, marginBottom: 8, opacity: 0.7, fontWeight: '600' }}>{results.length} Resultados</ThemedText>}
                    {isFilteredByMap && (
                      <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ marginBottom: 10, padding: 8, backgroundColor: 'rgba(0,128,181,0.1)', borderRadius: 10, alignItems: 'center' }}>
                        <ThemedText style={{ color: '#0080B5', fontWeight: 'bold', fontSize: 12 }}>{t.lawyerstab?.viewallresults || "Ver todos"}</ThemedText>
                      </TouchableOpacity>
                    )}
                    {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                  </View>
                </ScrollView>
              ) : (
                /* --- WEB: 3 COLUMNAS --- */
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={{ width: 230, borderRightWidth: 1, borderRightColor: 'rgba(150,150,150,0.1)', paddingRight: 15 }}>
                    <ThemedText style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 15, opacity: 0.5 }}>ESPECIALIDADES</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {PRACTICE_AREAS.map((area) => (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); handleSearch(area); }} style={{ padding: 12, borderRadius: 10, marginBottom: 5, backgroundColor: selectedArea === area ? '#FF5F6D' : 'transparent' }}>
                          <ThemedText style={{ fontSize: 13, color: selectedArea === area ? '#fff' : (isDark ? '#fff' : '#000') }}>{area}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    <View style={[styles.searchRow, { marginBottom: 10 }]}>
                      <TextInput style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000' }]} placeholder="ZIP Code" value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                      <TouchableOpacity onPress={() => handleSearch()} style={styles.compactSearchBtn}>
                        <LinearGradient colors={['#FF5F6D', '#FFC371']} style={styles.gradientBtn}><MaterialCommunityIcons name="magnify" size={22} color="#fff" /></LinearGradient>
                      </TouchableOpacity>
                    </View>
                    <ThemedText style={{ fontSize: 13, marginBottom: 10, opacity: 0.7, fontWeight: '600' }}>{results.length} Resultados</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1.5, marginLeft: 20, height: '100%', borderRadius: 15, overflow: 'hidden' }}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={true} dataSource={results.length > 0 ? results : DATA_SOURCE} mapKey={mapKey} onMarkerPress={(l: any) => setResults([l])} />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}