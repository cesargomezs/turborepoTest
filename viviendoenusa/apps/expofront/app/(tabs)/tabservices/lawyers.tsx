import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions, Keyboard,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal, KeyboardAvoidingView,
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

// Importación de la lista de palabras prohibidas
import badWordsData from '../../../utils/babwords.json';

// --- LÓGICA DE VALIDACIÓN (BADWORDS) ---
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

// --- FORMULARIO DE RESEÑAS CON VALIDACIÓN ---
const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (!validateComment(comment)) {
      const errorMsg = t.communitytab.textInappropriateDescription;
      if (Platform.OS === 'web') {
        window.alert(errorMsg); 
      } else {
        Alert.alert(t.communitytab.textInappropriateTittle, errorMsg);
      }
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>{t.lawyerstab.backBtn}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20 }}>{t.lawyerstab.experience}</ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <MaterialCommunityIcons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput value={comment} onChangeText={setComment} placeholder="Escribe tu opinión..." placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} multiline style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16 }} />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}>
          <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.lawyerstab.publishBtn}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

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
  { id: 1, name: 'Neil Panchal Law', area: 'General', rating: 5.0, lat: 34.0668, lng: -117.6115, phone: '+19517036499', image: 'https://randomuser.me/api/portraits/men/32.jpg', reviews: [] },
  { id: 2, name: 'BANDERAS LAW, PC', area: 'Inmigración', rating: 5.0, lat: 34.0668, lng: -117.5783, phone: '+19097070000', image: 'https://randomuser.me/api/portraits/women/44.jpg', reviews: [] },
  { id: 3, name: 'Law Office of Cierra Esq', area: 'Familia', rating: 4.8, lat: 34.0696, lng: -117.5782, phone: '+18883644444', image: 'https://randomuser.me/api/portraits/women/22.jpg', reviews: [] },
  { id: 4, name: 'Centro Legal De Accidentes', area: 'Accidentes', rating: 4.9, lat: 34.0652, lng: -117.6509, phone: '+18559126909', image: 'https://randomuser.me/api/portraits/men/45.jpg', reviews: [] }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  const isLargeWeb = isWeb && width > 1000;
  const isIOS = Platform.OS === 'ios';

  const styles = getContentCardStyles(isDark);
  const localStyles = useUnifiedCardStyles(); 

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#455A64', 
    accent: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
  };

  const ReviewItem = ({ review, isDark, Colors }: any) => (
    <View style={{
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
      borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <MaterialCommunityIcons key={s} name="star" size={14} color={s <= review.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
          ))}
        </View>
        <ThemedText style={{ fontSize: 11, color: Colors.subtext, fontWeight: '700' }}>{t.lawyerstab.recent}</ThemedText>
      </View>
      <ThemedText style={{ color: Colors.text, fontSize: 14, lineHeight: 20 }}>{review.comment}</ThemedText>
    </View>
  );

  const [zipCode, setZipCode] = useState('');
  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) ? t.lawyerstab.practiceAreas : [];
  const allFilterText = PRACTICE_AREAS[0] || '';
  const [selectedArea, setSelectedArea] = useState(allFilterText);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const [selectedLawyer, setSelectedLawyer] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  const isZipValid = zipCode.length === 5;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  useEffect(() => {
    if (zipCode.length < 5) { setResults([]); setShowMarkers(false); }
  }, [zipCode]);

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
    setMapKey(prev => prev + 1); 
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(coords, 1000);
  };

  useFocusEffect(useCallback(() => { getCurrentLocation(); }, []));

  const handleSearch = async (forcedArea?: string) => {
    const areaToSearch = typeof forcedArea === 'string' ? forcedArea : selectedArea;
    if (!isZipValid) return;
    setLoading(true);
    setIsFilteredByMap(false);
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
    } catch (e) { if(!isWeb) Alert.alert("Error", t.lawyerstab?.zipnofound); } finally { setLoading(false); }
  };

  const handleMarkerSelection = (lawyer: any) => {
    setResults([lawyer]);
    setIsFilteredByMap(true);
    const region = { latitude: lawyer.lat, longitude: lawyer.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const openDirections = (lawyer: any) => {
    const lat = lawyer.lat;
    const lng = lawyer.lng;
    const label = encodeURIComponent(lawyer.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });
    if (url) Linking.openURL(url);
  };

  const LawyerCard = ({ lawyer }: { lawyer: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    return (
      <View style={[styles.lawyerCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, shadowOpacity: 0, elevation: 0 }]}>
        <Image source={{ uri: lawyer.image }} style={styles.avatar} />
        <View style={{flex: 1, marginLeft: 12}}>
          <ThemedText style={{fontWeight: '700', fontSize: 15, color: Colors.text}}>{lawyer.name}</ThemedText>
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{color: Colors.text, fontSize: 12, fontWeight: '600', marginLeft: 4}}>{lawyer.rating.toFixed(1)}</ThemedText>
            {dist !== null && <ThemedText style={{color: Colors.accent, fontSize: 12, fontWeight: '700'}}> • {dist} mi</ThemedText>}
          </View>
          <ThemedText style={{fontSize: 12, color: Colors.subtext, fontWeight: '800', marginTop: 2}}>{lawyer.area}</ThemedText>
        </View>
        <View style={{flexDirection: 'row', gap: 8}}>
          <TouchableOpacity onPress={() => setSelectedLawyer(lawyer)} style={[styles.actionBtn, {backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5'}]}>
             <MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} />
          </TouchableOpacity>
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
      <Modal visible={!!selectedLawyer} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedLawyer(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.78, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 32, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: Colors.text }}>{selectedLawyer?.name}</ThemedText>
                    <ThemedText style={{ color: Colors.subtext, fontWeight: '800' }}>{selectedLawyer?.area}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { setSelectedLawyer(null); setShowReviewInput(false); }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
              </View>
              {!showReviewInput ? (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowReviewInput(true)} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                    <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} />
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.lawyerstab.typeReview}</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {selectedLawyer?.reviews?.map((r: any) => <ReviewItem key={r.id} review={r} isDark={isDark} Colors={Colors} />)}
                  </ScrollView>
                </View>
              ) : (
                <ReviewForm 
                    isDark={isDark} 
                    t={t} 
                    onCancel={() => setShowReviewInput(false)} 
                    onPublish={(rating: number, comment: string) => { 
                        const review = { id: Date.now().toString(), stars: rating, comment: comment }; 
                        selectedLawyer.reviews = [review, ...(selectedLawyer.reviews || [])]; 
                        setShowReviewInput(false); 
                    }} 
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[localStyles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={localStyles.cardContent}>
              <View style={localStyles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={Colors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="scale-balance" size={40} color={Colors.text} style={{opacity: 0.55}} />
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.searchRow}>
                    <TextInput style={[styles.customInput, { flex: 1, color: Colors.text, backgroundColor: Colors.inputBg }]} placeholder={t.lawyerstab?.messagezip} keyboardType="numeric" maxLength={5} value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                    <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={styles.compactSearchBtn}>
                      <LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#B0BEC5', '#CFD8DC']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {PRACTICE_AREAS.map((area) => {
                       const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                       const isActive = selectedArea === area;
                       return (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={{ marginRight: 8, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: isActive ? 'transparent' : Colors.border }}>
                          <LinearGradient colors={isActive ? ['#FF5F6D', '#FFC371'] : ['transparent', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <iconInfo.lib name={iconInfo.name} size={14} color={isActive ? '#fff' : Colors.text} style={{ marginRight: 8 }} />
                            <ThemedText style={{ color: isActive ? '#fff' : Colors.text, fontSize: 13, fontWeight: '700' }}>{area}</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                       );
                    })}
                  </ScrollView>
                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} onZoom={handleZoom} dataSource={results.length > 0 ? results : DATA_SOURCE} mapKey={mapKey} onMarkerPress={handleMarkerSelection} />
                    <TouchableOpacity onPress={getCurrentLocation} style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: isDark ? '#333' : '#FFF', padding: 8, borderRadius: 8, elevation: 4 }}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FF5F6D" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ marginTop: 20 }}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length} {t.lawyerstab?.resultdomore}</ThemedText>}
                    {isFilteredByMap && (
                      <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.accent }}>
                        <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} />
                        <ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults }`}</ThemedText>
                      </TouchableOpacity>
                    )}
                    {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={localStyles.webSidebar}>
                    <ThemedText style={[localStyles.sideMenuTitle, { color: Colors.text }]}>{t.lawyerstab.label}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {PRACTICE_AREAS.map((area) => {
                        const iconData = AREA_ICONS[area] || AREA_ICONS['Default'];
                        const isActive = selectedArea === area;
                        return (
                          <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={{ marginBottom: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: isActive ? 'transparent' : Colors.border }}>
                            <LinearGradient colors={isActive ? ['#FF5F6D', '#FFC371'] : ['transparent', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
                              <iconData.lib name={iconData.name} size={18} color={isActive ? '#FFF' : Colors.subtext} style={{ marginRight: 12 }} />
                              <ThemedText style={{ color: isActive ? '#FFF' : Colors.text, fontWeight: isActive ? '700' : '500' }}>{area}</ThemedText>
                            </LinearGradient>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                        <TextInput style={[{ flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, color: Colors.text, backgroundColor: Colors.inputBg, borderColor: Colors.border, borderWidth: 1 }]} placeholder={t.lawyerstab?.messagezip} value={zipCode} maxLength={5} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                        <TouchableOpacity onPress={() => handleSearch()} style={styles.compactSearchBtn} disabled={!isZipValid}><LinearGradient colors={isZipValid ? ['#FF5F6D', '#FFC371'] : ['#CFD8DC', '#B0BEC5']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}><MaterialCommunityIcons name="magnify" size={22} color="#fff" /></LinearGradient></TouchableOpacity>
                      </View>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {results.length > 0 && <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {t.lawyerstab?.resultdomore}</ThemedText>}
                        {isFilteredByMap && (
                          <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.accent }}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} />
                            <ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults }`}</ThemedText>
                          </TouchableOpacity>
                        )}
                        {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
                      <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={results.length > 0 ? results : DATA_SOURCE} mapKey={mapKey} onMarkerPress={handleMarkerSelection} />
                      <TouchableOpacity onPress={getCurrentLocation} style={{ position: 'absolute', right: 20, bottom: 20, backgroundColor: isDark ? '#333' : '#FFF', padding: 12, borderRadius: 12, elevation: 5 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#FF5F6D" />
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