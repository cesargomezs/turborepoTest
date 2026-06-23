import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal, KeyboardAvoidingView, Share, ColorValue
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
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

const ICONS_ARRAY = ['apps', 'cart', 'baguette', 'laptop', 'storefront'];

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

// 📡 URL BASE PARA LOS NEGOCIOS/TIENDAS
const API_STORES_URL = 'http://192.168.252.243:3000/stores';
const API_TARIFFS_URL = 'http://192.168.252.243:3000/tariffs';

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const openDirections = (store: any) => {
  const label = encodeURIComponent(store.name || store.nameStores);
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${store.lat},${store.lng}`,
    android: `geo:0,0?q=${store.lat},${store.lng}(${label})`,
    web: `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`
  });
  if (url) Linking.openURL(url);
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

// --- COMPONENTE: FORMULARIO DE RESEÑA ---
const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
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
        <TextInput 
          value={comment} 
          onChangeText={setComment} 
          placeholder={t.genericlabel?.labelopinion || "Escribe tu opinión..."} 
          placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} 
          multiline 
          autoCapitalize="sentences"
          style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
        />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}>
          <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.lawyerstab?.publishBtn || 'Publicar'}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// 🚀 COMPONENTE: MODAL DE RENOVACIÓN DE TIENDA
const RenewStoreModal = memo(({ visible, onClose, onSuccess, storeToRenew, currentUserId, currentTariff, t, isDark, Colors, orangeGradient, isLargeWeb, isAndroid, isIOS }: any) => {
  const [renewRefCode, setRenewRefCode] = useState('');
  const [renewPayMethod, setRenewPayMethod] = useState('Zelle');
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenewRefCode('');
      setRenewPayMethod('Zelle');
    }
  }, [visible]);

  const handleRenewSubmit = async () => {
    if (!renewRefCode.trim()) return Alert.alert("Aviso", "Ingresa el código de confirmación de pago.");
    
    setIsRenewing(true);
    try {
      const payload = { referenceCode: renewRefCode, paymentMethod: renewPayMethod, userId: currentUserId };
      const res = await fetch(`${API_STORES_URL}/${storeToRenew.id}/renew`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      Alert.alert("Éxito", "Solicitud de renovación enviada. Será verificada pronto.");
      onSuccess();
    } catch (e) {
      Alert.alert("Error", "No se pudo procesar la renovación.");
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isRenewing && onClose()} />
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: isLargeWeb ? 400 : '90%', backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
            {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text }}>Renovar Negocio</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 14, color: Colors.text, marginBottom: 20 }}>
              Renueva la suscripción de <ThemedText style={{fontWeight: 'bold', color: Colors.accent}}>{storeToRenew?.name || storeToRenew?.nameStores}</ThemedText> realizando el pago de ${currentTariff} USD y enviando el comprobante aquí abajo.
            </ThemedText>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              {['Zelle', 'Venmo'].map((method) => (
                <TouchableOpacity key={method} onPress={() => setRenewPayMethod(method)} style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: renewPayMethod === method ? Colors.accent : Colors.border, backgroundColor: renewPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}>
                  <ThemedText style={{ fontWeight: '900', color: renewPayMethod === method ? Colors.accent : Colors.subtext }}>{method}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
              placeholder={`# CONFIRMACION DE ${renewPayMethod}...`} placeholderTextColor={Colors.subtext}
              value={renewRefCode} onChangeText={(text) => setRenewRefCode(text.toUpperCase())} autoCapitalize="characters"
            />

            <TouchableOpacity onPress={handleRenewSubmit} disabled={isRenewing}>
              <LinearGradient colors={orangeGradient} style={{ padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {isRenewing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" style={{ marginRight: 8 }} />}
                <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>Enviar Renovación</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

export default function StoresScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const params = useLocalSearchParams();
  const rawNotifId = params.id || params.storeId || params.referenceId || params.reference_id || params.openEventId;
  const notificationId = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;

  const mapRef = useRef<MapView>(null); 
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

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

  const rawCategories = t.storestab?.categoriesList;
  const CATEGORIES_LIST = Array.isArray(rawCategories) && rawCategories.length > 0
    ? rawCategories
    : ['Todas', 'Supermercado', 'Panadería', 'Electrónica', 'Otros'];

  const [zipCode, setZipCode] = useState('');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [loading, setLoading] = useState(false);
  
  const [allStores, setAllStores] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]); 
  
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [storeToRenew, setStoreToRenew] = useState<any>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);

  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');

  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [currentTariff, setCurrentTariff] = useState<string>("50.00");

  const currentUserId = userMetadata?.id || userMetadata?.userId || "baeb641a-3fa4-4fef-9846-d75947d1bca9";
  const isZipValid = zipCode.length === 5;
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const isFormValid = !!(formName.trim() && formAddress.trim() && formZip.length === 5 && formPhone.trim() && formImage && formRefCode.trim());

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormAddress(''); setFormZip(''); setFormPhone(''); 
    setCountryIdx(0); setFormImage(null); setFormCategoryIdx(1); 
    setFormRefCode(''); setFormPayMethod('Zelle'); 
  };

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Store`);
        if (res.ok) {
          const tariffsData = await res.json();
          if (tariffsData && tariffsData.length > 0 && tariffsData[0].price) {
            setCurrentTariff(tariffsData[0].price);
          }
        }
      } catch (e) {
        console.warn("⚠️ No se pudo cargar la tarifa dinámica", e);
      }
    };
    fetchTariff();
  }, []);

  const fetchStoresData = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_STORES_URL}?zip=${searchZip.trim()}&userId=${currentUserId}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameStores || item.name || 'Sin nombre',
          description: item.descriptionStores || item.description || '',
          address: item.addressStores || item.address || '',
          categoryId: item.categoryId || 0,
          zip: item.zip,
          image: item.imageStores || item.image || '',
          lat: Number(item.lat) || 34.0934,
          lng: Number(item.lng) || -117.5847,
          phone: item.phone || '',
          rating: Number(item.rating) || 0,
          reviews: Array.isArray(item.reviews) ? item.reviews : [],
          totalReviews: Number(item.totalReviews) || 0,
          status: item.approved ? 'approved' : 'pending',
          ownerName: item.ownerName,
          referenceCode: item.referenceCode,
          paymentMethod: item.paymentMethod,
          userId: item.userId || item.user_id,
          timepostEnd: item.timepostEnd || item.timepost_end
        }));

        const approved = mappedData.filter(s => s.status === 'approved');
        setAllStores(approved);
        
        if (!isAdminMode) {
          setPendingStores(mappedData.filter(s => s.status === 'pending'));
        }
        return approved;
      }
      return [];
    } catch (e) {
      console.error("Error", e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 🚀 LÓGICA DE NOTIFICACIÓN CORREGIDA (Mapeo asegurado)
  const lastProcessedNotifId = useRef<string | null>(null);

  useEffect(() => {
    if (notificationId) {
      const cleanNotifId = String(notificationId).trim();

      if (cleanNotifId !== lastProcessedNotifId.current) {
        lastProcessedNotifId.current = cleanNotifId;
        
        const localMatch = allStores.find(l => String(l.id) === cleanNotifId) || pendingStores.find(l => String(l.id) === cleanNotifId);

        if (localMatch) {
          setSelectedDetail(localMatch);
        } else {
          const fetchSpecificStore = async () => {
            try {
              const res = await fetch(`${API_STORES_URL}/${cleanNotifId}`);
              if (res.ok) {
                const data = await res.json();
                
                // 🚀 FIX CRÍTICO: Aseguramos el mapeo de variables para el Modal
                const mappedStore = {
                  ...data,
                  name: data.nameStores || data.name || 'Sin nombre',
                  address: data.addressStores || data.address || '',
                  description: data.descriptionStores || data.description || '',
                  image: data.imageStores || data.image || data.imageUrl || '',
                  lat: Number(data.lat) || 34.0934,
                  lng: Number(data.lng) || -117.5847,
                };

                setSelectedDetail(mappedStore); 

                if (data.zip && String(data.zip).length === 5) {
                  setZipCode(String(data.zip));
                  handleSearch(undefined, String(data.zip));
                }
              }
            } catch (e) {
              console.error("❌ Error Fetch notificación de Tienda:", e);
            }
          };
          fetchSpecificStore();
        }
      }
    }
  }, [notificationId]);

  const handleCloseDetailModal = () => {
    setSelectedDetail(null);
    router.setParams({ id: '', storeId: '', referenceId: '', reference_id: '', openEventId: '' });
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

  useEffect(() => {
    if (isAdminMode) {
      fetchAllPendingStores();
    } else {
      if (zipCode.length !== 5) {
        setPendingStores([]);
      } else {
        fetchStoresData(zipCode);
      }
    }
  }, [isAdminMode]);

  const applyLocalFilters = (storesList: any[], categoryIdx: number, lat: number, lng: number) => {
    let filtered = (categoryIdx === 0) ? [...storesList] : storesList.filter(l => Number(l.categoryId) === categoryIdx);
    
    filtered.sort((a, b) => {
      const aIsOwner = a.userId === currentUserId;
      const aIsExpired = a.timepostEnd ? new Date(a.timepostEnd) < new Date() : false;
      const aNeedsRenewal = aIsOwner && aIsExpired;

      const bIsOwner = b.userId === currentUserId;
      const bIsExpired = b.timepostEnd ? new Date(b.timepostEnd) < new Date() : false;
      const bNeedsRenewal = bIsOwner && bIsExpired;

      if (aNeedsRenewal && !bNeedsRenewal) return -1;
      if (!aNeedsRenewal && bNeedsRenewal) return 1;

      return getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng);
    });

    return filtered;
  };

  const fetchAllPendingStores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_STORES_URL}?userId=${currentUserId}`); 
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameStores || item.name || 'Sin nombre',
          description: item.descriptionStores || item.description || '',
          address: item.addressStores || item.address || '',
          categoryId: item.categoryId || 0,
          zip: item.zip,
          image: item.imageStores || item.image || '',
          lat: Number(item.lat) || 34.0934,
          lng: Number(item.lng) || -117.5847,
          phone: item.phone || '',
          rating: Number(item.rating) || 0,
          reviews: Array.isArray(item.reviews) ? item.reviews : [],
          totalReviews: Number(item.totalReviews) || 0,
          status: item.approved ? 'approved' : 'pending',
          ownerName: item.ownerName,
          referenceCode: item.referenceCode, 
          paymentMethod: item.paymentMethod,
          userId: item.userId || item.user_id,
          timepostEnd: item.timepostEnd || item.timepost_end
        }));
        setPendingStores(mappedData.filter(s => s.status === 'pending'));
      }
    } catch (e) {
      console.error("Error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (forcedCategoryIdx?: number, forcedZip?: string) => {
    const targetZip = forcedZip || zipCode;
    if (targetZip.length !== 5) return;

    const categoryToSearch = forcedCategoryIdx !== undefined ? forcedCategoryIdx : selectedCategoryIdx;
    setIsFilteredByMap(false);

    let lat = userLocation ? userLocation.latitude : 34.0934; 
    let lng = userLocation ? userLocation.longitude : -117.5847;

    try {
      const geo = await Location.geocodeAsync(targetZip);
      if (geo.length > 0) {
        lat = geo[0].latitude;
        lng = geo[0].longitude;
      }
    } catch (e) { }

    const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
    setUserLocation(newCoords);
    setShowMarkers(true); 
    
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);

    const approvedStores = await fetchStoresData(targetZip);
    const filtered = applyLocalFilters(approvedStores, categoryToSearch, lat, lng);
    
    setResults(filtered);
    setMapKey(k => k + 1);
  };

  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) {
      setResults([]);
      setAllStores([]);
      if (!isAdminMode) {
        setPendingStores([]);
      }
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

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIdx(index);
    if (isZipValid && allStores.length > 0) {
      const lat = userLocation ? userLocation.latitude : 34.0934;
      const lng = userLocation ? userLocation.longitude : -117.5847;
      const filtered = applyLocalFilters(allStores, index, lat, lng);
      setResults(filtered);
    } else if (isZipValid) {
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
      await Share.share({ message: t.storestab?.sharemessage + ` ${store.name || store.nameStores}\n${store.description || store.descriptionStores}` });
    } catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishStore = async () => {
    if (!isFormValid) {
      return Alert.alert("Atención", "Completar nombre, ubicación, foto y código de pago son obligatorios.");
    }
    
    setIsPublishing(true);
    try {
      let finalImageName = '';
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          return Alert.alert(t.communitytab?.imageInappropriateTittle || "Bloqueada", t.communitytab?.imageInappropriateDescription || "Imagen inválida");
        }

        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage as string);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage as string, name: filename, type } as any);
        }

        const uploadResponse = await fetch('http://192.168.252.243:3000/api/subir-imagen-optimizada/stores', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
        finalImageName = uploadData.identificadorArchivo;
      }

      let lat = 34.0934; 
      let lng = -117.5847;
      try {
        const geo = await Location.geocodeAsync(formZip);
        if (geo.length > 0) { lat = geo[0].latitude; lng = geo[0].longitude; }
      } catch (e) { }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';
      
      const payload = {
        nameStores: formName, 
        descriptionStores: formDesc, 
        addressStores: formAddress,
        categoryId: String(formCategoryIdx), 
        zip: formZip, 
        imageStores: finalImageName,
        lat: lat, 
        lng: lng, 
        phone: fullPhone, 
        userId: currentUserId,
        approved: false,
        referenceCode: formRefCode,
        paymentMethod: formPayMethod 
      };

      const response = await fetch(API_STORES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando tienda");

      const newEntryLocal = {
        id: savedFromDB.id,
        name: savedFromDB.nameStores,
        description: savedFromDB.descriptionStores,
        address: savedFromDB.addressStores,
        categoryId: savedFromDB.categoryId,
        image: formImage, 
        lat, lng,
        rating: 0,
        reviews: [],
        totalReviews: 0,
        phone: savedFromDB.phone,
        status: 'pending',
        referenceCode: formRefCode,
        paymentMethod: formPayMethod,
        userId: currentUserId,
        timepostEnd: null
      };
      
      setPendingStores([newEntryLocal, ...pendingStores]);
      setModalVisible(false);
      resetForm();
      
      if (!zipCode || zipCode.length < 5) {
        setZipCode(formZip);
        handleSearch(undefined, formZip);
      }

      Alert.alert(t.storestab?.sendnewsug || "Enviado con éxito, pendiente de aprobación");

    } catch (err: any) {
      Alert.alert("Error", err.message || "Error");
    } finally {
      setIsPublishing(false);
    }
  };

  const approveStore = async (store: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_STORES_URL}/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      if (!response.ok) throw new Error("Error en servidor");
      
      const updatedStoreFromServer = await response.json();
      
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + durationMonths);

      const approvedStore = { 
        ...store, 
        ...updatedStoreFromServer,
        status: 'approved',
        timepostEnd: updatedStoreFromServer.timepostEnd || updatedStoreFromServer.timepost_end || futureDate.toISOString() 
      };
      
      if (store.zip === zipCode) {
        const newAllStores = [approvedStore, ...allStores.filter(s => s.id !== store.id)];
        setAllStores(newAllStores); 
        
        if (showMarkers || isZipValid) {
          const lat = userLocation ? userLocation.latitude : 34.0934;
          const lng = userLocation ? userLocation.longitude : -117.5847;
          const filtered = applyLocalFilters(newAllStores, selectedCategoryIdx, lat, lng);
          setResults(filtered);
        }
        setMapKey(k => k + 1);
      }
      
      setPendingStores(pendingStores.filter(s => s.id !== store.id));
      Alert.alert("Aprobado", `El negocio ha sido aprobado exitosamente por ${durationMonths} meses.`);
    } catch (error) {
      Alert.alert("Error", "No se pudo aprobar.");
    }
  };

  const rejectStore = async (id: number) => {
    try {
      const response = await fetch(`${API_STORES_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Error en servidor");
      setPendingStores(pendingStores.filter(e => e.id !== id));
      Alert.alert("Rechazado", "Negocio eliminado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo rechazar.");
    }
  };

  const StoreCard = ({ store, renderAdminControls }: { store: any, renderAdminControls?: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, store.lat, store.lng) : null;
    const categoryName = CATEGORIES_LIST[store.categoryId] || 'Otros';
    const isPending = store.status === 'pending';
    const isOwner = store.userId === currentUserId;
    
    const isExpired = (store.timepostEnd && new Date(store.timepostEnd).getFullYear() > 1970) 
        ? new Date(store.timepostEnd) < new Date() 
        : false;
    
    const fadeCard = isExpired && !isPending;

    const safeRating = Number(store.rating) || 0;
    const displayRating = safeRating > 0 ? safeRating.toFixed(1) : "Nuevo";

    const reviewCount = store.reviews?.length || store.totalReviews || 0;
    let formattedCount = reviewCount.toString();
    if (reviewCount >= 1000) {
      formattedCount = (reviewCount / 1000).toFixed(1) + 'k';
    }

    const cardBgColor = isPending 
      ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.9)')
      : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)');

    return (
      <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: cardBgColor, borderColor: (isPending || isExpired) ? '#FFB74D' : DynamicColors.border }}>
        
        {isPending && isOwner && (
          <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" />
            <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>En revisión. Será publicado pronto.</ThemedText>
          </View>
        )}

        {isOwner && isExpired && !isPending && (
          <View style={{ backgroundColor: 'rgba(255, 82, 82, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 82, 82, 0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#FF5252" />
              <ThemedText style={{ color: '#FF5252', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>Tu publicación ha expirado.</ThemedText>
            </View>
            <TouchableOpacity onPress={() => { setStoreToRenew(store); setRenewModalVisible(true); }} style={{ backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 10 }}>
              <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>Renovar</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{categoryName.toUpperCase()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{displayRating}</ThemedText>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(store)} style={{ width: '100%', height: 140, opacity: fadeCard ? 0.6 : 1 }}>
          {store.image && store.image.length > 5 ? (
            <Image source={{ uri: store.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: isDark ? '#333' : '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="image-off-outline" size={40} color={DynamicColors.subtext} />
            </View>
          )}
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
            <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Ver detalle</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={{ padding: 15, opacity: fadeCard ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{store.name || store.nameStores}</ThemedText>
            {dist !== null && <ThemedText style={{ color: '#FF5F6D', fontSize: 13, fontWeight: '700' }}>{dist} mi</ThemedText>}
          </View>
          {(store.address || store.addressStores) && (
             <ThemedText style={{ fontSize: 13, color: '#FF5F6D', fontWeight: 'bold', marginTop: 4 }}>
                 <MaterialCommunityIcons name="map-marker-outline" size={12}/> {store.address || store.addressStores}
             </ThemedText>
          )}
          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 6 }} numberOfLines={isPending ? undefined : 2}>{store.description || store.descriptionStores}</ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15, opacity: isPending ? 0.4 : 1 }}>
            <TouchableOpacity onPress={() => !isPending && setSelectedStore(store)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5' }}>
               <MaterialCommunityIcons name="comment-text-outline" size={17} color={isDark ? '#FFF' : '#444'} />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>
                  Reseñas {reviewCount > 0 ? `(${formattedCount})` : ''}
               </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && openDirections(store)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
              <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>Cómo llegar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && Linking.openURL(`tel:${store.phone}`)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}>
              <MaterialCommunityIcons name="phone" size={17} color={isDark ? '#FFB74D' : '#EF6C00'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>Llamar</ThemedText>
            </TouchableOpacity>
          </View>

          {renderAdminControls && renderAdminControls()}
        </View>
      </View>
    );
  };

  const PendingStoreItem = ({ store }: { store: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    
    const adminControls = () => (
      <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15 }}>
        <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.5)' }}>
           <MaterialCommunityIcons name="bank-transfer" size={18} color="#FFB74D" />
           <ThemedText style={{ fontSize: 12, color: DynamicColors.text, fontWeight: '600', marginLeft: 8 }}>
              Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{store.referenceCode || 'N/A'}</ThemedText> ({store.paymentMethod || 'Pago'})
           </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {[1, 3, 6, 12].map(m => (
            <TouchableOpacity key={m} onPress={() => setSelectedMonths(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedMonths === m ? '#4CAF50' : DynamicColors.inputBg }}>
               <ThemedText style={{color: selectedMonths === m ? '#FFF' : DynamicColors.text, fontWeight: 'bold', fontSize: 12}}>{m}M</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => rejectStore(store.id)} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Rechazar</ThemedText></TouchableOpacity>
          <TouchableOpacity onPress={() => approveStore(store, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Aprobar</ThemedText></TouchableOpacity>
        </View>
      </View>
    );

    return <StoreCard store={store} renderAdminControls={adminControls} />;
  };

  return (
    <View style={stylesUnified.container}>

      {/* MODAL DE RENOVACIÓN */}
      <RenewStoreModal 
        visible={renewModalVisible} 
        onClose={() => setRenewModalVisible(false)} 
        onSuccess={() => { setRenewModalVisible(false); handleSearch(); }} 
        storeToRenew={storeToRenew} currentUserId={currentUserId} currentTariff={currentTariff} 
        t={t} isDark={isDark} Colors={DynamicColors} orangeGradient={orangeGradient} 
        isLargeWeb={isLargeWeb} isAndroid={isAndroid} isIOS={isIOS} 
      />

      {/* MODAL DETALLE */}
      <Modal visible={!!selectedDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseDetailModal} />
          
          <View style={{ width: '90%', height: '75%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240 }}>
               {selectedDetail?.image && selectedDetail?.image.length > 5 ? (
                 <Image source={{ uri: selectedDetail?.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
               ) : (
                 <View style={{ width: '100%', height: '100%', backgroundColor: isDark ? '#333' : '#E0E0E0', justifyContent: 'center', alignItems: 'center' }}>
                   <MaterialCommunityIcons name="image-off-outline" size={40} color={DynamicColors.subtext} />
                 </View>
               )}
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
               <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="share-variant" size={22} color="#FFF" /></TouchableOpacity>
               
               <TouchableOpacity onPress={handleCloseDetailModal} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}>
                 <MaterialCommunityIcons name="close" size={24} color="#FFF" />
               </TouchableOpacity>
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
                    <ThemedText style={{ marginLeft: 5, fontWeight: '900', color: DynamicColors.text, fontSize: 16 }}>
                      {selectedDetail?.rating > 0 ? selectedDetail.rating.toFixed(1) : "Nuevo"}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: DynamicColors.text }}>
                    {selectedDetail?.name || selectedDetail?.nameStores || 'Sin nombre'}
                </ThemedText>
                {(selectedDetail?.address || selectedDetail?.addressStores) && (
                    <ThemedText style={{ color: '#FF5F6D', fontWeight:'700', marginBottom:10 }}>
                        {selectedDetail?.address || selectedDetail?.addressStores}
                    </ThemedText>
                )}
                <View style={{height:1, backgroundColor:DynamicColors.border, marginVertical:20}} />
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 20 }}>
                    {selectedDetail?.description || selectedDetail?.descriptionStores}
                </ThemedText>

                {isAdminMode && selectedDetail?.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => { rejectStore(selectedDetail.id); handleCloseDetailModal(); }} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#FFF" />
                            <ThemedText style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>Rechazar</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { approveStore(selectedDetail, 1); handleCloseDetailModal(); }} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" />
                            <ThemedText style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>Aprobar</ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
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
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: DynamicColors.text }}>{selectedStore?.name || selectedStore?.nameStores}</ThemedText>
                    <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800' }}>{t.storestab?.commutnityopini || 'Opiniones'}</ThemedText>
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
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.storestab?.writingreview || 'Escribir reseña'}</ThemedText>
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
                    onPublish={async (ratingNum: number, commentStr: string) => { 
                       try {
                         const reviewPayload = {
                           reference_id: selectedStore.id,
                           stars: ratingNum,
                           comment: commentStr,
                           userId: currentUserId
                         };

                         const res = await fetch(`${API_STORES_URL}/reviews`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify(reviewPayload)
                         });

                         if (!res.ok) throw new Error();
                         const fromDB = await res.json();

                         const newReviewFormatted = { 
                           id: fromDB.id || Date.now().toString(), 
                           stars: Number(ratingNum), 
                           comment: commentStr 
                         };

                         const updatedReviews = [newReviewFormatted, ...(selectedStore.reviews || [])];
                         const totalStars = updatedReviews.reduce((sum, r) => sum + r.stars, 0);
                         const newAverage = updatedReviews.length > 0 ? (totalStars / updatedReviews.length) : 0;

                         const updatedStoreObj = {
                           ...selectedStore,
                           reviews: updatedReviews,
                           rating: newAverage,
                           totalReviews: updatedReviews.length
                         };

                         setSelectedStore(updatedStoreObj);
                         setResults(prev => prev.map(s => s.id === selectedStore.id ? updatedStoreObj : s));
                         setAllStores(prev => prev.map(s => s.id === selectedStore.id ? updatedStoreObj : s));

                         Alert.alert("¡Gracias!", "Tu reseña ha sido publicada exitosamente.");
                       } catch (e) {
                         Alert.alert("Error", "No se pudo conectar al servidor.");
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
                <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 8 }}>{t.storestab?.textphoto || 'FOTO'}</ThemedText></View>}
                </TouchableOpacity>
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8,textTransform:'none'}}>{t.storestab?.category || 'Categoría'}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6, marginBottom: 14 }}>
                  {CATEGORIES_LIST.map((cat, index) => {
                    if (index === 0) return null; 
                    const isActive = formCategoryIdx === index;
                    const iconName = ICONS_ARRAY[index] || 'storefront'; 
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'none' }}>{cat}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'none' }}>{cat}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholderTextColor={DynamicColors.subtext} 
                  placeholder={t.storestab?.placeHoldname || 'Nombre'} 
                  value={formName} 
                  onChangeText={setFormName} 
                  autoCapitalize="words" 
                />
                
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholderTextColor={DynamicColors.subtext} 
                  placeholder={t.storestab?.placeHoldAddress || 'Dirección'} 
                  value={formAddress} 
                  onChangeText={setFormAddress} 
                  autoCapitalize="words" 
                />
                
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholderTextColor={DynamicColors.subtext} 
                  placeholder={t.storestab?.messagezip || 'Código Postal'} 
                  value={formZip} 
                  onChangeText={setFormZip} 
                  keyboardType="numeric" 
                  maxLength={5} 
                />
                
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, height: 90, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholderTextColor={DynamicColors.subtext} 
                  placeholder={t.storestab?.description || 'Descripción'} 
                  value={formDesc} 
                  onChangeText={setFormDesc} 
                  multiline 
                  autoCapitalize="sentences" 
                />
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform:'none'  }}>{t.storestab?.phoneContacto || 'Teléfono'}</ThemedText>
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

                <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: DynamicColors.border }}>
                  <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: DynamicColors.accent }}>Verificación de Pago</ThemedText>
                  
                  <ThemedText style={{ fontSize: 15, marginBottom: 15, lineHeight: 18, color: DynamicColors.text }}>
                    Para promocionar tu negocio, realiza el pago de <ThemedText style={{fontWeight:'900', color: DynamicColors.accent}}>${currentTariff} USD</ThemedText> mediante Zelle o Venmo y escribe el código de confirmación aquí abajo.
                  </ThemedText>
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    {['Zelle', 'Venmo'].map((method) => (
                      <TouchableOpacity 
                        key={method}
                        onPress={() => setFormPayMethod(method)} 
                        style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: formPayMethod === method ? DynamicColors.accent : DynamicColors.border, backgroundColor: formPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : DynamicColors.inputBg }}
                      >
                        <ThemedText style={{ fontWeight: '900', color: formPayMethod === method ? DynamicColors.accent : DynamicColors.subtext }}>{method}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput 
                    style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    placeholder={`# CONFIRMACION DE ${formPayMethod}...`} 
                    placeholderTextColor={DynamicColors.subtext}
                    value={formRefCode} 
                    onChangeText={(text) => setFormRefCode(text.toUpperCase())} 
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity onPress={handlePublishStore} disabled={!isFormValid || isPublishing} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <><MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{t.storestab?.sendbutton || 'Enviar'}</ThemedText></>}
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
              
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder={t.lawyerstab?.messagezip || "Código postal..."} 
                    keyboardType="numeric" maxLength={5} value={zipCode} 
                    onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} 
                    placeholderTextColor={DynamicColors.subtext} 
                  />
                  <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={isZipValid ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={isZipValid ? "#fff" : DynamicColors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setAllStores([]); setPendingStores([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={DynamicColors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => { setIsAdminMode(!isAdminMode); }}>
                    <MaterialCommunityIcons name="store-plus-outline" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.2, marginLeft: 5}} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
                  
                  {isAdminMode && pendingStores.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>Negocios por Verificar ({pendingStores.length})</ThemedText>
                      {pendingStores.map(store => (
                        <PendingStoreItem key={store.id} store={store} />
                      ))}
                    </View>
                  )}

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
                    {results.length > 0 ? (
                      <>
                        <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? t.genericbtn?.resultdomore || 'resultados' : t.genericbtn?.resultone || 'resultado')}</ThemedText>
                        {isFilteredByMap && (
                          <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accenticon }}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accenticon} />
                            <ThemedText style={{ color: DynamicColors.accenticon, fontWeight: '800', fontSize: 13 }}>{`  ${t.genericbtn?.viewallresults || 'Ver todos'}`}</ThemedText>
                          </TouchableOpacity>
                        )}
                        {results.map((store) => <StoreCard key={store.id} store={store} />)}
                      </>
                    ) : (
                      (!loading && zipCode.length === 5) ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="store-remove-outline" size={48} color={DynamicColors.text} />
                          <ThemedText style={{ marginTop: 10, color: DynamicColors.text }}>No se encontraron negocios aquí.</ThemedText>
                        </View>
                      ) : null
                    )}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>{(t.storestab?.category || 'Categoría') + 's'}</ThemedText>
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
                          <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>Negocios por Verificar ({pendingStores.length})</ThemedText>
                          {pendingStores.map(store => (
                            <PendingStoreItem key={store.id} store={store} />
                          ))}
                        </View>
                      )}

                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                        {results.length > 0 ? (
                          <>
                            <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {t.genericbtn?.resultdomore || 'resultados'}</ThemedText>
                            {isFilteredByMap && (
                              <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accent }}>
                                <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accent} />
                                <ThemedText style={{ color: DynamicColors.accent, fontWeight: '800', fontSize: 13 }}>{`  ${t.genericbtn?.viewallresults || 'Ver todos'}`}</ThemedText>
                              </TouchableOpacity>
                            )}
                            {results.map((store) => <StoreCard key={store.id} store={store} />)}
                          </>
                        ) : (
                          (!loading && zipCode.length === 5) ? (
                            <View style={{ flex: 1, alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                              <MaterialCommunityIcons name="store-remove-outline" size={48} color={DynamicColors.text} />
                              <ThemedText style={{ marginTop: 10, color: DynamicColors.text }}>No se encontraron negocios aquí.</ThemedText>
                            </View>
                          ) : null
                        )}
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
      <TouchableOpacity style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <MaterialCommunityIcons name="store-plus-outline" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}