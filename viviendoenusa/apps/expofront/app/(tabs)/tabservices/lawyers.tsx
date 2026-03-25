import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform,
  StyleSheet, useWindowDimensions, Keyboard,
  TextInput, ActivityIndicator, Image, Linking, Alert,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { getContentCardStyles } from 'app/src/styles/contentcommunity';
import MapComponent from '@/components/Map';

// --- CONFIGURACIÓN DE ICONOS Y DATOS ---
const AREA_ICONS: Record<string, { lib: any, name: string }> = {
  'General': { lib: MaterialCommunityIcons, name: 'gavel' },
  'Inmigración': { lib: MaterialCommunityIcons, name: 'passport' },
  'Familia': { lib: MaterialCommunityIcons, name: 'account-child-circle' },
  'Accidentes': { lib: FontAwesome5, name: 'car-crash' },
  'Laboral': { lib: MaterialCommunityIcons, name: 'briefcase' },
  'Criminal': { lib: MaterialCommunityIcons, name: 'handcuffs' },
  'Default': { lib: MaterialCommunityIcons, name: 'scale-balance' }
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
  const mapRef = useRef<any>(null); 
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const styles = getContentCardStyles(isDark);
  const localStyles = useUnifiedCardStyles(); 

  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) ? t.lawyerstab.practiceAreas : [];
  const allFilterText = PRACTICE_AREAS[0] || '';

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#546E7A',
    accent: isDark ? '#4FC3F7' : '#0080B5',
    // SUBIMOS LA OPACIDAD DEL BORDE PARA WEB
    border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
    inputBg: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
  };

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
    if (zipCode.length < 5) { setResults([]); setShowMarkers(false); }
  }, [zipCode]);

  useEffect(() => { if (allFilterText) setSelectedArea(allFilterText); }, [allFilterText]);

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
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
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(coords, 1000);
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
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);
      let filtered = (areaToSearch === allFilterText) ? [...DATA_SOURCE] : DATA_SOURCE.filter(l => l.area === areaToSearch);
      filtered.sort((a, b) => getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng));
      setResults(filtered);
      setMapKey(k => k + 1);
    } catch (e) { 
      if(!isWeb) Alert.alert("Error", t.lawyerstab?.zipnofound); 
    } finally { setLoading(false); }
  };

  const openDirections = (lawyer: any) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(lawyer.name)}@${lawyer.lat},${lawyer.lng}`,
      android: `geo:0,0?q=${lawyer.lat},${lawyer.lng}(${encodeURIComponent(lawyer.name)})`,
      web: `https://www.google.com/maps/search/?api=1&query=${lawyer.lat},${lawyer.lng}`
    });
    if (url) Linking.openURL(url);
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -120 : (isIOS ? -85 : -100);

  const LawyerCard = ({ lawyer }: { lawyer: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    return (
      <View style={[styles.lawyerCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', marginBottom: 12, paddingVertical: 15, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, borderWidth: 0 }]}>
        <Image source={{ uri: lawyer.image }} style={styles.avatar} />
        <View style={{flex: 1, marginLeft: 12}}>
          <ThemedText style={{fontWeight: '700', fontSize: 15, color: Colors.text}}>{lawyer.name}</ThemedText>
          <View style={styles.ratingDistRow}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={[styles.smallText, {color: Colors.text, fontWeight: '600'}]}>{lawyer.rating.toFixed(1)}</ThemedText>
            {dist !== null && <ThemedText style={[styles.smallText, {color: Colors.accent, fontWeight: '700'}]}> • {dist} mi</ThemedText>}
          </View>
          <ThemedText style={{fontSize: 12, color: Colors.subtext, fontWeight: '500'}}>{lawyer.area}</ThemedText>
        </View>
        <View style={styles.actionGroup}>
          <TouchableOpacity onPress={() => openDirections(lawyer)} style={[styles.actionBtn, {backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'}]}>
            <MaterialCommunityIcons name="directions" size={20} color={isDark ? '#4FC3F7' : '#1976D2'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${lawyer.phone}`)} style={[styles.actionBtn, {backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0'}]}>
            <MaterialCommunityIcons name="phone" size={20} color={isDark ? '#FFB74D' : '#EF6C00'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: isWeb ? 'flex-start' : 'center', 
          paddingTop: isWeb ? 40 : 0 
        }} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
          
          {/* --- CONTENEDOR DE BORDE (Aislado para asegurar visibilidad) --- */}
          <View style={{
             width: cardWidth,
             height: cardHeight,
             borderRadius: 28,
             borderWidth: 1.5, // Un poco más grueso para igualar visualmente
             borderColor: Colors.border,
             borderStyle: 'solid',
             overflow: 'hidden', // Asegura que el contenido siga el radio
             backgroundColor: isAndroid 
                ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)') 
                : (isWeb ? (isDark ? '#141414' : '#FFFFFF') : 'transparent'),
             
             // SOMBRA UNIFICADA
             elevation: 10,
             shadowColor: '#000',
             shadowOffset: { width: 0, height: 8 },
             shadowOpacity: isDark ? 0.4 : 0.1,
             shadowRadius: 15,
          }}>
            
            {/* BLUR PARA IOS/MACOS */}
            {!isAndroid && <BlurView intensity={isDark ? 90 : 70} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={styles.cardContent}>
              <View style={localStyles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <TouchableOpacity onPress={() => { setResults([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                    <MaterialCommunityIcons name="refresh" size={24} color={Colors.text} style={{marginRight: 15, opacity: 0.7}} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="scale-balance" size={40} color={Colors.text} style={{opacity: 0.15}} />
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: 40}}>
                  <View style={styles.searchRow}>
                    <TextInput 
                      style={[styles.customInput, { flex: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, fontWeight: '500' }]} 
                      placeholder={t.lawyerstab?.messagezip} 
                      keyboardType="numeric" 
                      maxLength={5} 
                      value={zipCode} 
                      onChangeText={setZipCode} 
                      onSubmitEditing={() => handleSearch()} 
                      placeholderTextColor={isDark ? '#78909C' : '#90A4AE'} 
                    />
                    <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={styles.compactSearchBtn}>
                      <LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#B0BEC5', '#CFD8DC']} style={styles.gradientBtn}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {PRACTICE_AREAS.map((area) => {
                       const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                       return (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={[styles.chip, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderColor: Colors.border, backgroundColor: selectedArea === area ? '#FF5F6D' : 'transparent' }, selectedArea === area && { borderColor: '#FF5F6D' }]}>
                          <iconInfo.lib name={iconInfo.name} size={14} color={selectedArea === area ? '#fff' : Colors.text} style={{ marginRight: 8 }} />
                          <ThemedText style={[styles.chipText, {color: selectedArea === area ? '#fff' : Colors.text, fontWeight: selectedArea === area ? '700' : '500'}]}>{area}</ThemedText>
                        </TouchableOpacity>
                       );
                    })}
                  </ScrollView>
                  <View style={[styles.mapContainer, {borderColor: Colors.border, borderWidth: 1, borderRadius: 20}]}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} onZoom={handleZoom} dataSource={results.length > 0 ? results : DATA_SOURCE} onMarkerPress={(l: any) => { setResults([l]); setIsFilteredByMap(true); if(mapRef.current) mapRef.current.animateToRegion({ latitude: l.lat, longitude: l.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800); }} />
                  </View>
                  <View style={styles.resultsWrapper}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, marginBottom: 10, color: Colors.subtext, fontWeight: '700' }}>{results.length} {t.lawyerstab?.resultdomore}</ThemedText>}
                    {isFilteredByMap && <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, width: '100%', borderWidth: 1, borderColor: isDark ? 'rgba(79, 195, 247, 0.2)' : 'transparent' }}><MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} /><ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults }`}</ThemedText></TouchableOpacity>}
                    {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={localStyles.webSidebar}>
                    <ThemedText style={[localStyles.sideMenuTitle, { color: isDark ? '#fffafa' : '#000' }]}>Especialidades</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {PRACTICE_AREAS.map((area) => {
                        const iconData = AREA_ICONS[area] || AREA_ICONS['Default'];
                        const isActive = selectedArea === area;
                        return (
                          <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={[localStyles.webCapsuleBtn, isActive ? { backgroundColor: '#FF5F6D' } : { backgroundColor: isDark ? 'rgba(128,128,128,0.2)' : 'rgba(0, 0, 0, 0.1)', borderWidth: 1, borderColor: Colors.border }]}>
                            <iconData.lib name={iconData.name} size={18} color={isActive ? '#FFF' : Colors.subtext} style={{ marginRight: 12, width: 22, textAlign: 'center' }} />
                            <ThemedText style={{ color: isActive ? '#FFF' : Colors.text, fontWeight: isActive ? '700' : '500', fontSize: 14 }}>{area}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                        <TextInput style={[{ flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, color: Colors.text, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#fff', borderColor: Colors.border, borderWidth: 1 }]} placeholder={t.lawyerstab?.messagezip} value={zipCode} maxLength={5} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                        <TouchableOpacity onPress={() => handleSearch()} style={styles.compactSearchBtn} disabled={!isZipValid}><LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#CFD8DC', '#B0BEC5']} style={styles.gradientBtn}><MaterialCommunityIcons name="magnify" size={22} color="#fff" /></LinearGradient></TouchableOpacity>
                      </View>
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
                        {results.length > 0 && <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {t.lawyerstab?.resultdomore}</ThemedText>}
                        {isFilteredByMap && <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, width: '100%', borderWidth: 1, borderColor: isDark ? 'rgba(79, 195, 247, 0.2)' : 'transparent' }}><MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} /><ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults }`}</ThemedText></TouchableOpacity>}
                        {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                      </ScrollView>
                    </View>
                    
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' }}>
                      <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={results.length > 0 ? results : DATA_SOURCE} mapKey={mapKey} onMarkerPress={(l: any) => { setResults([l]); setIsFilteredByMap(true); }} />
                      <TouchableOpacity onPress={getCurrentLocation} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: isDark ? '#333' : '#FFF', padding: 10, borderRadius: 30, elevation: 5, shadowColor: "#000", shadowOpacity: 0.2 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}