import React, { useState, useRef } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal, KeyboardAvoidingView, Share
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import MapView from 'react-native-maps';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import MapComponent from '@/components/Map';
import badWordsData from '../../../utils/babwords.json';

const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

// --- ICONOS DINÁMICOS POR CATEGORÍA ---
const CATEGORY_ICONS: Record<string, { lib: any, name: string }> = {
  'Todas': { lib: MaterialCommunityIcons, name: 'apps' },
  'Supermercado': { lib: MaterialCommunityIcons, name: 'cart' },
  'Panadería': { lib: MaterialCommunityIcons, name: 'baguette' },
  'Electrónica': { lib: MaterialCommunityIcons, name: 'laptop' },
  'Default': { lib: MaterialCommunityIcons, name: 'storefront' }
};

// --- UTILIDADES ---
const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (!validateComment(comment)) {
      const errorMsg = t.communitytab.textInappropriateDescription;
      if (Platform.OS === 'web') { window.alert(errorMsg); } 
      else { Alert.alert(t.communitytab.textInappropriateTittle, errorMsg); }
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

const DATA_SOURCE = [
  { id: 1, name: 'Cardenas Markets', area: 'Supermercado', description: 'Productos frescos y auténtica comida mexicana preparada directamente en la tienda.', rating: 4.5, lat: 34.0934, lng: -117.5847, phone: '+19099451100', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', reviews: [] },
  { id: 2, name: 'El Super', area: 'Supermercado', description: 'Gran variedad de productos importados con los mejores precios de la zona.', rating: 4.3, lat: 34.0775, lng: -117.6050, phone: '+19099843665', image: 'https://images.unsplash.com/photo-1601599963565-b7ba29c8e3ff?w=800', reviews: [] }
];

export default function StoresScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();

  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B', 
    accent: '#FF5F6D',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)',
  };

  const [zipCode, setZipCode] = useState('');
  const CATEGORIES_LIST = ['Todas', 'Supermercado', 'Panadería', 'Electrónica'];
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>(DATA_SOURCE); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null); 
  const [showReviewInput, setShowReviewInput] = useState(false);

  const isZipValid = zipCode.length === 5;
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const handleShare = async (store: any) => {
    if (!store) return;
    try {
      await Share.share({
        message: `Mira este establecimiento en ViviendoEnUSA: ${store.name}\n${store.description}`,
      });
    } catch (error) { console.log(error); }
  };

  const handleMarkerSelection = (store: any) => {
    setSelectedDetail(store);
    const region = { latitude: store.lat, longitude: store.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const handleSearch = async (forcedArea?: string) => {
    const areaToSearch = forcedArea || selectedArea;
    if (!isZipValid) return;
    setLoading(true);
    try {
      const geo = await Location.geocodeAsync(zipCode);
      const lat = geo.length > 0 ? geo[0].latitude : 34.0668;
      const lng = geo.length > 0 ? geo[0].longitude : -117.5783;
      const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
      setUserLocation(newCoords);
      setShowMarkers(true);
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);
      let filtered = (areaToSearch === 'Todas') ? [...DATA_SOURCE] : DATA_SOURCE.filter(l => l.area === areaToSearch);
      setResults(filtered);
      setMapKey(k => k + 1);
    } catch (e) { Alert.alert("Error", "ZIP no válido"); } finally { setLoading(false); }
  };

  const StoreCard = ({ store }: { store: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, store.lat, store.lng) : null;
    return (
      <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', marginBottom: 20, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding:12 }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ color: Colors.accent, fontSize: 11, fontWeight: '900' }}>{store.area.toUpperCase()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
            <ThemedText style={{ color: Colors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{store.rating.toFixed(1)}</ThemedText>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(store)} style={{ width: '100%', height: 140, overflow: 'hidden' }}>
          <Image source={{ uri: store.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </TouchableOpacity>

        <View style={{padding:15}}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontWeight: '800', fontSize: 18, color: Colors.text }}>{store.name}</ThemedText>
            {dist !== null && <ThemedText style={{ color: Colors.accent, fontSize: 13, fontWeight: '700' }}>{dist} mi</ThemedText>}
          </View>
          
          <ThemedText style={{ fontSize: 14, color: Colors.text, opacity: 0.7, marginTop: 6, lineHeight: 20 }} numberOfLines={2}>
            {store.description}
          </ThemedText>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}>
            <TouchableOpacity onPress={() => setSelectedStore(store)} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
               <MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.text }}>Reseñas</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`http://maps.google.com/?q=${store.lat},${store.lng}`)} style={{ flex: 1, backgroundColor: isDark ? 'rgba(79,195,247,0.15)' : '#E3F2FD', height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.text }}>Mapa</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${store.phone}`)} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0', height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <MaterialCommunityIcons name="phone" size={18} color={isDark ? '#FFB74D' : '#EF6C00'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: Colors.text }}>Teléfono</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={stylesUnified.container}>
      {/* Detalle del Establecimiento */}
      <Modal visible={!!selectedDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={stylesLocal.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedDetail(null)} />
          <View style={[stylesLocal.detailContent, { backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: Colors.border }]}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={stylesLocal.detailImgContainer}>
               <Image source={{ uri: selectedDetail?.image }} style={stylesLocal.detailImg} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={stylesLocal.detailImgOverlay} />
            </View>
            <TouchableOpacity onPress={() => setSelectedDetail(null)} style={stylesLocal.closeBtnDetail}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={stylesLocal.shareBtnDetail}>
              <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <LinearGradient colors={orangeGradient} style={stylesLocal.detailBadge}>
                    <ThemedText style={stylesLocal.detailBadgeText}>{selectedDetail?.area.toUpperCase()}</ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', marginLeft: 15, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                    <ThemedText style={{ marginLeft: 5, fontWeight: '900', color: Colors.text, fontSize: 16 }}>{selectedDetail?.rating}</ThemedText>
                  </View>
                </View>
                <ThemedText style={[stylesLocal.detailTitle, { color: Colors.text }]}>{selectedDetail?.name}</ThemedText>
                <ThemedText style={{ color: Colors.text, lineHeight: 26, fontSize: 16, opacity: 0.9 }}>{selectedDetail?.description}</ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reseñas */}
      <Modal visible={!!selectedStore} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedStore(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.8, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
              <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={{ padding: 25, flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View>
                        <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text }}>{selectedStore?.name}</ThemedText>
                        <ThemedText style={{ color: Colors.subtext, fontWeight: '800' }}>Reseñas Comunidad</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedStore(null); setShowReviewInput(false); }}><MaterialCommunityIcons name="close" size={28} color={Colors.text} /></TouchableOpacity>
                  </View>
                  {!showReviewInput ? (
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => setShowReviewInput(true)} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                        <LinearGradient colors={orangeGradient} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                           <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} /><ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.lawyerstab.typeReview}</ThemedText>
                        </LinearGradient>
                      </TouchableOpacity>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {selectedStore?.reviews?.length > 0 ? selectedStore.reviews.map((r: any) => (
                           <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                             <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                               {[1, 2, 3, 4, 5].map((s) => (<MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />))}
                             </View>
                             <ThemedText style={{ color: Colors.text, fontSize: 14 }}>{r.comment}</ThemedText>
                           </View>
                        )) : <ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>Aún no hay reseñas.</ThemedText>}
                      </ScrollView>
                    </View>
                  ) : (
                    <ReviewForm isDark={isDark} t={t} onCancel={() => setShowReviewInput(false)} onPublish={(rating: number, comment: string) => { 
                            const review = { id: Date.now().toString(), stars: rating, comment: comment }; 
                            selectedStore.reviews = [review, ...(selectedStore.reviews || [])]; 
                            setShowReviewInput(false); 
                        }} 
                    />
                  )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 32 }}>
            <BlurView intensity={isDark ? 100 : 85} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={stylesUnified.cardContent}>
              <View style={stylesUnified.headerRow}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 18, fontWeight: '900', color: Colors.text }}>Establecimientos</ThemedText>
                <TouchableOpacity onPress={() => { setResults(DATA_SOURCE); setZipCode(''); setMapKey(k => k + 1); }}>
                    <MaterialCommunityIcons name="refresh" size={24} color={Colors.text} style={{opacity: 0.6}} />
                </TouchableOpacity>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={stylesLocal.searchRow}>
                    <TextInput style={[stylesLocal.customInput, { flex: 1, color: Colors.text, backgroundColor: Colors.inputBg, borderColor: Colors.border, borderWidth: 1 }]} placeholder={t.lawyerstab.messagezip} placeholderTextColor={Colors.subtext} keyboardType="numeric" maxLength={5} value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                    <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={stylesLocal.compactSearchBtn}>
                      <LinearGradient colors={isZipValid ? orangeGradient : ['#B0BEC5', '#CFD8DC']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {CATEGORIES_LIST.map((area) => {
                      const iconData = CATEGORY_ICONS[area] || CATEGORY_ICONS['Default'];
                      const isActive = selectedArea === area;
                      return (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={{ marginRight: 8, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: isActive ? 'transparent' : Colors.border }}>
                          <LinearGradient colors={isActive ? orangeGradient : ['transparent', 'transparent']} style={{ paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                            <iconData.lib name={iconData.name} size={14} color={isActive ? '#FFF' : Colors.text} style={{ marginRight: 8 }} />
                            <ThemedText style={{ color: isActive ? '#fff' : Colors.text, fontSize: 13, fontWeight: '700' }}>{area}</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 15 }}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={results} mapKey={mapKey} showsUserLocation={false} onMarkerPress={handleMarkerSelection} onZoom={handleZoom} />
                  </View>
                  {results.map((store) => <StoreCard key={store.id} store={store} />)}
                </ScrollView>
              ) : (
                /* VERSION WEB */
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={{ color: Colors.text, fontSize: 16, fontWeight: '900', marginBottom: 20 }}>Categorías</ThemedText>
                    {CATEGORIES_LIST.map((area) => {
                      const iconData = CATEGORY_ICONS[area] || CATEGORY_ICONS['Default'];
                      const isActive = selectedArea === area;
                      return (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
                          <LinearGradient colors={isActive ? orangeGradient : ['transparent', 'transparent']} style={{ padding: 15, flexDirection: 'row', alignItems: 'center' }}>
                            <iconData.lib name={iconData.name} size={18} color={isActive ? '#FFF' : Colors.text} style={{ marginRight: 12 }} />
                            <ThemedText style={{ color: isActive ? '#FFF' : Colors.text, fontWeight: '700' }}>{area}</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                       <TextInput style={{ height: 50, borderRadius: 15, paddingHorizontal: 20, backgroundColor: Colors.inputBg, color: Colors.text, marginBottom: 15, borderWidth: 1, borderColor: Colors.border }} placeholder="ZIP..." value={zipCode} onChangeText={setZipCode} onSubmitEditing={() => handleSearch()} />
                       <ScrollView showsVerticalScrollIndicator={false}>
                        {results.map((store) => <StoreCard key={store.id} store={store} />)}
                       </ScrollView>
                    </View>
                    <View style={{ flex: 1.5, marginLeft: 25, borderRadius: 32, overflow: 'hidden' }}>
                      <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={results} mapKey={mapKey} onMarkerPress={handleMarkerSelection} onZoom={handleZoom} />
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

const stylesLocal = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  detailContent: { width: '92%', height: '82%', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
  detailImgContainer: { width: '100%', height: 260 },
  detailImg: { width: '100%', height: '100%' },
  detailImgOverlay: { ...StyleSheet.absoluteFillObject },
  closeBtnDetail: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 50 },
  shareBtnDetail: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8, zIndex: 50 },
  detailBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  detailBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  detailTitle: { fontSize: 26, fontWeight: '900', marginBottom: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  customInput: { height: 50, borderRadius: 15, paddingHorizontal: 15 },
  compactSearchBtn: { width: 55, height: 50 }
});