import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, ActivityIndicator, Share, Linking,
  Modal as RNModal, KeyboardAvoidingView, ColorValue, Text
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { useTranslation } from '@/hooks/useTranslation';

// --- VALIDACIONES ---
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';
import { useMockSelector } from '@/redux/slices';
import { useAppTheme } from 'app/src/context/ThemeContext';

let BANNED_WORDS: string[] = [];
try {
  BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : [];
} catch (e) {
  console.error("Error cargando badwords.json:", e);
}

const isTextInappropriate = (text: string): boolean => {
  if (!text) return false;
  return BANNED_WORDS.some(word => text.toLowerCase().includes(word.toLowerCase()));
};

const INTERNAL_CATEGORIES = ['Todos', 'Social', 'Salud', 'Educación', 'Deportes'];
const ICONS_ARRAY = ['calendar-range', 'account-group', 'heart-pulse', 'school', 'basketball'];
const COUNTRIES = [ { code: '+1', flag: '🇺🇸', name: 'USA' }, { code: '+1', flag: '🇺🇸', name: 'USA' } ];

const API_EVENTS_URL = 'http://192.168.1.107:3000/events';
const API_TARIFFS_URL = 'http://192.168.1.107:3000/tariffs'; 

const planStyles: any = {
  coupon: { 
    selected: '#EA8D2D', 
    unselected: (isDark: boolean) => isDark ? 'rgba(234, 141, 45, 0.15)' : 'rgba(234, 141, 45, 0.08)', 
    text: (isDark: boolean) => isDark ? '#FFF' : '#333' 
  },
  basic: { 
    selected: '#FF5F6D', 
    unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)', 
    text: (isDark: boolean) => isDark ? '#FFF' : '#333' 
  },
  premium: { 
    selected: '#F5A623', 
    unselected: (isDark: boolean) => isDark ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.08)', 
    text: (isDark: boolean) => isDark ? '#FFF' : '#333' 
  },
  unlimited: { 
    selected: '#10B981', 
    unselected: (isDark: boolean) => isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', 
    text: (isDark: boolean) => isDark ? '#FFF' : '#333' 
  }
};

export default function EventsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  /*const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';*/
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const stylesUnified = useUnifiedCardStyles();

  const params = useLocalSearchParams();
  const rawNotifId = params.openEventId || params.id || params.referenceId;
  const eventIdFromNotif = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;

  const userMetadata = useMockSelector((state : any) => state.mockAuth.userMetadata) as any;
  const loggedIn = useMockSelector((state : any) => state.mockAuth.loggedIn);
  
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
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formLocation, setFormLocation] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formTimeEnd, setFormTimeEnd] = useState(new Date());
  
  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');
  const [formPlan, setFormPlan] = useState('basic');
  const [formCoupon, setFormCoupon] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);

  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [currentTariff, setCurrentTariff] = useState<string>("50.00");
  const [companyTariffs, setCompanyTariffs] = useState({
    coupon: '0.00', 
    basic: '50.00', 
    premium: '99.00', 
    unlimited: '149.00' 
  });

  const lastProcessedNotifId = useRef<string | null>(null);

  const isFormValid = !!(formTitle.trim() && formLocation.trim() && formZip.trim() && formPhone.trim() && formImage && formRefCode.trim());

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Event`);
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
              const res = await fetch(`${API_EVENTS_URL}/${cleanEventId}`);
              
              if (res.ok) {
                const data = await res.json();
                
                let formattedDate = '';
                try {
                  formattedDate = new Date(data.dateEvent).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                } catch(e) { formattedDate = 'Fecha N/A'; }

                const eventMapped = {
                  ...data,
                  category: INTERNAL_CATEGORIES[data.categoryIdx] || 'Social',
                  date: formattedDate,
                  time: data.timeStart || 'N/A',
                  timeEnd: data.timeEnd || 'N/A',
                  description: data.descriptionEven || '',
                  image: data.imageEven || '',
                  location: data.locationEven || '',
                };

                setSelectedEventDetails(eventMapped); 

                if (data.zip && String(data.zip).length === 5) {
                  setZipCode(String(data.zip));
                  fetchEvents(String(data.zip), isAdminMode);
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

  const fetchEvents = async (searchZip?: string, forceAdminFetch: boolean = false) => {
    if (!forceAdminFetch && (!searchZip || searchZip.trim().length !== 5)) return;
    
    try {
      setIsLoadingPosts(true);
      const url = (searchZip && searchZip.trim().length === 5) 
          ? `${API_EVENTS_URL}?zip=${searchZip.trim()}` 
          : API_EVENTS_URL;

      const res = await fetch(url);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => {
          let formattedDate = '';
          try {
            formattedDate = new Date(item.dateEvent).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          } catch(e) { formattedDate = 'Fecha N/A'; }

          return {
            ...item,
            category: INTERNAL_CATEGORIES[item.categoryIdx] || 'Social',
            date: formattedDate,
            time: item.timeStart || 'N/A',
            timeEnd: item.timeEnd || 'N/A',
            description: item.descriptionEven || '',
            image: item.imageEven || '',
            location: item.locationEven || '',
            referenceCode: item.referenceCode,
            paymentMethod: item.paymentMethod,
            premiumPlan: item.premiumPlan,
            couponCode: item.couponCode
          };
        });

        setEvents(mappedData.filter(e => e.approved === true));
        setPendingEvents(mappedData.filter(e => e.approved !== true));
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

  const ActionBtn = ({ icon, text, color, bgColor, onPress, minWidth = 100, disabled = false }: any) => (
    <TouchableOpacity 
      disabled={disabled} 
      onPress={onPress} 
      style={{ flexGrow: 1, minWidth: minWidth, height: 42, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8, marginRight: 8, opacity: disabled ? 0.4 : 1 }}
    >
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

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

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `¡Mira este evento en ViviendoenUSA! 🇺🇸\n\n📌 ${event.title}\n📅 ${event.date}\n⏰ ${event.time}\n📍 ${event.location}`,
      });
    } catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return triggerAlert('Error', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishEvent = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();
    const trimmedLoc = formLocation.trim();
    const trimmedZip = formZip.trim();

    if (!isFormValid) {
        return triggerAlert("Atención", "Título, ubicación, ZIP Code, teléfono, pago e imagen son obligatorios.");
    }

    if (isTextInappropriate(trimmedTitle) || isTextInappropriate(trimmedDesc) || isTextInappropriate(trimmedLoc)) {
      triggerAlert(t.communitytab?.textInappropriateTittle || "Error", t.communitytab?.textInappropriateDescription || "Contenido inapropiado.");
      return; 
    }

    setIsPublishing(true);
    try {
      let finalImageName = '';
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          triggerAlert(t.communitytab?.imageInappropriateTittle || "Bloqueada", t.communitytab?.imageInappropriateDescription || "Imagen inválida");
          return;
        }

        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'evento.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage, name: filename, type } as any);
        }

        const uploadResponse = await fetch('http://192.168.1.107:3000/api/subir-imagen-optimizada/events', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
        finalImageName = uploadData.identificadorArchivo; 
      }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';

      const newEntryPayload = {
        title: trimmedTitle, 
        categoryIdx: formCategoryIdx,
        dateEvent: formDate.toISOString(),
        timeStart: formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        timeEnd: formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        descriptionEven: trimmedDesc, 
        imageEven: finalImageName, 
        locationEven: trimmedLoc,
        zip: trimmedZip, 
        phone: fullPhone, 
        contactMethod: formContactMethod,
        approved: false, 
        userId: userMetadata?.id || userMetadata?.userId || null,
        referenceCode: formRefCode,
        paymentMethod: formPayMethod,
        premiumPlan: formPlan,
        couponCode: formCoupon.trim(),
        tariffPlan: (companyTariffs as any)[formPlan]
      };

      const response = await fetch(API_EVENTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntryPayload)
      });
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando evento");

      const newEventLocal = {
        ...savedFromDB,
        image: formImage,
        category: INTERNAL_CATEGORIES[savedFromDB.categoryIdx],
        date: new Date(savedFromDB.dateEvent).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        time: savedFromDB.timeStart,
        timeEnd: savedFromDB.timeEnd,
        description: savedFromDB.descriptionEven,
        location: savedFromDB.locationEven,
        referenceCode: savedFromDB.referenceCode || formRefCode,
        paymentMethod: savedFromDB.paymentMethod || formPayMethod,
        premiumPlan: formPlan,
        couponCode: formCoupon
      };

      setPendingEvents(prev => [newEventLocal, ...prev]);
      setModalVisible(false);
      resetForm();
      
      if (!zipCode || zipCode.length < 5) {
        setZipCode(trimmedZip);
        fetchEvents(trimmedZip, isAdminMode);
      }
      
      triggerAlert("¡Recibido!", "Tu evento ha sido enviado y el pago será revisado pronto.");
      
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      if (!response.ok) throw new Error("Error en servidor");
      
      const approvedEvent = { ...event, approved: true };
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
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Error en servidor");

      setPendingEvents(pendingEvents.filter(e => e.id !== id));
      triggerAlert("Rechazado", "El evento ha sido eliminado de la lista de pendientes.");
    } catch (error) {
      triggerAlert("Error", "No se pudo rechazar el evento en el servidor.");
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormImage(null); setFormLocation(''); setFormZip('');
    setFormPhone(''); setCountryIdx(0); setFormContactMethod('whatsapp'); setFormCategoryIdx(1);
    setFormDate(new Date()); setFormTime(new Date()); setFormTimeEnd(new Date());
    setFormRefCode(''); setFormPayMethod('Zelle'); setFormPlan('basic'); setFormCoupon('');
  };

  const filteredEvents = useMemo(() => 
    events.filter(item => {
      const title = item.title || '';
      return item.approved === true && 
             (selectedCategoryIdx === 0 || item.category === INTERNAL_CATEGORIES[selectedCategoryIdx]) && 
             title.toLowerCase().includes(searchQuery.toLowerCase());
    }), 
  [events, selectedCategoryIdx, searchQuery]);

  const PendingEventItem = ({ ev }: { ev: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    
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

         {/*ev.couponCode ? (
             <View style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.5)' }}>
                <MaterialCommunityIcons name="ticket-percent" size={18} color="#4CAF50" />
                <ThemedText style={{ fontSize: 12, color: Colors.text, fontWeight: '600', marginLeft: 8 }}>
                   Cupón: <ThemedText style={{color: '#4CAF50', fontWeight: '900'}}>{ev.couponCode}</ThemedText>
                </ThemedText>
             </View>
         ) : null*/}

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
           <TouchableOpacity onPress={() => approveEvent(ev, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
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
            ActionBtn={ActionBtn} 
            t={t} 
            categoryLabels={CATEGORIES_LABELS} 
            internalCategories={INTERNAL_CATEGORIES} 
            renderAdminControls={adminControls} 
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
                        if (isAdminMode) {
                            fetchEvents('', true);
                        } else if (events.length > 0 || pendingEvents.length > 0) {
                            setEvents([]); 
                            setPendingEvents([]);
                        }
                      } else if (text.length === 5) {
                        fetchEvents(text, isAdminMode); 
                      }
                    }} 
                    onSubmitEditing={() => zipCode.length === 5 && fetchEvents(zipCode, isAdminMode)} 
                    placeholderTextColor={Colors.subtext} 
                  />
                  <TouchableOpacity onPress={() => fetchEvents(zipCode, isAdminMode)} disabled={zipCode.length !== 5 && !isAdminMode} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={(zipCode.length === 5 || isAdminMode) ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {isLoadingPosts ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={(zipCode.length === 5 || isAdminMode) ? "#fff" : Colors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity onLongPress={() => {
                    const newAdminMode = !isAdminMode;
                    setIsAdminMode(newAdminMode);
                    if (newAdminMode) {
                        fetchEvents(zipCode, true);
                    } else if (!zipCode || zipCode.length < 5) {
                        setEvents([]);
                        setPendingEvents([]);
                    }
                }}>
                  <MaterialCommunityIcons name="calendar-star" size={40} color={isAdminMode ? Colors.accent : Colors.accenticon} style={{opacity: isAdminMode ? 1 : 0.2, marginLeft: 5}}/>
                </TouchableOpacity>
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
                    
                    {/* SECCIÓN ADMIN MODIFICADA SIN EL FONDO AMARILLO */}
                    {isAdminMode && pendingEvents.length > 0 && (
                      <View style={{ marginBottom: 20 }}>
                        <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>
                          Revisión ({pendingEvents.length})
                        </ThemedText>
                        {pendingEvents.map(ev => <PendingEventItem key={ev.id} ev={ev} />)}
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
                            ActionBtn={ActionBtn}
                            t={t} 
                            categoryLabels={CATEGORIES_LABELS}
                            internalCategories={INTERNAL_CATEGORIES} 
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

      {/* FAB - NUEVO EVENTO */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{ flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="calendar-plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL CREAR EVENTO CON PAGO */}
      <RNModal visible={isModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isPublishing}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: Colors.text }}>{t.eventstab?.botonEvent || 'Nuevo Evento'}</ThemedText>
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
                <TextInput value={formTitle} onChangeText={setFormTitle} autoCapitalize="words" placeholder={t.eventstab?.nameEvent || 'Nombre'} placeholderTextColor={Colors.iconInactive}  style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formLocation} onChangeText={setFormLocation} autoCapitalize="words" placeholder={t.eventstab?.addressEvent || 'Dirección'} placeholderTextColor={Colors.iconInactive} style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formZip} onChangeText={setFormZip} placeholder="ZIP Code" keyboardType="numeric" maxLength={5} placeholderTextColor={Colors.iconInactive} style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formDescription} onChangeText={setFormDescription} autoCapitalize="sentences" placeholder={t.eventstab?.detailsEvent || 'Detalles'} placeholderTextColor={Colors.iconInactive} multiline style={{ padding: 15, borderRadius: 18, borderWidth: 1, color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, height: 90, textAlignVertical:'top', marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                
                {/* 🚀 SELECCIONAR PLAN */}
                <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: Colors.text, marginBottom: 8, marginTop: 5 }}>SELECCIONA TU PLAN *</ThemedText>
                <View style={{ flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {[
                        { id: 'coupon', name: t.categoryplan.coupon, price: companyTariffs.coupon, desc: t.categoryplan.coupondesc },
                        { id: 'basic', name: t.categoryplan.basic, price: companyTariffs.basic, desc: t.categoryplan.basicdesc },
                        { id: 'premium', name: t.categoryplan.premium, price: companyTariffs.premium, desc: t.categoryplan.premiumdesc },
                        { id: 'unlimited', name: t.categoryplan.unlimited, price: companyTariffs.unlimited, desc: t.categoryplan.unlimiteddesc }
                    ].map(plan => {
                        const pStyle = planStyles[plan.id as keyof typeof planStyles];
                        const isSelected = formPlan === plan.id;
                        return (
                        <TouchableOpacity 
                            key={plan.id} onPress={() => setFormPlan(plan.id)}
                            style={{ padding: 15, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? pStyle.selected : Colors.border, backgroundColor: isSelected ? pStyle.unselected(isDark) : Colors.inputBg }}
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

                {/* 🚀 VERIFICACIÓN DE PAGO */}
                <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border }}>
                  <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: Colors.accent }}>Verificación de Pago</ThemedText>
                  
                  <ThemedText style={{ fontSize: 15, marginBottom: 15, lineHeight: 18, color: Colors.text }}>
                    Para promocionar tu evento, realiza el pago de <ThemedText style={{fontWeight:'900', color: Colors.accent}}>${(companyTariffs as any)[formPlan] || '0.00'} USD</ThemedText> mediante Zelle o Venmo y escribe el código de confirmación aquí abajo.
                  </ThemedText>
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    {['Zelle'].map((method) => (
                      <TouchableOpacity 
                        key={method} 
                        onPress={() => setFormPayMethod(method)} 
                        style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: formPayMethod === method ? Colors.accent : Colors.border, backgroundColor: formPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}
                      >
                        <ThemedText style={{ fontWeight: '900', color: formPayMethod === method ? Colors.accent : Colors.subtext }}>{method}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={`# CONFIRMACION DE ${formPayMethod}...`} placeholderTextColor={Colors.subtext} value={formRefCode} onChangeText={(text) => setFormRefCode(text.toUpperCase())} autoCapitalize="characters" />
                </View>

                <TouchableOpacity onPress={handlePublishEvent} disabled={!isFormValid || isPublishing} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <><MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{t.eventstab?.createEvent || 'Crear'}</ThemedText></>}
                  </LinearGradient>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* 🚀 MODAL DETALLE EXPANDIDO CON FUNCIÓN DE CIERRE LIMPIO */}
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
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 }}>
                  <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>
                    {CATEGORIES_LABELS[INTERNAL_CATEGORIES.indexOf(selectedEventDetails?.category)] || selectedEventDetails?.category}
                  </ThemedText>
                </LinearGradient>
                <ThemedText style={{marginLeft:10, fontWeight:'700'}}>{selectedEventDetails?.date}</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 26, fontWeight: '900', marginBottom: 15, color: Colors.text }}>{selectedEventDetails?.title}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.time} - {selectedEventDetails?.timeEnd}</ThemedText></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="map-marker" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.location}</ThemedText></View>
              <View style={{height:1, backgroundColor:Colors.border, marginVertical:20}} />
              <ThemedText style={{color:Colors.text, lineHeight:22, fontSize:15}}>{selectedEventDetails?.description}</ThemedText>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 25 }}>
                {selectedEventDetails?.phone && (
                  <ActionBtn 
                    minWidth={130}
                    disabled={!selectedEventDetails?.approved}
                    onPress={() => {
                      if(selectedEventDetails.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${selectedEventDetails.phone.replace(/\D/g, '')}`); } 
                      else { Linking.openURL(`tel:${selectedEventDetails.phone}`); }
                    }} 
                    icon={selectedEventDetails.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} 
                    text={selectedEventDetails.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"} 
                    color={selectedEventDetails.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} 
                    bgColor={selectedEventDetails.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)')} 
                  />
                )}
                <ActionBtn 
                  minWidth={130} 
                  disabled={!selectedEventDetails?.approved} 
                  onPress={() => handleShare(selectedEventDetails)} 
                  icon="share-variant" 
                  text={t.genericbtn?.sharingbtn || 'Compartir'} 
                  color={isDark ? '#4FC3F7' : '#1976D2'} 
                  bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} 
                />
              </View>

            </ScrollView>
          </View>
        </View>
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

const EventCard = memo(({ item, isLargeWeb, isDark, Colors, orangeGradient, onOpen, ActionBtn, t, categoryLabels, internalCategories, renderAdminControls }: any) => {
  const catIndex = internalCategories.indexOf(item.category);
  const catLabel = catIndex >= 0 ? categoryLabels[catIndex] : item.category;
  const isPending = !item.approved;
  
  // 🚀 El fondo del componente EventCard (blanco absoluto o gris oscuro)
  const cardBgColor = isPending 
      ? (isDark ? '#1E1E1E' : '#FFFFFF') 
      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)');

  return (
    <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => onOpen(item)} 
        style={{ borderWidth: 1, marginBottom: 20, overflow: 'hidden', width: isLargeWeb ? '48.5%' : '100%', backgroundColor: cardBgColor, borderColor: isPending ? '#FFB74D' : Colors.border, borderRadius: 28 }}
    >
      {/* 🚀 BARRA DE PENDIENTE PEGADA AL BORDE SUPERIOR */}
      {isPending && (
        <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" />
          <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>
            En revisión. Será publicado pronto.
          </ThemedText>
        </View>
      )}

      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
          <ThemedText style={{ fontSize: 12, color: '#FF5F6D', fontWeight: '900' }}>
            {catLabel.toUpperCase()}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
          <MaterialCommunityIcons name="calendar-month" size={14} color="#FFB300" />
          <ThemedText style={{ marginLeft: 4, fontSize: 13, fontWeight: '900', color: Colors.text }}>
            {item.date}
          </ThemedText>
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

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
          {item.phone && (
            <ActionBtn 
              flex={1}
              disabled={isPending}
              onPress={(e: any) => {
                e.stopPropagation?.();
                if(item.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`); } 
                else { Linking.openURL(`tel:${item.phone}`); }
              }} 
              icon={item.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} 
              text={item.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"} 
              color={item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} 
              bgColor={item.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)')} 
            />
          )}
          <ActionBtn 
            flex={1} 
            disabled={isPending}
            onPress={(e: any) => { e.stopPropagation?.(); Share.share({ message: item.title }) }} 
            icon="share-variant" 
            text={t.genericbtn?.sharingbtn || 'Compartir'} 
            color={isDark ? '#4FC3F7' : '#1976D2'} 
            bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} 
           />
        </View>

        {renderAdminControls && renderAdminControls()}
      </View>
    </TouchableOpacity>
  );
});