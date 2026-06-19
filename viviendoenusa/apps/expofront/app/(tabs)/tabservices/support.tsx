import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions, Animated, Easing,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal, KeyboardAvoidingView, Share, ColorValue
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useGlobalSearchParams } from 'expo-router'; 
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

const ICONS_ARRAY = ['apps', 'heart-pulse', 'brain', 'hand-heart', 'dots-horizontal'];
const CATEGORIES_LIST = ['Todos', 'Psicólogos Pro-Bono', 'Mentores Locales', 'Grupos de Apoyo', 'Otros'];
const COUNTRIES = [{ code: '+1', flag: '🇺🇸', name: 'USA' }];

const API_SUPPORT_URL = 'http://192.168.252.243:3000/support';
const API_TARIFFS_URL = 'http://192.168.252.243:3000/tariffs';

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const openDirections = (store: any) => {
  const label = encodeURIComponent(store.name || store.nameSupp);
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
      const msg = "Comentario inapropiado";
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>Volver</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20 }}>Tu Experiencia</ThemedText>
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
          placeholder={"Escribe tu opinión..."} 
          placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} 
          multiline 
          autoCapitalize="sentences"
          style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
        />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}>
          <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Publicar</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// 🚀 COMPONENTE: MODAL DE RENOVACIÓN DE APOYO
const RenewSupportModal = memo(({ visible, onClose, onSuccess, storeToRenew, currentUserId, currentTariff, isDark, Colors, orangeGradient, isLargeWeb, isAndroid, isIOS }: any) => {
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
      const res = await fetch(`${API_SUPPORT_URL}/${storeToRenew.id}/renew`, {
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
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text }}>Renovar Contacto</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 14, color: Colors.text, marginBottom: 20 }}>
              Renueva la suscripción de <ThemedText style={{fontWeight: 'bold', color: Colors.accent}}>{storeToRenew?.name || storeToRenew?.nameSupp}</ThemedText> realizando el pago de ${currentTariff} USD y enviando el comprobante aquí abajo.
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


export default function SupportScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 🚀 LECTURA DE PARÁMETROS GLOBALES (Notificaciones)
  const paramsGlobal = useGlobalSearchParams();
  const rawNotifId = paramsGlobal.id || paramsGlobal.storeId || paramsGlobal.supportId || paramsGlobal.referenceId || paramsGlobal.reference_id;
  const notificationId = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;

  const mapRef = useRef<MapView>(null); 
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
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

  const Colors = DynamicColors;

  // --- ESTADOS ---
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

  // --- ESTADOS DE RENOVACIÓN ---
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [storeToRenew, setStoreToRenew] = useState<any>(null);

  // --- ESTADOS SUGERIR APOYO ---
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
  
  // --- ESTADOS ADMIN ---
  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // 🚀 TARIFA DINÁMICA
  const [currentTariff, setCurrentTariff] = useState<string>("50.00");

  const currentUserId = userMetadata?.id || userMetadata?.userId || "baeb641a-3fa4-4fef-9846-d75947d1bca9";
  const isZipValid = zipCode.length === 5;
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const isFormValid = !!(formName.trim() && formAddress.trim() && formZip.length === 5 && formPhone.trim() && formImage && formRefCode.trim());

  // --- ANIMACIONES DEL BOTÓN 988 ---
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseRingAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1000) 
      ])
    ).start();

    Animated.loop(
        Animated.parallel([
            Animated.timing(pulseRingAnim, { toValue: 1.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseOpacityAnim, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ])
    ).start();
  }, [ringAnim, pulseRingAnim, pulseOpacityAnim]);

  const spin = ringAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg']
  });

  // 🚀 CARGAR TARIFA
  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Support`);
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

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchAllPendingSupports();
    } else {
      if (zipCode.length !== 5) {
        setPendingStores([]);
      } else {
        fetchSupportData(zipCode);
      }
    }
  }, [isAdminMode]);

  const applyLocalFilters = (supportList: any[], categoryIdx: number, lat: number, lng: number) => {
    let filtered = (categoryIdx === 0) ? [...supportList] : supportList.filter(l => Number(l.categoryId) === categoryIdx);
    
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

  const fetchAllPendingSupports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_SUPPORT_URL}?userId=${currentUserId}`); 
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameSupp || item.name || 'Sin nombre',
          description: item.descriptionSupp || item.description || '',
          address: item.addressSupp || item.address || '',
          categoryId: item.categoryId || 0,
          zip: item.zip,
          image: item.imageSupp || item.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
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
      console.error("Error obteniendo pendientes globales:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_SUPPORT_URL}?zip=${searchZip.trim()}&userId=${currentUserId}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameSupp || item.name || 'Sin nombre',
          description: item.descriptionSupp || item.description || '',
          address: item.addressSupp || item.address || '',
          categoryId: item.categoryId || 0,
          zip: item.zip,
          image: item.imageSupp || item.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
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
      console.error("Error obteniendo soporte:", e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 🚀 LÓGICA DE NOTIFICACIÓN
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
          const fetchSpecificSupport = async () => {
            try {
              const res = await fetch(`${API_SUPPORT_URL}/${cleanNotifId}`);
              if (res.ok) {
                const data = await res.json();
                
                const mappedSupport = {
                  ...data,
                  name: data.nameSupp || data.name || 'Sin nombre',
                  address: data.addressSupp || data.address || '',
                  description: data.descriptionSupp || data.description || '',
                  image: data.imageSupp || data.image || data.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                  lat: Number(data.lat) || 34.0934,
                  lng: Number(data.lng) || -117.5847,
                };

                setSelectedDetail(mappedSupport); 

                if (data.zip && String(data.zip).length === 5) {
                  setZipCode(String(data.zip));
                  handleSearch(undefined, String(data.zip));
                }
              }
            } catch (e) {
              console.error("❌ Error Fetch notificación de Support:", e);
            }
          };
          fetchSpecificSupport();
        }
      }
    }
  }, [notificationId]);

  const handleCloseDetailModal = () => {
    setSelectedDetail(null);
    lastProcessedNotifId.current = null;
    router.setParams({ id: '', supportId: '', referenceId: '', reference_id: '', openEventId: '' });
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

    const approvedSupport = await fetchSupportData(targetZip);
    const filtered = applyLocalFilters(approvedSupport, categoryToSearch, lat, lng);
    
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
    } else if (text.length === 5) {
      handleSearch(selectedCategoryIdx);
    }
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
    setResults([store]); setIsFilteredByMap(true);
    const region = { latitude: store.lat, longitude: store.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const handleShare = async (store: any) => {
    if (!store) return;
    try { await Share.share({ message: `Te recomiendo este contacto de apoyo: ${store.name || store.nameSupp}\n${store.description || store.descriptionSupp}` }); } 
    catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishStore = async () => {
    if (!isFormValid) {
      const msg = "Completar nombre, ubicación, foto y código de pago son obligatorios.";
      return isWeb ? window.alert(msg) : Alert.alert("Atención", msg);
    }
    setIsPublishing(true);

    try {
      let finalImageName = '';
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

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage as string);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage as string, name: filename, type } as any);
        }

        const uploadResponse = await fetch('http://192.168.252.243:3000/api/subir-imagen-optimizada/support', {
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
        nameSupp: formName, 
        descriptionSupp: formDesc, 
        addressSupp: formAddress,
        categoryId: formCategoryIdx, 
        zip: formZip, 
        imageSupp: finalImageName,
        lat: lat, 
        lng: lng, 
        phone: fullPhone, 
        userId: currentUserId,
        approved: false,
        referenceCode: formRefCode,
        paymentMethod: formPayMethod 
      };

      const response = await fetch(API_SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando soporte");

      const newEntryLocal = {
        id: savedFromDB.id,
        name: savedFromDB.nameSupp,
        description: savedFromDB.descriptionSupp,
        address: savedFromDB.addressSupp,
        categoryId: savedFromDB.categoryId,
        image: formImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800', 
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
      setFormName(''); setFormDesc(''); setFormAddress(''); setFormZip(''); setFormPhone(''); setFormImage(null); setFormCategoryIdx(1); setFormRefCode(''); setFormPayMethod('Zelle');
      
      if (!zipCode || zipCode.length < 5) {
        setZipCode(formZip);
        handleSearch(undefined, formZip);
      }

      const success = "Solicitud enviada exitosamente, pendiente de aprobación.";
      isWeb ? window.alert(success) : Alert.alert("Solicitud Enviada", success);

    } catch (err: any) {
      Alert.alert("Error", err.message || "Error al enviar la solicitud.");
    } finally {
      setIsPublishing(false);
    }
  };

  const approveStore = async (store: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_SUPPORT_URL}/${store.id}`, {
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
      Alert.alert("Aprobado", `El contacto ha sido aprobado exitosamente por ${durationMonths} meses.`);
    } catch (error) {
      Alert.alert("Error", "No se pudo aprobar.");
    }
  };

  const rejectStore = async (id: number) => {
    try {
      const response = await fetch(`${API_SUPPORT_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Error en servidor");
      setPendingStores(pendingStores.filter(e => e.id !== id));
      Alert.alert("Rechazado", "Contacto eliminado.");
    } catch (error) {
      Alert.alert("Error", "No se pudo rechazar.");
    }
  };

  const SupportCard = ({ store, renderAdminControls }: { store: any, renderAdminControls?: any }) => {
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

    // 🚀 LÓGICA DE CONTADOR ABREVIADO Y SEGURO
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
          <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, margin: 10, marginBottom: 0, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#FFB74D" />
              <ThemedText style={{ color: '#FFB74D', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>En revisión. Será publicado pronto.</ThemedText>
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
            <ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>
              {displayRating}
            </ThemedText>
          </View>
        </View>
        
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(store)} style={{ width: '100%', height: 140, opacity: fadeCard ? 0.6 : 1 }}>
          <Image source={{ uri: store.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
            <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Ver detalle</ThemedText>
          </View>
        </TouchableOpacity>
        
        <View style={{ padding: 15, opacity: fadeCard ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{store.name}</ThemedText>
            {dist !== null && <ThemedText style={{ color: '#FF5F6D', fontSize: 13, fontWeight: '700' }}>{dist} mi</ThemedText>}
          </View>

          {store.address && (
             <ThemedText style={{ fontSize: 13, color: '#FF5F6D', fontWeight: 'bold', marginTop: 4 }}>
                 <MaterialCommunityIcons name="map-marker-outline" size={12}/> {store.address}
             </ThemedText>
          )}

          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 6 }} numberOfLines={isPending ? undefined : 2}>{store.description}</ThemedText>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15, opacity: isPending ? 0.4 : 1 }}>
            <TouchableOpacity onPress={() => !isPending && setSelectedStore(store)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5' }}>
               <MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} />
               {/* 🚀 INYECTAMOS EL CONTADOR EN EL BOTÓN */}
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>
                  Reseñas {reviewCount > 0 ? `(${formattedCount})` : ''}
               </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && openDirections(store)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
              <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>Ruta</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && Linking.openURL(`tel:${store.phone}`)} disabled={isPending || isExpired} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}>
              <MaterialCommunityIcons name="phone" size={18} color={isDark ? '#FFB74D' : '#EF6C00'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>Llamar</ThemedText>
            </TouchableOpacity>
          </View>

          {renderAdminControls && renderAdminControls()}
        </View>
      </View>
    );
  };

  const PendingSupportItem = ({ store }: { store: any }) => {
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

    return <SupportCard store={store} renderAdminControls={adminControls} />;
  };

  return (
    <View style={stylesUnified.container}>

      {/* MODAL DE RENOVACIÓN */}
      <RenewSupportModal 
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
               <Image source={{ uri: selectedDetail?.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
               <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="share-variant" size={22} color="#FFF" /></TouchableOpacity>
               <TouchableOpacity onPress={handleCloseDetailModal} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="close" size={24} color="#FFF" /></TouchableOpacity>
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
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: DynamicColors.text }}>{selectedDetail?.name || selectedDetail?.nameSupp}</ThemedText>
                {(selectedDetail?.address || selectedDetail?.addressSupp) && <ThemedText style={{ color: '#FF5F6D', fontWeight:'700', marginBottom:10 }}>{selectedDetail?.address || selectedDetail?.addressSupp}</ThemedText>}
                <View style={{height:1, backgroundColor:DynamicColors.border, marginVertical:20}} />
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 20 }}>{selectedDetail?.description || selectedDetail?.descriptionSupp}</ThemedText>

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
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: DynamicColors.text }}>{selectedStore?.name || selectedStore?.nameSupp}</ThemedText>
                    <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800' }}>Experiencias y Opiniones</ThemedText>
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
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Compartir experiencia</ThemedText>
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

                         const res = await fetch(`${API_SUPPORT_URL}/reviews`, {
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

      {/* MODAL SUGERIR APOYO */}
      <Modal visible={isModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <ThemedText style={{fontSize: 20, fontWeight:'bold'}}>Unirse a la Red</ThemedText>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: DynamicColors.border }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 8 }}>FOTO</ThemedText></View>}
                </TouchableOpacity>
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8,textTransform:'none'}}>Categoría</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6, marginBottom: 14 }}>
                  {CATEGORIES_LIST.map((cat, index) => {
                    if (index === 0) return null; 
                    const isActive = formCategoryIdx === index;
                    const iconName = ICONS_ARRAY[index] || 'heart'; 
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
                            <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'none' }}>{cat}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 🚀 AÑADIDO: autoCapitalize="words" para capitalizar la primera letra */}
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder="Nombre del Profesional / Mentor" 
                  placeholderTextColor={DynamicColors.subtext} 
                  value={formName} 
                  onChangeText={setFormName} 
                  autoCapitalize="words" 
                />
                
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder="Ciudad o Dirección" 
                  placeholderTextColor={DynamicColors.subtext} 
                  value={formAddress} 
                  onChangeText={setFormAddress} 
                  autoCapitalize="words" 
                />
                
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder="Código Postal" 
                  placeholderTextColor={DynamicColors.subtext} 
                  value={formZip} 
                  onChangeText={setFormZip} 
                  keyboardType="numeric" 
                  maxLength={5} 
                />
                
                {/* 🚀 AÑADIDO: autoCapitalize="sentences" para capitalizar oraciones */}
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, height: 90, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder="Especialidad o cómo ayudas..." 
                  placeholderTextColor={DynamicColors.subtext} 
                  value={formDesc} 
                  onChangeText={setFormDesc} 
                  multiline 
                  autoCapitalize="sentences" 
                />
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform:'none' }}>Teléfono de Contacto</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 0 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DynamicColors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DynamicColors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
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
                    Para promocionar tu perfil de apoyo, realiza el pago de <ThemedText style={{fontWeight:'900', color: DynamicColors.accent}}>${currentTariff} USD</ThemedText> mediante Zelle o Venmo y escribe el código de confirmación aquí abajo.
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

                  {/* 🚀 ASEGURADO: uppercase forzado */}
                  <TextInput 
                    style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 15, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    placeholder={`# CONFIRMACION DE ${formPayMethod}...`} 
                    placeholderTextColor={DynamicColors.subtext}
                    value={formRefCode} 
                    onChangeText={(text) => setFormRefCode(text.toUpperCase())} 
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity onPress={handlePublishStore} disabled={!isFormValid || isPublishing} style={{ marginTop: 20, alignSelf: 'center' }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Enviar Solicitud</ThemedText>
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
              
              <View style={[stylesUnified.headerRow, { marginBottom: 15, alignItems: 'center', flexDirection: 'row', gap: 12 }]}>
                
                <TouchableOpacity onPress={() => router.push('/services')}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder="Código postal..." 
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

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setAllStores([]); setPendingStores([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={DynamicColors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => { setIsAdminMode(!isAdminMode); }}>
                    <MaterialCommunityIcons name="heart-pulse" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.2}} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
                  
                  {isAdminMode && pendingStores.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>Verificar ({pendingStores.length})</ThemedText>
                      {pendingStores.map(store => (
                         <PendingSupportItem key={store.id} store={store} />
                      ))}
                    </View>
                  )}

                  <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL('tel:988')} style={{ marginBottom: 15 }}>
                    <LinearGradient colors={['#FF416C', '#FF4B2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ position: 'relative', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                        <Animated.View style={{
                            position: 'absolute', width: 48, height: 48, borderRadius: 24,
                            borderWidth: 2, borderColor: '#FFFFFF',
                            transform: [{ scale: pulseRingAnim }], opacity: pulseOpacityAnim
                        }} />
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                              <MaterialCommunityIcons name="phone-alert" size={26} color="#FFF" />
                            </Animated.View>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>Línea de Crisis 988</ThemedText>
                        <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>Atención en español 24/7</ThemedText>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ marginBottom: 15 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                      {CATEGORIES_LIST.map((area, index) => {
                         const iconName = ICONS_ARRAY[index] || 'heart';
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
                      mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} 
                      onZoom={handleZoom} dataSource={showMarkers ? results : []} 
                      mapKey={mapKey} onMarkerPress={handleMarkerSelection} showsUserLocation={true}
                    />
                    {isWeb && (
                      <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 15, right: 15, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: DynamicColors.border, zIndex: 99, elevation: 99 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={DynamicColors.text} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ marginTop: 20 }}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? "resultados" : "resultado")}</ThemedText>}
                    {isFilteredByMap && (
                      <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accenticon }}>
                        <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accenticon} />
                        <ThemedText style={{ color: DynamicColors.accenticon, fontWeight: '800', fontSize: 13 }}>Ver todos</ThemedText>
                      </TouchableOpacity>
                    )}
                    {results.map((store) => <SupportCard key={store.id} store={store} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  
                  <View style={stylesUnified.webSidebar}>
                    
                    <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL('tel:988')} style={{ marginBottom: 20 }}>
                      <LinearGradient colors={['#FF416C', '#FF4B2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                           <Animated.View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF', transform: [{ scale: pulseRingAnim }], opacity: pulseOpacityAnim }} />
                           <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                               <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                 <MaterialCommunityIcons name="phone-alert" size={20} color="#FFF" />
                               </Animated.View>
                           </View>
                        </View>
                        <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>SOS 988</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>

                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>Categorías</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES_LIST.map((area, index) => {
                        const iconName = ICONS_ARRAY[index] || 'heart';
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
                          <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>Verificar ({pendingStores.length})</ThemedText>
                          {pendingStores.map(store => (
                             <PendingSupportItem key={store.id} store={store} />
                          ))}
                        </View>
                      )}

                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                        {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} resultados</ThemedText>}
                        {isFilteredByMap && (
                          <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accent }}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accent} />
                            <ThemedText style={{ color: DynamicColors.accent, fontWeight: '800', fontSize: 13 }}>{`  Ver todos`}</ThemedText>
                          </TouchableOpacity>
                        )}
                        {results.map((store) => <SupportCard key={store.id} store={store} />)}
                      </ScrollView>
                    </View>
                    
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border, position: 'relative' }}>
                      <MapComponent 
                        mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} 
                        dataSource={showMarkers ? results : []} mapKey={mapKey} 
                        onMarkerPress={handleMarkerSelection} onZoom={handleZoom} showsUserLocation={true}
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

      <TouchableOpacity style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <MaterialCommunityIcons name="handshake" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}