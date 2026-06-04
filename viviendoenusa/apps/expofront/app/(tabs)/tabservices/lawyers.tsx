import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, ActivityIndicator, Image, Linking as RNLinking, Alert,
  Modal, KeyboardAvoidingView, ColorValue
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { getContentCardStyles } from 'app/src/styles/contentcommunity';
import MapComponent from '@/components/Map';

import badWordsData from '../../../utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

// 📡 URL BASE FIJA Y SEGURA CON TU IP CONFIRMADA 
const API_BASE_URL = 'http://172.20.10.3:3000/lawyers';

const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

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
        <TextInput value={comment} onChangeText={setComment} placeholder="Escribe tu opinión..." placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} multiline style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
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
  'Pro Bono': { lib: MaterialCommunityIcons, name: 'hand-heart' },
  'Civil': { lib: MaterialCommunityIcons, name: 'scale-balance' },
  'Bienes Raíces': { lib: MaterialCommunityIcons, name: 'home-city' },
  'Default': { lib: MaterialCommunityIcons, name: 'scale-balance' }
};

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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null); 
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

  const orangeGradient: readonly [ColorValue, ColorValue] = ['#FF5F6D', '#FFC371'];
  const disabledGradient: readonly [ColorValue, ColorValue] = isDark ? ['#333333', '#444444'] : ['#dddddd', '#cccccc'];

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#455A64', 
    accent: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', 
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  const [zipCode, setZipCode] = useState('');
  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) ? t.lawyerstab.practiceAreas : ['Todas', 'General', 'Inmigración', 'Familia', 'Accidentes', 'Laboral', 'Criminal', 'Pro Bono', 'Civil', 'Bienes Raíces'];
  
  const allFilterText = PRACTICE_AREAS[0] || 'Todas';
  const [selectedArea, setSelectedArea] = useState(allFilterText);
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const [selectedLawyer, setSelectedLawyer] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  
  const [pendingLawyers, setPendingLawyers] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const isZipValid = zipCode.length === 5;
  const currentUserId = "baeb641a-3fa4-4fef-9846-d75947d1bca9";

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

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

  const handleSearch = async (forcedArea?: string, forcedZip?: string) => {
    const areaToSearch = typeof forcedArea === 'string' ? forcedArea : selectedArea;
    const zipToSearch = typeof forcedZip === 'string' ? forcedZip : zipCode;
    
    if (zipToSearch.length !== 5) return;
    
    setLoading(true);
    setIsFilteredByMap(false);
    try {
      const geo = await Location.geocodeAsync(zipToSearch);
      const lat = geo.length > 0 ? geo[0].latitude : 34.0668;
      const lng = geo.length > 0 ? geo[0].longitude : -117.5783;
      const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
      setUserLocation(newCoords);
      setShowMarkers(true);
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);

      const response = await fetch(`${API_BASE_URL}?zip=${zipToSearch}`); 
      const apiData = await response.json();

      const transformedData = Array.isArray(apiData) ? apiData.map((item: any) => {
        const latNumber = item.lat ? Number(item.lat) : 34.0668;
        const lngNumber = item.lng ? Number(item.lng) : -117.6115;

        return {
          id: item.id,
          name: item.nameLawy || 'Sin nombre', 
          area: item.area || 'General',
          rating: item.totalRating !== undefined ? Number(item.totalRating) : (Number(item.rating) || 5.0),
          
          lat: latNumber, 
          lng: lngNumber, 
          
          latitude: latNumber,
          longitude: lngNumber,

          phone: item.phone || '',
          image: item.image || item.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg', 
          reviews: Array.isArray(item.rating) ? item.rating : [], 
          status: item.approved ? 'approved' : 'pending'
        };
      }) : [];

      let filtered = (areaToSearch === allFilterText) ? [...transformedData] : transformedData.filter(l => l.area === areaToSearch);
      filtered.sort((a, b) => getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng));
      
      setLocalData(transformedData);
      setResults(filtered);
      setMapKey(k => k + 1);
    } catch (e) { 
      if(!isWeb) Alert.alert("Error", t.lawyerstab?.zipnofound || "No se encontró el ZIP"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleMarkerSelection = (lawyer: any) => {
    setResults([lawyer]);
    setIsFilteredByMap(true);
    const region = { latitude: lawyer.lat, longitude: lawyer.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const openDirections = (lawyer: any) => {
    const label = encodeURIComponent(lawyer.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lawyer.lat},${lawyer.lng}`,
      android: `geo:0,0?q=${lawyer.lat},${lawyer.lng}(${label})`,
      web: `http://googleusercontent.com/maps.google.com/?q=${lawyer.lat},${lawyer.lng}`
    });
    if (url) RNLinking.openURL(url);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishLawyer = async () => {
    if (!formName.trim() || !formAddress.trim() || formZip.length < 5 || !formPhone.trim()) {
      const msg = "Debes completar todos los campos obligatorios.";
      return isWeb ? window.alert(msg) : Alert.alert("Atención", msg);
    }
    setIsPublishing(true);

    try {
      let finalImageName = null; 

      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          const title = "Error";
          const desc = "Imagen inválida o inapropiada";
          if (isWeb) { window.alert(`${title}\n${desc}`); } 
          else { Alert.alert(title, desc); }
          return;
        }

        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('imagen', { 
          uri: formImage,
          name: filename, 
          type: type 
        } as any);

        console.log("📤 Enviando imagen al optimizador dinámico...");
        
        const uploadResponse = await fetch('http://172.20.10.3:3000/api/subir-imagen-optimizada/lawyers', {
          method: 'POST',
          body: formData,
          headers: { 
            'Accept': 'application/json'
          },
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Error al subir la imagen a la nube.");
        }

        finalImageName = uploadData.identificadorArchivo; 
      }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '+1000000000';
      
      // 🚀 CONVERSIÓN ESTRICTA DE DIRECCIÓN A COORDENADAS
      let finalLat = null;
      let finalLng = null;

      try {
        const geoResult = await Location.geocodeAsync(`${formAddress}, ${formZip}`);
        if (geoResult.length > 0) {
          finalLat = geoResult[0].latitude;
          finalLng = geoResult[0].longitude;
        } else {
          // Intento secundario solo con el Zip Code
          const zipResult = await Location.geocodeAsync(formZip);
          if (zipResult.length > 0) {
             finalLat = zipResult[0].latitude;
             finalLng = zipResult[0].longitude;
          }
        }
      } catch (error) {
        console.log("Error al geocodificar la dirección");
      }

      // 🚨 VALIDACIÓN ESTRICTA: Si no se encontraron coordenadas, detenemos el proceso
      if (finalLat === null || finalLng === null) {
        setIsPublishing(false);
        const title = "Dirección inválida";
        const desc = "No pudimos ubicar la dirección o código postal en el mapa. Por favor, verifícalos e intenta de nuevo.";
        if (isWeb) { window.alert(`${title}\n${desc}`); } 
        else { Alert.alert(title, desc); }
        return; 
      }

      const newEntryPayload = {
        nameLawy: formName, 
        area: PRACTICE_AREAS[formCategoryIdx] || PRACTICE_AREAS[1],
        address: formAddress,
        zip: formZip, 
        imageUrl: finalImageName || 'https://randomuser.me/api/portraits/lego/1.jpg',
        lat: finalLat, 
        lng: finalLng, 
        phone: fullPhone, 
        userId: currentUserId,
        approved: false
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntryPayload)
      });

      const savedFromDB = await response.json();
      
      const normalizedPending = {
        ...savedFromDB,
        name: savedFromDB.nameLawy,
        image: formImage || 'https://randomuser.me/api/portraits/lego/1.jpg',
        rating: 5.0,
        reviews: [],
        status: 'pending'
      };

      setPendingLawyers([normalizedPending, ...pendingLawyers]);
      
      const success = "Revisaremos la información para agregar al profesional a la red.";
      isWeb ? window.alert(success) : Alert.alert("Solicitud Enviada", success);
      
      setModalVisible(false);
      setFormName(''); setFormAddress(''); setFormZip(''); setFormPhone(''); setFormImage(null); setFormCategoryIdx(1);

    } catch (err: any) {
      console.error("❌ [ERROR DETECTADO EN FORMULARIO]:", err?.message || err);
      
      const errorTitle = "Error de red";
      const errorDesc = "No se pudo enviar la solicitud.";
      if (isWeb) { window.alert(`${errorTitle}\n${errorDesc}`); } 
      else { Alert.alert(errorTitle, errorDesc); }
    } finally {
      setIsPublishing(false);
    }
  };

  const approveLawyer = async (lawyer: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${lawyer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }) 
      });

      if (!response.ok) throw new Error("Fallo al actualizar en el servidor");

      const approvedLawyer = { ...lawyer, status: 'approved' };
      
      setLocalData(prev => [approvedLawyer, ...prev]); 
      if (showMarkers) { setResults(prev => [approvedLawyer, ...prev]); }
      
      setPendingLawyers(pendingLawyers.filter(s => s.id !== lawyer.id));
      setMapKey(k => k + 1); 
      
      if (!isWeb && mapRef.current) {
          mapRef.current.animateToRegion({ 
            latitude: lawyer.lat, longitude: lawyer.lng, 
            latitudeDelta: 0.02, longitudeDelta: 0.02 
          }, 1000);
      }

      const msg = "Abogado aprobado y publicado en el directorio.";
      isWeb ? window.alert(msg) : Alert.alert("Éxito", msg);

    } catch (error) {
      console.error("Error al aprobar:", error);
      const errMsg = "No se pudo aprobar al abogado en la base de datos.";
      isWeb ? window.alert(errMsg) : Alert.alert("Error de conexión", errMsg);
    }
  };

  const rejectLawyer = (id: number) => {
    setPendingLawyers(pendingLawyers.filter(l => l.id !== id));
  };

  const LawyerCard = ({ lawyer }: { lawyer: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    const isPending = lawyer.status === 'pending';

    const safeRating = Number(lawyer.rating);
    const displayRating = isNaN(safeRating) ? "5.0" : safeRating.toFixed(1);

    return (
      <View style={[styles.lawyerCard, { flexDirection: 'column', padding: 15, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', marginBottom: 12, borderRadius: 20, borderWidth: 1, borderBottomColor: isPending ? '#FFB74D' : Colors.border, borderColor: isPending ? '#FFB74D' : Colors.border, shadowOpacity: 0, elevation: 0 }]}>
        
        {isPending && (
          <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 8, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#FFB74D" />
              <ThemedText style={{ color: '#FFB74D', fontSize: 11, fontWeight: 'bold', marginLeft: 8 }}>Pendiente de aprobación</ThemedText>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={{ uri: lawyer.image }} style={{ width: 60, height: 60, borderRadius: 30 }} />
          <View style={{flex: 1, marginLeft: 15}}>
            <ThemedText style={{fontWeight: '800', fontSize: 16, color: Colors.text}}>{lawyer.name}</ThemedText>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
              <ThemedText style={{color: Colors.text, fontSize: 13, fontWeight: '600', marginLeft: 4}}>
                {displayRating}
              </ThemedText>
              {dist !== null && <ThemedText style={{color: Colors.accent, fontSize: 13, fontWeight: '700'}}> • {dist} mi</ThemedText>}
            </View>
            <ThemedText style={{fontSize: 13, color: Colors.subtext, fontWeight: '800', marginTop: 4}}>{lawyer.area}</ThemedText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15, opacity: isPending ? 0.4 : 1 }}>
          <TouchableOpacity onPress={() => !isPending && setSelectedLawyer(lawyer)} disabled={isPending} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0' }}>
             <MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} />
             <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>{t.lawyerstab?.reviews}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => !isPending && openDirections(lawyer)} disabled={isPending} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
            <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
            <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>{t.lawyerstab?.route}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => !isPending && RNLinking.openURL(`tel:${lawyer.phone}`)} disabled={isPending} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}>
            <MaterialCommunityIcons name="phone" size={18} color={isDark ? '#FFB74D' : '#EF6C00'} />
            <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>{t.lawyerstab?.call}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* MODAL REVIEW */}
      <Modal visible={!!selectedLawyer} transparent animationType="slide">
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
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
                    {selectedLawyer?.reviews?.map((r: any) => (
                       <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                         <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                           {[1, 2, 3, 4, 5].map((s) => (
                             <MaterialCommunityIcons key={s} name="star" size={14} color={s <= (r.rating || r.stars || 5) ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                           ))}
                         </View>
                         <ThemedText style={{ color: Colors.text, fontSize: 14 }}>{r.comment || r.review}</ThemedText>
                       </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <ReviewForm 
                    isDark={isDark} 
                    t={t} 
                    onCancel={() => setShowReviewInput(false)} 
                    onPublish={async (ratingNum: number, commentStr: string) => { 
                        try {
                          const ratingPayload = {
                            referenceId: selectedLawyer.id,
                            typeEntry: 'lawyer',
                            rating: ratingNum,
                            review: commentStr,
                            userId: "baeb641a-3fa4-4fef-9846-d75947d1bca9"
                          };

                          const res = await fetch(`${API_BASE_URL}/rating`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(ratingPayload)
                          });
                          const fromDB = await res.json();

                          const newReview = { 
                            id: fromDB.id || Date.now().toString(), 
                            rating: Number(ratingNum),
                            stars: Number(ratingNum), 
                            comment: commentStr, 
                            review: commentStr 
                          }; 
                          
                          const updatedReviews = [newReview, ...(selectedLawyer.reviews || [])];

                          const totalStars = updatedReviews.reduce((sum, r) => sum + (Number(r.rating) || Number(r.stars) || 5), 0);
                          const newAverageRating = updatedReviews.length > 0 ? (totalStars / updatedReviews.length) : 5;

                          const updatedLawyer = {
                            ...selectedLawyer,
                            reviews: updatedReviews,
                            rating: newAverageRating
                          };

                          setSelectedLawyer(updatedLawyer); 
                          setLocalData(prev => prev.map(l => l.id === selectedLawyer.id ? updatedLawyer : l)); 
                          setResults(prev => prev.map(l => l.id === selectedLawyer.id ? updatedLawyer : l));   

                        } catch (err) {
                          console.log(err);
                        } finally {
                          setShowReviewInput(false); 
                        }
                    }} 
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL CREAR ABOGADO */}
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <ThemedText style={{fontSize: 20, fontWeight:'bold'}}>Sugerir Abogado</ThemedText>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                
                <TouchableOpacity onPress={pickImage} style={{ height: 120, width: 120, alignSelf: 'center', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border, overflow: 'hidden', backgroundColor: Colors.inputBg }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} color={Colors.text} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 4 }}>{t.genericbtn.photo}</ThemedText></View>}
                </TouchableOpacity>
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8,textTransform:'capitalize'}}>Área de Práctica</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6, marginBottom: 14 }}>
                  {PRACTICE_AREAS.map((area, index) => {
                    if (index === 0) return null; 
                    const isActive = formCategoryIdx === index;
                    const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <iconInfo.lib name={iconInfo.name} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'capitalize' }}>{area}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                            <iconInfo.lib name={iconInfo.name} size={14} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'capitalize' }}>{area}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder="Nombre del Abogado / Firma" placeholderTextColor={Colors.subtext} value={formName} onChangeText={setFormName} />
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder="Dirección del Despacho" placeholderTextColor={Colors.subtext} value={formAddress} onChangeText={setFormAddress} />
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder="Código Postal" placeholderTextColor={Colors.subtext} value={formZip} onChangeText={setFormZip} keyboardType="numeric" maxLength={5} />
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform: 'capitalize' }}>Teléfono de Oficina</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 15, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(0)} 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: Colors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: Colors.text }}>{COUNTRIES[countryIdx].code}</ThemedText>
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    placeholderTextColor={Colors.subtext}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: Colors.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <TouchableOpacity onPress={handlePublishLawyer} disabled={isPublishing} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{t.genericbtn.sendsuggestion}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[localStyles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={localStyles.cardContent}>
              
              <View style={[localStyles.headerRow, { marginBottom: 15, alignItems: 'center', justifyContent: 'space-between' }]}>
                
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 5 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} />
                </TouchableOpacity>

                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  flex: 1,
                  maxWidth: 220, 
                  marginHorizontal: 10
                }}>
                  <TextInput 
                    style={[{ 
                      flex: 1, 
                      height: 40, 
                      borderRadius: 12, 
                      paddingHorizontal: 14, 
                      fontSize: 14,
                      color: Colors.text, 
                      backgroundColor: Colors.inputBg, 
                      borderColor: Colors.border, 
                      borderWidth: 1, 
                      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) 
                    }]} 
                    placeholder="Zip Code..." 
                    keyboardType="numeric" 
                    maxLength={5} 
                    value={zipCode} 
                    onChangeText={(text) => {
                      setZipCode(text);
                      if (text.length < 5) {
                        if (results.length > 0 || localData.length > 0) {
                            setResults([]);
                            setLocalData([]);
                            setShowMarkers(false);
                            setIsFilteredByMap(false);
                        }
                      } else if (text.length === 5) {
                        handleSearch(selectedArea, text); 
                      }
                    }} 
                    onSubmitEditing={() => isZipValid && handleSearch(selectedArea, zipCode)} 
                    placeholderTextColor={Colors.subtext} 
                  />
                  <TouchableOpacity 
                    onPress={() => handleSearch(selectedArea, zipCode)} 
                    disabled={!isZipValid} 
                    style={{ width: 40, height: 40, marginLeft: 6 }}
                  >
                    <LinearGradient 
                      colors={isZipValid ? orangeGradient : disabledGradient} 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
                    >
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={18} color={isZipValid ? "#fff" : Colors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setLocalData([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={Colors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => setIsAdminMode(!isAdminMode)}>
                     <MaterialCommunityIcons name="scale-balance" size={32} color={isAdminMode ? Colors.accent : Colors.text} style={{opacity: isAdminMode ? 1 : 0.2}} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  
                  {isAdminMode && pendingLawyers.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>{t.genericbtn.tittleReview} ({pendingLawyers.length})</ThemedText>
                      {pendingLawyers.map(lawyer => (
                        <View key={lawyer.id} style={{ marginBottom: 15 }}>
                           <LawyerCard lawyer={lawyer} />
                           <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -10, zIndex: 10, paddingRight: 15, gap: 10 }}>
                             <TouchableOpacity onPress={() => rejectLawyer(lawyer.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                               <MaterialCommunityIcons name="close-circle" size={16} color="#FFF" />
                               <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>{t.genericbtn.rejectbtn}</ThemedText>
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => approveLawyer(lawyer)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                               <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                               <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>{t.genericbtn.aprovedbtn}</ThemedText>
                             </TouchableOpacity>
                           </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {PRACTICE_AREAS.map((area) => {
                       const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                       const isActive = selectedArea === area;
                       return (
                        <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area); }} style={{ marginRight: 8, borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                          {isActive ? (
                            <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                              <iconInfo.lib name={iconInfo.name} size={14} color="#FFF" style={{ marginRight: 8 }} />
                              <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{area}</ThemedText>
                            </LinearGradient>
                          ) : (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.categoryUnselected }}>
                              <iconInfo.lib name={iconInfo.name} size={14} color={Colors.iconInactive} style={{ marginRight: 8 }} />
                              <ThemedText style={{ color: Colors.iconInactive, fontSize: 13, fontWeight: '600' }}>{area}</ThemedText>
                            </View>
                          )}
                        </TouchableOpacity>
                       );
                    })}
                  </ScrollView>

                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' }}>
                    <MapComponent 
                      mapRef={mapRef} 
                      userLocation={userLocation} 
                      showMarkers={showMarkers} 
                      onZoom={handleZoom} 
                      dataSource={results.length > 0 ? results : []} 
                      mapKey={mapKey} 
                      onMarkerPress={handleMarkerSelection} 
                      showsUserLocation={true}
                    />
                    {isWeb && (
                      <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 15, right: 15, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: Colors.border, zIndex: 99, elevation: 99 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {(!zipCode || zipCode.length < 5) ? (
                    <View style={{ alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        <MaterialCommunityIcons name="map-marker-radius" size={40} color={Colors.subtext} />
                      </View>
                      <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                        {t.lawyerstab.messageNoemptytitle}
                      </ThemedText>
                      <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                        {t.lawyerstab.messageNoempty}
                      </ThemedText>
                    </View>
                  ) : localData.length === 0 && !loading ? (
                    <View style={{ alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        <MaterialCommunityIcons name="scale-balance" size={40} color={Colors.subtext} />
                      </View>
                      <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
                        {t.lawyerstab.messageNodatatitle}
                      </ThemedText>
                      <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                        {t.lawyerstab.messageNodata}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={{ marginTop: 20 }}>
                      {results.length > 0 && <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? t.genericbtn?.resultdomore : t.genericbtn?.resultone)} </ThemedText>}
                      {isFilteredByMap && (
                        <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(selectedArea, zipCode); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.accent }}>
                          <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} />
                          <ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.genericbtn?.viewallresults }`}</ThemedText>
                        </TouchableOpacity>
                      )}
                      {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                    </View>
                  )}
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
                          <TouchableOpacity key={area} onPress={() => { setSelectedArea(area); if(isZipValid) handleSearch(area, zipCode); }} style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                            {isActive ? (
                              <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <iconData.lib name={iconData.name} size={18} color="#FFF" style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{area}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: Colors.categoryUnselected }}>
                                <iconData.lib name={iconData.name} size={18} color={Colors.iconInactive} style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 14 }}>{area}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      
                      {isAdminMode && pendingLawyers.length > 0 && (
                        <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                          <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>REVISIÓN ({pendingLawyers.length})</ThemedText>
                          {pendingLawyers.map(lawyer => (
                            <View key={lawyer.id} style={{ marginBottom: 15 }}>
                               <LawyerCard lawyer={lawyer} />
                               <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -10, zIndex: 10, paddingRight: 15, gap: 10 }}>
                                 <TouchableOpacity onPress={() => rejectLawyer(lawyer.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                   <MaterialCommunityIcons name="close-circle" size={16} color="#FFF" />
                                   <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Rechazar</ThemedText>
                                 </TouchableOpacity>
                                 <TouchableOpacity onPress={() => approveLawyer(lawyer)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                                   <MaterialCommunityIcons name="check-circle" size={16} color="#FFF" />
                                   <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Aprobar</ThemedText>
                                 </TouchableOpacity>
                               </View>
                            </View>
                          ))}
                        </View>
                      )}
                      
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {(!zipCode || zipCode.length < 5) ? (
                          <View style={{ alignItems: 'center', marginTop: height * 0.1, paddingHorizontal: 30 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                              <MaterialCommunityIcons name="map-marker-radius" size={40} color={Colors.subtext} />
                            </View>
                            <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                              {t.lawyerstab.messageNoemptytitle}
                            </ThemedText>
                            <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                              {t.lawyerstab.messageNoempty}
                            </ThemedText>
                          </View>
                        ) : localData.length === 0 && !loading ? (
                          <View style={{ alignItems: 'center', marginTop: height * 0.1, paddingHorizontal: 30 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                              <MaterialCommunityIcons name="scale-balance" size={40} color={Colors.subtext} />
                            </View>
                            <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
                              {t.lawyerstab.messageNodatatitle}
                            </ThemedText>
                            <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                              {t.lawyerstab.messageNodata}
                            </ThemedText>
                          </View>
                        ) : (
                          <>
                            {results.length > 0 && <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {t.genericbtn?.resultdomore}</ThemedText>}
                            {isFilteredByMap && (
                              <TouchableOpacity onPress={() => { setIsFilteredByMap(false); handleSearch(selectedArea, zipCode); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.accent }}>
                                <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accent} />
                                <ThemedText style={{ color: Colors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.genericbtn?.viewallresults }`}</ThemedText>
                              </TouchableOpacity>
                            )}
                            {results.length > 0 ? results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />) : localData.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                          </>
                        )}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' }}>
                      <MapComponent 
                        mapRef={mapRef} 
                        userLocation={userLocation} 
                        showMarkers={showMarkers} 
                        dataSource={results.length > 0 ? results : localData} 
                        mapKey={mapKey} 
                        onMarkerPress={handleMarkerSelection} 
                        onZoom={handleZoom}
                        showsUserLocation={true}
                      />
                      {isWeb && (
                        <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 30, borderWidth: 1, borderColor: Colors.border, zIndex: 99, elevation: 99 }}>
                          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.text} />
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

      <TouchableOpacity onPress={() => setModalVisible(true)} style={[localStyles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <MaterialCommunityIcons name="scale-balance" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}