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

const AREA_ICONS: Record<string, any> = {
  'General': 'gavel',
  'Inmigración': 'passport',
  'Familia': 'account-child-circle',
  'Accidentes': 'car-crash',
  'Laboral': 'briefcase',
  'Criminal': 'handcuffs',
  'Default': 'scale-balance'
};

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
  const mapRef = useRef<any>(null); // REFERENCIA PARA IOS
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
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const isZipValid = zipCode.length === 5;

  useEffect(() => {
    if (zipCode.length < 5) {
      setResults([]);
      setShowMarkers(false);
    }
  }, [zipCode]);

  useEffect(() => { if (allFilterText) setSelectedArea(allFilterText); }, [allFilterText]);

  const handleZoom = (type: 'in' | 'out') => {
    if (Platform.OS === 'web' || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (Platform.OS === 'ios') camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    let location = await Location.getCurrentPositionAsync({});
    const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setUserLocation(coords);

    // Mover cámara en iOS físicamente
    if (!isWeb && mapRef.current) {
        mapRef.current.animateToRegion(coords, 1000);
    }

    if(isWeb) setMapKey(k => k + 1);
  };

  useFocusEffect(useCallback(() => { getCurrentLocation(); }, []));

  const handleSearch = async (forcedArea?: string) => {
    const areaToSearch = typeof forcedArea === 'string' ? forcedArea : selectedArea;
    if (!isZipValid) return;
    
    setLoading(true);
    setIsFilteredByMap(false);
    if (!isWeb) Keyboard.dismiss();

    try {
      const geo = await Location.geocodeAsync(zipCode);
      const lat = geo.length > 0 ? geo[0].latitude : 34.0668;
      const lng = geo.length > 0 ? geo[0].longitude : -117.5783;
      
      const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
      setUserLocation(newCoords);
      setShowMarkers(true);

      // Mover cámara en iOS al buscar
      if (!isWeb && mapRef.current) {
        mapRef.current.animateToRegion(newCoords, 1000);
      }

      let filtered = (areaToSearch === allFilterText) ? [...DATA_SOURCE] : DATA_SOURCE.filter(l => l.area === areaToSearch);
      filtered.sort((a, b) => getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng));
      
      setResults(filtered);
      setMapKey(k => k + 1);
    } catch (e) { 
        if(!isWeb) Alert.alert("Error", "ZIP no encontrado."); 
    } finally { setLoading(false); }
  };

  const LawyerCard = ({ lawyer }: { lawyer: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    const cardStyle = isLargeWeb ? webStyles.lawyerCardWeb : styles.lawyerCard;

    return (
      <View style={[cardStyle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', marginBottom: 10 }]}>
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
          <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lawyer.lat},${lawyer.lng}`)} style={[styles.actionBtn, {backgroundColor: '#E3F2FD'}]}>
            <MaterialCommunityIcons name="directions" size={18} color="#1976D2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: '#FFF3E0'}]}>
            <MaterialCommunityIcons name="phone" size={18} color="#EF6C00" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (loggedIn ? height * 0.69 : height * 0.65);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { justifyContent: (isLargeWeb || !loggedIn) ? 'center' : 'flex-start'}]} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, isLargeWeb && { marginTop: -100 }]}>
          <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={styles.cardContent}>
              
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} /></TouchableOpacity>
                <View style={styles.headerIcons}>
                  <TouchableOpacity onPress={() => { setResults([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                    <MaterialCommunityIcons name="refresh" size={24} color={isDark ? '#fff' : '#000'} style={{marginRight: 15}} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="scale-balance" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.2}} />
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.formContainer}>
                    <View style={styles.searchRow}>
                      <TextInput
                      style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                      placeholder={t.lawyerstab?.messagezip || "ZIP Code"}
                        keyboardType="numeric" maxLength={5} value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()}
                      />
                      <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={[styles.compactSearchBtn]}>
                        <LinearGradient 
                            colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#D3D3D3', '#D3D3D3']}
                            style={styles.gradientBtn}
                        >
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
                    {/* ASIGNAMOS mapRef AQUÍ */}
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} onZoom={handleZoom} dataSource={results.length > 0 ? results : DATA_SOURCE}  onMarkerPress={(l: any) => { setResults([l]); setIsFilteredByMap(true); if(mapRef.current) mapRef.current.animateToRegion({ latitude: l.lat, longitude: l.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800); }} />
                  </View>
                  <View style={styles.resultsWrapper}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, marginBottom: 4, opacity: 0.7, fontWeight: '600' }}>{results.length === 1 
        ? `1 ${t.lawyerstab?.resultone}` 
        : `${results.length} ${t.lawyerstab?.resultdomore}`} </ThemedText>}
                    {isFilteredByMap && (
                      <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={webStyles.viewAllBtn}>
                        <MaterialCommunityIcons name="filter-remove-outline" size={14} color="#0080B5" />
                        <ThemedText style={{ color: '#0080B5', fontWeight: 'bold', fontSize: 12 }}> {t.lawyerstab?.viewallresults}</ThemedText>
                      </TouchableOpacity>
                    )}
                    {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={webStyles.sideMenuContainer}>
                    <ThemedText style={webStyles.sideMenuTitle}>Especialidades</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {PRACTICE_AREAS.map((area) => (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={[webStyles.sideMenuItem, selectedArea === area && { backgroundColor: 'rgba(255,95,109,0.1)' }]}>
                          {selectedArea === area && <View style={webStyles.activeIndicator} />}
                          <MaterialCommunityIcons 
                            name={AREA_ICONS[area] || AREA_ICONS['Default']} 
                            size={18} 
                            color={selectedArea === area ? '#FF5F6D' : (isDark ? '#777' : '#999')} 
                            style={{ marginRight: 10 }}
                          />
                          <ThemedText style={{ fontSize: 13, fontWeight: selectedArea === area ? '700' : '400', color: selectedArea === area ? '#FF5F6D' : (isDark ? '#fff' : '#000') }}>{area}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 20 }}>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.searchRow, { marginBottom: 20 }]}>
                        <TextInput style={[styles.customInput, { flex: 1, color: isDark ? '#fff' : '#000' }]} placeholder="Introduce ZIP Code..." value={zipCode} maxLength={5} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                        <TouchableOpacity onPress={() => handleSearch()} style={styles.compactSearchBtn} disabled={!isZipValid}>
                          <LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#D3D3D3', '#D3D3D3']} style={styles.gradientBtn}>
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.5, marginLeft: 20, height: '100%', position: 'relative' }}>
                      <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={results} mapKey={mapKey} onMarkerPress={(l: any) => { setResults([l]); setIsFilteredByMap(true); }} />
                      <TouchableOpacity onPress={getCurrentLocation} style={webStyles.locationBtn}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0080B5" />
                      </TouchableOpacity>
                    </View>
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

const webStyles = StyleSheet.create({
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,128,181,0.1)', padding: 10, borderRadius: 10, marginBottom: 10 },
    lawyerCardWeb: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15 },
    sideMenuContainer: { width: 230, borderRightWidth: 1, borderRightColor: 'rgba(150,150,150,0.1)', paddingRight: 15 },
    sideMenuTitle: { fontWeight: 'bold', fontSize: 11, marginBottom: 20, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1 },
    sideMenuItem: { padding: 12, borderRadius: 10, marginBottom: 5, position: 'relative', flexDirection: 'row', alignItems: 'center' },
    activeIndicator: { position: 'absolute', left: 0, width: 3, height: '60%', backgroundColor: '#FF5F6D', top: '20%', borderRadius: 2 },
    locationBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', padding: 10, borderRadius: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 }
});