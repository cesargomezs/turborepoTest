import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal, KeyboardAvoidingView, Share, ColorValue
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import MapComponent from '@/components/Map';
import badWordsData from '../../../utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

// --- CONFIGURACIÓN Y VALIDACIÓN ---
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

// Iconos asignados por posición (Índice): 0: Todas, 1: Supermercado, 2: Panadería, 3: Electrónica, 4: Otros
const ICONS_ARRAY = ['apps', 'cart', 'baguette', 'laptop', 'storefront'];

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const openDirections = (store: any) => {
  const label = encodeURIComponent(store.name);
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${store.lat},${store.lng}`,
    android: `geo:0,0?q=${store.lat},${store.lng}(${label})`,
    web: `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`
  });
  if (url) Linking.openURL(url);
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

// --- COMPONENTE: FORMULARIO DE RESEÑA ---
const ReviewForm = ({ 
  onPublish, 
  onCancel, 
  isDark, 
  t 
}: {
  onPublish: (stars: number, comment: string) => void;
  onCancel: () => void;
  isDark: boolean;
  t: any;
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (!validateComment(comment)) {
      const errorMsg = t.communitytab?.textInappropriateDescription || "Comentario inapropiado";
      if (Platform.OS === 'web') { window.alert(errorMsg); } 
      else { Alert.alert("Error", errorMsg); }
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>{t.lawyerstab?.backBtn || 'Volver'}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20 }}>{t.lawyerstab?.experience || 'Tu Experiencia'}</ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <MaterialCommunityIcons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput value={comment} onChangeText={setComment} placeholder="Escribe tu opinión..." placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} multiline style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}>
          <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.lawyerstab?.publishBtn || 'Publicar'}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const DATA_SOURCE = [
  // Nota: categoryId 1 corresponde a la segunda opción de la lista (ej. "Supermercado")
  { id: 1, name: 'Cardenas Markets', categoryId: 1, description: 'Productos frescos y auténtica comida mexicana preparada directamente en la tienda.', rating: 4.5, lat: 34.0934, lng: -117.5847, phone: '+19099451100', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', reviews: [] },
  { id: 2, name: 'El Super', categoryId: 1, description: 'Gran variedad de productos importados con los mejores precios de la zona.', rating: 4.3, lat: 34.0775, lng: -117.6050, phone: '+19099843665', image: 'https://images.unsplash.com/photo-1601599963565-b7ba29c8e3ff?w=800', reviews: [] }
];

export default function StoresScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null); 
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#546E7A',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  // --- TRADUCCIONES SEGURAS DE CATEGORÍAS ---
  const rawCategories = t.storestab?.categoriesList;
  const CATEGORIES_LIST = Array.isArray(rawCategories) && rawCategories.length > 0
    ? rawCategories
    : ['Todas', 'Supermercado', 'Panadería', 'Electrónica', 'Otros'];

  // --- ESTADOS ---
  const [zipCode, setZipCode] = useState('');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); // 0 = 'Todas'
  const [loading, setLoading] = useState(false);
  
  const [localData, setLocalData] = useState<any[]>(DATA_SOURCE);
  const [results, setResults] = useState<any[]>([]); 
  
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  // --- ESTADOS SUGERIR NEGOCIO ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); // Default a la primera opción que NO sea "Todas"
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const isZipValid = zipCode.length === 5;
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  // --- OBTENER UBICACIÓN INICIAL ---
  const getCurrentLocation = async (isManual = false) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      setUserLocation(coords);
      setMapKey(prev => prev + 1); 
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(coords, isManual ? 1000 : 1);
    } catch (e) { console.log(e); }
  };

  const hasFetchedLocation = useRef(false);
  useEffect(() => {
    if (!hasFetchedLocation.current) {
      getCurrentLocation();
      hasFetchedLocation.current = true;
    }
  }, []);

  // --- FUNCIONES ---
  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) {
      setResults([]);
      setShowMarkers(false);
      setIsFilteredByMap(false);
    }
  };

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const handleSearch = async (forcedCategoryIdx?: number) => {
    if (!isZipValid) return;

    const categoryToSearch = forcedCategoryIdx !== undefined ? forcedCategoryIdx : selectedCategoryIdx;
    setLoading(true);
    setIsFilteredByMap(false);

    let lat = userLocation ? userLocation.latitude : 34.0934; 
    let lng = userLocation ? userLocation.longitude : -117.5847;

    try {
      const geo = await Location.geocodeAsync(zipCode);
      if (geo.length > 0) {
        lat = geo[0].latitude;
        lng = geo[0].longitude;
      }
    } catch (e) {
      if(!isWeb) Alert.alert("Error", "No se encontró el ZIP");
    }

    const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
    setUserLocation(newCoords);
    setShowMarkers(true); 
    
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);

    let filtered = (categoryToSearch === 0) ? [...localData] : localData.filter(l => l.categoryId === categoryToSearch);
    filtered.sort((a, b) => getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng));
    
    setResults(filtered);
    setMapKey(k => k + 1);
    setLoading(false);
  };

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIdx(index);
    if (isZipValid) {
      handleSearch(index); 
    }
  };

  const handleMarkerSelection = (store: any) => {
    setResults([store]);
    setIsFilteredByMap(true);
    const region = { latitude: store.lat, longitude: store.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const handleShare = async (store: any) => {
    if (!store) return;
    try {
      await Share.share({ message: t.storestab.sharemessage+` ${store.name}\n${store.description}` });
    } catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishStore = async () => {
    if (!formName.trim() || !formAddress.trim() || formZip.length < 5) {
      return Alert.alert(t.storestab.alertmessage);
    }
    
    setIsPublishing(true);
    try {
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          const title = t.communitytab?.imageInappropriateTittle || "Error";
          const desc = t.communitytab?.imageInappropriateDescription || "Imagen inválida";
          if (isWeb) { window.alert(`${title}\n${desc}`); } 
          else { Alert.alert(title, desc); }
          return;
        }
      }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '+1000000000';
      const newEntry = {
        id: Date.now(), 
        name: formName, 
        description: formDesc, 
        address: formAddress,
        categoryId: formCategoryIdx, // Guardar el índice en lugar del texto
        zip: formZip, 
        image: formImage || 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
        rating: 5.0, 
        lat: 34.0934, 
        lng: -117.5847, 
        phone: fullPhone, 
        reviews: []
      };
      
      setPendingStores([newEntry, ...pendingStores]);
      setModalVisible(false);
      setFormName(''); setFormDesc(''); setFormAddress(''); setFormZip(''); setFormPhone(''); setCountryIdx(0); setFormImage(null); setFormCategoryIdx(1);
      Alert.alert(t.storestab.sendnewsug);

    } catch (err) {
      const errorTitle = "Error de red";
      const errorDesc = t.communitytab?.errorServer || "Error";
      if (isWeb) { window.alert(`${errorTitle}\n${errorDesc}`); } 
      else { Alert.alert(errorTitle, errorDesc); }
    } finally {
      setIsPublishing(false);
    }
  };

  const approveStore = (store: any) => {
    setLocalData(prev => [store, ...prev]); 
    if (showMarkers) {
      setResults(prev => [store, ...prev]); 
    }
    setPendingStores(pendingStores.filter(s => s.id !== store.id));
    setMapKey(k => k + 1);
  };

  const StoreCard = ({ store }: { store: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, store.lat, store.lng) : null;
    const categoryName = CATEGORIES_LIST[store.categoryId] || 'Otros';

    return (
      <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: DynamicColors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{categoryName.toUpperCase()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{store.rating.toFixed(1)}</ThemedText>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(store)} style={{ width: '100%', height: 140 }}>
          <Image source={{ uri: store.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </TouchableOpacity>
        <View style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{store.name}</ThemedText>
            {dist !== null && <ThemedText style={{ color: '#FF5F6D', fontSize: 13, fontWeight: '700' }}>{dist} mi</ThemedText>}
          </View>
          <ThemedText style={{ fontSize: 14, color: DynamicColors.text, opacity: 0.7, marginTop: 6 }} numberOfLines={2}>{store.description}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
            <TouchableOpacity onPress={() => setSelectedStore(store)} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5' }}>
               <MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>{t.storestab.reviews}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openDirections(store)} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
              <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>{t.storestab.route}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${store.phone}`)} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}>
              <MaterialCommunityIcons name="phone" size={18} color={isDark ? '#FFB74D' : '#EF6C00'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>{t.storestab.callbton}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={stylesUnified.container}>

      {/* MODAL DETALLE */}
      <Modal visible={!!selectedDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedDetail(null)} />
          <View style={{ width: '90%', height: '75%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240 }}>
               <Image source={{ uri: selectedDetail?.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
               <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="share-variant" size={22} color="#FFF" /></TouchableOpacity>
               <TouchableOpacity onPress={() => setSelectedDetail(null)} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="close" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>
                          {selectedDetail ? CATEGORIES_LIST[selectedDetail.categoryId]?.toUpperCase() : ''}
                      </ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', marginLeft: 15, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                    <ThemedText style={{ marginLeft: 5, fontWeight: '900', color: DynamicColors.text, fontSize: 16 }}>{selectedDetail?.rating}</ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: DynamicColors.text }}>{selectedDetail?.name}</ThemedText>
                {selectedDetail?.address && <ThemedText style={{ color: '#FF5F6D', fontWeight:'700', marginBottom:10 }}>{selectedDetail.address}</ThemedText>}
                <View style={{height:1, backgroundColor:DynamicColors.border, marginVertical:20}} />
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 16, opacity: 0.9 }}>{selectedDetail?.description}</ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL RESEÑAS */}
      <Modal visible={!!selectedStore} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedStore(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.78, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 32, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: DynamicColors.text }}>{selectedStore?.name}</ThemedText>
                    <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800' }}>{t.storestab.commutnityopini}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { setSelectedStore(null); setShowReviewInput(false); }}>
                  <MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} />
                </TouchableOpacity>
              </View>
              {!showReviewInput ? (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowReviewInput(true)} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                    <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} />
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.storestab.writingreview}</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {selectedStore?.reviews?.map((r: any) => (
                       <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                         <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                           {[1, 2, 3, 4, 5].map((s) => (
                             <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                           ))}
                         </View>
                         <ThemedText style={{ color: DynamicColors.text, fontSize: 14 }}>{r.comment}</ThemedText>
                       </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <ReviewForm 
                    isDark={isDark} 
                    t={t} 
                    onCancel={() => setShowReviewInput(false)} 
                    onPublish={(rating: number, comment: string) => { 
                        const review = { id: Date.now().toString(), stars: rating, comment: comment }; 
                        selectedStore.reviews = [review, ...(selectedStore.reviews || [])]; 
                        setShowReviewInput(false); 
                    }} 
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL SUGERIR NEGOCIO */}
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: DynamicColors.border }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 8 }}>{t.storestab.textphoto}</ThemedText></View>}
                </TouchableOpacity>
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8,textTransform:'capitalize'}}>{t.storestab.category}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6, marginBottom: 14 }}>
                  {CATEGORIES_LIST.map((cat, index) => {
                    if (index === 0) return null; // Filtramos la opción "Todas" usando su índice
                    const isActive = formCategoryIdx === index;
                    const iconName = ICONS_ARRAY[index] || 'storefront'; 
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'capitalize' }}>{cat}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'capitalize' }}>{cat}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.storestab.placeHoldname} value={formName} onChangeText={setFormName} placeholderTextColor={DynamicColors.subtext} />
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.storestab.placeHoldAddress} value={formAddress} onChangeText={setFormAddress} placeholderTextColor={DynamicColors.subtext} />
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.storestab.messagezip} value={formZip} onChangeText={setFormZip} keyboardType="numeric" maxLength={5} placeholderTextColor={DynamicColors.subtext} />
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, height: 90, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.storestab.description} value={formDesc} onChangeText={setFormDesc} multiline placeholderTextColor={DynamicColors.subtext} />
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform: 'capitalize'  }}>{t.storestab.phoneContacto}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DynamicColors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DynamicColors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DynamicColors.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    placeholderTextColor={DynamicColors.subtext}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: DynamicColors.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <TouchableOpacity onPress={handlePublishStore} disabled={isPublishing} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{t.storestab.sendbutton}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ESTRUCTURA PRINCIPAL */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={stylesUnified.cardContent}>
              <View style={stylesUnified.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={DynamicColors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => { setIsAdminMode(!isAdminMode); }}>
                    <MaterialCommunityIcons name="store-plus-outline" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.2}} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
                  {isAdminMode && pendingStores.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>{t.storestab.verify} ({pendingStores.length})</ThemedText>
                      {pendingStores.map(store => (
                        <View key={store.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <View style={{flex:1}}><ThemedText style={{ fontSize: 13, fontWeight:'bold' }}>{store.name}</ThemedText></View>
                          <TouchableOpacity onPress={() => approveStore(store)}><MaterialCommunityIcons name="check-circle" size={24} color="green" /></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                    <TextInput 
                      style={[{ flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                      placeholder={t.lawyerstab?.messagezip} 
                      keyboardType="numeric" maxLength={5} value={zipCode} 
                      onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} 
                      placeholderTextColor={DynamicColors.subtext} 
                    />
                    <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 48, height: 48 }}>
                      <LinearGradient colors={isZipValid ? orangeGradient : ['#CFD8DC', '#B0BEC5']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 15 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                      {CATEGORIES_LIST.map((area, index) => {
                         const iconName = ICONS_ARRAY[index] || 'storefront';
                         const isActive = selectedCategoryIdx === index;
                         return (
                          <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                               <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                 <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                 <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{area}</ThemedText>
                               </LinearGradient>
                             ) : (
                               <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                                 <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                 <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{area}</ThemedText>
                               </View>
                             )}
                          </TouchableOpacity>
                         );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border, position: 'relative' }}>
                    <MapComponent 
                      mapRef={mapRef} 
                      userLocation={userLocation} 
                      showMarkers={showMarkers} 
                      onZoom={handleZoom} 
                      dataSource={showMarkers ? results : []} 
                      mapKey={mapKey} 
                      onMarkerPress={handleMarkerSelection} 
                      showsUserLocation={true}
                    />
                    
                    {isWeb && (
                      <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 15, right: 15, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: DynamicColors.border, zIndex: 99, elevation: 99 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={DynamicColors.text} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ marginTop: 20 }}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length} {t.lawyerstab?.resultdomore || 'resultados'}</ThemedText>}
                    {isFilteredByMap && (
                      <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accenticon }}>
                        <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accenticon} />
                        <ThemedText style={{ color: DynamicColors.accenticon, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults || 'Ver todos'}`}</ThemedText>
                      </TouchableOpacity>
                    )}
                    {results.map((store) => <StoreCard key={store.id} store={store} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>{t.storestab.category+'s'}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES_LIST.map((area, index) => {
                        const iconName = ICONS_ARRAY[index] || 'storefront';
                        const isActive = selectedCategoryIdx === index;
                        return (
                          <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{area}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color={DynamicColors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: DynamicColors.text, fontWeight: '600', fontSize: 14 }}>{area}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      
                      {isAdminMode && pendingStores.length > 0 && (
                        <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                          <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>{t.storestab.verify} ({pendingStores.length})</ThemedText>
                          {pendingStores.map(store => (
                            <View key={store.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                              <View style={{flex:1}}><ThemedText style={{ fontSize: 13, fontWeight:'bold' }}>{store.name}</ThemedText></View>
                              <TouchableOpacity onPress={() => approveStore(store)}><MaterialCommunityIcons name="check-circle" size={24} color="green" /></TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 }}>
                        <TextInput 
                          style={[{ flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                          placeholder={t.lawyerstab?.messagezip } value={zipCode} maxLength={5} 
                          onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} placeholderTextColor={DynamicColors.subtext} 
                        />
                        <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 48, height: 48 }}>
                          <LinearGradient colors={isZipValid ? orangeGradient : ['#CFD8DC', '#B0BEC5']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                            {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                        {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {t.lawyerstab?.resultdomore || 'resultados'}</ThemedText>}
                        {isFilteredByMap && (
                          <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accent }}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accent} />
                            <ThemedText style={{ color: DynamicColors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.lawyerstab?.viewallresults || 'Ver todos'}`}</ThemedText>
                          </TouchableOpacity>
                        )}
                        {results.map((store) => <StoreCard key={store.id} store={store} />)}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border, position: 'relative' }}>
                      <MapComponent 
                        mapRef={mapRef} 
                        userLocation={userLocation} 
                        showMarkers={showMarkers} 
                        dataSource={showMarkers ? results : []} 
                        mapKey={mapKey} 
                        onMarkerPress={handleMarkerSelection} 
                        onZoom={handleZoom}
                        showsUserLocation={true}
                      />
                      {isWeb && (
                        <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 30, borderWidth: 1, borderColor: DynamicColors.border, zIndex: 99, elevation: 99 }}>
                          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={DynamicColors.text} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB para Sugerir Negocio (UNIVERSAL) */}
      <TouchableOpacity style={{ position: 'absolute', right: 20, bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <MaterialCommunityIcons name="store-plus-outline" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}