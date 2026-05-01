import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Alert, Share, ColorValue, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking
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

// --- CONFIGURACIÓN DE EMPLEOS ---
const JOB_CATEGORIES = [
  { id: 'Todos', icon: 'apps' },
  { id: 'Construcción', icon: 'hammer-wrench' },
  { id: 'Limpieza', icon: 'broom' },
  { id: 'Restaurantes', icon: 'silverware-fork-knife' },
  { id: 'Transporte', icon: 'truck-fast' },
  { id: 'Tecnología', icon: 'laptop' }
];

const SUGGESTED_TITLES: Record<string, string[]> = {
  'Construcción': ['Carpintero', 'Electricista', 'Plomero', 'Ayudante'],
  'Limpieza': ['Housekeeper', 'Limpieza Comercial', 'Janitor'],
  'Restaurantes': ['Cocinero', 'Mesero/a', 'Dishwasher', 'Bartender'],
  'Transporte': ['Chofer CDL', 'Repartidor', 'Mecánico'],
  'Tecnología': ['Desarrollador', 'Soporte Técnico', 'Diseñador'],
  'Todos': ['Asistente', 'Servicio al Cliente', 'Ventas']
};

const COUNTRY_CODES = [
    { code: '+1', flag: '🇺🇸' },
    { code: '+52', flag: '🇲🇽' },
    { code: '+57', flag: '🇨🇴' },
    { code: '+502', flag: '🇬🇹' },
    { code: '+503', flag: '🇸🇻' },
    { code: '+504', flag: '🇭🇳' },
    { code: '+51', flag: '🇵🇪' },
    { code: '+56', flag: '🇨🇱' },
    { code: '+34', flag: '🇪🇸' }, 
    { code: '+54', flag: '🇦🇷' },
    { code: '+55', flag: '🇧🇷' }
];

const SHIFT_OPTIONS = ['Mañana', 'Tarde', 'Noche', 'Fines de Semana', 'Flexible'];

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

  // Mock Data Inicial
  const INITIAL_JOBS = [
    { id: 1, userName: 'Cesar Gomez', title: 'Técnico de Construcción', company: 'BuildUSA Corp', category: 'Construcción', location: 'Rancho Cucamonga, CA', contactMethod: 'whatsapp', phoneCode: '+1', phone: '1234567890', shifts: ['Mañana'], salaryMin: '25', salaryMax: '35', rating: 4.8, reviews: [{id: 1, text: 'Pagan a tiempo y buen trato.', stars: 5}], description: 'Se busca técnico con experiencia en framing y drywall. Contratación inmediata. Debe tener herramientas propias y transporte. Interesados enviar mensaje por WhatsApp con foto de trabajos anteriores. Se ofrece buen sueldo semanal.', status: 'approved', isOpen: true, displayTime: 'Hace 2h' },
    { id: 2, userName: 'Otro Usuario', title: 'Limpieza de Oficinas', company: 'Spotless Agency', category: 'Limpieza', location: 'Ontario, 91761', contactMethod: 'call', phoneCode: '+1', phone: '0987654321', shifts: ['Noche', 'Fines de Semana'], salaryMin: '18', salaryMax: '20', rating: 4.2, reviews: [], description: 'Horario nocturno de lunes a viernes. Se proveen materiales de limpieza y uniforme. Se requiere puntualidad y papeles en regla.', status: 'approved', isOpen: false, displayTime: 'Hace 5h' }
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
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'] as const;

  // Estados de Filtro
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [availabilityFilter, setAvailabilityFilter] = useState<'open' | 'closed'>('open'); 
  const [filterShift, setFilterShift] = useState<string>('Todos'); 
  const [filterSalaryMin, setFilterSalaryMin] = useState('');
  const [filterLocation, setFilterLocation] = useState(''); // <-- NUEVO ESTADO DE UBICACIÓN
  
  // Modales
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newJob, setNewJob] = useState<{
      title: string; company: string; category: string; description: string; 
      contactMethod: 'whatsapp' | 'call'; phoneCode: string; phone: string;
      shifts: string[]; salaryMin: string; salaryMax: string; location: string; // <-- AÑADIDO UBICACIÓN
  }>({ 
      title: '', company: '', category: 'Construcción', description: '', 
      contactMethod: 'whatsapp', phoneCode: '+1', phone: '',
      shifts: [], salaryMin: '', salaryMax: '', location: '' 
  });
  
  // Selectores de Vistas
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showShiftPickerModal, setShowShiftPickerModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<any>(null); 

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

  const handlePublishJob = () => {
    if (!newJob.title || !newJob.company || !newJob.location || !newJob.description || !newJob.phone || newJob.shifts.length === 0 || !newJob.salaryMin) {
      triggerAlert("Campos Incompletos", "Por favor completa el título, empresa, ubicación, salario mínimo, turno(s), descripción y el número de contacto.");
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
      setNewJob({ title: '', company: '', category: 'Construcción', description: '', contactMethod: 'whatsapp', phoneCode: '+1', phone: '', shifts: [], salaryMin: '', salaryMax: '', location: '' });
      triggerAlert("¡Recibido!", "Tu empleo ha sido enviado y está pendiente de revisión por el administrador.");
    }, 1200);
  };

  const toggleJobStatus = (id: number) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === id) {
        const willBeOpen = !job.isOpen;
        const newTime = willBeOpen ? 'Justo ahora' : job.displayTime; 
        return { ...job, isOpen: willBeOpen, displayTime: newTime };
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

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchCategory = activeFilter === 'Todos' || job.category === activeFilter;
      const matchAvailability = availabilityFilter === 'open' ? job.isOpen === true : job.isOpen === false;
      
      const matchShift = filterShift === 'Todos' || job.shifts.includes(filterShift);
      const matchSalary = filterSalaryMin === '' || parseInt(job.salaryMin) >= parseInt(filterSalaryMin);
      
      // NUEVO: Filtro por locación
      const matchLocation = filterLocation === '' || job.location.toLowerCase().includes(filterLocation.toLowerCase());
      
      return matchCategory && matchAvailability && matchShift && matchSalary && matchLocation;
    });
  }, [jobs, activeFilter, availabilityFilter, filterShift, filterSalaryMin, filterLocation]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              
              {/* --- CABECERA --- */}
              <View style={[styles.headerRow, { marginBottom: 20 }]}>

                <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: DynamicColors.border }}>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('open')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: availabilityFilter === 'open' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '900', color: availabilityFilter === 'open' ? '#FFF' : DynamicColors.subtext }}>Disponibles</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAvailabilityFilter('closed')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: availabilityFilter === 'closed' ? DynamicColors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '900', color: availabilityFilter === 'closed' ? '#FFF' : DynamicColors.subtext }}>No Disponibles</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>

                <MaterialCommunityIcons name="briefcase-search" size={40} color={DynamicColors.text} style={{opacity: 0.2}}/>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                
                {/* MENU LATERAL WEB */}
                {isLargeWeb && (
                  <View style={styles.webSidebar}>
                    <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>Categorías</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {JOB_CATEGORIES.map((cat) => {
                        const isActive = activeFilter === cat.id;
                        return (
                          <TouchableOpacity key={cat.id} onPress={() => setActiveFilter(cat.id)} style={{ marginBottom: 10, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{cat.id}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color={DynamicColors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: DynamicColors.text, fontWeight: '600', fontSize: 14 }}>{cat.id}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}  
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  
                  {/* --- NUEVOS FILTROS DE BÚSQUEDA --- */}

                  {/* 1. Filtro de Ubicación o Zip Code */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 10, paddingHorizontal: 15, height: 48 }}>
                      <MaterialCommunityIcons name="map-marker-radius" size={20} color={DynamicColors.subtext} style={{ marginRight: 8 }} />
                      <TextInput 
                          style={{ flex: 1, color: DynamicColors.text, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                          placeholder="Ciudad o Zip Code..." 
                          placeholderTextColor={DynamicColors.subtext}
                          value={filterLocation}
                          onChangeText={setFilterLocation}
                      />
                  </View>

                  {/* 2. Filtros de Turno y Salario */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    <TouchableOpacity onPress={() => setShowShiftPickerModal(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15, height: 48 }}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color={DynamicColors.subtext} style={{ marginRight: 8 }} />
                        <ThemedText style={{ flex: 1, color: filterShift === 'Todos' ? DynamicColors.subtext : DynamicColors.text, fontWeight: '700', fontSize: 13 }}>
                            {filterShift === 'Todos' ? 'Turno' : filterShift}
                        </ThemedText>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={DynamicColors.subtext} />
                    </TouchableOpacity>

                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15, height: 48 }}>
                        <MaterialCommunityIcons name="cash" size={18} color={DynamicColors.subtext} style={{ marginRight: 8 }} />
                        <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800', marginRight: 4 }}>$</ThemedText>
                        <TextInput 
                            style={{ flex: 1, color: DynamicColors.text, fontSize: 13, fontWeight: '700', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                            placeholder="Min/hr" 
                            placeholderTextColor={DynamicColors.subtext}
                            keyboardType="numeric"
                            value={filterSalaryMin}
                            onChangeText={setFilterSalaryMin}
                        />
                    </View>
                  </View>

                  {/* FILTROS DE CATEGORÍAS MÓVILES */}
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 15, minHeight: 46 }}> 
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 6 }}
                        keyboardShouldPersistTaps="handled" 
                      >
                        <View style={{ flexDirection: 'row', gap: 8 }}> 
                          {JOB_CATEGORIES.map(cat => {
                            const isActive = activeFilter === cat.id;
                            return (
                              <TouchableOpacity key={cat.id} onPress={() => setActiveFilter(cat.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 40, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                                 {isActive ? (
                                   <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                     <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{cat.id}</ThemedText>
                                   </LinearGradient>
                                 ) : (
                                   <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                     <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{cat.id}</ThemedText>
                                   </View>
                                 )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* FEED EMPLEOS */}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {filteredJobs.length === 0 ? (
                       <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                         <MaterialCommunityIcons name="briefcase-variant-off" size={56} color={DynamicColors.subtext} />
                         <ThemedText style={{ color: DynamicColors.subtext, marginTop: 14, fontWeight: '700' }}>No se encontraron empleos con estos filtros.</ThemedText>
                       </View>
                    ) : (
                      filteredJobs.map(job => (
                        <View key={job.id} style={[styles.postCard, { borderWidth: job.status === 'pending' ? 1 : 0, borderColor: '#FFB74D', opacity: job.isOpen ? 1 : 0.65 }]}>
                          
                          {/* Banner Pendiente Admin */}
                          {job.status === 'pending' && (
                            <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#FFB74D" />
                                <ThemedText style={{ color: '#FFB74D', fontSize: 12, fontWeight: '800', marginLeft: 8 }}>Pendiente de aprobación (Admin)</ThemedText>
                            </View>
                          )}

                          {/* CONTENIDO RESUMIDO CLICABLE */}
                          <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedJobDetail(job)}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <View style={{ flex: 1 }}>
                                  <ThemedText style={{ fontSize: 18, fontWeight: '900', color: DynamicColors.text }}>{job.title}</ThemedText>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                      <MaterialCommunityIcons name="domain" size={14} color={DynamicColors.subtext} />
                                      <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, marginLeft: 4, fontWeight: '600' }}>{job.company}</ThemedText>
                                      <ThemedText style={{ fontSize: 12, marginLeft: 8, fontWeight: '800' }}>• {job.category}</ThemedText>
                                  </View>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                  <ThemedText style={{ fontSize: 11, marginBottom: 4 }}>{job.displayTime}</ThemedText>
                                  {!job.isOpen && (
                                      <View style={{ backgroundColor: 'rgba(255, 82, 82, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                          <ThemedText style={{ color: '#FF5252', fontSize: 10, fontWeight: '900' }}>Cerrada</ThemedText>
                                      </View>
                                  )}
                              </View>
                            </View>

                            {/* Info de Ubicación, Salario y Turno */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <MaterialCommunityIcons name="map-marker-radius" size={14} color={DynamicColors.subtext} />
                                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: DynamicColors.subtext, marginLeft: 4 }}>
                                        {job.location}
                                    </ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <MaterialCommunityIcons name="cash" size={14} color="#4CAF50" />
                                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#4CAF50', marginLeft: 4 }}>
                                        ${job.salaryMin}{job.salaryMax ? ` - $${job.salaryMax}` : ''}/hr
                                    </ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <MaterialCommunityIcons name="clock-outline" size={14} color={DynamicColors.accent} />
                                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: DynamicColors.accent, marginLeft: 4 }}>
                                        {job.shifts.join(', ')}
                                    </ThemedText>
                                </View>
                            </View>

                            <ThemedText numberOfLines={2} style={{ fontSize: 14, color: DynamicColors.text, marginBottom: 4, lineHeight: 22 }}>{job.description}</ThemedText>
                            <ThemedText style={{ fontSize: 12, color: '#FF5F6D', fontWeight: '800', marginBottom: 15 }}>Ver detalles de la vacante...</ThemedText>
                          </TouchableOpacity>

                          {/* BOTONES ACCIÓN RÁPIDOS */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15, paddingBottom: job.userName === currentUser ? 15 : 0 }}>
                            <TouchableOpacity onPress={() => setSelectedCompany(job)} style={{ flex: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                              <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
                              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: DynamicColors.text }}>{job.rating > 0 ? job.rating.toFixed(1) : 'Nuevo'}</ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleContact(job.contactMethod as 'whatsapp'|'call', job.phoneCode, job.phone)} disabled={job.status === 'pending' || !job.isOpen} style={{ flex: 2, minWidth: 140, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: job.contactMethod === 'whatsapp' ? 'rgba(76, 175, 80, 0.15)' : (isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'), opacity: (job.status === 'pending' || !job.isOpen) ? 0.4 : 1 }}>
                              <MaterialCommunityIcons name={job.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={16} color={job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2')} />
                              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: job.contactMethod === 'whatsapp' ? "#4CAF50" : (isDark ? '#4FC3F7' : '#1976D2') }}>
                                  {job.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamar'}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>

                          {/* ACCIONES DEL DUEÑO DE LA PUBLICACIÓN */}
                          {job.userName === currentUser && (
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15 }}>
                              <TouchableOpacity onPress={() => toggleJobStatus(job.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: job.isOpen ? 'rgba(255, 82, 82, 0.1)' : 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 }}>
                                <MaterialCommunityIcons name={job.isOpen ? "briefcase-off" : "briefcase-check"} size={16} color={job.isOpen ? "#FF5252" : "#4CAF50"} />
                                <ThemedText style={{ fontSize: 12, fontWeight: '800', color: job.isOpen ? "#FF5252" : "#4CAF50", marginLeft: 6 }}>
                                  {job.isOpen ? "Marcar como No Disponible" : "Reabrir Vacante"}
                                </ThemedText>
                              </TouchableOpacity>
                            </View>
                          )}
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
      <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
          <MaterialCommunityIcons name="briefcase-search" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL DETALLES DEL EMPLEO */}
      <RNModal visible={!!selectedJobDetail} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedJobDetail(null)} />
            <View style={{ width: width > 600 ? 550 : '90%', maxHeight: height * 0.85, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 28, padding: 25, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <ThemedText style={{ fontSize: 24, fontWeight: '900', color: DynamicColors.text }}>{selectedJobDetail?.title}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <MaterialCommunityIcons name="domain" size={16} color={DynamicColors.subtext} />
                        <ThemedText style={{ fontSize: 14, color: DynamicColors.subtext, marginLeft: 4, fontWeight: '700' }}>{selectedJobDetail?.company}</ThemedText>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedJobDetail(null)} style={{ backgroundColor: DynamicColors.inputBg, padding: 6, borderRadius: 20 }}>
                    <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                          <MaterialCommunityIcons name="tag-outline" size={14} color={DynamicColors.accent} />
                          <ThemedText style={{ fontSize: 12, fontWeight: '800', color: DynamicColors.accent, marginLeft: 6 }}>{selectedJobDetail?.category}</ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                          <MaterialCommunityIcons name="map-marker-outline" size={14} color={DynamicColors.subtext} />
                          <ThemedText style={{ fontSize: 12, fontWeight: '700', color: DynamicColors.subtext, marginLeft: 6 }}>{selectedJobDetail?.location}</ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                          <MaterialCommunityIcons name="cash" size={14} color="#4CAF50" />
                          <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#4CAF50', marginLeft: 6 }}>
                            ${selectedJobDetail?.salaryMin}{selectedJobDetail?.salaryMax ? ` - $${selectedJobDetail?.salaryMax}` : ''} /hr
                          </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 95, 109, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                          <MaterialCommunityIcons name="clock-outline" size={14} color={DynamicColors.accent} />
                          <ThemedText style={{ fontSize: 12, fontWeight: '800', color: DynamicColors.accent, marginLeft: 6 }}>{selectedJobDetail?.shifts?.join(', ')}</ThemedText>
                      </View>
                  </View>

                  <ThemedText style={{ fontSize: 13, fontWeight: '900', color: DynamicColors.text, marginBottom: 8, textTransform: 'uppercase' }}>Descripción de la Vacante</ThemedText>
                  <ThemedText style={{ fontSize: 15, color: DynamicColors.text, lineHeight: 24, marginBottom: 25 }}>{selectedJobDetail?.description}</ThemedText>

                  {/* Acciones dentro del Modal */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      <TouchableOpacity onPress={() => { setSelectedJobDetail(null); setSelectedCompany(selectedJobDetail); }} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                          <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                          <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: '800', color: DynamicColors.text }}>Ver Reseñas</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleContact(selectedJobDetail?.contactMethod as 'whatsapp'|'call', selectedJobDetail?.phoneCode, selectedJobDetail?.phone)} disabled={selectedJobDetail?.status === 'pending' || !selectedJobDetail?.isOpen} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: selectedJobDetail?.contactMethod === 'whatsapp' ? '#4CAF50' : '#2196F3', opacity: (selectedJobDetail?.status === 'pending' || !selectedJobDetail?.isOpen) ? 0.4 : 1 }}>
                          <MaterialCommunityIcons name={selectedJobDetail?.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color="#FFF" />
                          <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: '900', color: '#FFF' }}>
                              {selectedJobDetail?.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamar'}
                          </ThemedText>
                      </TouchableOpacity>
                  </View>
              </ScrollView>
            </View>
        </View>
      </RNModal>

      {/* MODAL CREAR EMPLEO */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%', alignSelf: 'center' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, marginBottom: 10 }}>
                <View>
                    <ThemedText style={{ fontSize: 20, fontWeight: '900', color: DynamicColors.text }}>Publicar Empleo</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#FFB74D', fontWeight: '700', marginTop: 4 }}>* Requiere revisión de administrador</ThemedText>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                
                {/* CATEGORÍAS */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {JOB_CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => setNewJob({...newJob, category: cat.id, title: ''})} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: newJob.category === cat.id ? 0 : 1, borderColor: DynamicColors.border }}>
                      {newJob.category === cat.id ? (
                          <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14 }}>
                              <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{marginRight:6}} />
                              <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{cat.id}</ThemedText>
                          </LinearGradient>
                      ) : (
                          <View style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              <MaterialCommunityIcons name={cat.icon as any} size={16} color={DynamicColors.iconInactive} style={{marginRight:6}} />
                              <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 13, fontWeight: '600' }}>{cat.id}</ThemedText>
                          </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* SUGERENCIAS DE TÍTULOS */}
                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>TÍTULO DEL PUESTO *</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}} contentContainerStyle={{gap: 8}}>
                    {(SUGGESTED_TITLES[newJob.category] || SUGGESTED_TITLES['Todos']).map(suggestion => {
                        const isSelected = newJob.title === suggestion;
                        return (
                            <TouchableOpacity key={suggestion} onPress={() => setNewJob({...newJob, title: suggestion})} style={{ borderRadius: 20, overflow: 'hidden', borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                {isSelected ? (
                                    <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
                                        <MaterialCommunityIcons name="check" size={14} color="#FFF" style={{ marginRight: 4 }} />
                                        <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>{suggestion}</ThemedText>
                                    </LinearGradient>
                                ) : (
                                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: DynamicColors.inputBg }}>
                                        <ThemedText style={{ fontSize: 13, fontWeight: '600', color: DynamicColors.text }}>{suggestion}</ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <TextInput value={newJob.title} onChangeText={t => setNewJob({...newJob, title: t})} placeholder="Escribe o elige un puesto arriba..." placeholderTextColor="#999" style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                {/* UBICACIÓN Y EMPRESA */}
                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>UBICACIÓN O ZIP CODE *</ThemedText>
                <TextInput value={newJob.location} onChangeText={t => setNewJob({...newJob, location: t})} placeholder="Ej. Ontario, CA o 91761" placeholderTextColor="#999" style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>EMPRESA / CONTRATISTA *</ThemedText>
                <TextInput value={newJob.company} onChangeText={t => setNewJob({...newJob, company: t})} placeholder="Nombre del negocio o persona" placeholderTextColor="#999" style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                {/* --- RANGO SALARIAL POR HORA --- */}
                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>PAGO POR HORA (USD) *</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                        <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800', marginRight: 8 }}>$</ThemedText>
                        <TextInput value={newJob.salaryMin} onChangeText={t => setNewJob({...newJob, salaryMin: t})} keyboardType="numeric" placeholder="Mínimo" placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                        <ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800', marginRight: 8 }}>$</ThemedText>
                        <TextInput value={newJob.salaryMax} onChangeText={t => setNewJob({...newJob, salaryMax: t})} keyboardType="numeric" placeholder="Máximo (Opcional)" placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                    </View>
                </View>

                {/* --- SELECCIÓN MÚLTIPLE DE TURNOS --- */}
                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>TURNOS DISPONIBLES *</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {SHIFT_OPTIONS.map(shift => {
                        const isSelected = newJob.shifts.includes(shift);
                        return (
                            <TouchableOpacity key={shift} onPress={() => toggleNewJobShift(shift)} style={{ borderRadius: 12, overflow: 'hidden', height: 40, borderWidth: isSelected ? 0 : 1, borderColor: DynamicColors.border }}>
                                {isSelected ? (
                                    <LinearGradient colors={orangeGradient} style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14 }}>
                                        <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" style={{marginRight:6}} />
                                        <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>{shift}</ThemedText>
                                    </LinearGradient>
                                ) : (
                                    <View style={{ flex: 1, flexDirection:'row', alignItems:'center', paddingHorizontal: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                                        <MaterialCommunityIcons name="circle-outline" size={14} color={DynamicColors.iconInactive} style={{marginRight:6}} />
                                        <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 12, fontWeight: '600' }}>{shift}</ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* DISEÑO DE CONTACTO */}
                <ThemedText style={{ fontSize: 13, fontWeight: '900', color: DynamicColors.text, marginBottom: 10 }}>Método de contacto principal</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    <TouchableOpacity
                        onPress={() => setNewJob({...newJob, contactMethod: 'whatsapp'})}
                        style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.border, backgroundColor: newJob.contactMethod === 'whatsapp' ? 'rgba(76, 175, 80, 0.1)' : DynamicColors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="whatsapp" size={18} color={newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.subtext} />
                        <ThemedText style={{ marginLeft: 6, fontWeight: '800', color: newJob.contactMethod === 'whatsapp' ? '#4CAF50' : DynamicColors.subtext }}>WhatsApp</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setNewJob({...newJob, contactMethod: 'call'})}
                        style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.border, backgroundColor: newJob.contactMethod === 'call' ? 'rgba(33, 150, 243, 0.1)' : DynamicColors.inputBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="phone" size={18} color={newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.subtext} />
                        <ThemedText style={{ marginLeft: 6, fontWeight: '800', color: newJob.contactMethod === 'call' ? '#2196F3' : DynamicColors.subtext }}>Llamada</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Input con código de país a la izquierda */}
                <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden', marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => setShowCountryPicker(true)} style={{ paddingHorizontal: 15, justifyContent: 'center', borderRightWidth: 1, borderRightColor: DynamicColors.border, flexDirection: 'row', alignItems: 'center' }}>
                        <ThemedText style={{ fontWeight: '800', color: DynamicColors.text }}>{COUNTRY_CODES.find(c => c.code === newJob.phoneCode)?.flag} {newJob.phoneCode}</ThemedText>
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

                <ThemedText style={{ fontSize: 11, fontWeight: '900', color: DynamicColors.text, marginBottom: 8 }}>DESCRIPCIÓN *</ThemedText>
                <TextInput value={newJob.description} onChangeText={t => setNewJob({...newJob, description: t})} placeholder="Requisitos, habilidades necesarias..." placeholderTextColor="#999" multiline style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, height: 100, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                <TouchableOpacity onPress={handlePublishJob} disabled={isPublishing}>
                  <LinearGradient colors={(!newJob.title || !newJob.description || !newJob.phone || !newJob.company || !newJob.location || newJob.shifts.length === 0 || !newJob.salaryMin) ? disabledGradient : orangeGradient} style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Enviar a Revisión</ThemedText>}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* SELECTOR DE FILTRO DE TURNO MODAL */}
      <RNModal visible={showShiftPickerModal} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowShiftPickerModal(false)} />
              <View style={{ width: 280, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                  {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  <ThemedText style={{ fontSize: 16, fontWeight: '900', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>Filtrar por Turno</ThemedText>
                  
                  <View style={{ flexDirection: 'column', gap: 10 }}>
                      <TouchableOpacity style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.border }} onPress={() => { setFilterShift('Todos'); setShowShiftPickerModal(false); }}>
                          <ThemedText style={{ fontWeight: '800', color: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.text }}>Todos los turnos</ThemedText>
                      </TouchableOpacity>
                      {SHIFT_OPTIONS.map((shift, index) => (
                          <TouchableOpacity key={index} style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterShift === shift ? DynamicColors.accent : DynamicColors.border }} onPress={() => { setFilterShift(shift); setShowShiftPickerModal(false); }}>
                              <ThemedText style={{ fontWeight: '800', color: filterShift === shift ? DynamicColors.accent : DynamicColors.text }}>{shift}</ThemedText>
                          </TouchableOpacity>
                      ))}
                  </View>
              </View>
          </View>
      </RNModal>

      {/* SELECTOR DE PAÍS MODAL */}
      <RNModal visible={showCountryPicker} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCountryPicker(false)} />
              <View style={{ width: 300, maxHeight: height * 0.6, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
                  {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
                  <ThemedText style={{ fontSize: 16, fontWeight: '900', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>Selecciona el País</ThemedText>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                          {COUNTRY_CODES.map((country, index) => (
                              <TouchableOpacity key={index} style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, width: '45%', alignItems: 'center', borderWidth: 1, borderColor: DynamicColors.border, flexDirection: 'row', justifyContent: 'center' }} onPress={() => {
                                  setNewJob({...newJob, phoneCode: country.code});
                                  setShowCountryPicker(false);
                              }}>
                                  <ThemedText style={{ fontSize: 16, marginRight: 6 }}>{country.flag}</ThemedText>
                                  <ThemedText style={{ fontWeight: '800', color: DynamicColors.text }}>{country.code}</ThemedText>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </ScrollView>
              </View>
          </View>
      </RNModal>

      {/* MODAL RESEÑAS EMPRESA */}
      <RNModal visible={!!selectedCompany} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedCompany(null)} />
            <View style={{ width: width > 600 ? 500 : '90%', maxHeight: height * 0.7, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 28, padding: 25, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View>
                    <ThemedText style={{ fontSize: 20, fontWeight: '900', color: DynamicColors.text }}>{selectedCompany?.company}</ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MaterialCommunityIcons name="star" size={16} color="#FFB300" />
                        <ThemedText style={{ fontSize: 14, fontWeight: '800', color: DynamicColors.text, marginLeft: 4 }}>{selectedCompany?.rating > 0 ? selectedCompany?.rating.toFixed(1) : 'Sin reseñas'}</ThemedText>
                    </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedCompany(null)}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedCompany?.reviews && selectedCompany.reviews.length > 0 ? (
                    selectedCompany.reviews.map((r: any) => (
                        <View key={r.id} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 15, marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : DynamicColors.iconInactive} />
                                ))}
                            </View>
                            <ThemedText style={{ color: DynamicColors.text, fontSize: 14 }}>{r.text}</ThemedText>
                        </View>
                    ))
                ) : (
                    <ThemedText style={{ color: DynamicColors.subtext, textAlign: 'center', marginTop: 20 }}>Esta empresa aún no tiene reseñas.</ThemedText>
                )}
              </ScrollView>
            </View>
        </View>
      </RNModal>
    </View>
  );
}