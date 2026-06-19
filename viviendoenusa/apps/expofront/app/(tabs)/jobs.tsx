import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Alert, Share, ColorValue, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useGlobalSearchParams } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import badWordsData from '@/utils/babwords.json';

// --- LÓGICA DE VALIDACIÓN ---
const BANNED_WORDS = Array.isArray((badWordsData as any)?.badWordsList) ? (badWordsData as any).badWordsList : []; 
const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some((word: string) => lowerText.includes(word.toLowerCase()));
};

// 📡 URL BASE PARA LOS EMPLEOS Y TARIFAS
const API_JOBS_URL = 'http://192.168.252.243:3000/jobs';
const API_TARIFFS_URL = 'http://192.168.252.243:3000/tariffs';

// --- BASE DE DATOS LOCAL DE CIUDADES ---
const usCitiesData: Record<string, string[]> = {
  "California": ["Anaheim", "Bakersfield", "Chino", "Chino Hills", "Corona", "Eastvale", "El Monte", "Fontana", "Fullerton", "Hesperia", "Irvine", "Jurupa Valley", "Long Beach", "Los Angeles", "Moreno Valley", "Ontario", "Pomona", "Rancho Cucamonga", "Rialto", "Riverside", "San Bernardino", "San Diego", "Santa Ana", "Upland", "Victorville"],
  "Texas": ["Austin", "Dallas", "El Paso", "Fort Worth", "Houston", "San Antonio"],
  "Florida": ["Jacksonville", "Miami", "Orlando", "Tampa"]
};
const STATES = Object.keys(usCitiesData);

const COUNTRY_CODES = [{ code: '+1', flag: '🇺🇸' }];

const CATEGORY_MAP: Record<string, string[]> = {
  'Bodega': ['Bodega', 'Warehouse'],
  'Construcción': ['Construcción', 'Construction'],
  'Limpieza': ['Limpieza', 'Cleaning'],
  'Restaurantes': ['Restaurantes', 'Restaurants'],
  'Transporte': ['Transporte', 'Transportation'],
  'Tecnología': ['Tecnología', 'Technology']
};

// 🚀 COMPONENTE: MODAL DE RENOVACIÓN DE EMPLEO
const RenewJobModal = memo(({ visible, onClose, onSuccess, jobToRenew, currentUserId, currentTariff, isDark, Colors, orangeGradient, isLargeWeb, isAndroid, isIOS }: any) => {
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
      const res = await fetch(`${API_JOBS_URL}/${jobToRenew.id}/renew`, {
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
    <RNModal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isRenewing && onClose()} />
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: isLargeWeb ? 400 : '90%', backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
            {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text }}>Renovar Vacante</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 14, color: Colors.text, marginBottom: 20 }}>
              Renueva la vacante de <ThemedText style={{fontWeight: 'bold', color: Colors.accent}}>{jobToRenew?.title}</ThemedText> realizando el pago de ${currentTariff} USD y enviando el comprobante aquí abajo.
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
    </RNModal>
  );
});


export default function JobsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // 🚀 LECTURA GLOBAL DE PARÁMETROS PARA NOTIFICACIONES
  const paramsGlobal = useGlobalSearchParams();
  const rawNotifId = paramsGlobal.openJobId || paramsGlobal.id || paramsGlobal.jobId;
  const notificationId = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;

  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark'; 
  
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  
  const currentUser = userMetadata?.name || userMetadata?.firstName || 'Cesar Gomez';
  const currentUserId = userMetadata?.id || userMetadata?.userId || "baeb641a-3fa4-4fef-9846-d75947d1bca9";

  const jobstabData = (t.jobstab as any) || {};
  
  const JOB_CATEGORIES = jobstabData.jobCategories || [
    { id: 'Todos', icon: 'apps' },
    { id: 'Bodega', icon: 'warehouse' }, 
    { id: 'Construcción', icon: 'hammer-wrench' },
    { id: 'Limpieza', icon: 'broom' },
    { id: 'Restaurantes', icon: 'silverware-fork-knife' },
    { id: 'Transporte', icon: 'truck-fast' },
    { id: 'Tecnología', icon: 'laptop' }
  ];
  
  const SUGGESTED_TITLES: Record<string, string[]> = jobstabData.jobtitles || {};
  const SHIFT_OPTIONS = jobstabData.filter === 'Filter' 
    ? ['Morning', 'Afternoon', 'Night', 'Weekends', 'Flexible']
    : ['Mañana', 'Tarde', 'Noche', 'Fines de Semana', 'Flexible'];

  const styles = useUnifiedCardStyles();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  const isLargeWeb = isWeb && width > 1000;

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);
  
  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#546E7A',
    accent: '#FF5F6D', 
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    cardBg:  isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(255,255,255,0.45)',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'] as const;

  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [allJobs, setAllJobs] = useState<any[]>([]); 
  const [jobs, setJobs] = useState<any[]>([]); 
  const [pendingJobs, setPendingJobs] = useState<any[]>([]); 
  const [isAdminMode, setIsAdminMode] = useState(false); 

  const [activeFilter, setActiveFilter] = useState('Todos');
  const [availabilityFilter, setAvailabilityFilter] = useState<'open' | 'closed'>('open'); 
  const [filterTitle, setFilterTitle] = useState<string>('Todos'); 
  const [filterShift, setFilterShift] = useState<string>('Todos'); 
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  
  const [filterState, setFilterState] = useState<string>('California');
  const [filterLocations, setFilterLocations] = useState<string[]>([]); 
  
  // Modales Empleo
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishView, setPublishView] = useState<'form' | 'city' | 'country'>('form');

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [jobToRenew, setJobToRenew] = useState<any>(null);

  // 🚀 ESTADOS DE PAGO
  const [currentTariff, setCurrentTariff] = useState<string>("750.00");
  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');

  const [newJob, setNewJob] = useState<{
      title: string; company: string; category: string; description: string; 
      contactMethod: 'whatsapp' | 'call'; phoneCode: string; phone: string;
      shifts: string[]; salaryMin: string; salaryMax: string; state: string; city: string;
  }>({ 
      title: '', company: '', category: 'Bodega', description: '', 
      contactMethod: 'whatsapp', phoneCode: '+1', phone: '',
      shifts: [], salaryMin: '', salaryMax: '', state: 'California', city: ''
  });
  
  // Selectores y Reseñas
  const [showShiftPickerModal, setShowShiftPickerModal] = useState(false);
  const [showTitlePickerModal, setShowTitlePickerModal] = useState(false); 
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false); 
  
  const [selectedCompany, setSelectedCompany] = useState<any>(null); 
  const [selectedJobDetail, setSelectedJobDetail] = useState<any>(null); 
  const [reviewForm, setReviewForm] = useState({ visible: false, text: '', rating: 0, isAnonymous: false });

  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  // 🚀 FETCH TARIFA
  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Jobs`);
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

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        const storedJobs = await AsyncStorage.getItem('@saved_jobs');
        if (storedJobs) {
          setSavedJobs(JSON.parse(storedJobs));
        }
      } catch (error) {
        console.error("Error cargando empleos guardados", error);
      }
    };
    loadSavedJobs();
  }, []);

  // --- OBTENER EMPLEOS (CON PARÁMETROS COMPLETOS) ---
  const fetchJobsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_JOBS_URL}?userId=${currentUserId}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => {
          const parsedReviews = item.reviews ? item.reviews.map((r: any) => ({
             id: r.id,
             stars: Number(r.rating || r.stars) || 0,
             text: r.review || r.comment || '',
             userName: r.userName || r.name || 'Anónimo',
             displayTime: r.displayTime || ''
          })) : [];

          const realRating = parsedReviews.length > 0 
            ? parsedReviews.reduce((sum: number, r: any) => sum + r.stars, 0) / parsedReviews.length 
            : 0;

          return {
            id: item.id,
            userName: item.ownerName || item.userNameId || 'Anónimo',
            userId: item.userId || item.user_id,
            title: item.title || item.nameJobs || 'Sin Título',
            company: item.company || '',
            category: item.category || 'Otros',
            state: item.stateCountry || 'California',
            city: item.city || '',
            zip: item.zip || '',
            contactMethod: item.contactMethod ? 'whatsapp' : 'call', 
            phoneCode: item.phoneCode || '+1',
            phone: item.phone || '',
            shifts: item.shifts ? item.shifts.split(',').map((s: string) => s.trim()) : [],
            salaryMin: item.salaryMin || '',
            salaryMax: item.salaryMax || '',
            rating: realRating, 
            reviews: parsedReviews, 
            description: item.descriptionJob || '',
            status: item.approved ? 'approved' : 'pending',
            isOpen: item.isOpen,
            referenceCode: item.referenceCode,
            paymentMethod: item.paymentMethod,
            timepostEnd: item.timepostEnd || item.timepost_end,
            displayTime: new Date(item.createdAt).toLocaleDateString()
          };
        });

        setAllJobs(mappedData);
        setJobs(mappedData.filter(job => job.status === 'approved'));
        setPendingJobs(mappedData.filter(job => job.status === 'pending'));
      }
    } catch (e) {
      console.error("Error al obtener empleos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, [currentUserId]);

  // 🚀 LÓGICA BLINDADA DE APERTURA AUTOMÁTICA DESDE NOTIFICACIÓN
  const lastProcessedNotifId = useRef<string | null>(null);

  useEffect(() => {
    if (!notificationId) {
      lastProcessedNotifId.current = null;
      return;
    }

    const cleanNotifId = String(notificationId).trim();

    if (cleanNotifId && cleanNotifId !== lastProcessedNotifId.current) {
      lastProcessedNotifId.current = cleanNotifId;
      
      router.setParams({ id: '', openJobId: '', jobId: '' });

      const localMatch = jobs.find(j => String(j.id) === cleanNotifId) || pendingJobs.find(j => String(j.id) === cleanNotifId);

      if (localMatch) {
        setSelectedJobDetail(localMatch);
      } else {
        const fetchSpecificJob = async () => {
          try {
            const res = await fetch(`${API_JOBS_URL}/${cleanNotifId}`);
            if (res.ok) {
              const data = await res.json();
              
              const mappedJob = {
                ...data,
                title: data.title || data.nameJobs || 'Sin Título',
                description: data.descriptionJob || data.description || '',
                state: data.stateCountry || 'California',
                contactMethod: data.contactMethod ? 'whatsapp' : 'call',
                shifts: data.shifts ? data.shifts.split(',').map((s: string) => s.trim()) : [],
              };

              setSelectedJobDetail(mappedJob); 
            }
          } catch (e) {
            console.error("❌ Error Fetch notificación de Job:", e);
          }
        };
        fetchSpecificJob();
      }
    }
  }, [notificationId, jobs, pendingJobs]);

  const handleCloseDetailModal = () => {
    setSelectedJobDetail(null);
    lastProcessedNotifId.current = null;
    router.setParams({ id: '', openJobId: '', jobId: '' });
  };

  const toggleSaveJob = async (id: string) => {
    try {
      let newSavedList;
      if (savedJobs.includes(id)) {
        newSavedList = savedJobs.filter(j => j !== id);
        triggerAlert("Eliminado", "Empleo eliminado de tus guardados.");
      } else {
        newSavedList = [...savedJobs, id];
        triggerAlert("Guardado", "Empleo guardado exitosamente.");
      }
      
      setSavedJobs(newSavedList);
      await AsyncStorage.setItem('@saved_jobs', JSON.stringify(newSavedList));
    } catch (error) {
      console.error("Error guardando el empleo", error);
    }
  };

  const availableTitles = useMemo(() => {
    if (activeFilter === 'Todos' || activeFilter === 'All') {
        if (!SUGGESTED_TITLES || Object.keys(SUGGESTED_TITLES).length === 0) return [];
        return Array.from(new Set(Object.values(SUGGESTED_TITLES).flat())).sort();
    }
    return SUGGESTED_TITLES[activeFilter] || [];
  }, [activeFilter, SUGGESTED_TITLES]);

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

  const toggleNewJobShift = (shift: string) => {
      setNewJob(prev => {
          const exists = prev.shifts.includes(shift);
          if (exists) return { ...prev, shifts: prev.shifts.filter(s => s !== shift) };
          return { ...prev, shifts: [...prev.shifts, shift] };
      });
  };

  const toggleLocationFilter = (city: string) => {
      setFilterLocations(prev => {
          if (prev.includes(city)) return prev.filter(c => c !== city);
          return [...prev, city];
      });
  };

  const handleShareJob = async (job: any) => {
      if (!job) return;
      try {
          await Share.share({
              message: `¡Mira esta oferta de empleo!\n\n📌 Puesto: ${job.title}\n🏢 Empresa: ${job.company}\n📍 Ubicación: ${job.city}, ${job.state}\n💵 Pago: $${job.salaryMin}/hr\n\nPostúlate o encuentra más vacantes en Viviendo en USA.`
          });
      } catch (error) {
          console.log(error);
      }
  };

  // 🚀 PUBLICAR CON VERIFICACIÓN DE PAGO
  const handlePublishJob = async () => {
    if (!newJob.title || !newJob.company || !newJob.city || !newJob.description || !newJob.phone || newJob.shifts.length === 0 || !newJob.salaryMin || !formRefCode.trim()) {
      triggerAlert("Campos Incompletos", "Por favor completa todos los campos, incluyendo el código de confirmación de pago.");
      return;
    }
    if (!validateComment(newJob.description)) {
      triggerAlert("Error", "La descripción contiene palabras no permitidas.");
      return; 
    }
    
    setIsPublishing(true);
    try {
      const payload = {
        nameJobs: newJob.title.trim(),
        title: newJob.title.trim(),
        company: newJob.company.trim(),
        category: newJob.category,
        stateCountry: newJob.state,
        city: newJob.city.trim(),
        zip: '', 
        contactMethod: newJob.contactMethod === 'whatsapp',
        phoneCode: newJob.phoneCode,
        phone: newJob.phone.trim(),
        shifts: newJob.shifts.join(', '),
        salaryMin: newJob.salaryMin.trim(),
        salaryMax: newJob.salaryMax.trim(),
        descriptionJob: newJob.description.trim(),
        isOpen: true,
        userId: userMetadata?.id || null,
        userNameId: currentUser,
        imageRute: '',
        referenceCode: formRefCode,
        paymentMethod: formPayMethod 
      };

      const res = await fetch(API_JOBS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Fallo en servidor");

      fetchJobsData(); 
      setModalVisible(false);
      setNewJob({ title: '', company: '', category: 'Bodega', description: '', contactMethod: 'whatsapp', phoneCode: '+1', phone: '', shifts: [], salaryMin: '', salaryMax: '', state: 'California', city: '' });
      setFormRefCode('');
      setFormPayMethod('Zelle');

      triggerAlert("¡Recibido!", "Tu empleo ha sido publicado/enviado exitosamente y está pendiente de aprobación.");
    } catch (e) {
      triggerAlert("Error", "No se pudo publicar el empleo. Revisa tu conexión.");
    } finally {
      setIsPublishing(false);
    }
  };

  // 🚀 APROBAR CON MESES
  const handleApproveJob = async (id: string, durationMonths: number) => {
    try {
      const res = await fetch(`${API_JOBS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, durationMonths })
      });

      if (!res.ok) throw new Error("No se pudo aprobar");

      const jobToApprove = pendingJobs.find(job => job.id === id);
      if (jobToApprove) {
        
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + durationMonths);

        jobToApprove.status = 'approved';
        jobToApprove.timepostEnd = futureDate.toISOString();
        
        setJobs(prev => [jobToApprove, ...prev]);
        setPendingJobs(prev => prev.filter(job => job.id !== id));
      }
      triggerAlert("Aprobado", `La oferta de empleo ahora es pública por ${durationMonths} meses.`);
    } catch (e) {
      triggerAlert("Error", "Ocurrió un error al aprobar la oferta.");
    }
  };

  const handleRejectJob = async (id: string) => {
    try {
      const res = await fetch(`${API_JOBS_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("No se pudo rechazar");
      setPendingJobs(prev => prev.filter(job => job.id !== id));
      triggerAlert("Rechazado", "La oferta de empleo ha sido eliminada.");
    } catch (e) {
      triggerAlert("Error", "Ocurrió un error al rechazar la oferta.");
    }
  };

  const toggleJobStatus = async (id: string, currentIsOpen: boolean) => {
    try {
      const willBeOpen = !currentIsOpen;
      setJobs(prevJobs => prevJobs.map(job => {
        if (job.id === id) return { ...job, isOpen: willBeOpen, displayTime: willBeOpen ? 'Justo ahora' : job.displayTime };
        return job;
      }));
      await fetch(`${API_JOBS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: willBeOpen })
      });
    } catch (e) { console.error("Error al actualizar estado:", e); }
  };

  const handleContact = (method: 'whatsapp' | 'call', code: string, phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = `${code}${cleanPhone}`;
    let url = method === 'call' ? `tel:${fullNumber}` : `https://wa.me/${cleanPhone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
    }).catch(err => console.log(err));
  };

  const handleSubmitReview = async () => {
      if (!reviewForm.text.trim() || reviewForm.rating === 0) {
          triggerAlert("Incompleto", "Por favor ingresa un comentario y selecciona la cantidad de estrellas.");
          return;
      }
      if (!validateComment(reviewForm.text)) {
          triggerAlert("Error", "Tu reseña contiene palabras no permitidas.");
          return;
      }

      try {
        const idParaEnviar = userMetadata?.id || userMetadata?.uid || 'baeb641a-3fa4-4fef-9846-d75947d1bca9';

        const payload = {
          reference_id: selectedCompany.id,
          stars: reviewForm.rating,
          comment: reviewForm.text,
          userId: idParaEnviar, 
          userName: currentUser,
          isAnonymous: reviewForm.isAnonymous 
        };

        const res = await fetch(`${API_JOBS_URL}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
           const errorData = await res.json().catch(() => ({}));
           if (errorData.message === "ALREADY_REVIEWED" || res.status === 400) {
               throw new Error("Ya dejaste una reseña para esta empresa anteriormente.");
           }
           throw new Error("No se pudo publicar la reseña.");
        }

        const savedReview = await res.json();
        
        const newReviewFormatted = { 
          id: savedReview.id || Date.now(), 
          text: savedReview.comment || reviewForm.text, 
          stars: Number(savedReview.stars || reviewForm.rating), 
          userName: savedReview.userName 
        };
        
        let newAverage = 0;
        
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === selectedCompany.id) {
                const updatedReviews = [newReviewFormatted, ...job.reviews];
                newAverage = updatedReviews.reduce((acc: number, r: any) => acc + r.stars, 0) / updatedReviews.length;
                return { ...job, reviews: updatedReviews, rating: newAverage };
            }
            return job;
        }));
        
        setSelectedCompany((prev: any) => {
            if(!prev) return prev;
            const updatedReviews = [newReviewFormatted, ...prev.reviews];
            return { ...prev, reviews: updatedReviews, rating: newAverage };
        });
        
        setReviewForm({ visible: false, text: '', rating: 0, isAnonymous: false });
        triggerAlert("¡Gracias!", "Tu reseña ha sido publicada exitosamente.");

      } catch (e: any) {
        triggerAlert("Aviso", e.message || "No se pudo publicar la reseña.");
      }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      let matchCategory = false;
      if (activeFilter === 'Todos' || activeFilter === 'All') {
          matchCategory = true;
      } else {
          const spanishCategory = Object.keys(CATEGORY_MAP).find(key => 
              CATEGORY_MAP[key].includes(activeFilter) || key === activeFilter
          );
          if (spanishCategory) matchCategory = CATEGORY_MAP[spanishCategory].includes(job.category);
          else matchCategory = job.category === activeFilter;
      }

      const matchAvailability = availabilityFilter === 'open' ? job.isOpen === true : job.isOpen === false;
      const matchShift = filterShift === 'Todos' || filterShift === 'All' || job.shifts.some((s: string) => s === filterShift);
      const matchTitle = filterTitle === 'Todos' || filterTitle === 'All' || job.title === filterTitle;
      const matchState = job.state === filterState;
      const matchLocation = filterLocations.length === 0 || filterLocations.includes(job.city);
      
      const matchSaved = showSavedOnly ? savedJobs.includes(job.id) : true;
      
      return matchCategory && matchAvailability && matchShift && matchTitle && matchState && matchLocation && matchSaved;
    });
  }, [jobs, activeFilter, availabilityFilter, filterTitle, filterShift, filterState, filterLocations, showSavedOnly, savedJobs]);

  const locationButtonText = filterLocations.length === 0 
      ? (jobstabData.filter === 'Filter' ? 'All Cities' : 'Todas las Ciudades')
      : filterLocations.length === 1 
          ? filterLocations[0] 
          : `${filterLocations.length} ${jobstabData.filter === 'Filter' ? 'cities' : 'ciudades'}`;

  // 🚀 NUEVO COMPONENTE ADMIN
  const PendingJobItem = ({ job }: { job: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    
    return (
        <View style={{ marginBottom: 15 }}>
            <View style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: '#FFB74D' }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedJobDetail(job)}>
                    <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, margin: 10, marginBottom: 0, flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#FFB74D" />
                        <ThemedText style={{ color: '#FFB74D', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>Pendiente de aprobación (Admin)</ThemedText>
                    </View>
                    <View style={{ padding: 15 }}>
                        <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{job.title}</ThemedText>
                        <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, marginTop: 4, fontWeight: 'bold' }}>{job.company}</ThemedText>
                    </View>
                </TouchableOpacity>

                {/* Controles de Admin con Ref y Meses */}
                <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: DynamicColors.border, padding: 15 }}>
                    <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.5)' }}>
                        <MaterialCommunityIcons name="bank-transfer" size={18} color="#FFB74D" />
                        <ThemedText style={{ fontSize: 12, color: DynamicColors.text, fontWeight: '600', marginLeft: 8 }}>
                            Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{job.referenceCode || 'N/A'}</ThemedText> ({job.paymentMethod || 'Pago'})
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
                        <TouchableOpacity onPress={() => handleRejectJob(job.id)} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Rechazar</ThemedText></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleApproveJob(job.id, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Aprobar</ThemedText></TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 🚀 MODAL RENOVACIÓN */}
      <RenewJobModal 
        visible={renewModalVisible} 
        onClose={() => setRenewModalVisible(false)} 
        onSuccess={() => { setRenewModalVisible(false); fetchJobsData(); }} 
        jobToRenew={jobToRenew} currentUserId={currentUserId} currentTariff={currentTariff} 
        isDark={isDark} Colors={DynamicColors} orangeGradient={orangeGradient} 
        isLargeWeb={isLargeWeb} isAndroid={isAndroid} isIOS={isIOS} 
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              
              <View style={[styles.headerRow, { marginBottom: 15, justifyContent: 'space-between', alignItems: 'center' }]}>
                
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4, zIndex: 10 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 3, borderWidth: 1, borderColor: DynamicColors.border }}>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('open')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: availabilityFilter === 'open' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: availabilityFilter === 'open' ? '#FFF' : DynamicColors.subtext }}>{jobstabData.statusBottonModalDis || 'Disponible'}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('closed')} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: availabilityFilter === 'closed' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: availabilityFilter === 'closed' ? '#FFF' : DynamicColors.subtext }}>{jobstabData.statusBottonModalNoDis || 'No Disp.'}</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity onPress={() => setShowSavedOnly(!showSavedOnly)} style={{ padding: 0 }}>
                      <MaterialCommunityIcons 
                          name={showSavedOnly ? "bookmark" : "bookmark-outline"} 
                          size={24} 
                          color={showSavedOnly ? DynamicColors.accent : DynamicColors.text} 
                          style={{opacity: showSavedOnly ? 1 : 0.6}}
                      />
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => { setIsAdminMode(!isAdminMode); }} style={{ padding: 0 }}>
                      <MaterialCommunityIcons name="briefcase-search" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.2}}/>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                
                {isLargeWeb && (
                  <View style={styles.webSidebar}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>{jobstabData.filter || 'Filtro'}</ThemedText>
                      
                      <TouchableOpacity onPress={() => setShowLocationPickerModal(true)} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: 1, borderColor: DynamicColors.border }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                              <MaterialCommunityIcons name="map-marker-radius" size={18} color={filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.text} style={{ marginRight: 10 }} />
                              <ThemedText style={{ color: filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.text, fontWeight: 'bold', fontSize: 14 }}>{filterLocations.length > 0 ? `${filterLocations.length} Ciudades` : 'Ubicación'}</ThemedText>
                          </View>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => setShowShiftPickerModal(true)} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: 1, borderColor: DynamicColors.border }}>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                              <MaterialCommunityIcons name="clock-outline" size={18} color={filterShift !== 'Todos' && filterShift !== 'All' ? DynamicColors.accent : DynamicColors.text} style={{ marginRight: 10 }} />
                              <ThemedText style={{ color: filterShift !== 'Todos' && filterShift !== 'All' ? DynamicColors.accent : DynamicColors.text, fontWeight: 'bold', fontSize: 14 }}>{filterShift === 'Todos' || filterShift === 'All' ? 'Turnos' : filterShift}</ThemedText>
                          </View>
                      </TouchableOpacity>

                      <View style={{ height: 1, backgroundColor: DynamicColors.border, marginVertical: 10 }} />

                      {JOB_CATEGORIES.map((cat: any) => {
                        const isActive = activeFilter === cat.id;
                        return (
                          <TouchableOpacity key={cat.id} onPress={() => { setActiveFilter(cat.id); setFilterTitle('Todos'); }} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{cat.id}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color={DynamicColors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: DynamicColors.text, fontWeight: 'bold', fontSize: 14 }}>{cat.id}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}  
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  
                  {isAdminMode && pendingJobs.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>Verificar ({pendingJobs.length})</ThemedText>
                      {pendingJobs.map(job => (
                        <PendingJobItem key={job.id} job={job} />
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                    <TouchableOpacity onPress={() => setShowLocationPickerModal(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: filterLocations.length > 0 ? 'rgba(255, 95, 109, 0.1)' : DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.border, paddingHorizontal: 15, height: 48 }}>
                        <MaterialCommunityIcons name="map-marker-radius" size={18} color={filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.subtext} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1, overflow: 'hidden' }}>
                            <ThemedText numberOfLines={1} style={{ color: filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.text, fontWeight: 'bold', fontSize: 13 }}>
                                {locationButtonText}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 9, color: DynamicColors.subtext }}>{filterState}</ThemedText>
                        </View>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={filterLocations.length > 0 ? DynamicColors.accent : DynamicColors.subtext} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowShiftPickerModal(true)} style={{ width: isLargeWeb ? undefined : 48, flex: isLargeWeb ? 1 : undefined, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: filterShift !== 'Todos' && filterShift !== 'All' ? 'rgba(255, 95, 109, 0.1)' : DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: filterShift !== 'Todos' && filterShift !== 'All' ? DynamicColors.accent : DynamicColors.border, paddingHorizontal: isLargeWeb ? 15 : 0, height: 48 }}>
                        <MaterialCommunityIcons name="clock-outline" size={isLargeWeb ? 18 : 22} color={filterShift !== 'Todos' && filterShift !== 'All' ? DynamicColors.accent : DynamicColors.subtext} style={{ marginRight: isLargeWeb ? 8 : 0 }} />
                        {isLargeWeb && (
                            <>
                                <ThemedText style={{ flex: 1, color: filterShift === 'Todos' || filterShift === 'All' ? DynamicColors.subtext : DynamicColors.accent, fontWeight: 'bold', fontSize: 13 }}>
                                    {filterShift === 'Todos' || filterShift === 'All' ? 'Turno' : filterShift}
                                </ThemedText>
                                <MaterialCommunityIcons name="chevron-down" size={18} color={filterShift !== 'Todos' && filterShift !== 'All' ? DynamicColors.accent : DynamicColors.subtext} />
                            </>
                        )}
                    </TouchableOpacity>
                  </View>

                  {!isLargeWeb && (
                    <View style={{ marginBottom: 8, minHeight: 46 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 6 }} keyboardShouldPersistTaps="handled">
                        <View style={{ flexDirection: 'row', gap: 8 }}> 
                          {JOB_CATEGORIES.map((cat: any) => {
                            const isActive = activeFilter === cat.id;
                            return (
                              <TouchableOpacity key={cat.id} onPress={() => { setActiveFilter(cat.id); setFilterTitle('Todos'); }} style={{ borderRadius: 12, overflow: 'hidden', height: 40, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                                 {isActive ? (
                                   <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                     <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{cat.id}</ThemedText>
                                   </LinearGradient>
                                 ) : (
                                   <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                     <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: 'bold', fontSize: 12 }}>{cat.id}</ThemedText>
                                   </View>
                                 )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  <View style={{ marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => setShowTitlePickerModal(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: filterTitle !== 'Todos' && filterTitle !== 'All' ? 'rgba(255, 95, 109, 0.1)' : DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.border, paddingHorizontal: 15, height: 48 }}>
                          <MaterialCommunityIcons name="briefcase-outline" size={18} color={filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.subtext} style={{ marginRight: 8 }} />
                          <ThemedText style={{ flex: 1, color: filterTitle === 'Todos' || filterTitle === 'All' ? DynamicColors.subtext : DynamicColors.accent, fontWeight: 'bold', fontSize: 13 }}>
                              {filterTitle === 'Todos' || filterTitle === 'All' ? `Cualquier Puesto en ${activeFilter}` : filterTitle}
                          </ThemedText>
                          <MaterialCommunityIcons name="chevron-down" size={18} color={filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.subtext} />
                      </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {filteredJobs.length === 0 ? (
                       <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                         <MaterialCommunityIcons name="briefcase-variant-off" size={56} color={DynamicColors.subtext} />
                         <ThemedText style={{ color: DynamicColors.subtext, marginTop: 14, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 20 }}>
                           {showSavedOnly ? "Aún no has guardado ninguna vacante." : "No se encontraron empleos con estos filtros."}
                         </ThemedText>
                       </View>
                    ) : (
                      filteredJobs.map(job => {
                        const reviewCount = job.reviews?.length || 0;
                        let formattedCount = reviewCount.toString();
                        if (reviewCount >= 1000) {
                          formattedCount = (reviewCount / 1000).toFixed(1) + 'k';
                        }
                        
                        const isOwner = job.userId === currentUserId || job.userName === currentUser;
                        const isExpired = (job.timepostEnd && new Date(job.timepostEnd).getFullYear() > 1970) 
                            ? new Date(job.timepostEnd) < new Date() 
                            : false;
                        
                        const fadeCard = (!job.isOpen || isExpired);

                        return (
                          <View key={job.id} style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: (isExpired) ? '#FFB74D' : DynamicColors.border, opacity: fadeCard ? 0.65 : 1 }}>
                            
                            {isOwner && isExpired && (
                              <View style={{ backgroundColor: 'rgba(255, 82, 82, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 82, 82, 0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                  <MaterialCommunityIcons name="alert-circle" size={20} color="#FF5252" />
                                  <ThemedText style={{ color: '#FF5252', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>Tu publicación ha expirado.</ThemedText>
                                </View>
                                <TouchableOpacity onPress={() => { setJobToRenew(job); setRenewModalVisible(true); }} style={{ backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 10 }}>
                                  <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>Renovar</ThemedText>
                                </TouchableOpacity>
                              </View>
                            )}

                            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedJobDetail(job)}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                                <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                                  <ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{job.category.toUpperCase()}</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                  <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                                  <ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{job.rating > 0 ? job.rating.toFixed(1) : 'Nuevo'}</ThemedText>
                                </View>
                              </View>

                              <View style={{ padding: 15, paddingTop: 0 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text, flex: 1 }}>{job.title}</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <MaterialCommunityIcons name="domain" size={14} color={DynamicColors.subtext} />
                                    <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, marginLeft: 4, fontWeight: 'bold' }}>{job.company}</ThemedText>
                                </View>
                                
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                      <MaterialCommunityIcons name="map-marker-radius" size={14} color={DynamicColors.subtext} />
                                      <ThemedText numberOfLines={1} style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.subtext, marginLeft: 4 }}>
                                          {job.city}, {job.state}
                                      </ThemedText>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                      <MaterialCommunityIcons name="cash" size={14} color="#4CAF50" />
                                      <ThemedText numberOfLines={1} style={{ fontSize: 12, fontWeight: 'bold', color: '#4CAF50', marginLeft: 4 }}>
                                          ${job.salaryMin}{job.salaryMax ? ` - $${job.salaryMax}` : ''}/hr
                                      </ThemedText>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 95, 109, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                      <MaterialCommunityIcons name="clock-outline" size={14} color={DynamicColors.accent} />
                                      <ThemedText numberOfLines={1} style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.accent, marginLeft: 4 }}>
                                          {job.shifts.join(', ')}
                                      </ThemedText>
                                  </View>
                                </View>

                                <ThemedText numberOfLines={2} style={{ fontSize: 14, color: DynamicColors.text, marginTop: 15, lineHeight: 22, opacity: 0.8 }}>{job.description}</ThemedText>

                                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 }}>
                                    <MaterialCommunityIcons name="arrow-expand" size={14} color={DynamicColors.text} style={{ marginRight: 6 }} />
                                    <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.text }}>Ver detalle completo</ThemedText>
                                </View>
                              </View>
                            </TouchableOpacity>

                            <View style={{ padding: 15, paddingTop: 0 }}>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15, marginTop: 5, paddingBottom: isOwner ? 10 : 0 }}>
                                  <TouchableOpacity onPress={() => setSelectedCompany(job)} disabled={isExpired} style={{ flex: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                                    <MaterialCommunityIcons name="comment-text-outline" size={16} color={DynamicColors.text} />
                                    <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: DynamicColors.text }}>
                                      Reseñas {reviewCount > 0 ? `(${formattedCount})` : ''}
                                    </ThemedText>
                                  </TouchableOpacity>

                                  <TouchableOpacity onPress={() => handleContact(job.contactMethod as 'whatsapp'|'call', job.phoneCode, job.phone)} disabled={!job.isOpen || isExpired} style={{ flex: 2, minWidth: 140, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: job.contactMethod === 'whatsapp' ? 'rgba(76, 175, 80, 0.15)' : (isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD')}}>
                                  <MaterialCommunityIcons name={job.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={16} color={job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2')} />
                                  <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2') }}>
                                      {job.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamar'}
                                  </ThemedText>
                                  </TouchableOpacity>
                              </View>

                              {isOwner && (
                                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 10 }}>
                                  <TouchableOpacity onPress={() => toggleJobStatus(job.id, job.isOpen)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: job.isOpen ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 }}>
                                      <MaterialCommunityIcons name={job.isOpen ? "briefcase-off" : "briefcase-check"} size={16} color={job.isOpen ? "#FF5252" : "#4CAF50"} />
                                      <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: job.isOpen ? "#FF5252" : "#4CAF50", marginLeft: 6 }}>
                                      {job.isOpen ? "Marcar como No Disponible" : "Reabrir Vacante"}
                                      </ThemedText>
                                  </TouchableOpacity>
                                  </View>
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => { setPublishView('form'); setModalVisible(true); }} style={[styles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
          <MaterialCommunityIcons name="briefcase-plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <RNModal visible={!!selectedJobDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseDetailModal} />
          
          <View style={{ width: '90%', maxHeight: '80%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => handleShareJob(selectedJobDetail)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
                        <MaterialCommunityIcons name="share-variant" size={22} color={DynamicColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleSaveJob(selectedJobDetail.id)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
                        <MaterialCommunityIcons 
                          name={savedJobs.includes(selectedJobDetail?.id) ? "bookmark" : "bookmark-outline"} 
                          size={22} 
                          color={savedJobs.includes(selectedJobDetail?.id) ? DynamicColors.accent : DynamicColors.text} 
                        />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleCloseDetailModal} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
                    <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ padding: 25, paddingTop: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>
                          {selectedJobDetail?.category?.toUpperCase()}
                      </ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', marginLeft: 15, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                    <ThemedText style={{ marginLeft: 5, fontWeight: '900', color: DynamicColors.text, fontSize: 16 }}>{selectedJobDetail?.rating > 0 ? selectedJobDetail?.rating.toFixed(1) : 'Nuevo'}</ThemedText>
                  </View>
                </View>
                
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: DynamicColors.text }}>{selectedJobDetail?.title}</ThemedText>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 20 }}>
                    <MaterialCommunityIcons name="domain" size={16} color={DynamicColors.subtext} />
                    <ThemedText style={{ fontSize: 14, color: DynamicColors.subtext, marginLeft: 4, fontWeight: 'bold' }}>{selectedJobDetail?.company}</ThemedText>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="map-marker-outline" size={14} color={DynamicColors.text} />
                        <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.text, marginLeft: 6 }}>{selectedJobDetail?.city}, {selectedJobDetail?.state}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="cash" size={14} color="#4CAF50" />
                        <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: '#4CAF50', marginLeft: 6 }}>
                          ${selectedJobDetail?.salaryMin}{selectedJobDetail?.salaryMax ? ` - $${selectedJobDetail?.salaryMax}` : ''} /hr
                        </ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 95, 109, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={DynamicColors.accent} />
                        <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.accent, marginLeft: 6 }}>{selectedJobDetail?.shifts?.join(', ')}</ThemedText>
                    </View>
                </View>

                <View style={{height:1, backgroundColor:DynamicColors.border, marginVertical:15}} />

                <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8, textTransform: 'uppercase' }}>Descripción de la Vacante</ThemedText>
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 25 }}>{selectedJobDetail?.description}</ThemedText>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 }}>
                    <TouchableOpacity onPress={() => { setSelectedJobDetail(null); setTimeout(() => setSelectedCompany(selectedJobDetail), 300); }} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                        <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.text }}>Ver Reseñas</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleContact(selectedJobDetail?.contactMethod as 'whatsapp'|'call', selectedJobDetail?.phoneCode, selectedJobDetail?.phone)} disabled={!selectedJobDetail?.isOpen} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: selectedJobDetail?.contactMethod === 'whatsapp' ? '#4CAF50' : '#2196F3', opacity: !selectedJobDetail?.isOpen ? 0.4 : 1 }}>
                        <MaterialCommunityIcons name={selectedJobDetail?.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color="#FFF" />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#FFF' }}>
                            {selectedJobDetail?.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamar'}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </RNModal>

      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%', alignSelf: 'center' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              {publishView === 'city' ? (
                 <View style={{ padding: 25, height: height * 0.7, zIndex: 999 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                         <TouchableOpacity onPress={() => setPublishView('form')} style={{ paddingRight: 15 }}>
                             <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                         </TouchableOpacity>
                         <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>Elige la Ciudad en {newJob.state}</ThemedText>
                     </View>
                     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                         <View style={{ flexDirection: 'column', gap: 10 }}>
                             {(usCitiesData[newJob.state] || []).map((city, index) => (
                                 <TouchableOpacity 
                                     key={index} 
                                     style={{ padding: 15, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: newJob.city === city ? DynamicColors.accent : DynamicColors.border }} 
                                     onPress={() => { setNewJob({...newJob, city}); setPublishView('form'); }}>
                                     <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: newJob.city === city ? DynamicColors.accent : DynamicColors.text }}>{city}</ThemedText>
                                 </TouchableOpacity>
                             ))}
                         </View>
                     </ScrollView>
                 </View>
              ) : publishView === 'country' ? (
                 <View style={{ padding: 25, height: height * 0.6, zIndex: 999 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                         <TouchableOpacity onPress={() => setPublishView('form')} style={{ paddingRight: 15 }}>
                             <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                         </TouchableOpacity>
                         <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>Selecciona el País</ThemedText>
                     </View>
                     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                         <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                             {COUNTRY_CODES.map((country, index) => (
                                 <TouchableOpacity key={index} style={{ padding: 15, backgroundColor: DynamicColors.inputBg, borderRadius: 12, width: '45%', alignItems: 'center', borderWidth: 1, borderColor: DynamicColors.border, flexDirection: 'row', justifyContent: 'center' }} onPress={() => {
                                     setNewJob({...newJob, phoneCode: country.code});
                                     setPublishView('form');
                                 }}>
                                     <ThemedText style={{ fontSize: 18, marginRight: 8 }}>{country.flag}</ThemedText>
                                     <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: DynamicColors.text }}>{country.code}</ThemedText>
                                 </TouchableOpacity>
                             ))}
                         </View>
                     </ScrollView>
                 </View>
              ) : (
              <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, marginBottom: 10 }}>
                    <View>
                        <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{jobstabData.labeljobs || 'Empleos'}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: '#FFB74D', fontWeight: 'bold', marginTop: 4 }}>{jobstabData.labeladmin || 'Admin'}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {JOB_CATEGORIES.filter((c: any) => c.id !== 'Todos').map((cat: any) => (
                        <TouchableOpacity key={cat.id} onPress={() => setNewJob({...newJob, category: cat.id, title: ''})} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: newJob.category === cat.id ? 0 : 1, borderColor: DynamicColors.border }}>
                          {newJob.category === cat.id ? (
                              <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14 }}>
                                  <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{marginRight:6}} />
                                  <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{cat.id}</ThemedText>
                              </LinearGradient>
                          ) : (
                              <View style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                  <MaterialCommunityIcons name={cat.icon as any} size={16} color={DynamicColors.iconInactive} style={{marginRight:6}} />
                                  <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 13, fontWeight: 'bold' }}>{cat.id}</ThemedText>
                              </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>TÍTULO DEL PUESTO *</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}} contentContainerStyle={{gap: 8}}>
                        {(SUGGESTED_TITLES[newJob.category] || SUGGESTED_TITLES['Todos'] || []).map((suggestion: string) => {
                            const isSelected = newJob.title === suggestion;
                            return (
                                <TouchableOpacity key={suggestion} onPress={() => setNewJob({...newJob, title: suggestion})} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                    {isSelected ? (
                                        <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
                                            <MaterialCommunityIcons name="check" size={14} color="#FFF" style={{ marginRight: 4 }} />
                                            <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: '#FFF' }}>{suggestion}</ThemedText>
                                        </LinearGradient>
                                    ) : (
                                        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: DynamicColors.inputBg }}>
                                            <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: DynamicColors.text }}>{suggestion}</ThemedText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TextInput 
                      value={newJob.title} 
                      onChangeText={t => setNewJob({...newJob, title: t})} 
                      placeholder="Escribe o elige un puesto arriba..." 
                      placeholderTextColor="#999" 
                      autoCapitalize="words"
                      style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    />

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>ESTADO *</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}} contentContainerStyle={{gap: 8}}>
                        {STATES.map(st => {
                            const isSelected = newJob.state === st;
                            return (
                                <TouchableOpacity key={st} onPress={() => setNewJob({...newJob, state: st, city: ''})} style={{ borderRadius: 14, overflow: 'hidden', borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                    {isSelected ? (
                                        <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                                            <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: '#FFF' }}>{st}</ThemedText>
                                        </LinearGradient>
                                    ) : (
                                        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: DynamicColors.inputBg }}>
                                            <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: DynamicColors.text }}>{st}</ThemedText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>CIUDAD *</ThemedText>
                    <View style={{ zIndex: 50, marginBottom: 20 }}>
                        <TouchableOpacity 
                            onPress={() => setPublishView('city')} 
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: DynamicColors.border }}>
                            <ThemedText style={{ flex: 1, color: newJob.city ? DynamicColors.text : '#999', fontSize: 14 }}>
                                {newJob.city || 'Seleccionar Ciudad...'}
                            </ThemedText>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={DynamicColors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>EMPRESA / CONTRATISTA *</ThemedText>
                    <TextInput 
                      value={newJob.company} 
                      onChangeText={t => setNewJob({...newJob, company: t})} 
                      placeholder="Nombre del negocio o persona" 
                      placeholderTextColor="#999" 
                      autoCapitalize="words"
                      style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    />

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>PAGO POR HORA (USD) *</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                            <ThemedText style={{ color: DynamicColors.subtext, fontWeight: 'bold', marginRight: 8 }}>$</ThemedText>
                            <TextInput value={newJob.salaryMin} onChangeText={t => setNewJob({...newJob, salaryMin: t})} keyboardType="numeric" placeholder="Mínimo" placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                            <ThemedText style={{ color: DynamicColors.subtext, fontWeight: 'bold', marginRight: 8 }}>$</ThemedText>
                            <TextInput value={newJob.salaryMax} onChangeText={t => setNewJob({...newJob, salaryMax: t})} keyboardType="numeric" placeholder="Máximo (Opcional)" placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                        </View>
                    </View>

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>TURNOS DISPONIBLES *</ThemedText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {SHIFT_OPTIONS.map(shift => {
                            const isSelected = newJob.shifts.includes(shift);
                            return (
                                <TouchableOpacity key={shift} onPress={() => toggleNewJobShift(shift)} style={{ borderRadius: 12, overflow: 'hidden', height: 40, borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                    {isSelected ? (
                                        <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14 }}>
                                            <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" style={{marginRight:6}} />
                                            <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{shift}</ThemedText>
                                        </LinearGradient>
                                    ) : (
                                        <View style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                            <MaterialCommunityIcons name="circle-outline" size={14} color={DynamicColors.iconInactive} style={{marginRight:6}} />
                                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 12, fontWeight: 'bold' }}>{shift}</ThemedText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 10 }}>Método de contacto principal</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                        <TouchableOpacity
                            onPress={() => setNewJob({...newJob, contactMethod: 'whatsapp'})}
                            style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.border, backgroundColor: newJob.contactMethod === 'whatsapp' ? 'rgba(76, 175, 80, 0.1)' : DynamicColors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="whatsapp" size={18} color={newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.subtext} />
                            <ThemedText style={{ marginLeft: 6, fontWeight: 'bold', color: newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.subtext }}>WhatsApp</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setNewJob({...newJob, contactMethod: 'call'})}
                            style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.border, backgroundColor: newJob.contactMethod === 'call' ? 'rgba(33, 150, 243, 0.1)' : DynamicColors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="phone" size={18} color={newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.subtext} />
                            <ThemedText style={{ marginLeft: 6, fontWeight: 'bold', color: newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.subtext }}>Llamada</ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={{ zIndex: 50, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                            <TouchableOpacity onPress={() => setPublishView('country')} style={{ paddingHorizontal: 15, justifyContent: 'center', borderRightWidth: 1, borderRightColor: DynamicColors.border, flexDirection: 'row', alignItems: 'center' }}>
                                <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.text }}>{COUNTRY_CODES.find(c => c.code === newJob.phoneCode)?.flag} {newJob.phoneCode}</ThemedText>
                                <MaterialCommunityIcons name="chevron-down" size={16} color={DynamicColors.subtext} style={{marginLeft: 4}}/>
                            </TouchableOpacity>
                            <TextInput
                                value={newJob.phone}
                                onChangeText={t => setNewJob({...newJob, phone: t})}
                                keyboardType="phone-pad"
                                placeholder="(909) 000-0000"
                                placeholderTextColor={DynamicColors.subtext}
                                style={{ flex: 1, padding: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                            />
                        </View>
                    </View>

                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>DESCRIPCIÓN *</ThemedText>
                    <TextInput 
                      value={newJob.description} 
                      onChangeText={t => setNewJob({...newJob, description: t})} 
                      placeholder="Requisitos, habilidades necesarias..." 
                      placeholderTextColor="#999" 
                      multiline 
                      autoCapitalize="sentences"
                      style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, height: 100, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    />

                    {/* 🚀 VERIFICACIÓN DE PAGO AGREGADA EN EL MODAL */}
                    <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: DynamicColors.border }}>
                      <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: DynamicColors.accent }}>Verificación de Pago</ThemedText>
                      
                      <ThemedText style={{ fontSize: 15, marginBottom: 15, lineHeight: 18, color: DynamicColors.text }}>
                        Para publicar esta vacante, realiza el pago de <ThemedText style={{fontWeight:'900', color: DynamicColors.accent}}>${currentTariff} USD</ThemedText> mediante Zelle o Venmo y escribe el código de confirmación aquí abajo.
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

                    <TouchableOpacity onPress={handlePublishJob} disabled={isPublishing}>
                      <LinearGradient colors={(!newJob.title || !newJob.description || !newJob.phone || !newJob.company || !newJob.city || newJob.shifts.length === 0 || !newJob.salaryMin || !formRefCode.trim()) ? disabledGradient : orangeGradient} style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                        {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Enviar a Revisión</ThemedText>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </ScrollView>
              </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* --- MODALES DE FILTROS --- */}
      <RNModal visible={showTitlePickerModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowTitlePickerModal(false)} />
              <View style={{ width: 300, maxHeight: height * 0.7, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                  {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>Filtrar por Puesto</ThemedText>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'column', gap: 10 }}>
                          <TouchableOpacity 
                              style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterTitle === 'Todos' ? DynamicColors.accent : DynamicColors.border }} 
                              onPress={() => { setFilterTitle('Todos'); setShowTitlePickerModal(false); }}>
                              <ThemedText style={{ fontWeight: 'bold', color: filterTitle === 'Todos' ? DynamicColors.accent : DynamicColors.text }}>Todos los puestos</ThemedText>
                          </TouchableOpacity>
                          {availableTitles.map((title, index) => (
                              <TouchableOpacity 
                                  key={index} 
                                  style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterTitle === title ? DynamicColors.accent : DynamicColors.border }} 
                                  onPress={() => { setFilterTitle(title as string); setShowTitlePickerModal(false); }}>
                                  <ThemedText style={{ fontWeight: 'bold', color: filterTitle === title ? DynamicColors.accent : DynamicColors.text, textAlign: 'center' }}>{title}</ThemedText>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </ScrollView>
              </View>
          </View>
      </RNModal>

      <RNModal visible={showShiftPickerModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowShiftPickerModal(false)} />
              <View style={{ width: 280, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                  {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>Filtrar por Turno</ThemedText>
                  
                  <View style={{ flexDirection: 'column', gap: 10 }}>
                      <TouchableOpacity style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.border }} onPress={() => { setFilterShift('Todos'); setShowShiftPickerModal(false); }}>
                          <ThemedText style={{ fontWeight: 'bold', color: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.text }}>Todos los turnos</ThemedText>
                      </TouchableOpacity>
                      {SHIFT_OPTIONS.map((shift, index) => (
                          <TouchableOpacity key={index} style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterShift === shift ? DynamicColors.accent : DynamicColors.border }} onPress={() => { setFilterShift(shift); setShowShiftPickerModal(false); }}>
                              <ThemedText style={{ fontWeight: 'bold', color: filterShift === shift ? DynamicColors.accent : DynamicColors.text }}>{shift}</ThemedText>
                          </TouchableOpacity>
                      ))}
                  </View>
              </View>
          </View>
      </RNModal>

      <RNModal visible={showLocationPickerModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowLocationPickerModal(false)} />
              <View style={{ width: 320, maxHeight: height * 0.8, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                  {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: DynamicColors.text }}>Filtro de Ubicación</ThemedText>
                      <TouchableOpacity onPress={() => setShowLocationPickerModal(false)}>
                          <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.subtext, marginBottom: 8, textTransform: 'uppercase' }}>1. Selecciona el Estado</ThemedText>
                  <View style={{ height: 45, marginBottom: 15 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {STATES.map(st => {
                              const isSelected = filterState === st;
                              return (
                                  <TouchableOpacity 
                                      key={st} 
                                      onPress={() => { setFilterState(st); setFilterLocations([]); }} 
                                      style={{ paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12, backgroundColor: isSelected ? DynamicColors.accent : DynamicColors.inputBg, borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                      <ThemedText style={{ fontWeight: 'bold', fontSize: 13, color: isSelected ? '#FFF' : DynamicColors.text }}>{st}</ThemedText>
                                  </TouchableOpacity>
                              );
                          })}
                      </ScrollView>
                  </View>

                  <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: DynamicColors.subtext, marginBottom: 8, textTransform: 'uppercase' }}>2. Selecciona las Ciudades</ThemedText>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'column', gap: 10 }}>
                          <TouchableOpacity 
                              style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.border }} 
                              onPress={() => setFilterLocations([])}>
                              <MaterialCommunityIcons name={filterLocations.length === 0 ? "radiobox-marked" : "radiobox-blank"} size={20} color={filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.iconInactive} style={{ marginRight: 10 }} />
                              <ThemedText style={{ fontWeight: 'bold', color: filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.text }}>Todas en {filterState}</ThemedText>
                          </TouchableOpacity>

                          {(usCitiesData[filterState] || []).map((city, index) => {
                              const isSelected = filterLocations.includes(city);
                              return (
                                  <TouchableOpacity 
                                      key={index} 
                                      style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isSelected ? DynamicColors.accent : DynamicColors.border }} 
                                      onPress={() => toggleLocationFilter(city)}>
                                      <MaterialCommunityIcons name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={isSelected ? DynamicColors.accent : DynamicColors.iconInactive} style={{ marginRight: 10 }} />
                                      <ThemedText style={{ fontWeight: 'bold', color: isSelected ? DynamicColors.accent : DynamicColors.text }}>{city}</ThemedText>
                                  </TouchableOpacity>
                              );
                          })}
                      </View>
                  </ScrollView>

                  {filterLocations.length > 0 && (
                      <TouchableOpacity onPress={() => setShowLocationPickerModal(false)} style={{ marginTop: 15 }}>
                          <LinearGradient colors={orangeGradient} style={{ height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                              <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Aplicar Filtros</ThemedText>
                          </LinearGradient>
                      </TouchableOpacity>
                  )}
              </View>
          </View>
      </RNModal>

      {/* MODAL RESEÑAS EMPRESA */}
      <RNModal visible={!!selectedCompany} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedCompany(null)} />
            <View style={{ width: width > 600 ? 500 : '90%', maxHeight: height * 0.85, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 28, padding: 25, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View>
                    <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{selectedCompany?.company}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
                        <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: DynamicColors.text, marginLeft: 4 }}>{selectedCompany?.rating > 0 ? selectedCompany?.rating.toFixed(1) : 'Sin reseñas'}</ThemedText>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedCompany(null)}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {reviewForm.visible ? (
                    <View style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 10 }}>Califica a la empresa</ThemedText>
                        
                        <View style={{ flexDirection: 'row', marginBottom: 15, gap: 5 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setReviewForm(prev => ({...prev, rating: star}))}>
                                    <MaterialCommunityIcons name="star" size={32} color={star <= reviewForm.rating ? "#FFB300" : DynamicColors.iconInactive} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            value={reviewForm.text}
                            onChangeText={t => setReviewForm(prev => ({...prev, text: t}))}
                            placeholder="Describe tu experiencia trabajando aquí..."
                            placeholderTextColor={DynamicColors.subtext}
                            multiline
                            autoCapitalize="sentences"
                            style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 12, padding: 15, color: DynamicColors.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                        />

                        <TouchableOpacity onPress={() => setReviewForm(prev => ({...prev, isAnonymous: !prev.isAnonymous}))} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <MaterialCommunityIcons name={reviewForm.isAnonymous ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={DynamicColors.accent} />
                            <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.text }}>Publicar como Anónimo</ThemedText>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setReviewForm({ visible: false, text: '', rating: 0, isAnonymous: false })} style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: DynamicColors.categoryUnselected }}>
                                <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.text }}>Cancelar</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmitReview} style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: DynamicColors.accent }}>
                                <ThemedText style={{ fontWeight: 'bold', color: '#FFF' }}>Publicar</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setReviewForm(prev => ({...prev, visible: true}))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 95, 109, 0.1)', padding: 14, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.accent }}>
                        <MaterialCommunityIcons name="pencil-plus-outline" size={20} color={DynamicColors.accent} />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.accent }}>Escribir una reseña</ThemedText>
                    </TouchableOpacity>
                )}

                {selectedCompany?.reviews && selectedCompany.reviews.length > 0 ? (
                    selectedCompany.reviews.map((r: any) => (
                        <View key={r.id} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: DynamicColors.border }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : DynamicColors.iconInactive} />
                                    ))}
                                </View>
                                <ThemedText style={{ fontSize: 12,fontWeight: 'bold' }}>{r.userName || 'Anónimo'}</ThemedText>
                            </View>
                            <ThemedText style={{ color: DynamicColors.text, fontSize: 14, lineHeight: 20 }}>{r.text}</ThemedText>
                        </View>
                    ))
                ) : (
                    !reviewForm.visible && <ThemedText style={{ textAlign: 'center', fontSize:13, marginTop: 20, fontWeight: 'bold' }}>Esta empresa aún no tiene reseñas. ¡Sé el primero!</ThemedText>
                )}
              </ScrollView>
            </View>
        </View>
      </RNModal>
    </View>
  );
}