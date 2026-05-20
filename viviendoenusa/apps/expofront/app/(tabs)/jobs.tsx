import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Alert, Share, ColorValue, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import badWordsData from '@/utils/babwords.json';

// --- LÓGICA DE VALIDACIÓN ---
const BANNED_WORDS = Array.isArray(badWordsData?.badWordsList) ? badWordsData.badWordsList : []; 
const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

// --- BASE DE DATOS LOCAL DE CIUDADES ---
const usCitiesData: Record<string, string[]> = {
  "California": ["Anaheim", "Bakersfield", "Chino", "Chino Hills", "Corona", "Eastvale", "El Monte", "Fontana", "Fullerton", "Hesperia", "Irvine", "Jurupa Valley", "Long Beach", "Los Angeles", "Moreno Valley", "Ontario", "Pomona", "Rancho Cucamonga", "Rialto", "Riverside", "San Bernardino", "San Diego", "Santa Ana", "Upland", "Victorville"],
  "Texas": ["Austin", "Dallas", "El Paso", "Fort Worth", "Houston", "San Antonio"],
  "Florida": ["Jacksonville", "Miami", "Orlando", "Tampa"]
};
const STATES = Object.keys(usCitiesData);

const COUNTRY_CODES = [{ code: '+1', flag: '🇺🇸' }];

// Diccionarios simples para empatar filtros bilingües
const CATEGORY_MAP: Record<string, string[]> = {
  'Bodega': ['Bodega', 'Warehouse'],
  'Construcción': ['Construcción', 'Construction'],
  'Limpieza': ['Limpieza', 'Cleaning'],
  'Restaurantes': ['Restaurantes', 'Restaurants'],
  'Transporte': ['Transporte', 'Transportation'],
  'Tecnología': ['Tecnología', 'Technology']
};

export default function JobsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark'; 
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const currentUser = userMetadata?.name || 'Cesar Gomez';

  // --- MANEJO SEGURO DE TRADUCCIONES ---
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

  // --- MOCK DATA BILINGÜE ---
  const INITIAL_JOBS = [
    { id: 1, userName: 'Cesar Gomez', title: 'Técnico de Construcción', company: 'BuildUSA Corp', category: 'Construcción', state: 'California', city: 'Rancho Cucamonga', contactMethod: 'whatsapp', phoneCode: '+1', phone: '1234567890', shifts: ['Mañana', 'Morning'], salaryMin: '25', salaryMax: '35', rating: 4.8, reviews: [{id: 1, text: 'Pagan a tiempo y buen trato.', stars: 5, userName: 'Anónimo'}], description: 'Se busca técnico con experiencia en framing y drywall. Contratación inmediata. Es necesario contar con herramienta propia básica y medio de transporte. El proyecto durará aproximadamente 6 meses con posibilidad a extensión.', status: 'approved', isOpen: true, displayTime: 'Hace 2h' },
    { id: 2, userName: 'AdminWarehouse', title: 'Operador de Montacargas', company: 'Amazon Fulfillment', category: 'Bodega', state: 'California', city: 'Ontario', contactMethod: 'whatsapp', phoneCode: '+1', phone: '0987654321', shifts: ['Noche', 'Night', 'Fines de Semana', 'Weekends'], salaryMin: '21', salaryMax: '24', rating: 4.5, reviews: [], description: 'Se requiere operador de montacargas (Stand-up Reach) con certificación vigente. Beneficios desde el primer día incluyendo seguro médico, dental y visión. Turno nocturno de 10pm a 6am.', status: 'approved', isOpen: true, displayTime: 'Hace 3h' },
    { id: 3, userName: 'ChefMaria', title: 'Cocinero de Línea', company: 'El Torito', category: 'Restaurantes', state: 'California', city: 'Chino', contactMethod: 'whatsapp', phoneCode: '+1', phone: '9093334444', shifts: ['Tarde', 'Afternoon', 'Noche', 'Night'], salaryMin: '19', salaryMax: '22', rating: 4.0, reviews: [], description: 'Buscamos cocinero con experiencia en comida mexicana tradicional. Disponibilidad para fines de semana indispensable. Ofrecemos comida de empleado gratuita por turno y excelente ambiente de trabajo.', status: 'approved', isOpen: true, displayTime: 'Hace 6h' },
    { id: 4, userName: 'JohnBuilder', title: 'Drywall Installer', company: 'Cali Builders Inc.', category: 'Construction', state: 'California', city: 'Fontana', contactMethod: 'call', phoneCode: '+1', phone: '9091112233', shifts: ['Morning', 'Mañana'], salaryMin: '26', salaryMax: '32', rating: 4.7, reviews: [{id: 4, text: 'Great management and steady work.', stars: 5, userName: 'Mike T.'}], description: 'Looking for experienced drywall installers for residential projects. Must have own tools and transportation. Immediate start available. Paid weekly via direct deposit.', status: 'approved', isOpen: true, displayTime: 'Ayer' },
    { id: 5, userName: 'WarehousePro', title: 'Packer / Scanner', company: 'Target Distribution', category: 'Warehouse', state: 'California', city: 'Eastvale', contactMethod: 'whatsapp', phoneCode: '+1', phone: '9512223344', shifts: ['Night', 'Noche', 'Flexible'], salaryMin: '19', salaryMax: '22', rating: 4.2, reviews: [], description: 'Entry-level packing and scanning position. Light physical work. Night shift differential pay included. Overtime available during peak seasons.', status: 'approved', isOpen: true, displayTime: 'Hace 2 días' },
  ];

  const styles = useUnifiedCardStyles();

  // --- LÓGICA DE DIMENSIONES ---
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
    cardBg:             isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(255,255,255,0.45)',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'] as const;

  // Estados de Filtro Principales
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [availabilityFilter, setAvailabilityFilter] = useState<'open' | 'closed'>('open'); 
  const [filterTitle, setFilterTitle] = useState<string>('Todos'); 
  const [filterShift, setFilterShift] = useState<string>('Todos'); 
  
  // Filtros de Ubicación (Doble Nivel)
  const [filterState, setFilterState] = useState<string>('California');
  const [filterLocations, setFilterLocations] = useState<string[]>([]); 
  
  // Modales Empleo
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishView, setPublishView] = useState<'form' | 'city' | 'country'>('form');

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
  const [savedJobs, setSavedJobs] = useState<number[]>([]);
  const [reviewForm, setReviewForm] = useState({ visible: false, text: '', rating: 0, isAnonymous: false });

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

  const toggleSaveJob = (id: number) => {
      setSavedJobs(prev => {
          if (prev.includes(id)) {
              triggerAlert("Eliminado", "Empleo eliminado de guardados.");
              return prev.filter(j => j !== id);
          } else {
              triggerAlert("Guardado", "Empleo guardado exitosamente.");
              return [...prev, id];
          }
      });
  };

  const handlePublishJob = () => {
    if (!newJob.title || !newJob.company || !newJob.city || !newJob.description || !newJob.phone || newJob.shifts.length === 0 || !newJob.salaryMin) {
      triggerAlert("Campos Incompletos", "Por favor completa el título, empresa, estado, ciudad, salario mínimo, turno(s), descripción y el número de contacto.");
      return;
    }
    if (!validateComment(newJob.description)) {
      triggerAlert("Error", "La descripción contiene palabras no permitidas.");
      return; 
    }
    
    setIsPublishing(true);
    setTimeout(() => {
      const jobToAdd = {
        ...newJob,
        id: Date.now(),
        rating: 0,
        reviews: [],
        status: 'pending',
        isOpen: true,
        userName: currentUser,
        displayTime: 'Justo ahora'
      };
      setJobs([jobToAdd, ...jobs]);
      setIsPublishing(false);
      setModalVisible(false);
      setNewJob({ title: '', company: '', category: 'Bodega', description: '', contactMethod: 'whatsapp', phoneCode: '+1', phone: '', shifts: [], salaryMin: '', salaryMax: '', state: 'California', city: '' });
      triggerAlert("¡Recibido!", "Tu empleo ha sido enviado y está pendiente de revisión por el administrador.");
    }, 1200);
  };

  const toggleJobStatus = (id: number) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === id) {
        const willBeOpen = !job.isOpen;
        return { ...job, isOpen: willBeOpen, displayTime: willBeOpen ? 'Justo ahora' : job.displayTime };
      }
      return job;
    }));
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

  const handleSubmitReview = () => {
      if (!reviewForm.text.trim() || reviewForm.rating === 0) {
          triggerAlert("Incompleto", "Por favor ingresa un comentario y selecciona la cantidad de estrellas.");
          return;
      }
      if (!validateComment(reviewForm.text)) {
          triggerAlert("Error", "Tu reseña contiene palabras no permitidas.");
          return;
      }
      const newReview = { id: Date.now(), text: reviewForm.text, stars: reviewForm.rating, userName: reviewForm.isAnonymous ? 'Anónimo' : currentUser };
      let newAverage = 0;
      setJobs(prevJobs => prevJobs.map(job => {
          if (job.company === selectedCompany.company) {
              const updatedReviews = [newReview, ...job.reviews];
              newAverage = updatedReviews.reduce((acc, r) => acc + r.stars, 0) / updatedReviews.length;
              return { ...job, reviews: updatedReviews, rating: newAverage };
          }
          return job;
      }));
      setSelectedCompany((prev: any) => {
          if(!prev) return prev;
          const updatedReviews = [newReview, ...prev.reviews];
          return { ...prev, reviews: updatedReviews, rating: newAverage };
      });
      setReviewForm({ visible: false, text: '', rating: 0, isAnonymous: false });
      triggerAlert("¡Gracias!", "Tu reseña ha sido publicada exitosamente.");
  };

  // --- LÓGICA DE FILTRADO ROBUSTA PARA BILINGÜISMO ---
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Validar categoría (Mapea inglés a español y viceversa para que el filtro funcione)
      let matchCategory = false;
      if (activeFilter === 'Todos' || activeFilter === 'All') {
          matchCategory = true;
      } else {
          // Busca en el diccionario de mapeo
          const spanishCategory = Object.keys(CATEGORY_MAP).find(key => 
              CATEGORY_MAP[key].includes(activeFilter) || key === activeFilter
          );
          
          if (spanishCategory) {
              matchCategory = CATEGORY_MAP[spanishCategory].includes(job.category);
          } else {
              matchCategory = job.category === activeFilter;
          }
      }

      const matchAvailability = availabilityFilter === 'open' ? job.isOpen === true : job.isOpen === false;
      
      // Validación de Turno (Busca si la palabra en español o inglés existe en el arreglo de turnos del empleo)
      const matchShift = filterShift === 'Todos' || filterShift === 'All' || job.shifts.some(s => s === filterShift);
      
      const matchTitle = filterTitle === 'Todos' || filterTitle === 'All' || job.title === filterTitle;
      const matchState = job.state === filterState;
      const matchLocation = filterLocations.length === 0 || filterLocations.includes(job.city);
      
      return matchCategory && matchAvailability && matchShift && matchTitle && matchState && matchLocation;
    });
  }, [jobs, activeFilter, availabilityFilter, filterTitle, filterShift, filterState, filterLocations]);

  const locationButtonText = filterLocations.length === 0 
      ? (jobstabData.filter === 'Filter' ? 'All Cities' : 'Todas las Ciudades')
      : filterLocations.length === 1 
          ? filterLocations[0] 
          : `${filterLocations.length} ${jobstabData.filter === 'Filter' ? 'cities' : 'ciudades'}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              
              {/* --- CABECERA --- */}
              <View style={[styles.headerRow, { marginBottom: 15 }]}>

                <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: DynamicColors.border }}>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('open')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: availabilityFilter === 'open' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: availabilityFilter === 'open' ? '#FFF' : DynamicColors.subtext }}>{jobstabData.statusBottonModalDis || 'Disponible'}</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('closed')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: availabilityFilter === 'closed' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: availabilityFilter === 'closed' ? '#FFF' : DynamicColors.subtext }}>{jobstabData.statusBottonModalNoDis || 'No Disponible'}</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>

                <MaterialCommunityIcons name="briefcase-search" size={40} color={DynamicColors.text} style={{opacity: 0.2}}/>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                
                {/* MENU LATERAL WEB (FILTROS) */}
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
                  
                  {/* --- 1. FILTROS SUPERIORES: CIUDAD Y TURNO --- */}
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

                  {/* --- 2. CATEGORÍAS MÓVILES --- */}
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 8, minHeight: 46 }}> 
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 6 }}
                        keyboardShouldPersistTaps="handled" 
                      >
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

                  {/* --- 3. FILTRO DE PUESTO (TÍTULO) --- */}
                  <View style={{ marginBottom: 10 }}>
                      <TouchableOpacity onPress={() => setShowTitlePickerModal(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: filterTitle !== 'Todos' && filterTitle !== 'All' ? 'rgba(255, 95, 109, 0.1)' : DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.border, paddingHorizontal: 15, height: 48 }}>
                          <MaterialCommunityIcons name="briefcase-outline" size={18} color={filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.subtext} style={{ marginRight: 8 }} />
                          <ThemedText style={{ flex: 1, color: filterTitle === 'Todos' || filterTitle === 'All' ? DynamicColors.subtext : DynamicColors.accent, fontWeight: 'bold', fontSize: 13 }}>
                              {filterTitle === 'Todos' || filterTitle === 'All' ? `Cualquier Puesto en ${activeFilter}` : filterTitle}
                          </ThemedText>
                          <MaterialCommunityIcons name="chevron-down" size={18} color={filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.subtext} />
                      </TouchableOpacity>
                  </View>

                  {/* FEED EMPLEOS (FONDO TRANSPARENTE / DISEÑO ORIGINAL SIN FOTOS) */}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {filteredJobs.length === 0 ? (
                       <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                         <MaterialCommunityIcons name="briefcase-variant-off" size={56} color={DynamicColors.subtext} />
                         <ThemedText style={{ color: DynamicColors.subtext, marginTop: 14, fontWeight: 'bold' }}>No se encontraron empleos con estos filtros.</ThemedText>
                       </View>
                    ) : (
                      filteredJobs.map(job => (
                        <View key={job.id} style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: job.status === 'pending' ? '#FFB74D' : DynamicColors.border, opacity: job.isOpen ? 1 : 0.65 }}>
                          
                          {/* Banner Pendiente Admin */}
                          {job.status === 'pending' && (
                            <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, margin: 10, marginBottom: 0, flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#FFB74D" />
                                <ThemedText style={{ color: '#FFB74D', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>Pendiente de aprobación (Admin)</ThemedText>
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
                                <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{job.title}</ThemedText>
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

                              {/* Descripción resumida */}
                              <ThemedText numberOfLines={2} style={{ fontSize: 14, color: DynamicColors.text, marginTop: 15, lineHeight: 22, opacity: 0.8 }}>{job.description}</ThemedText>

                              {/* Botón visual para abrir detalles */}
                              <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 }}>
                                  <MaterialCommunityIcons name="arrow-expand" size={14} color={DynamicColors.text} style={{ marginRight: 6 }} />
                                  <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: DynamicColors.text }}>Ver detalle completo</ThemedText>
                              </View>
                            </View>
                          </TouchableOpacity>

                          <View style={{ padding: 15, paddingTop: 0 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15, marginTop: 5, paddingBottom: job.userName === currentUser ? 10 : 0 }}>
                                <TouchableOpacity onPress={() => setSelectedCompany(job)} style={{ flex: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name="comment-text-outline" size={16} color={DynamicColors.text} />
                                <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: DynamicColors.text }}>Reseñas</ThemedText>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => handleContact(job.contactMethod as 'whatsapp'|'call', job.phoneCode, job.phone)} disabled={job.status === 'pending' || !job.isOpen} style={{ flex: 2, minWidth: 140, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: job.contactMethod === 'whatsapp' ? 'rgba(76, 175, 80, 0.15)' : (isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'), opacity: (job.status === 'pending' || !job.isOpen) ? 0.4 : 1 }}>
                                <MaterialCommunityIcons name={job.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={16} color={job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2')} />
                                <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: 'bold', color: job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2') }}>
                                    {job.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamar'}
                                </ThemedText>
                                </TouchableOpacity>
                            </View>

                            {/* Opciones de Administrador de la Vacante */}
                            {job.userName === currentUser && (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 10 }}>
                                <TouchableOpacity onPress={() => toggleJobStatus(job.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: job.isOpen ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 }}>
                                    <MaterialCommunityIcons name={job.isOpen ? "briefcase-off" : "briefcase-check"} size={16} color={job.isOpen ? "#FF5252" : "#4CAF50"} />
                                    <ThemedText style={{ fontSize: 12, fontWeight: 'bold', color: job.isOpen ? "#FF5252" : "#4CAF50", marginLeft: 6 }}>
                                    {job.isOpen ? "Marcar como No Disponible" : "Reabrir Vacante"}
                                    </ThemedText>
                                </TouchableOpacity>
                                </View>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB - NUEVO EMPLEO */}
      <TouchableOpacity onPress={() => { setPublishView('form'); setModalVisible(true); }} style={[styles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
          <MaterialCommunityIcons name="briefcase-plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL DETALLES DEL EMPLEO (SIN FOTO, ESTILO LIMPIO CON ICONOS DE CRISTAL) */}
      <RNModal visible={!!selectedJobDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedJobDetail(null)} />
          <View style={{ width: '90%', maxHeight: '80%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            {/* CABECERA DEL MODAL (Transparente estilo cristal) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => handleShareJob(selectedJobDetail)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
                        <MaterialCommunityIcons name="share-variant" size={22} color={DynamicColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleSaveJob(selectedJobDetail.id)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
                        <MaterialCommunityIcons name={savedJobs.includes(selectedJobDetail?.id) ? "bookmark" : "bookmark-outline"} size={22} color={savedJobs.includes(selectedJobDetail?.id) ? DynamicColors.accent : DynamicColors.text} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setSelectedJobDetail(null)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 20 }}>
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

                    <TouchableOpacity onPress={() => handleContact(selectedJobDetail?.contactMethod as 'whatsapp'|'call', selectedJobDetail?.phoneCode, selectedJobDetail?.phone)} disabled={selectedJobDetail?.status === 'pending' || !selectedJobDetail?.isOpen} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: selectedJobDetail?.contactMethod === 'whatsapp' ? '#4CAF50' : '#2196F3', opacity: (selectedJobDetail?.status === 'pending' || !selectedJobDetail?.isOpen) ? 0.4 : 1 }}>
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

      {/* MODAL CREAR EMPLEO - VISTAS INTERNAS */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%', alignSelf: 'center' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              {/* --- VISTA: SELECCIONAR CIUDAD AL PUBLICAR --- */}
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
              /* --- VISTA: SELECCIONAR PAÍS AL PUBLICAR --- */
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
              /* --- VISTA: FORMULARIO PRINCIPAL DE PUBLICACIÓN --- */
              <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, marginBottom: 10 }}>
                    <View>
                        <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{jobstabData.labeljobs || 'Empleos'}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: '#FFB74D', fontWeight: 'bold', marginTop: 4 }}>{jobstabData.labeladmin || 'Admin'}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                    
                    {/* CATEGORÍAS */}
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

                    {/* SUGERENCIAS DE TÍTULOS */}
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
                    <TextInput value={newJob.title} onChangeText={t => setNewJob({...newJob, title: t})} placeholder="Escribe o elige un puesto arriba..." placeholderTextColor="#999" style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                    {/* ESTADO Y CIUDAD AL PUBLICAR */}
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
                    <View style={{ zIndex: 50, marginBottom: 15 }}>
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
                    <TextInput value={newJob.company} onChangeText={t => setNewJob({...newJob, company: t})} placeholder="Nombre del negocio o persona" placeholderTextColor="#999" style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                    {/* RANGO SALARIAL */}
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

                    {/* SELECCIÓN MÚLTIPLE DE TURNOS */}
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

                    {/* DISEÑO DE CONTACTO */}
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
                    <TextInput value={newJob.description} onChangeText={t => setNewJob({...newJob, description: t})} placeholder="Requisitos, habilidades necesarias..." placeholderTextColor="#999" multiline style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, height: 100, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                    <TouchableOpacity onPress={handlePublishJob} disabled={isPublishing}>
                      <LinearGradient colors={(!newJob.title || !newJob.description || !newJob.phone || !newJob.company || !newJob.city || newJob.shifts.length === 0 || !newJob.salaryMin) ? disabledGradient : orangeGradient} style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
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

      {/* --- MODALES PRINCIPALES (EXTERNOS) --- */}
      
      {/* SELECTOR DE PUESTO (TÍTULO) */}
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

      {/* SELECTOR DE FILTRO DE TURNO */}
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

      {/* SELECTOR MULTI-CIUDAD Y ESTADO PARA FILTROS */}
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
                            
                            multiline
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

                {/* LISTA DE RESEÑAS EXISTENTES */}
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