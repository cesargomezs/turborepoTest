import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, ActivityIndicator, Share, Linking,
  Modal as RNModal, KeyboardAvoidingView, ColorValue, Text, AppState
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 
import { createClient } from '@supabase/supabase-js';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '../../../context/ThemeContext';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { useTranslation } from '@/hooks/useTranslation';

// --- VALIDACIONES ---
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';
import { useMockSelector, setUserMetadata, toggleAuth, useMockDispatch } from '@/redux/slices'; 
import { handleUniversalShare } from '../../../utils/shareHelper';
import { supabaseClient } from '../../../utils/supabase';
import * as Clipboard from 'expo-clipboard';

const refreshSupabaseUrl = async (url: string, fallbackFolder = 'events') => {
  if (!url || typeof url !== 'string' || url.length < 5) return null;
  if (!supabaseClient) return url;

  if (url.includes('supabase.co')) {
    let cleanPath = '';
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/images/');
      if (parts.length > 1) {
        cleanPath = parts[1]; 
      } else {
        cleanPath = url.split('/').pop()?.split('?')[0] || '';
      }
    } catch (e) {
      cleanPath = url.split('/').pop()?.split('?')[0] || '';
    }

    if (!cleanPath.includes('/')) {
        cleanPath = `${fallbackFolder}/${cleanPath}`;
    }

    try {
      const { data } = await supabaseClient.storage.from('images').createSignedUrl(cleanPath, 604800);
      return data?.signedUrl || url;
    } catch (e) {
      return url;
    }
  }

  if (!url.startsWith('http')) {
     const path = url.includes('/') ? url : `${fallbackFolder}/${url}`;
     try {
       const { data } = await supabaseClient.storage.from('images').createSignedUrl(path, 604800);
       return data?.signedUrl || url;
     } catch(e) { return url; }
  }

  return url; 
};

let BANNED_WORDS: string[] = [];
try {
  BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : [];
} catch (e) {
  console.error("Error cargando badwords.json:", e);
}

const containsBadWords = (text: string): boolean => {
  if (!text) return false;
  
  const wordsInText = text.toLowerCase().match(/\b[\wáéíóúüñ]+\b/g) || [];

  return wordsInText.some(userWord => {
    return BANNED_WORDS.some(bannedWord => {
      if (!bannedWord) return false;
      const lowerBanned = bannedWord.toLowerCase();
      if (userWord === lowerBanned) return true;
      if (userWord === `${lowerBanned}s` || userWord === `${lowerBanned}es`) return true;
      if (userWord === `re${lowerBanned}`) return true;
      return false;
    });
  });
};

const COUNTRIES = [ { code: '+1', flag: '🇺🇸', name: 'USA' }, { code: '+1', flag: '🇺🇸', name: 'USA' } ];

const API_EVENTS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/events';
const API_TARIFFS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/tariffs'; 
const API_CONFIG_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/config';

const planStyles: any = {
  coupon: { selected: '#EA8D2D', unselected: (isDark: boolean) => isDark ? 'rgba(234, 141, 45, 0.15)' : 'rgba(234, 141, 45, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  basic: { selected: '#FF5F6D', unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  premium: { selected: '#F5A623', unselected: (isDark: boolean) => isDark ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  unlimited: { selected: '#10B981', unselected: (isDark: boolean) => isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' }
};

const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (containsBadWords(comment)) {
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
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20, color: isDark ? '#FFF' : '#1A1A1A' }}>{t.lawyerstab?.experience || 'Tu Experiencia'}</ThemedText>
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

export default function EventsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useMockDispatch(); 
  
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const isFocused = useIsFocused();
  const stylesUnified = useUnifiedCardStyles();

  const INTERNAL_CATEGORIES = t.eventstab.categoriesList;
  const ICONS_ARRAY = t.eventstab.categoriesListIcons;

  const params = useLocalSearchParams();
  const rawNotifId = params.openEventId || params.id || params.referenceId;
  const eventIdFromNotif = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;

  const userMetadata = useMockSelector((state : any) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken; 
  const loggedIn = useMockSelector((state : any) => state.mockAuth.loggedIn);
  const currentUserId = userMetadata?.id || userMetadata?.userId;
  
  const userRoleStr = String(userMetadata?.role || userMetadata?.rol || 'User').toLowerCase();
  const isAdmin = ['sadmin', 'admin'].includes(userRoleStr); 
  const isGuest = userMetadata?.typeDetail === 'Guest'; 

  useEffect(() => {
    if (!userToken) {
      router.replace('/');
    }
  }, [userToken]);

  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  
  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'];
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#364045',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    iconInactive: isDark ? '#B0BEC5' : '#364045',  
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    modalBg: isDark ? '#1C1C1E' : '#FFFFFF', 
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : width * 0.92);
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : height * 0.69);
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const rawCategories = t.eventstab?.categoriesList;
  const CATEGORIES_LABELS = Array.isArray(rawCategories) && rawCategories.length >= INTERNAL_CATEGORIES.length 
      ? rawCategories 
      : INTERNAL_CATEGORIES;

  const [zipCode, setZipCode] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [isModalVisible, setModalVisible] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false); 
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);

  // 🚀 ESTADO PARA EDICIÓN / RENOVACIÓN ANUAL
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formLocation, setFormLocation] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formGoogleLink, setFormGoogleLink] = useState('');
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formTimeEnd, setFormTimeEnd] = useState(new Date());
  
  const [formPayMethod, setFormPayMethod] = useState('Zelle');

  const [uiPayType, setUiPayType] = useState<'subscription' | 'coupon'>('coupon');
  const [formPlan, setFormPlan] = useState('coupon');
  const [formRefCode, setFormRefCode] = useState(''); 
  const [zelleQrUrl, setZelleQrUrl] = useState<string>('');
  const [appConfig, setAppConfig] = useState({ payOnActive: false, zelleActive: true, zelleLink: '' });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);

  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // 🚀 ESTADOS PARA EL REPORTE DE CONTENIDO
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [itemToReport, setItemToReport] = useState<any>(null);
  const [reportReason, setReportReason] = useState('Infracción de Copyright o Spam');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // 🚀 ESTADOS PARA RESEÑAS DE EVENTOS
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [selectedReviews, setSelectedReviews] = useState<any>(null);

  const [currentTariff, setCurrentTariff] = useState<string>("50.00");
  const [companyTariffs, setCompanyTariffs] = useState({
    coupon: '0.00', basic: '50.00', premium: '99.00', unlimited: '149.00' 
  });

  const lastProcessedNotifId = useRef<string | null>(null);

  const isBaseFormValid = !!(formTitle.trim() && formLocation.trim() && formZip.trim() && formPhone.trim() && formImage);
  const isFormValid = !!(isBaseFormValid && formRefCode.trim());

  const fetchAppConfig = async () => {
    try {
      const res = await fetch(API_CONFIG_URL);
      if (res.ok) {
        const data = await res.json();
        let isPayOn = false;
        let isZelle = true;
        let zLink = '';

        if (Array.isArray(data)) {
          const payOnItem = data.find((d: any) => String(d.typeCode).toLowerCase() === 'payon');
          const zelleItem = data.find((d: any) => String(d.typeCode).toLowerCase() === 'zelle');

          isPayOn = payOnItem ? (payOnItem.statusType === true || String(payOnItem.statusType).toLowerCase() === 'true' || payOnItem.statusType === 1) : false;
          isZelle = zelleItem ? (zelleItem.statusType === true || String(zelleItem.statusType).toLowerCase() === 'true' || zelleItem.statusType === 1) : true;
          zLink = zelleItem?.descriptionType || '';
        } 
        else if (data && typeof data === 'object') {
          isPayOn = data.payOnActive === true || String(data.payOnActive).toLowerCase() === 'true';
          isZelle = data.zelleActive === true || String(data.zelleActive).toLowerCase() === 'true';
          zLink = data.zelleLink || data.descriptionType || '';
        }

        setAppConfig({
          payOnActive: isPayOn,
          zelleActive: isZelle,
          zelleLink: zLink
        });
      }
    } catch (error) {
      console.warn("⚠️ Error obteniendo configuración de eventos:", error);
    }
  };

  useEffect(() => {
    fetchAppConfig();
  }, []);

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Event`, {
          method: 'GET',
          headers: userToken ? { 'Authorization': `Bearer ${userToken}` } : undefined
        });
        if (res.status === 401) { router.replace('/'); return; }
        
        if (res.ok) {
          const tariffsData = await res.json();
          if (tariffsData && tariffsData.length > 0) {
            setCompanyTariffs({
              coupon: tariffsData[0].coupon || '0.00',
              basic: tariffsData[0].basic || '50.00',
              premium: tariffsData[0].premium || '99.00',
              unlimited: tariffsData[0].unlimited || '149.00'
            });
            if (tariffsData[0].basic) setCurrentTariff(tariffsData[0].basic);
          }
        }
      } catch (e) {
        console.warn("💰 No se pudo cargar la tarifa dinámica", e);
      }
    };
    fetchTariff();
  }, []);

  useEffect(() => {
    const loadZelleQr = async () => {
      try {
        if (supabaseClient) {
          const { data } = await supabaseClient.storage.from('images').createSignedUrl('logoorimages/qrzelle.webp', 604800);
          if (data?.signedUrl) {
            setZelleQrUrl(data.signedUrl);
          }
        }
      } catch (error) {
        console.warn("⚠️ No se pudo obtener la URL firmada de qrzelle.webp", error);
      }
    };
    loadZelleQr();
  }, []);

  const fetchEvents = async (searchZip?: string) => {
    try {
      setIsLoadingPosts(true);
      
      let url = API_EVENTS_URL;
      
      if (isAdminMode) {
        url = (searchZip && searchZip.trim().length === 5)
          ? `${API_EVENTS_URL}?zip=${searchZip.trim()}`
          : API_EVENTS_URL;
      } else {
        url = (searchZip && searchZip.trim().length === 5)
          ? `${API_EVENTS_URL}?zip=${searchZip.trim()}&userId=${currentUserId}`
          : `${API_EVENTS_URL}?userId=${currentUserId}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      });
      
      if (res.status === 401) { router.replace('/'); return; }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = await Promise.all(data.map(async (item: any) => {
          let formattedDate = '';
          try {
            formattedDate = new Date(item.dateEvent).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          } catch(e) { formattedDate = 'Fecha N/A'; }

          const rawImage = item.imageEven || item.imageUrl;
          const freshImage = rawImage ? await refreshSupabaseUrl(rawImage, 'events') : '';
          
          const isAppr = String(item.approved) === 'true' || item.approved === 1 || item.approved === true;

          return {
            ...item,
            category: INTERNAL_CATEGORIES[item.categoryIdx] || 'Social',
            date: formattedDate,
            time: item.timeStart || 'N/A',
            timeEnd: item.timeEnd || 'N/A',
            description: item.descriptionEven || '',
            image: freshImage,
            location: item.locationEven || '',
            referenceCode: item.referenceCode,
            paymentMethod: item.paymentMethod,
            premiumPlan: item.premiumPlan,
            couponCode: item.couponCode,
            approved: isAppr,
            status: isAppr ? 'approved' : 'pending',
            userId: item.userId || item.user_id,
            reviews: Array.isArray(item.reviews) ? item.reviews : [],
            totalReviews: Number(item.totalReviews) || 0,
            rating: Number(item.rating) || 0,
          };
        }));

        setEvents(mappedData.filter(e => e.approved === true || (e.status === 'pending' && e.userId === currentUserId)));
        setPendingEvents(mappedData.filter(e => e.status === 'pending'));
      } else {
        setEvents([]);
        setPendingEvents([]);
      }
    } catch (e) {
      console.error("Error obteniendo eventos:", e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchEvents(zipCode.length === 5 ? zipCode : undefined);
    } else {
      if (zipCode.length === 5) {
        fetchEvents(zipCode);
      } else {
        setPendingEvents([]);
      }
    }
  }, [isAdminMode]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents(zipCode.length === 5 ? zipCode : undefined);
    }, [zipCode])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isFocused) {
        fetchEvents(zipCode.length === 5 ? zipCode : undefined);
      }
    });

    return () => subscription.remove();
  }, [isFocused, zipCode]);

  useEffect(() => {
    if (eventIdFromNotif) {
      const cleanEventId = String(eventIdFromNotif).trim();
      
      if (cleanEventId !== lastProcessedNotifId.current) {
        lastProcessedNotifId.current = cleanEventId;
        
        const localMatch = events.find(e => String(e.id) === cleanEventId);
        
        if (localMatch) {
          setSelectedEventDetails(localMatch);
        } else {
          const fetchSpecificEvent = async () => {
            try {
              const res = await fetch(`${API_EVENTS_URL}/${cleanEventId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${userToken}` }
              });
              
              if (res.status === 401) { router.replace('/'); return; }
              
              if (res.ok) {
                const data = await res.json();
                
                let formattedDate = '';
                try {
                  formattedDate = new Date(data.dateEvent).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                } catch(e) { formattedDate = 'Fecha N/A'; }

                const rawImage = data.imageEven || data.imageUrl;
                const freshImage = rawImage ? await refreshSupabaseUrl(rawImage, 'events') : '';
                const isAppr = String(data.approved) === 'true' || data.approved === 1 || data.approved === true;

                const eventMapped = {
                  ...data,
                  category: INTERNAL_CATEGORIES[data.categoryIdx] || 'Social',
                  date: formattedDate,
                  time: data.timeStart || 'N/A',
                  timeEnd: data.timeEnd || 'N/A',
                  description: data.descriptionEven || '',
                  image: freshImage,
                  location: data.locationEven || '',
                  approved: isAppr,
                  reviews: Array.isArray(data.reviews) ? data.reviews : [],
                  totalReviews: Number(data.totalReviews) || 0,
                  rating: Number(data.rating) || 0,
                };

                setSelectedEventDetails(eventMapped); 

                if (data.zip && String(data.zip).length === 5) {
                  setZipCode(String(data.zip));
                  fetchEvents(String(data.zip));
                }
              }
            } catch (e) {
              console.error("❌ Error haciendo fetch al ID del evento:", e);
            }
          };
          fetchSpecificEvent();
        }
      }
    }
  }, [eventIdFromNotif, events]); 

  const handleCloseDetailModal = () => {
    setSelectedEventDetails(null);
    router.setParams({ openEventId: '', id: '', referenceId: '' });
  };

  const formatDateForWeb = (date: Date) => date.toISOString().split('T')[0];
  const formatTimeForWeb = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleWebTimeChange = (val: string, type: 'start' | 'end') => {
    const [h, m] = val.split(':');
    const newDate = new Date();
    newDate.setHours(parseInt(h), parseInt(m));
    type === 'start' ? setFormTime(newDate) : setFormTimeEnd(newDate);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (isAndroid) setShowDatePicker(false);
    if (selectedDate) setFormDate(selectedDate);
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (isAndroid) setShowTimePicker(false);
    if (selectedTime) setFormTime(selectedTime);
  };

  const onTimeEndChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (isAndroid) setShowTimeEndPicker(false);
    if (selectedTime) setFormTimeEnd(selectedTime);
  };

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n${message}`); 
    else Alert.alert(title, message);
  };

  // 🚀 FUNCIÓN DE REPORTE DE CONTENIDO
  const handleReportSubmit = async () => {
    if (!itemToReport) return;
    setIsSubmittingReport(true);
    try {
      const response = await fetch(`${API_EVENTS_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          itemId: itemToReport.id,
          itemType: itemToReport.itemType || 'event',
          userId: currentUserId,
          reason: reportReason
        })
      });

      if (!response.ok) throw new Error("No se pudo enviar el reporte.");

      triggerAlert("Reporte enviado", "Gracias por colaborar. Nuestro equipo de moderación revisará este contenido.");
      setReportModalVisible(false);
      setItemToReport(null);
    } catch (error: any) {
      triggerAlert("Error", error.message || "Ocurrió un error al enviar el reporte.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleShare = async (event: any) => {
    await handleUniversalShare({
      title: event.title,
      description: event.description,
      phone: event.phone,
      address: event.location,
      zip: event.zip,
      image: event.image,
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return triggerAlert('Error', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  // 🚀 FUNCIÓN UNIFICADA PARA CREAR O ACTUALIZAR (RENOVAR ANUALMENTE)
  const handlePublishEvent = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();
    const trimmedLoc = formLocation.trim();
    const trimmedZip = formZip.trim();

    if (!isBaseFormValid) {
        return triggerAlert("Atención", "Título, ubicación, ZIP Code, teléfono e imagen son obligatorios.");
    }

    if (!formRefCode.trim()) {
      return triggerAlert("Atención", uiPayType === 'coupon' ? "Ingresa un código de cupón válido." : "Ingresa el código de confirmación del pago.");
    }

    if (formGoogleLink.trim() !== '') {
      const regex = /^https:\/\/(g\.page\/r\/|search\.google\.com\/local\/writereview|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i;
      if (!regex.test(formGoogleLink.trim())) {
        return triggerAlert(
          "Enlace Inválido",
          "Por favor ingresa un enlace oficial de reseñas de Google (ej. https://g.page/r/...)"
        );
      }
    }

    const contentToValidate = `${trimmedTitle} ${trimmedDesc} ${trimmedLoc}`;
    if (containsBadWords(contentToValidate)) {
      triggerAlert(t.communitytab?.textInappropriateTittle || "Atención", t.communitytab?.textInappropriateDescription || "Contenido inapropiado detectado.");
      return; 
    }

    setIsPublishing(true);
    try {
      let finalImageName = formImage;
      if (formImage && !formImage.startsWith('http')) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          triggerAlert(t.communitytab?.imageInappropriateTittle || "Bloqueada", t.communitytab?.imageInappropriateDescription || "Imagen inválida");
          return;
        }

        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'evento.jpg';
        const match = /\.(\w+)\$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage, name: filename, type } as any);
        }

        const uploadResponse = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/events', {
          method: 'POST',
          body: formData,
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}` 
          },
        });

        if (uploadResponse.status === 401) { setIsPublishing(false); router.replace('/'); return; }

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
        finalImageName = uploadData.identificadorArchivo; 
      }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';
      const finalPlan = uiPayType === 'coupon' ? 'coupon' : formPlan;
      const finalRefCode = uiPayType === 'coupon' ? formRefCode.trim().toUpperCase() : formRefCode;

      const url = editingEventId ? `${API_EVENTS_URL}/${editingEventId}` : API_EVENTS_URL;
      const method = editingEventId ? 'PUT' : 'POST';

      const payload: any = {
        title: trimmedTitle, 
        categoryIdx: formCategoryIdx,
        dateEvent: formDate.toISOString(),
        timeStart: formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        timeEnd: formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        descriptionEven: trimmedDesc, 
        imageEven: finalImageName ? finalImageName.replace('events/', '') : '', 
        locationEven: trimmedLoc,
        zip: trimmedZip, 
        phone: fullPhone, 
        contactMethod: formContactMethod,
        approved: false, // 🚀 Al actualizar o crear siempre pasa a pending por revisión
        userId: currentUserId,
        referenceCode: finalRefCode,
        paymentMethod: uiPayType === 'coupon' ? 'Coupon' : formPayMethod,
        premiumPlan: finalPlan,
        estate: userMetadata?.estate || null,
        couponCode: uiPayType === 'coupon' ? formRefCode.trim() : '',
        tariffPlan: (companyTariffs as any)[finalPlan],
        googleReviewLink: formGoogleLink.trim()
      };

      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 401) { setIsPublishing(false); router.replace('/'); return; }

      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando evento");

      setModalVisible(false);
      setEditingEventId(null);
      resetForm();
      
      fetchEvents(trimmedZip);
      
      setTimeout(() => {
        triggerAlert('¡Éxito!', editingEventId ? 'Tu evento ha sido actualizado y enviado a revisión con su nueva fecha y referencia.' : 'Tu evento ha sido enviado correctamente.');
      }, 150);
      
    } catch (err: any) {
      triggerAlert("Error", err.message || t.communitytab?.errorServer || "Error");
    } finally {
      setIsPublishing(false);
    }
  };

  const approveEvent = async (event: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_EVENTS_URL}/${event.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error("Error en servidor");
      
      const approvedEvent = { ...event, approved: true, status: 'approved' };
      setEvents(prev => [approvedEvent, ...prev]);
      setPendingEvents(pendingEvents.filter(e => e.id !== event.id));
      triggerAlert("Aprobado", "El evento se ha publicado en la cartelera.");
    } catch (error) {
      triggerAlert("Error", "No se pudo aprobar el evento en el servidor.");
    }
  };

  const rejectEvent = async (id: number) => {
    try {
      const response = await fetch(`${API_EVENTS_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error("Error en servidor");

      setPendingEvents(pendingEvents.filter(e => e.id !== id));
      triggerAlert("Rechazado", "El evento ha sido eliminado de la lista de pendientes.");
    } catch (error) {
      triggerAlert("Error", "No se pudo rechazar el evento en el servidor.");
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormImage(null); setFormLocation(''); setFormZip('');
    setFormPhone(''); setFormGoogleLink(''); setCountryIdx(0); setFormContactMethod('whatsapp'); setFormCategoryIdx(1);
    setFormDate(new Date()); setFormTime(new Date()); setFormTimeEnd(new Date());
    setFormRefCode(''); setFormPayMethod('Zelle'); setFormPlan('coupon'); setUiPayType('coupon');
    setEditingEventId(null);
  };

  const filteredEvents = useMemo(() => 
    events.filter(item => {
      const title = item.title || '';
      const isOwner = item.userId === currentUserId;
      const isPending = item.status === 'pending';

      if (isPending) {
        if (isAdminMode) return false;
        return isOwner;
      }

      return (selectedCategoryIdx === 0 || item.category === INTERNAL_CATEGORIES[selectedCategoryIdx]) && 
             title.toLowerCase().includes(searchQuery.toLowerCase());
    }), 
  [events, selectedCategoryIdx, searchQuery, isAdminMode, currentUserId]);

  const PendingEventItem = ({ ev }: { ev: any }) => {
    const adminControls = () => (
       <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 15 }}>
         
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' }}>
             {ev.premiumPlan && (
                 <View style={{ backgroundColor: planStyles[ev.premiumPlan as keyof typeof planStyles]?.unselected(isDark) || Colors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: planStyles[ev.premiumPlan as keyof typeof planStyles]?.selected || Colors.border }}>
                     <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: planStyles[ev.premiumPlan as keyof typeof planStyles]?.selected || Colors.subtext }}>
                         PLAN {ev.premiumPlan.toUpperCase()}
                     </ThemedText>
                 </View>
             )}
         </View>

         {ev.couponCode ? (
             <View style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.5)' }}>
                <MaterialCommunityIcons name="ticket-percent" size={18} color="#4CAF50" />
                <ThemedText style={{ fontSize: 12, color: Colors.text, fontWeight: '600', marginLeft: 8 }}>
                   Cupón: <ThemedText style={{color: '#4CAF50', fontWeight: '900'}}>{ev.couponCode}</ThemedText>
                </ThemedText>
             </View>
         ) : null}

         <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.5)' }}>
            <MaterialCommunityIcons name="bank-transfer" size={18} color="#FFB74D" />
            <ThemedText style={{ fontSize: 12, color: Colors.text, fontWeight: '600', marginLeft: 8 }}>
               Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{ev.referenceCode || 'N/A'}</ThemedText> ({ev.paymentMethod || 'Pago'})
            </ThemedText>
         </View>

         <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
           <TouchableOpacity onPress={() => rejectEvent(ev.id)} style={{ flex: 1, backgroundColor: '#FF5252', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
             <Text style={{color:'#FFFFFF', fontWeight:'bold', fontSize: 16}}>Rechazar</Text>
           </TouchableOpacity>
           <TouchableOpacity onPress={() => approveEvent(ev, 1)} style={{ flex: 1, backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
             <Text style={{color:'#FFFFFF', fontWeight:'bold', fontSize: 16}}>Aprobar</Text>
           </TouchableOpacity>
         </View>
       </View>
    );

    return (
        <EventCard 
            item={ev} 
            isLargeWeb={isLargeWeb} 
            isDark={isDark} 
            Colors={Colors} 
            orangeGradient={orangeGradient} 
            onOpen={(it: any) => setSelectedEventDetails(it)} 
            t={t} 
            categoryLabels={CATEGORIES_LABELS} 
            internalCategories={INTERNAL_CATEGORIES} 
            renderAdminControls={adminControls} 
            isWeb={isWeb}
            handleShare={handleShare}
            isAdminMode={isAdminMode}
            currentUserId={currentUserId}
            onReport={(eventItem: any) => { setItemToReport(eventItem); setReportModalVisible(true); }}
            onOpenReviews={(eventItem: any) => setSelectedReviews(eventItem)}
            onEditEvent={(eventItem: any) => {
              setEditingEventId(eventItem.id);
              setFormTitle(eventItem.title || '');
              setFormDescription(eventItem.description || '');
              setFormLocation(eventItem.location || '');
              setFormZip(String(eventItem.zip || ''));
              setFormPhone(eventItem.phone ? eventItem.phone.replace('+1', '') : '');
              setFormGoogleLink(eventItem.googleReviewLink || '');
              setFormCategoryIdx(eventItem.categoryIdx || 1);
              setFormImage(eventItem.image || null);
              if (eventItem.dateEvent) setFormDate(new Date(eventItem.dateEvent));
              setModalVisible(true);
            }}
        />
    );
  };

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }}>  
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: Colors.text, backgroundColor: Colors.inputBg, borderColor: Colors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder="Buscar código postal..." 
                    keyboardType="numeric" 
                    maxLength={5} 
                    value={zipCode} 
                    onChangeText={(text) => {
                      setZipCode(text);
                      if (text.length < 5) {
                        setEvents([]); 
                        setPendingEvents([]);
                      } else if (text.length === 5) {
                        fetchEvents(text); 
                      }
                    }} 
                    onSubmitEditing={() => zipCode.length === 5 && fetchEvents(zipCode)} 
                    placeholderTextColor={Colors.subtext} 
                  />
                  <TouchableOpacity onPress={() => fetchEvents(zipCode)} disabled={zipCode.length !== 5} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={zipCode.length === 5 ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {isLoadingPosts ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={zipCode.length === 5 ? "#fff" : Colors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                {/* 🚀 BOTÓN DE ADMINISTRADOR BLINDADO Y REACTIVO */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity 
                    activeOpacity={0.6}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    onPress={() => { 
                      if (isAdmin) {
                        setIsAdminMode(!isAdminMode); 
                      } else {
                        Alert.alert("Aviso", "No cuentas con permisos de administrador.");
                      }
                    }}
                    style={{ padding: 4, zIndex: 999 }}
                  >
                    <MaterialCommunityIcons name="calendar-star" size={40} color={isAdminMode ? '#FF5F6D' : Colors.text} style={{opacity: isAdminMode ? 1 : 0.2, marginLeft: 5}}/>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                
                {/* SIDEBAR WEB */}
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: Colors.text }]}>{t.eventstab?.filter || "Filtros"}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES_LABELS.map((catLabel: string, index: number) => {
                        const isActive = selectedCategoryIdx === index;
                        const iconName = ICONS_ARRAY[index] || 'tag';
                        return (
                          <TouchableOpacity key={index} onPress={() => setSelectedCategoryIdx(index)} style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{catLabel}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: Colors.inputBg }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color={Colors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: Colors.text, fontWeight: '600', fontSize: 14 }}>{catLabel}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* CONTENIDO PRINCIPAL */}
                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  
                  {/* BUSCADOR DE TEXTO */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 15, paddingHorizontal: 16, height: 48 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={Colors.iconInactive} style={{ marginRight: 10 }} />
                    <TextInput style={{ flex: 1, color: Colors.text, fontSize: 15, height: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.eventstab?.inputEvents || 'Buscar evento...'} placeholderTextColor={Colors.iconInactive} value={searchQuery} onChangeText={setSearchQuery} />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}><MaterialCommunityIcons name="close-circle" size={20} color={Colors.iconInactive} /></TouchableOpacity>
                    )}
                  </View>
                  
                  {/* FILTROS MÓVILES */}
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 15 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        {CATEGORIES_LABELS.map((catLabel: string, index: number) => {
                          const isActive = selectedCategoryIdx === index;
                          const iconName = ICONS_ARRAY[index] || 'tag';
                          return (
                            <TouchableOpacity key={index} onPress={() => setSelectedCategoryIdx(index)} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                              {isActive ? (
                                <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                  <MaterialCommunityIcons name={iconName as any} size={15} color="#FFF" style={{ marginRight: 6 }} />
                                  <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{catLabel}</ThemedText>
                                </LinearGradient>
                              ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: Colors.categoryUnselected }}>
                                  <MaterialCommunityIcons name={iconName as any} size={15} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                  <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{catLabel}</ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    
                    {/* EVENTOS PENDIENTES ARRIBA */}
                    {isAdminMode && (
                      <View style={{ marginBottom: 20 }}>
                        <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>
                          Pendientes de Revisión ({pendingEvents.length})
                        </ThemedText>
                        {pendingEvents.length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            {pendingEvents.map(ev => <PendingEventItem key={ev.id} ev={ev} />)}
                          </View>
                        ) : (
                          <View style={{ padding: 20, alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 16 }}>
                            <MaterialCommunityIcons name="check-circle-outline" size={32} color={Colors.subtext} />
                            <ThemedText style={{ color: Colors.subtext, marginTop: 8 }}>No hay eventos pendientes por aprobar.</ThemedText>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {(!zipCode || zipCode.length < 5) && !isAdminMode ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={40} color={Colors.subtext} />
                          </View>
                          <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                            Descubre Eventos
                          </ThemedText>
                          <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                            Ingresa un código postal de 5 dígitos para ver los eventos disponibles en la zona.
                          </ThemedText>
                        </View>
                      ) : filteredEvents.length === 0 && !isLoadingPosts ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="calendar-remove" size={56} color={Colors.subtext} />
                          <ThemedText style={{ color: Colors.subtext, marginTop: 14, fontWeight: '700', fontSize: 14 }}>No hay eventos disponibles</ThemedText>
                        </View>
                      ) : (
                        filteredEvents.map(item => (
                          <EventCard 
                            key={item.id} 
                            item={item} 
                            isLargeWeb={isLargeWeb} 
                            isDark={isDark} 
                            Colors={Colors} 
                            orangeGradient={orangeGradient} 
                            onOpen={(it: any) => setSelectedEventDetails(it)} 
                            t={t} 
                            categoryLabels={CATEGORIES_LABELS}
                            internalCategories={INTERNAL_CATEGORIES} 
                            isWeb={isWeb}
                            handleShare={handleShare}
                            isAdminMode={isAdminMode}
                            currentUserId={currentUserId}
                            onReport={(eventItem: any) => { setItemToReport(eventItem); setReportModalVisible(true); }}
                            onOpenReviews={(eventItem: any) => setSelectedReviews(eventItem)}
                            onEditEvent={(eventItem: any) => {
                              setEditingEventId(eventItem.id);
                              setFormTitle(eventItem.title || '');
                              setFormDescription(eventItem.description || '');
                              setFormLocation(eventItem.location || '');
                              setFormZip(String(eventItem.zip || ''));
                              setFormPhone(eventItem.phone ? eventItem.phone.replace('+1', '') : '');
                              setFormGoogleLink(eventItem.googleReviewLink || '');
                              setFormCategoryIdx(eventItem.categoryIdx || 1);
                              setFormImage(eventItem.image || null);
                              if (eventItem.dateEvent) setFormDate(new Date(eventItem.dateEvent));
                              setModalVisible(true);
                            }}
                          />
                        ))
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 🚀 FAB - NUEVO EVENTO CON PROTECCIÓN DE INVITADOS */}
      <TouchableOpacity 
        onPress={() => {
          if (isGuest) {
            setShowRestrictedModal(true);
            return;
          }
          resetForm();
          fetchAppConfig(); 
          setModalVisible(true);
        }} 
        style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}
      >
        <LinearGradient colors={orangeGradient} style={{ flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="calendar-plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL CREAR/EDITAR EVENTO (MUESTRA CAMPO DE PAGO/CUPÓN SIEMPRE) */}
      <RNModal visible={isModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isPublishing}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: Colors.text }}>{editingEventId ? 'Actualizar Evento (Nuevo Año)' : (t.eventstab?.botonEvent || 'Nuevo Evento')}</ThemedText>
                <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                
                <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: Colors.border, backgroundColor: Colors.inputBg }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={{alignItems:'center'}}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight:'800', fontSize:11, marginTop:8, color: Colors.subtext}}>{t.eventstab?.photoEvent || 'FOTO'}</ThemedText></View>}
                </TouchableOpacity>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 , color:Colors.text}}>{t.eventstab?.typeEvent || 'TIPO'}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20, paddingBottom: 6 }}>
                  {CATEGORIES_LABELS.map((catLabel: string, index: number) => {
                    if (index === 0) return null; 
                    const isActive = formCategoryIdx === index;
                    const iconName = ICONS_ARRAY[index] || 'tag';
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'none' }}>{catLabel}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'none' }}>{catLabel}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 , color:Colors.text}}>{t.eventstab?.dateEvent || 'FECHA'}</ThemedText>
                {isWeb ? (
                  <View style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 15 }}>
                    <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.accent} style={{ position: 'absolute', left: 15, zIndex: 1 }} />
                    <View style={{ width: '100%', padding: 15, paddingLeft: 45, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, justifyContent: 'center' }}>
                      <ThemedText style={{ color: Colors.text, fontWeight: '700' }}>{formDate.toLocaleDateString()}</ThemedText>
                    </View>
                    <input type="date" value={formatDateForWeb(formDate)} min={formatDateForWeb(new Date())} onChange={(e:any) => setFormDate(new Date(e.target.value))} className="native-web-input" />
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ padding: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                    <ThemedText style={{ color: Colors.text, fontWeight: '700' }}>{formDate.toLocaleDateString()}</ThemedText>
                    <MaterialCommunityIcons name="calendar-edit" size={20} color={Colors.accent} />
                  </TouchableOpacity>
                )}
                {showDatePicker && !isWeb && (
                  <View style={isIOS ? { backgroundColor: Colors.inputBg, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 15 } : null}>
                    <DateTimePicker value={formDate} mode="date" display={isIOS ? "spinner" : "default"} minimumDate={new Date()} onChange={onDateChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border }}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>{t.eventstab?.readyBtn || "Hecho"}</ThemedText></TouchableOpacity>}
                  </View>
                )}

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, color:Colors.text }}>{t.eventstab?.timeEvent || 'HORA'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  {isWeb ? (
                    <>
                      <View style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: '100%', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, justifyContent: 'center' }}>
                          <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>{formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        </View>
                        <input type="time" value={formatTimeForWeb(formTime)} onChange={(e:any) => handleWebTimeChange(e.target.value, 'start')} className="native-web-input" />
                      </View>
                      <View style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: '100%', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, justifyContent: 'center' }}>
                          <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>{formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        </View>
                        <input type="time" value={formatTimeForWeb(formTimeEnd)} onChange={(e:any) => handleWebTimeChange(e.target.value, 'end')} className="native-web-input" />
                      </View>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ flex: 1, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                        <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize:13 }}>{formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowTimeEndPicker(true)} style={{ flex: 1, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                        <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize:13 }}>{formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        <MaterialCommunityIcons name="clock-check" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {showTimePicker && !isWeb && (
                   <View style={isIOS ? { backgroundColor: Colors.inputBg, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 15 } : null}>
                    <DateTimePicker value={formTime} mode="time" display={isIOS ? "spinner" : "default"} onChange={onTimeChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowTimePicker(false)} style={{ padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border }}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>Hecho</ThemedText></TouchableOpacity>}
                  </View>
                )}
                {showTimeEndPicker && !isWeb && (
                   <View style={isIOS ? { backgroundColor: Colors.inputBg, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 15 } : null}>
                    <DateTimePicker value={formTimeEnd} mode="time" display={isIOS ? "spinner" : "default"} onChange={onTimeEndChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowTimeEndPicker(false)} style={{ padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border }}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>Hecho</ThemedText></TouchableOpacity>}
                  </View>
                )}

                <ThemedText style={{ fontSize: 12, fontWeight: '900',  marginBottom: 8, textTransform:'none' , color:Colors.text }}>{t.eventstab?.informationevent || 'Información'}</ThemedText>
                <TextInput value={formTitle} autoCapitalize="words" onChangeText={(text) => setFormTitle(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} placeholder={t.eventstab?.nameEvent || 'Nombre'} placeholderTextColor={Colors.iconInactive}  style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formLocation} onChangeText={(text) => setFormLocation(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" placeholder={t.eventstab?.addressEvent || 'Dirección'} placeholderTextColor={Colors.iconInactive} style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formZip} onChangeText={setFormZip} placeholder="ZIP Code" keyboardType="numeric" maxLength={5} placeholderTextColor={Colors.iconInactive} style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formDescription} onChangeText={(text) => setFormDescription(text ? text.charAt(0).toUpperCase() + text.slice(1) : '')} autoCapitalize="sentences" placeholder={t.eventstab?.detailsEvent || 'Detalles'} placeholderTextColor={Colors.iconInactive} multiline style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, height: 90, textAlignVertical:'top', marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 ,textTransform:'none', color:Colors.text}}>{t.eventstab?.typeContact || 'Contacto'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : Colors.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : Colors.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : Colors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : Colors.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? '#FF5F6D' : Colors.border, backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : Colors.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? '#FF5F6D' : Colors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'phone' ? '#FF5F6D' : Colors.subtext }}>{t.eventstab?.call || 'Llamada'}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' }}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: Colors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: Colors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone} placeholder="(909) 000-0000" placeholderTextColor={Colors.iconInactive} keyboardType="phone-pad" style={{ flex: 1, color: Colors.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform:'none', color: Colors.text }}>Enlace de Google Reviews (Opcional)</ThemedText>
                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 20, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder="https://g.page/r/..." 
                  placeholderTextColor={Colors.subtext} 
                  value={formGoogleLink} 
                  onChangeText={setFormGoogleLink} 
                  autoCapitalize="none" 
                  keyboardType="url"
                />

                {/* 🚀 MÉTODO DE ACTIVACIÓN Y PAGO (VISIBLE TANTO AL CREAR COMO AL ACTUALIZAR) */}
                <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: Colors.text, marginBottom: 8, marginTop: 5, textTransform: 'uppercase' }}>Método de Activación *</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity 
                    onPress={() => { setUiPayType('coupon'); setFormPlan('coupon'); setFormRefCode(''); }}
                    style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderColor: uiPayType === 'coupon' ? Colors.accent : Colors.border, backgroundColor: uiPayType === 'coupon' ? (isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}
                  >
                    <MaterialCommunityIcons name={uiPayType === 'coupon' ? "radiobox-marked" : "radiobox-blank"} size={18} color={uiPayType === 'coupon' ? Colors.accent : Colors.subtext} />
                    <ThemedText style={{ fontWeight: 'bold', fontSize: 13, color: uiPayType === 'coupon' ? Colors.accent : Colors.subtext }}>Tengo Cupón</ThemedText>
                  </TouchableOpacity>

                  {(isWeb || appConfig?.payOnActive) && (
                    <TouchableOpacity 
                      onPress={() => { setUiPayType('subscription'); if(formPlan === 'coupon') setFormPlan('basic'); setFormRefCode(''); }}
                      style={{ flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderColor: uiPayType === 'subscription' ? Colors.accent : Colors.border, backgroundColor: uiPayType === 'subscription' ? (isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}
                    >
                      <MaterialCommunityIcons name={uiPayType === 'subscription' ? "radiobox-marked" : "radiobox-blank"} size={18} color={uiPayType === 'subscription' ? Colors.accent : Colors.subtext} />
                      <ThemedText style={{ fontWeight: 'bold', fontSize: 13, color: uiPayType === 'subscription' ? Colors.accent : Colors.subtext }}>Suscripción</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {uiPayType === 'subscription' && (isWeb || appConfig?.payOnActive) && (
                  <>
                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: Colors.text, marginBottom: 8 }}>SELECCIONA TU PLAN DE PAGO *</ThemedText>
                    <View style={{ flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {[
                          { id: 'basic', name: t.categoryplan.basic, price: companyTariffs.basic, desc: t.categoryplan.basicdesc },
                          { id: 'premium', name: t.categoryplan.premium, price: companyTariffs.premium, desc: t.categoryplan.premiumdesc },
                          { id: 'unlimited', name: t.categoryplan.unlimited, price: companyTariffs.unlimited, desc: t.categoryplan.unlimiteddesc }
                        ].map(plan => {
                            const pStyle = planStyles[plan.id as keyof typeof planStyles];
                            const isSelected = formPlan === plan.id;
                            
                            return (
                            <TouchableOpacity 
                                key={plan.id}
                                onPress={() => setFormPlan(plan.id)}
                                style={{ 
                                    padding: 15, 
                                    borderRadius: 14, 
                                    borderWidth: 1, 
                                    borderColor: isSelected ? pStyle.selected : Colors.border, 
                                    backgroundColor: isSelected ? pStyle.unselected(isDark) : Colors.inputBg 
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={20} color={isSelected ? pStyle.selected : Colors.subtext} />
                                        <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: isSelected ? pStyle.selected : Colors.text, marginLeft: 8 }}>{plan.name}</ThemedText>
                                    </View>
                                    <ThemedText style={{ fontWeight: '900', fontSize: 16, color: Colors.text }}>${plan.price}</ThemedText>
                                </View>
                                <ThemedText style={{ fontSize: 13, color: isSelected ? pStyle.text(isDark) : Colors.subtext, marginTop: 6, marginLeft: 28 }}>{plan.desc}</ThemedText>
                            </TouchableOpacity>
                        )})}
                    </View>
                  </>
                )}

                <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: Colors.accent, marginBottom: 10 }}>
                    {uiPayType === 'coupon' ? 'Cupón de Activación' : 'Verificación de Pago'}
                  </ThemedText>

                  <TextInput 
                    style={{ 
                      padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, 
                      backgroundColor: uiPayType === 'coupon' ? (isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.06)') : Colors.inputBg, 
                      borderColor: uiPayType === 'coupon' ? Colors.accent : Colors.border, 
                      color: Colors.text, 
                      textAlign: uiPayType === 'coupon' ? 'center' : 'left',
                      fontSize: 16,
                      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) 
                    }} 
                    placeholder={uiPayType === 'coupon' ? 'ESCRIBE TU CÓDIGO AQUÍ...' : `# CONFIRMACION DE ${formPayMethod}...`} 
                    placeholderTextColor={Colors.subtext}
                    value={formRefCode} 
                    onChangeText={(text) => setFormRefCode(text.toUpperCase())} 
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity onPress={handlePublishEvent} disabled={!isFormValid || isPublishing} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <><MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{editingEventId ? 'Actualizar Evento (A Revisión)' : (t.eventstab?.createEvent || 'Crear')}</ThemedText></>}
                  </LinearGradient>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* MODAL DETALLE EXPANDIDO CON RESEÑAS */}
      <RNModal visible={!!selectedEventDetails} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCloseDetailModal} />
          
          <View style={{ width: '92%', height: '80%', borderRadius: 35, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240, backgroundColor: 'transparent' }}>
               {selectedEventDetails?.image && (selectedEventDetails?.image as string).length > 5 ? (
                 <Image source={{ uri: selectedEventDetails?.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
               ) : (
                 <View style={{ width: '100%', height: '100%', backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
                   <MaterialCommunityIcons name="image-off-outline" size={40} color={Colors.subtext} />
                 </View>
               )}
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={{ position: 'absolute', width: '100%', height: 80 }} />
            </View>
            
            <TouchableOpacity onPress={handleCloseDetailModal} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 6, zIndex: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <ScrollView style={{ padding: 25 }}>
              <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'space-between', marginBottom:10}}>
                <View style={{flexDirection:'row', alignItems:'center'}}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 }}>
                    <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>
                      {CATEGORIES_LABELS[INTERNAL_CATEGORIES.indexOf(selectedEventDetails?.category)] || selectedEventDetails?.category}
                    </ThemedText>
                  </LinearGradient>
                  <ThemedText style={{marginLeft:10, fontWeight:'700'}}>{selectedEventDetails?.date}</ThemedText>
                </View>

                {/* ESTRELLAS GLOBALES */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                  <ThemedText style={{ color: Colors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>
                    {selectedEventDetails?.rating > 0 ? selectedEventDetails.rating.toFixed(1) : "Nuevo"}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={{ fontSize: 26, fontWeight: '900', marginBottom: 15, color: Colors.text }}>{selectedEventDetails?.title}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.time} - {selectedEventDetails?.timeEnd}</ThemedText></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="map-marker" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.location}</ThemedText></View>
              <View style={{height:1, backgroundColor:Colors.border, marginVertical:20}} />
              <ThemedText style={{color:Colors.text, lineHeight:22, fontSize:15, marginBottom: 20 }}>{selectedEventDetails?.description}</ThemedText>
              
              {/* 🚀 BOTONERA DE ACCIÓN EN EL DETALLE CON ESTILO 2 FILAS */}
              <View style={{ marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity 
                    disabled={!selectedEventDetails?.approved}
                    onPress={() => setSelectedReviews(selectedEventDetails)} 
                    style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5', opacity: !selectedEventDetails?.approved ? 0.4 : 1 }}
                  >
                     <MaterialCommunityIcons name="comment-text-outline" size={17} color={isDark ? '#FFF' : '#444'} />
                     <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: isDark ? '#FFF' : '#444' }} numberOfLines={1}>
                        Reseñas {selectedEventDetails?.reviews?.length > 0 ? `(${selectedEventDetails.reviews.length})` : ''}
                     </ThemedText>
                  </TouchableOpacity>

                  {!isWeb && (
                    <TouchableOpacity 
                      disabled={!selectedEventDetails?.approved} 
                      onPress={() => handleShare(selectedEventDetails)} 
                      style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD', opacity: !selectedEventDetails?.approved ? 0.4 : 1 }}
                    >
                      <MaterialCommunityIcons name="share-variant" size={17} color={isDark ? '#4FC3F7' : '#1976D2'} />
                      <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }} numberOfLines={1}>
                        {t.genericbtn?.sharingbtn || 'Compartir'}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedEventDetails?.phone && (
                  <TouchableOpacity 
                    disabled={!selectedEventDetails?.approved}
                    onPress={() => {
                      if(selectedEventDetails.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${selectedEventDetails.phone.replace(/\D/g, '')}`); } 
                      else { Linking.openURL(`tel:${selectedEventDetails.phone}`); }
                    }} 
                    style={{ width: '100%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: selectedEventDetails.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)'), opacity: !selectedEventDetails?.approved ? 0.4 : 1 }}
                  >
                     <MaterialCommunityIcons name={selectedEventDetails.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color={selectedEventDetails.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} />
                     <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: selectedEventDetails.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D" }} numberOfLines={1}>
                       {selectedEventDetails.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"}
                     </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* SECCIÓN DE RESEÑAS EN EL DETALLE */}
              {selectedEventDetails?.status === 'approved' && (
                <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: Colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <ThemedText style={{ fontSize: 18, fontWeight: '800', color: Colors.text }}>{t.lawyerstab?.commutnityopini || 'Opiniones'}</ThemedText>
                  </View>

                  {!showReviewInput ? (
                    <View>
                      <TouchableOpacity 
                        onPress={() => { 
                          if (isGuest) {
                            setShowRestrictedModal(true);
                            return;
                          }
                          const hasReviewed = selectedEventDetails?.reviews?.some((r: any) => r.userId === currentUserId); 
                          if (hasReviewed) { return Alert.alert("Aviso", "Ya dejaste una reseña"); } 
                          setShowReviewInput(true); 
                        }} 
                        style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}
                      >
                        <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFF" style={{marginRight: 10}} />
                          <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.storestab?.writingreview || 'Escribir reseña'}</ThemedText>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      {selectedEventDetails?.reviews?.length > 0 ? (
                        selectedEventDetails.reviews.map((r: any) => (
                          <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{ flexDirection: 'row', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                                ))}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {r.image ? (
                                  <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/>
                                ) : (
                                  <MaterialCommunityIcons name="account-circle" size={24} color={Colors.subtext} />
                                )}
                                <ThemedText style={{ color: Colors.text, fontSize: 12, fontStyle: 'italic' }}>{r.name || r.userName || 'Anónimo'}</ThemedText>
                              </View>
                            </View>
                            <ThemedText style={{ color: Colors.text, fontSize: 14, marginTop: 4 }}>{r.comment}</ThemedText>
                            
                            {/* 🚀 BOTÓN DE REPORTAR RESEÑA */}
                            {r.userId !== currentUserId && (
                              <TouchableOpacity 
                                onPress={() => { 
                                  setItemToReport({ id: r.id, itemType: 'review' }); 
                                  setSelectedEventDetails(null); 
                                  setReportModalVisible(true); 
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border }}
                              >
                                <MaterialCommunityIcons name="flag-outline" size={13} color={Colors.subtext} style={{ marginRight: 4 }} />
                                <ThemedText style={{ fontSize: 11, color: Colors.subtext, fontWeight: '600' }}>Reportar reseña</ThemedText>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))
                      ) : (
                        <View style={{ alignItems: 'center', paddingVertical: 20, opacity: 0.5 }}>
                           <MaterialCommunityIcons name="comment-off-outline" size={40} color={Colors.iconInactive} />
                           <ThemedText style={{ color: Colors.iconInactive, marginTop: 10, fontSize: 13 }}>Aún no hay reseñas.</ThemedText>
                        </View>
                      )}
                    </View>
                  ) : (
                    <ReviewForm 
                      isDark={isDark} 
                      t={t} 
                      onCancel={() => setShowReviewInput(false)} 
                      onPublish={async (ratingNum: number, commentStr: string) => { 
                          try {
                            const reviewPayload = {
                              reference_id: selectedEventDetails.id,
                              stars: ratingNum,
                              comment: commentStr,
                              userId: currentUserId
                            };

                            const res = await fetch(`${API_EVENTS_URL}/reviews`, {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${userToken}` 
                              },
                              body: JSON.stringify(reviewPayload)
                            });

                            if (res.status === 401) { router.replace('/'); return; }
                            if (!res.ok) throw new Error();
                            const fromDB = await res.json();

                            const newReviewFormatted = { 
                              id: fromDB.id || Date.now().toString(), 
                              stars: Number(ratingNum), 
                              comment: commentStr,
                              name: fromDB.name || userMetadata?.name || 'Yo',
                              image: fromDB.image || userMetadata?.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
                              displayTime: fromDB.displayTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                              userId: currentUserId
                            };
                            
                            const updatedReviews = [newReviewFormatted, ...(selectedEventDetails.reviews || [])];
                            const totalStars = updatedReviews.reduce((sum: number, r: any) => sum + r.stars, 0);
                            const newAverage = updatedReviews.length > 0 ? (totalStars / updatedReviews.length) : 0;

                            const updatedEventObj = {
                              ...selectedEventDetails,
                              reviews: updatedReviews,
                              rating: newAverage,
                              totalReviews: updatedReviews.length
                            };

                            setSelectedEventDetails(updatedEventObj);
                            setEvents(prev => prev.map(s => s.id === selectedEventDetails.id ? updatedEventObj : s));

                            const plan = selectedEventDetails.premiumPlan ? String(selectedEventDetails.premiumPlan).toLowerCase() : 'free';
                            const isEligibleForGoogleReview = ['premium', 'unlimited'].includes(plan);
                            const googleReviewUrl = selectedEventDetails.googleReviewLink || selectedEventDetails.googleUrl || selectedEventDetails.google_review_link || 'https://g.page/r/CXrYzP8Yb7XzECE/review';

                            if (isEligibleForGoogleReview && googleReviewUrl && commentStr.trim()) {
                              try { Clipboard.setStringAsync(commentStr); } catch (clipError) { }
                              if (Platform.OS === 'web') {
                                const confirmWeb = window.confirm("🌟 ¡Apoya este evento en Google!\n\nTu opinión ya se guardó con éxito. Como este evento es Premium, ¿te gustaría pegar tu comentario directamente en su perfil de Google?");
                                if (confirmWeb) { window.open(googleReviewUrl, '_blank'); } 
                                else { window.alert("¡Gracias! Tu reseña se ha publicado con éxito."); }
                              } else {
                                Alert.alert("🌟 ¡Apoya este evento en Google!", "Tu opinión ya se guardó con éxito. ¿Te gustaría pegar tu comentario directamente en su perfil de Google?",
                                  [ { text: "No, gracias", style: "cancel" }, { text: "Ir a Google", onPress: () => { Linking.openURL(googleReviewUrl); } } ]
                                );
                              }
                            } else {
                              if (Platform.OS === 'web') { window.alert("¡Gracias! Tu reseña se ha publicado con éxito."); } 
                              else { Alert.alert("¡Gracias!", "Tu reseña se ha publicado exitosamente."); }
                            }

                          } catch (e) {
                            Alert.alert("Error", "No se pudo conectar al servidor.");
                          } finally {
                            setShowReviewInput(false);
                          }
                      }} 
                    />
                  )}
                </View>
              )}

              {/* 🚀 BOTÓN INFERIOR DE REPORTAR EVENTO (DETALLE) */}
              {selectedEventDetails?.userId !== currentUserId && (
                <TouchableOpacity 
                  onPress={() => { setItemToReport({ ...selectedEventDetails, itemType: 'event' }); setSelectedEventDetails(null); setReportModalVisible(true); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.subtext} style={{ marginRight: 6 }} />
                  <ThemedText style={{ fontSize: 12, color: Colors.subtext, fontWeight: '600' }}>Reportar publicación</ThemedText>
                </TouchableOpacity>
              )}

            </ScrollView>
          </View>
        </View>
      </RNModal>

      {/* MODAL ACCESO RESTRINGIDO */}
      <RNModal visible={showRestrictedModal} transparent animationType="fade" onRequestClose={() => setShowRestrictedModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '90%', maxWidth: 380, backgroundColor: Colors.modalBg, borderRadius: 32, padding: 25, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', alignItems: 'center' }}>
            
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 95, 109, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
              <MaterialCommunityIcons name="lock-alert" size={32} color="#FF5F6D" />
            </View>

            <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text, textAlign: 'center', marginBottom: 8 }}>
              Contenido Exclusivo
            </ThemedText>
            
            <ThemedText style={{ fontSize: 13, color: isDark ? '#A0A0A5' : '#666666', textAlign: 'center', lineHeight: 20, marginBottom: 25 }}>
              Para publicar eventos y guardar reseñas, necesitas crear tu cuenta gratuita. ¡Es rápido y seguro!
            </ThemedText>

            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => {
                  setShowRestrictedModal(false);
                  dispatch(setUserMetadata({} as any));
                  dispatch(toggleAuth());
                }}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Crear Cuenta Gratis</ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setShowRestrictedModal(false)}
                style={{ paddingVertical: 12, alignItems: 'center' }}
              >
                <ThemedText style={{ color: isDark ? '#A0A0A5' : '#666666', fontWeight: 'bold', fontSize: 14 }}>Seguir Explorando</ThemedText>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </RNModal>

      {/* 🚀 MODAL DE REPORTE DE CONTENIDO */}
      <RNModal visible={reportModalVisible} transparent animationType="fade" onRequestClose={() => setReportModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: isDark ? '#1E1E1E' : '#FFF', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: Colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: '900', color: Colors.text }}>Reportar Contenido</ThemedText>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 13, color: Colors.subtext, marginBottom: 15 }}>
              Selecciona el motivo por el cual deseas reportar este evento. Nuestro equipo lo revisará de inmediato.
            </ThemedText>

            {['Infracción de Copyright o Spam', 'Contenido inapropiado u ofensivo', 'Información de contacto falsa', 'El evento ha sido cancelado'].map((reasonOption, idx) => (
              <TouchableOpacity 
                key={idx} 
                onPress={() => setReportReason(reasonOption)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: Colors.border }}
              >
                <MaterialCommunityIcons 
                  name={reportReason === reasonOption ? "radiobox-marked" : "radiobox-blank"} 
                  size={20} 
                  color={reportReason === reasonOption ? Colors.accent : Colors.subtext} 
                  style={{ marginRight: 10 }}
                />
                <ThemedText style={{ fontSize: 14, color: Colors.text, fontWeight: reportReason === reasonOption ? '700' : '400' }}>
                  {reasonOption}
                </ThemedText>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              onPress={handleReportSubmit} 
              disabled={isSubmittingReport}
              style={{ marginTop: 20, backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
            >
              {isSubmittingReport ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Enviar Reporte</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>

      {/* MODAL DE RESEÑAS INDEPENDIENTE (VER TODAS) */}
      <RNModal visible={!!selectedReviews} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setSelectedReviews(null); setShowReviewInput(false); }}>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedReviews(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.78, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 32, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: Colors.text }}>{selectedReviews?.title}</ThemedText>
                    <ThemedText style={{ color: Colors.subtext, fontWeight: '800' }}>{t.lawyerstab?.commutnityopini || 'Opiniones de la comunidad'}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { setSelectedReviews(null); setShowReviewInput(false); }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
              </View>
              
              {!showReviewInput ? (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity 
                    onPress={() => { 
                      if (isGuest) {
                        setShowRestrictedModal(true);
                        return;
                      }
                      const hasReviewed = selectedReviews?.reviews?.some((r: any) => r.userId === currentUserId); 
                      if (hasReviewed) { return Alert.alert("Aviso", "Ya dejaste una reseña"); } 
                      setShowReviewInput(true); 
                    }} 
                    style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}
                  >
                    <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} />
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.storestab?.writingreview || 'Escribir reseña'}</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    {selectedReviews?.reviews?.length > 0 ? (
                      selectedReviews.reviews.map((r: any) => (
                         <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                             <View style={{ flexDirection: 'row', gap: 2 }}>
                               {[1, 2, 3, 4, 5].map((s) => (
                                 <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                               ))}
                             </View>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                               {r.image ? (
                                 <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/>
                               ) : (
                                 <MaterialCommunityIcons name="account-circle" size={24} color={Colors.subtext} />
                               )}
                               <ThemedText style={{ color: Colors.text, fontSize: 12, fontStyle: 'italic' }}>{r.name || r.userName || 'Anónimo'}</ThemedText>
                             </View>
                           </View>
                           <ThemedText style={{ color: Colors.text, fontSize: 14, marginTop: 4 }}>{r.comment}</ThemedText>

                           {r.userId !== currentUserId && (
                             <TouchableOpacity 
                               onPress={() => { 
                                 setItemToReport({ id: r.id, itemType: 'review' }); 
                                 setSelectedReviews(null); 
                                 setReportModalVisible(true); 
                               }}
                               style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border }}
                             >
                               <MaterialCommunityIcons name="flag-outline" size={13} color={Colors.subtext} style={{ marginRight: 4 }} />
                               <ThemedText style={{ fontSize: 11, color: Colors.subtext, fontWeight: '600' }}>Reportar reseña</ThemedText>
                             </TouchableOpacity>
                           )}
                         </View>
                      ))
                    ) : (
                      <View style={{ alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                        <MaterialCommunityIcons name="comment-off-outline" size={40} color={Colors.iconInactive} />
                        <ThemedText style={{ color: Colors.iconInactive, marginTop: 10 }}>Aún no hay reseñas.</ThemedText>
                      </View>
                    )}
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
                            reference_id: selectedReviews.id,
                            stars: ratingNum,
                            comment: commentStr,
                            userId: currentUserId
                          };

                          const res = await fetch(`${API_EVENTS_URL}/reviews`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${userToken}` 
                            },
                            body: JSON.stringify(reviewPayload)
                          });

                          if (res.status === 401) { router.replace('/'); return; }
                          if (!res.ok) throw new Error();
                          const fromDB = await res.json();

                          const newReviewFormatted = { 
                            id: fromDB.id || Date.now().toString(), 
                            stars: Number(ratingNum), 
                            comment: commentStr,
                            name: fromDB.name || userMetadata?.name || 'Yo',
                            image: fromDB.image || userMetadata?.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
                            displayTime: fromDB.displayTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            userId: currentUserId
                          };
                          
                          const updatedReviews = [newReviewFormatted, ...(selectedReviews.reviews || [])];
                          const totalStars = updatedReviews.reduce((sum, r) => sum + r.stars, 0);
                          const newAverage = updatedReviews.length > 0 ? (totalStars / updatedReviews.length) : 0;

                          const updatedEventObj = {
                            ...selectedReviews,
                            reviews: updatedReviews,
                            rating: newAverage,
                            totalReviews: updatedReviews.length
                          };

                          setSelectedReviews(updatedEventObj);
                          setEvents(prev => prev.map(s => s.id === selectedReviews.id ? updatedEventObj : s));

                          Alert.alert("¡Gracias!", "Tu reseña se ha publicado con éxito.");
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
      </RNModal>

      {isWeb && (
        <style dangerouslySetInnerHTML={{ __html: `
          .native-web-input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 2; }
          .native-web-input::-webkit-calendar-picker-indicator { position: absolute; width: 100%; height: 100%; cursor: pointer; }
        `}} />
      )}
    </View>
  );
}

const EventCard = memo(({ item, isLargeWeb, isDark, Colors, orangeGradient, onOpen, t, categoryLabels, internalCategories, renderAdminControls, isWeb, handleShare, isAdminMode, currentUserId, onReport, onOpenReviews, onEditEvent }: any) => {
  const catIndex = internalCategories.indexOf(item.category);
  const catLabel = catIndex >= 0 ? categoryLabels[catIndex] : item.category;
  
  const isPending = item.status === 'pending';
  const isOwner = item.userId === currentUserId;
  
  const cardBgColor = isPending 
      ? (isDark ? '#1E1E1E' : '#FFFFFF') 
      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)');

  const reviewCount = item.reviews?.length || item.totalReviews || 0;
  let formattedCount = reviewCount.toString();
  if (reviewCount >= 1000) {
    formattedCount = (reviewCount / 1000).toFixed(1) + 'k';
  }

  return (
    <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => onOpen(item)} 
        style={{ borderWidth: 1, marginBottom: 20, overflow: 'hidden', width: isLargeWeb ? '48.5%' : '100%', backgroundColor: cardBgColor, borderColor: isPending ? '#FFB74D' : Colors.border, borderRadius: 28 }}
    >
      {isPending && !isAdminMode && (
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { zIndex: 10 , pointerEvents: 'none'}]}  />
      )}

      {isPending && isOwner && (
        <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" />
          <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>
            En revisión. Será publicado pronto.
          </ThemedText>
        </View>
      )}

      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ fontSize: 12, color: '#FF5F6D', fontWeight: '900' }}>
              {catLabel.toUpperCase()}
            </ThemedText>
          </View>
          {/* 🚀 BOTÓN DE REPORTAR EN LA ESQUINA SUPERIOR DE LA TARJETA */}
          {!isOwner && (
            <TouchableOpacity onPress={() => onReport && onReport(item)} style={{ padding: 4, opacity: 0.7 }}>
              <MaterialCommunityIcons name="flag-outline" size={18} color={Colors.subtext} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{ marginLeft: 4, fontSize: 13, fontWeight: '900', color: Colors.text }}>
              {item.rating > 0 ? item.rating.toFixed(1) : "Nuevo"}
            </ThemedText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="calendar-month" size={14} color="#FFB300" />
            <ThemedText style={{ marginLeft: 4, fontSize: 13, fontWeight: '900', color: Colors.text }}>
              {item.date}
            </ThemedText>
          </View>
        </View>
      </View>
      
      <View style={{ width: '100%', height: 180, backgroundColor: 'transparent' }}>
        {item.image && (item.image as string).length > 5 ? (
          <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name="image-off-outline" size={40} color={Colors.subtext} />
          </View>
        )}
         
         <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
           <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
           <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
             {t.entrepreneurshiptab?.viewdetail || 'Ver detalle'}
           </ThemedText>
         </View>
      </View>
      
      <View style={{ padding: 16 }}>
        <ThemedText style={{ fontSize: 18, fontWeight: '800', color: Colors.text }} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={{ color: Colors.subtext, fontSize: 13, marginTop: 4, marginBottom: 8 }} numberOfLines={isPending ? undefined : 2}>{item.description}</ThemedText>
        <View style={{ marginTop: 4, gap: 4 }}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.accent} />
            <ThemedText style={{ fontSize: 12, marginLeft: 8, fontWeight: '700', color: Colors.text }}>{item.time} - {item.timeEnd}</ThemedText>
          </View>
          <View style={{flexDirection:'row', alignItems:'center'}}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.accent} />
            <ThemedText style={{ fontSize: 12, marginLeft: 8, fontWeight: '700', color: Colors.subtext }} numberOfLines={1}>{item.location}</ThemedText>
          </View>
        </View>

        {/* 🚀 BOTONERA DE ACCIÓN EN EL DETALLE CON ESTILO 2 FILAS */}
        <View style={{ marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity 
              disabled={isPending}
              onPress={(e: any) => {
                e.stopPropagation?.();
                if (onOpenReviews) onOpenReviews(item);
              }} 
              style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5', opacity: isPending ? 0.4 : 1 }}
            >
               <MaterialCommunityIcons name="comment-text-outline" size={17} color={isDark ? '#FFF' : '#444'} />
               <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: isDark ? '#FFF' : '#444' }} numberOfLines={1}>
                  Reseñas {reviewCount > 0 ? `(${formattedCount})` : ''}
               </ThemedText>
            </TouchableOpacity>

            {!isWeb && (
              <TouchableOpacity 
                disabled={isPending} 
                onPress={(e: any) => { e.stopPropagation?.(); handleShare(item); }} 
                style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD', opacity: isPending ? 0.4 : 1 }}
              >
                <MaterialCommunityIcons name="share-variant" size={17} color={isDark ? '#4FC3F7' : '#1976D2'} />
                <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }} numberOfLines={1}>
                  {t.genericbtn?.sharingbtn || 'Compartir'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          {item.phone && (
            <TouchableOpacity 
              disabled={isPending}
              onPress={(e: any) => {
                e.stopPropagation?.();
                if(item.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`); } 
                else { Linking.openURL(`tel:${item.phone}`); }
              }} 
              style={{ width: '100%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: item.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)'), opacity: isPending ? 0.4 : 1 }}
            >
               <MaterialCommunityIcons name={item.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color={item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} />
               <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D" }} numberOfLines={1}>
                 {item.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"}
               </ThemedText>
            </TouchableOpacity>
          )}

          {/* 🚀 BOTÓN DE ACTUALIZAR / RENOVAR EVENTO (SÓLO SI ES EL DUEÑO) */}
          {isOwner && (
            <TouchableOpacity 
              onPress={(e: any) => {
                e.stopPropagation?.();
                if (onEditEvent) onEditEvent(item);
              }}
              style={{ width: '100%', height: 40, marginTop: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: 'rgba(255, 193, 7, 0.15)', borderWidth: 1, borderColor: 'rgba(255, 193, 7, 0.4)' }}
            >
               <MaterialCommunityIcons name="update" size={16} color="#FFB300" />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: '#FFB300' }}>
                 Actualizar Evento (Nuevo Año)
               </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* 🚀 BOTÓN INFERIOR DE REPORTE (FUERA DE LA TARJETA) */}
        {!isPending && !isOwner && (
          <TouchableOpacity 
            onPress={() => { if (onReport) onReport(item); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.subtext} style={{ marginRight: 6 }} />
            <ThemedText style={{ fontSize: 12, color: Colors.subtext, fontWeight: '600' }}>Reportar publicación</ThemedText>
          </TouchableOpacity>
        )}

        {renderAdminControls && renderAdminControls()}
      </View>
    </TouchableOpacity>
  );
});