import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Alert, Share, ColorValue, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as ImagePicker from 'expo-image-picker'; 

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import badWordsData from '@/utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

const BANNED_WORDS = Array.isArray((badWordsData as any)?.badWordsList) ? (badWordsData as any).badWordsList : []; 
const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some((word: string) => lowerText.includes(word.toLowerCase()));
};

const API_JOBS_URL = 'http://192.168.252.243:3000/jobs';
const API_COMPANIES_URL = 'http://192.168.252.243:3000/companies';
const API_TARIFFS_URL = 'http://192.168.252.243:3000/tariffs';

const usCitiesData: Record<string, string[]> = {
  "California": ["Anaheim", "Bakersfield", "Chino", "Chino Hills", "Corona", "Eastvale", "El Monte", "Fontana", "Fullerton", "Hesperia", "Irvine", "Jurupa Valley", "Long Beach", "Los Angeles", "Moreno Valley", "Ontario", "Pomona", "Rancho Cucamonga", "Rialto", "Riverside", "San Bernardino", "San Diego", "Santa Ana", "Upland", "Victorville"],
  "Texas": ["Austin", "Dallas", "El Paso", "Fort Worth", "Houston", "San Antonio"],
  "Florida": ["Jacksonville", "Miami", "Orlando", "Tampa"]
};
const STATES = Object.keys(usCitiesData);

const COUNTRY_CODES = [{ code: '+1', flag: '🇺🇸' }];
  //, { code: '+52', flag: '🇲🇽' }, { code: '+57', flag: '🇨🇴' }];

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
  
  const paramsGlobal = useLocalSearchParams();
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

  //comp.premiumPlan

  const planStyles: any = {
    coupon: {
      selected: '#EA8D2D', // Coral vibrante (Mantenido, es un excelente color)
      unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)',
      text: (isDark: boolean) => isDark ? '#FFF' : '#333',
    },
    basic: {
      selected: '#FF5F6D', // Coral vibrante (Mantenido, es un excelente color)
      unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)',
      text: (isDark: boolean) => isDark ? '#FFF' : '#333',
    },
    premium: {
      selected: '#F5A623', // Oro/Ámbar más brillante y "premium" (Mejora sobre el #CFA82E opaco)
      unselected: (isDark: boolean) => isDark ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.08)', // Ahora usa los RGB correctos del color seleccionado
      text: (isDark: boolean) => isDark ? '#FFF' : '#333',
    },
    unlimited: {
      selected: '#10B981', // Verde esmeralda moderno y profesional
      unselected: (isDark: boolean) => isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', // Unificado al patrón de opacidad
      text: (isDark: boolean) => isDark ? '#FFF' : '#333', // Ajustado para garantizar legibilidad en ambos temas
    }
  };

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'] as const;

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]); 
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState('Todos');
  const [availabilityFilter, setAvailabilityFilter] = useState<'open' | 'closed'>('open'); 
  const [filterTitle, setFilterTitle] = useState<string>('Todos'); 
  const [filterShift, setFilterShift] = useState<string>('Todos'); 
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  
  const [filterState, setFilterState] = useState<string>('California');
  const [filterLocations, setFilterLocations] = useState<string[]>([]); 
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishView, setPublishView] = useState<'form' | 'city' | 'country' | 'company_list' | 'create_company'>('form');

  const [userCompanies, setUserCompanies] = useState<any[]>([]);
  const [companyTariffs, setCompanyTariffs] = useState({coupon: '0.00', basic: '50.00', premium: '99.00', unlimited: '149.00' });
  
  const [newCompanyForm, setNewCompanyForm] = useState({ 
    name: '', ein: '', phoneCode: '+1', phone: '', contactMethod: 'call' as 'whatsapp'|'call', email: '', website: '', logoUri: '', logoBase64: '', premiumPlan: 'basic'
  });
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  
  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');

  const [newJob, setNewJob] = useState<{
      title: string; company: string; companyId: string; category: string; description: string; 
      contactMethod: 'whatsapp' | 'call'; phoneCode: string; phone: string;
      shifts: string[]; salaryMin: string; salaryMax: string; state: string; city: string;
  }>({ 
      title: '', company: '', companyId: '', category: 'Bodega', description: '', 
      contactMethod: 'call', phoneCode: '+1', phone: '',
      shifts: [], salaryMin: '', salaryMax: '', state: 'California', city: ''
  });
  
  const [showShiftPickerModal, setShowShiftPickerModal] = useState(false);
  const [showTitlePickerModal, setShowTitlePickerModal] = useState(false); 
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false); 
  
  const [selectedCompany, setSelectedCompany] = useState<any>(null); 
  const [selectedJobDetail, setSelectedJobDetail] = useState<any>(null); 
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState<any>(null);

  const [reviewForm, setReviewForm] = useState({ visible: false, text: '', rating: 0, isAnonymous: false });
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Company`);
        if (res.ok) {
          const tariffsData = await res.json();
          if (tariffsData && tariffsData.length > 0) {
            setCompanyTariffs({
              coupon: tariffsData[0].priceCoupon || '0.00',
              basic: tariffsData[0].priceBasic || '50.00',
              premium: tariffsData[0].pricePremium || '99.00',
              unlimited: tariffsData[0].priceUnlimited || '149.00'
            });
          }
        }
      } catch (e) { console.warn("⚠️ No se pudo cargar la tarifa de empresas"); }
    };
    fetchTariff();
  }, []);

  const fetchUserCompanies = async () => {
    try {
      const res = await fetch(`${API_COMPANIES_URL}?userId=${currentUserId}`);
      const data = await res.json();
      if (Array.isArray(data)) setUserCompanies(data);
    } catch (e) { console.warn("No se pudieron cargar las empresas."); }
  };

  const fetchPendingCompaniesForAdmin = async () => {
    try {
      const res = await fetch(API_COMPANIES_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
          setPendingCompanies(data.filter((c: any) => c.status === 'pending' || !c.isVerified));
      }
    } catch (e) { console.error("Error al obtener pendientes de admin", e); }
  };

  useEffect(() => {
    if (isAdminMode) fetchPendingCompaniesForAdmin();
  }, [isAdminMode]);

  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        const storedJobs = await AsyncStorage.getItem('@saved_jobs');
        if (storedJobs) setSavedJobs(JSON.parse(storedJobs));
      } catch (error) { console.error(error); }
    };
    loadSavedJobs();
  }, []);

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
            companyId: item.companyId,
            isCompanyVerified: item.isCompanyVerified || false, 
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
            isOpen: item.isOpen,
            displayTime: new Date(item.createdAt).toLocaleDateString()
          };
        });
        setJobs(mappedData);
      }
    } catch (e) { console.error("Error al obtener empleos:", e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobsData(); }, [currentUserId]);

  const handleOpenCompanyProfile = async (companyId: string) => {
    if (!companyId) return triggerAlert("Aviso", "Esta vacante no tiene un perfil de empresa verificado enlazado.");
    try {
        setLoading(true);
        const res = await fetch(`${API_COMPANIES_URL}/${companyId}`);
        if (res.ok) {
            const data = await res.json();
            setSelectedCompanyProfile(data);
        } else {
            triggerAlert("Error", "No se pudo cargar el perfil de la empresa.");
        }
    } catch (e) {
        triggerAlert("Error", "Error de conexión al cargar la empresa.");
    } finally {
        setLoading(false);
    }
  };

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

      const localMatch = jobs.find(j => String(j.id) === cleanNotifId);
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
          } catch (e) { console.error(e); }
        };
        fetchSpecificJob();
      }
    }
  }, [notificationId, jobs]);

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
    } catch (error) { console.error(error); }
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
              message: `¡Mira esta oferta de empleo!\n\n📌 Puesto: ${job.title}\n🏢 Empresa: ${job.company}\n📍 Ubicación: ${job.city}, ${job.state}\n💵 Pago: $${job.salaryMin}/hr\n\nPostúlate en Viviendo en USA.`
          });
      } catch (error) { console.log(error); }
  };

  const handlePickLogo = async () => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setNewCompanyForm(prev => ({
                ...prev,
                logoUri: result.assets[0].uri
            }));
        }
    } catch (error) {
        triggerAlert("Error", "No se pudo acceder a la galería de imágenes.");
    }
  };

  const handleRegisterCompany = async () => {
    if (!newCompanyForm.name.trim() || !newCompanyForm.phone.trim() || !formRefCode.trim()) {
      triggerAlert("Campos Incompletos", "Por favor ingresa el nombre de la empresa, teléfono y código de confirmación de pago.");
      return;
    }
    
    setIsCreatingCompany(true);
    
    try {
      let finalImageName = '';
      
      if (newCompanyForm.logoUri) {
        const esSegura = await validarImagenEnServidor(newCompanyForm.logoUri);
        if (!esSegura) {
          setIsCreatingCompany(false);
          return Alert.alert("Error", "Imagen inapropiada");
        }
        
        const formData = new FormData();
        let filename = newCompanyForm.logoUri.split('/').pop() || 'logo.webp';
        filename = filename.replace(/\.[^/.]+$/, "") + ".webp"; 
        const type = 'image/webp';

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(newCompanyForm.logoUri);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: newCompanyForm.logoUri, name: filename, type } as any);
        }

        const uploadResponse = await fetch('http://192.168.252.243:3000/api/subir-imagen-optimizada/companies', {
          method: 'POST', body: formData, headers: { 'Accept': 'application/json' },
        });
        
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
        
        finalImageName = uploadData.identificadorArchivo;
      }

      const payload = {
        userId: currentUserId,
        name: newCompanyForm.name.trim(),
        ein: newCompanyForm.ein.trim() || null,
        phone: newCompanyForm.phone.trim(),
        phoneCode: newCompanyForm.phoneCode,
        contactMethod: 'call', 
        email: newCompanyForm.email.trim() || null,     
        website: newCompanyForm.website.trim() || null, 
        logoUrl: finalImageName, 
        premiumPlan: newCompanyForm.premiumPlan, 
        referenceCode: formRefCode,
        paymentMethod: formPayMethod
      };

      const res = await fetch(API_COMPANIES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar la empresa");
      }

      const savedCompany = await res.json();
      setUserCompanies(prev => [savedCompany, ...prev]);
      
      setNewJob(prev => ({ 
        ...prev, 
        company: savedCompany.name, 
        companyId: savedCompany.id, 
        phone: savedCompany.phone,
        phoneCode: savedCompany.phoneCode || '+1',
        contactMethod: 'call'
      }));
      
      setNewCompanyForm({ name: '', ein: '', phoneCode: '+1', phone: '', contactMethod: 'call', email: '', website: '', logoUri: '', logoBase64: '', premiumPlan: 'basic' });
      setFormRefCode('');
      setFormPayMethod('Zelle');
      setPublishView('form');
      triggerAlert("Suscripción en Revisión", "Tu empresa ha sido registrada. Podrás publicar en cuanto verifiquemos tu suscripción Premium.");
      
    } catch (e: any) {
      triggerAlert("Error", e.message || "No se pudo registrar la empresa.");
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handlePublishJob = async () => {
    if (!newJob.title || !newJob.companyId || !newJob.city || !newJob.description || newJob.shifts.length === 0 || !newJob.salaryMin) {
      triggerAlert("Campos Incompletos", "Selecciona una empresa registrada y completa todos los campos de la vacante.");
      return;
    }
    if (!validateComment(newJob.description)) {
      triggerAlert("Error", "La descripción contiene palabras no permitidas.");
      return; 
    }
    
    const selectedCompanyData = userCompanies.find(c => c.id === newJob.companyId);
    if (selectedCompanyData && !selectedCompanyData.isVerified) {
        triggerAlert("Empresa Pendiente", "Tu empresa aún está pendiente de verificación de pago. En cuanto se apruebe, podrás publicar.");
        return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        nameJobs: newJob.title.trim(),
        title: newJob.title.trim(),
        company: newJob.company.trim(),
        companyId: newJob.companyId,
        category: newJob.category,
        stateCountry: newJob.state,
        city: newJob.city.trim(),
        zip: '', 
        contactMethod: false, 
        phoneCode: newJob.phoneCode,
        phone: newJob.phone.trim(),
        shifts: newJob.shifts.join(', '),
        salaryMin: newJob.salaryMin.trim(),
        salaryMax: newJob.salaryMax.trim(),
        descriptionJob: newJob.description.trim(),
        isOpen: true,
        userId: currentUserId,
        userNameId: currentUser,
        imageRute: ''
      };

      const res = await fetch(API_JOBS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      fetchJobsData(); 
      setModalVisible(false);
      setNewJob({ title: '', company: '', companyId: '', category: 'Bodega', description: '', contactMethod: 'call', phoneCode: '+1', phone: '', shifts: [], salaryMin: '', salaryMax: '', state: 'California', city: '' });

      triggerAlert("¡Vacante Publicada!", "Al tener un plan activo, tu vacante se ha publicado inmediatamente.");
    } catch (e) { triggerAlert("Error", "No se pudo publicar la vacante."); } 
    finally { setIsPublishing(false); }
  };

  const handleApproveCompany = async (id: string, durationMonths: number) => {
    try {
      const res = await fetch(`${API_COMPANIES_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      if (!res.ok) throw new Error();
      triggerAlert("Aprobado", "Empresa verificada y suscripción Premium activada.");
      fetchPendingCompaniesForAdmin();
      fetchJobsData();
    } catch (e) { triggerAlert("Error", "No se pudo aprobar la empresa."); }
  };

  const handleRejectCompany = async (id: string) => {
    try {
      const res = await fetch(`${API_COMPANIES_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      triggerAlert("Rechazado", "El registro de la empresa ha sido eliminado.");
      fetchPendingCompaniesForAdmin();
    } catch (e) { triggerAlert("Error", "No se pudo eliminar la empresa."); }
  };

  const toggleJobStatus = async (id: string, currentIsOpen: boolean) => {
    try {
      const willBeOpen = !currentIsOpen;
      setJobs(prevJobs => prevJobs.map(job => {
        if (job.id === id) return { ...job, isOpen: willBeOpen };
        return job;
      }));
      await fetch(`${API_JOBS_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: willBeOpen })
      });
    } catch (e) { console.error(e); }
  };

  const handleContact = (method: 'whatsapp' | 'call', code: string, phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = `${code}${cleanPhone}`;
    let url = method === 'call' ? `tel:${fullNumber}` : `https://wa.me/${cleanPhone}`;
    Linking.canOpenURL(url).then(supported => { if (supported) Linking.openURL(url); });
  };

  const handleSubmitReview = async () => {
      if (!reviewForm.text.trim() || reviewForm.rating === 0) return triggerAlert("Incompleto", "Ingresa estrellas y un comentario.");
      if (!validateComment(reviewForm.text)) return triggerAlert("Error", "Palabras no permitidas.");

      try {
        const payload = {
          reference_id: selectedCompany.id,
          stars: reviewForm.rating,
          comment: reviewForm.text,
          userId: currentUserId, 
          userName: currentUser,
          isAnonymous: reviewForm.isAnonymous 
        };

        const res = await fetch(`${API_JOBS_URL}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
           const errorData = await res.json();
           throw new Error(errorData.error || "No se pudo publicar la reseña.");
        }

        const savedReview = await res.json();
        const newReviewFormatted = { id: savedReview.id || Date.now(), text: savedReview.comment || reviewForm.text, stars: Number(savedReview.stars || reviewForm.rating), userName: savedReview.userName };
        
        let newAverage = 0;
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.companyId === selectedCompany.companyId) {
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
        triggerAlert("¡Gracias!", "Tu reseña ha sido publicada.");
      } catch (e: any) { triggerAlert("Aviso", e.message); }
  };

  // 🚀 LÓGICA DE AGRUPACIÓN DE VACANTES EN EL FEED (CORREGIDA PARA TYPESCRIPT)
  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter(job => {
      
      if (job.companyId && !job.isCompanyVerified && job.userId !== currentUserId) {
          return false; 
      }

      let matchCategory = false;
      if (activeFilter === 'Todos' || activeFilter === 'All') { matchCategory = true; } 
      else {
          const spanishCategory = Object.keys(CATEGORY_MAP).find(key => CATEGORY_MAP[key].includes(activeFilter) || key === activeFilter);
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

    const grouped: any[] = [];
    const seenCompanies = new Set();

    filtered.forEach(job => {
        if (job.companyId) {
            if (!seenCompanies.has(job.companyId)) {
                const cJobs = filtered.filter(j => j.companyId === job.companyId);
                grouped.push({ ...job, groupedCount: cJobs.length });
                seenCompanies.add(job.companyId);
            }
        } else {
            grouped.push({ ...job, groupedCount: 1 });
        }
    });

    return grouped;
  }, [jobs, activeFilter, availabilityFilter, filterTitle, filterShift, filterState, filterLocations, showSavedOnly, savedJobs]);

  const locationButtonText = filterLocations.length === 0 
      ? (jobstabData.filter === 'Filter' ? 'All Cities' : 'Todas las Ciudades')
      : filterLocations.length === 1 ? filterLocations[0] : `${filterLocations.length} ciudades`;

  const companyJobs = selectedCompanyProfile 
      ? jobs.filter(j => j.companyId === selectedCompanyProfile.id && (j.isOpen || j.userId === currentUserId))
      : [];
  const activeCount = companyJobs.filter(j => j.isOpen).length;

  const PendingCompanyItem = ({ comp }: { comp: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    return (
        <View style={{ marginBottom: 15, borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: '#FFB74D', padding: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                {comp.logoUrl ? (
                    <Image source={{ uri: comp.logoUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} />
                ) : (
                    <MaterialCommunityIcons name="domain" size={26} color="#FFB74D" style={{ marginRight: 8 }}/>
                )}
                <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{comp.name}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <ThemedText style={{ fontSize: 11, color: '#FFB74D', fontWeight: 'bold' }}>PLAN: {comp.premiumPlan?.toUpperCase()}</ThemedText>
                </View>
            </View>
            {comp.ein && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext }}>EIN/Tax ID: {comp.ein}</ThemedText>}
            <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, marginTop: 2 }}>{t.jobstab.contact} {comp.phoneCode} {comp.phone}</ThemedText>
            
            <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.12)', padding: 10, borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.4)' }}>
                <ThemedText style={{ fontSize: 12, color: DynamicColors.text, fontWeight: '600', textAlign: 'center' }}>
                    Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{comp.referenceCode || 'N/A'}</ThemedText> ({comp.paymentMethod || 'Zelle'})
                </ThemedText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                {[1, 3, 6, 12].map(m => (
                    <TouchableOpacity key={m} onPress={() => setSelectedMonths(m)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedMonths === m ? '#4CAF50' : DynamicColors.inputBg }}>
                        <ThemedText style={{color: selectedMonths === m ? '#FFF' : DynamicColors.text, fontWeight: 'bold', fontSize: 12}}>{m} M</ThemedText>
                    </TouchableOpacity>
                ))}
            </View>
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => handleRejectCompany(comp.id)} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Rechazar</ThemedText></TouchableOpacity>
                <TouchableOpacity onPress={() => handleApproveCompany(comp.id, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}>Activar Plan</ThemedText></TouchableOpacity>
            </View>
        </View>
    );
  };

  return (
    <View style={styles.container}>
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

                {/* 🚀 Botón de Admin */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => setShowSavedOnly(!showSavedOnly)} style={{ padding: 0 }}>
                      <MaterialCommunityIcons name={showSavedOnly ? "bookmark" : "bookmark-outline"} size={24} color={showSavedOnly ? DynamicColors.accent : DynamicColors.text} style={{opacity: showSavedOnly ? 1 : 0.6}}/>
                  </TouchableOpacity>
                  <TouchableOpacity onLongPress={() => setIsAdminMode(!isAdminMode)} style={{ padding: 0 }}>
                      <MaterialCommunityIcons name="briefcase-search" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.3}}/>
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
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    
                    {/* 🚀 PANEL ADMIN ADENTRO DEL SCROLL */}
                    {isAdminMode && pendingCompanies.length > 0 && (
                        <View style={{ backgroundColor: 'rgba(255,255,0,0.06)', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
                        <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 12 }}>Empresas por Verificar ({pendingCompanies.length})</ThemedText>
                        {pendingCompanies.map(comp => (
                            <PendingCompanyItem key={comp.id} comp={comp} />
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
                                {filterTitle === 'Todos' || filterTitle === 'All' ? t.jobstab.anycity+` ${activeFilter}` : filterTitle}
                            </ThemedText>
                            <MaterialCommunityIcons name="chevron-down" size={18} color={filterTitle !== 'Todos' && filterTitle !== 'All' ? DynamicColors.accent : DynamicColors.subtext} />
                        </TouchableOpacity>
                    </View>

                    {filteredJobs.length === 0 ? (
                       <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                         <MaterialCommunityIcons name="briefcase-variant-off" size={56} color={DynamicColors.subtext} />
                         <ThemedText style={{ color: DynamicColors.subtext, marginTop: 14, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 20 }}>
                           {showSavedOnly ? t.jobstab.savevacancy : t.jobstab.novacancy}
                         </ThemedText>
                       </View>
                    ) : (
                      filteredJobs.map(job => {
                        const reviewCount = job.reviews?.length || 0;
                        let formattedCount = reviewCount.toString();
                        if (reviewCount >= 1000) {
                            formattedCount = (reviewCount / 1000).toFixed(1) + 'k';
                        }
                        
                        const isOwner = job.userId === currentUserId;
                        
                        return (
                          <View key={job.id} style={{ borderRadius: 28, overflow: 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', borderColor: DynamicColors.border, opacity: !job.isOpen ? 0.65 : 1 }}>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedJobDetail(job)}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                                <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                                  <ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{job.category.toUpperCase()}</ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                  {job.isCompanyVerified && <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                                    <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
                                    <ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{job.rating > 0 ? job.rating.toFixed(1) : 'Nuevo'}</ThemedText>
                                  </View>
                                </View>
                              </View>

                              <View style={{ padding: 15, paddingTop: 0 }}>
                                <ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{job.title}</ThemedText>
                                
                                {/* 🚀 INFO CORPORATIVA (TEXTO NORMAL) */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 15 }}>
                                    <MaterialCommunityIcons name="domain" size={16} color={DynamicColors.subtext} />
                                    <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: 'bold', marginLeft: 4 }}>{job.company}</ThemedText>
                                    {job.isCompanyVerified && <MaterialCommunityIcons name="check-decagram" size={14} color="#4CAF50" style={{marginLeft: 6}} />}
                                </View>

                                <ThemedText numberOfLines={2} style={{ fontSize: 14, color: DynamicColors.text, lineHeight: 22 }}>{job.description}</ThemedText>
                              </View>
                            </TouchableOpacity>

                            <View style={{ padding: 15, paddingTop: 0 }}>
                              
                              {/* 🚀 BANNER DE AGRUPACIÓN (FLEX SEGURO Y CLICKEABLE) */}
                              {job.groupedCount > 1 && (
                                  <TouchableOpacity onPress={() => handleOpenCompanyProfile(job.companyId)} style={{ marginBottom: 15, borderRadius: 14, overflow: 'hidden' }}>
                                      <LinearGradient colors={isDark ? ['rgba(255,95,109,0.2)', 'rgba(255,195,113,0.1)'] : ['rgba(255,95,109,0.1)', 'rgba(255,195,113,0.05)']} start={{x:0, y:0}} end={{x:1, y:0}} style={{ paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 95, 109, 0.4)', borderRadius: 14 }}>
                                          <MaterialCommunityIcons name="briefcase-search" size={20} color={DynamicColors.accent} style={{marginRight: 10}} />
                                          <View style={{flex: 1}}>
                                              <ThemedText style={{ fontSize: 13, color: DynamicColors.text, fontWeight: '800', flexShrink: 1 }}>
                                                  {t.jobstab.hadvacan} <ThemedText style={{color: DynamicColors.accent, fontWeight: '900'}}>{job.groupedCount} {t.jobstab.vacancys}</ThemedText> {t.jobstab.vacancys}
                                              </ThemedText>
                                          </View>
                                          <View style={{backgroundColor: DynamicColors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 10}}>
                                              <ThemedText style={{color: '#FFF', fontWeight: '900', fontSize: 11}}>{t.jobstab.viewall}</ThemedText>
                                          </View>
                                      </LinearGradient>
                                  </TouchableOpacity>
                              )}

                              {/* 🚀 BOTONES DE CONTACTO */}
                              <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15 }}>
                                  <TouchableOpacity onPress={() => setSelectedCompany(job)} style={{ flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}>
                                    <MaterialCommunityIcons name="comment-text-outline" size={18} color={DynamicColors.text} />
                                    <ThemedText style={{ marginLeft: 8, fontSize: 13, fontWeight: '800', color: DynamicColors.text }}>{t.genericbtn.reviews} ({formattedCount})</ThemedText>
                                  </TouchableOpacity>

                                  <TouchableOpacity onPress={() => handleContact('call', job.phoneCode, job.phone)} disabled={!job.isOpen} style={{ flex: 1.1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#E3F2FD', opacity: !job.isOpen ? 0.4 : 1 }}>
                                    <MaterialCommunityIcons name="phone" size={18} color="#1976D2" />
                                    <ThemedText style={{ marginLeft: 8, fontSize: 13, fontWeight: '800', color: '#1976D2' }}>
                                        {t.genericbtn.call}
                                    </ThemedText>
                                  </TouchableOpacity>
                              </View>

                              {/* 🚀 BOTÓN 'CERRAR VACANTE' */}
                              {isOwner && (
                                  <TouchableOpacity onPress={() => toggleJobStatus(job.id, job.isOpen)} style={{ width: '100%', marginTop: 15, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: job.isOpen ? 'rgba(255, 82, 82, 0.5)' : 'rgba(76, 175, 80, 0.5)', backgroundColor: job.isOpen ? 'rgba(255, 82, 82, 0.05)' : 'rgba(76, 175, 80, 0.05)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                      <MaterialCommunityIcons name={job.isOpen ? "close-circle-outline" : "refresh-circle"} size={18} color={job.isOpen ? '#FF5252' : '#4CAF50'} style={{marginRight: 8}} />
                                      <ThemedText style={{ color: job.isOpen ? '#FF5252' : '#4CAF50', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' }}>{job.isOpen ? t.jobstab.closevacanse : t.jobstab.reopenvacanse}</ThemedText>
                                  </TouchableOpacity>
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

      {/* FAB Flotante */}
      <TouchableOpacity onPress={() => { fetchUserCompanies(); setPublishView('company_list'); setModalVisible(true); }} style={[styles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
          <MaterialCommunityIcons name="briefcase-plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* --- MODAL DEL PERFIL CORPORATIVO (NUEVO) --- */}
      <RNModal visible={!!selectedCompanyProfile} transparent animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedCompanyProfile(null)} />
            <View style={{ width: isLargeWeb ? 600 : '100%', height: height * 0.85, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setSelectedCompanyProfile(null)}><MaterialCommunityIcons name="close-circle" size={32} color={DynamicColors.text} opacity={0.7} /></TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 25 }}>
                  {selectedCompanyProfile?.logoUrl ? (
                      <Image source={{ uri: selectedCompanyProfile.logoUrl }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: DynamicColors.accent, marginBottom: 15 }} />
                  ) : (
                      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: DynamicColors.border }}>
                          <MaterialCommunityIcons name="domain" size={50} color={DynamicColors.subtext} />
                      </View>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 26, fontWeight: '900', color: DynamicColors.text, textAlign: 'center' }}>{selectedCompanyProfile?.name}</ThemedText>
                      {selectedCompanyProfile?.isVerified && <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" style={{marginLeft: 8}} />}
                  </View>
                  {selectedCompanyProfile?.ein && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, marginTop: 4 }}>EIN: {selectedCompanyProfile.ein}</ThemedText>}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 30, paddingHorizontal: 5 }}>
                  {selectedCompanyProfile?.website && (
                      <TouchableOpacity onPress={() => Linking.openURL(selectedCompanyProfile.website.startsWith('http') ? selectedCompanyProfile.website : `https://${selectedCompanyProfile.website}`)} style={{ flex: 1, paddingVertical: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                           <MaterialCommunityIcons name="web" size={16} color={DynamicColors.accent} style={{marginRight: 4}} />
                           <ThemedText style={{ fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>{t.genericbtn.web}</ThemedText>
                      </TouchableOpacity>
                  )}
                  {selectedCompanyProfile?.email && (
                      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${selectedCompanyProfile.email}`)} style={{ flex: 1, paddingVertical: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                           <MaterialCommunityIcons name="email-outline" size={16} color={DynamicColors.accent} style={{marginRight: 4}} />
                           <ThemedText style={{ fontWeight: 'bold', fontSize: 13 }} numberOfLines={1}>{t.genericbtn.email}</ThemedText>
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleContact('call', selectedCompanyProfile?.phoneCode, selectedCompanyProfile?.phone)} style={{ flex: 1, paddingVertical: 12, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <MaterialCommunityIcons name="phone" size={16} color="#2196F3" style={{marginRight: 4}} />
                       <ThemedText style={{ fontWeight: 'bold', color: '#2196F3', fontSize: 13 }} numberOfLines={1}>{t.genericbtn.callbton}</ThemedText>
                  </TouchableOpacity>
              </View>

              <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 10 }}>{t.jobstab.vacancyactive} ({activeCount})</ThemedText>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 10 }}>
                  {companyJobs.length === 0 ? (
                      <ThemedText style={{ textAlign: 'center', opacity: 0.6, marginTop: 20 }}>{t.jobstab.novacancy}</ThemedText>
                  ) : (
                      companyJobs.map((job: any) => {
                          const isJobOwner = job.userId === currentUserId;
                          return (
                          <View key={job.id} style={{ backgroundColor: DynamicColors.inputBg, padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: DynamicColors.border, opacity: !job.isOpen ? 0.6 : 1 }}>
                              <TouchableOpacity disabled={!job.isOpen} onPress={() => { setSelectedCompanyProfile(null); setTimeout(() => setSelectedJobDetail(job), 300); }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                      <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                          <ThemedText style={{ color: DynamicColors.accent, fontSize: 10, fontWeight: '900' }}>{job.category.toUpperCase()}</ThemedText>
                                      </View>
                                      <ThemedText style={{ fontSize: 12, color: '#4CAF50', fontWeight: 'bold' }}>${job.salaryMin}/hr</ThemedText>
                                  </View>
                                  <ThemedText style={{ fontWeight: '900', fontSize: 16, color: DynamicColors.text }}>{job.title}</ThemedText>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={DynamicColors.subtext} />
                                      <ThemedText style={{ fontSize: 12, color: DynamicColors.subtext, marginLeft: 4 }}>{job.city}, {job.state}</ThemedText>
                                  </View>
                              </TouchableOpacity>
                              
                              {/* 🚀 BOTÓN DE CERRAR VACANTE DENTRO DEL PERFIL CORPORATIVO */}
                              {isJobOwner && (
                                  <TouchableOpacity onPress={() => toggleJobStatus(job.id, job.isOpen)} style={{ borderTopWidth: 1, borderColor: DynamicColors.border, paddingTop: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                      <MaterialCommunityIcons name={job.isOpen ? "close-circle-outline" : "refresh-circle"} size={16} color={job.isOpen ? '#FF5252' : '#4CAF50'} style={{marginRight: 6}} />
                                      <ThemedText style={{color: job.isOpen ? '#FF5252' : '#4CAF50', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase'}}>{job.isOpen ? t.jobstab.closevacanse : t.jobstab.reopenvacanse}</ThemedText>
                                  </TouchableOpacity>
                              )}
                          </View>
                      )})
                  )}
              </ScrollView>
            </View>
        </View>
      </RNModal>

      {/* --- MODAL DETALLE DE VACANTE --- */}
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
                    {selectedJobDetail?.isCompanyVerified && <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" style={{marginLeft: 6}} />}
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

                <ThemedText style={{ fontSize: 13, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8, textTransform: 'uppercase' }}>{t.jobstab.descriptionoffert}</ThemedText>
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 25 }}>{selectedJobDetail?.description}</ThemedText>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 }}>
                    <TouchableOpacity onPress={() => { setSelectedJobDetail(null); setTimeout(() => setSelectedCompany(selectedJobDetail), 300); }} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: DynamicColors.inputBg }}>
                        <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.viewreviews}</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleContact('call', selectedJobDetail?.phoneCode, selectedJobDetail?.phone)} disabled={!selectedJobDetail?.isOpen} style={{ flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#E3F2FD', opacity: !selectedJobDetail?.isOpen ? 0.4 : 1 }}>
                        <MaterialCommunityIcons name="phone" size={18} color="#1976D2" />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#1976D2' }}>
                            Llamar
                        </ThemedText>
                    </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </RNModal>

      {/* --- MODAL FORMULARIO DE PUBLICACIÓN Y CREACIÓN DE EMPRESAS --- */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: isLargeWeb ? 'center' : 'flex-end' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%', alignSelf: 'center' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              {publishView === 'city' ? (
                 <View style={{ padding: 25, height: height * 0.7, zIndex: 999 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                         <TouchableOpacity onPress={() => setPublishView('form')} style={{ paddingRight: 15 }}>
                             <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                         </TouchableOpacity>
                         <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.choisecity} {newJob.state}</ThemedText>
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
                         <TouchableOpacity onPress={() => setPublishView('create_company')} style={{ paddingRight: 15 }}>
                             <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                         </TouchableOpacity>
                         <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>Selecciona el País</ThemedText>
                     </View>
                     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                         <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                             {COUNTRY_CODES.map((country, index) => (
                                 <TouchableOpacity key={index} style={{ padding: 15, backgroundColor: DynamicColors.inputBg, borderRadius: 12, width: '45%', alignItems: 'center', borderWidth: 1, borderColor: DynamicColors.border, flexDirection: 'row', justifyContent: 'center' }} onPress={() => {
                                     setNewCompanyForm({...newCompanyForm, phoneCode: country.code});
                                     setPublishView('create_company');
                                 }}>
                                     <ThemedText style={{ fontSize: 18, marginRight: 8 }}>{country.flag}</ThemedText>
                                     <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: DynamicColors.text }}>{country.code}</ThemedText>
                                 </TouchableOpacity>
                             ))}
                         </View>
                     </ScrollView>
                 </View>
              ) : publishView === 'company_list' ? (
                 <View style={{ padding: 25, height: height * 0.7, zIndex: 999 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                             <TouchableOpacity onPress={() => setPublishView('form')} style={{ paddingRight: 15 }}>
                                 <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                             </TouchableOpacity>
                             <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.yourcompanies}</ThemedText>
                         </View>
                         <TouchableOpacity onPress={() => setPublishView('create_company')}>
                             <MaterialCommunityIcons name="plus-circle" size={28} color={DynamicColors.accent} />
                         </TouchableOpacity>
                     </View>
                     
                     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                         {userCompanies.length === 0 ? (
                             <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.6 }}>
                                 <MaterialCommunityIcons name="domain-off" size={48} color={DynamicColors.text} />
                                 <ThemedText style={{ textAlign: 'center', marginTop: 15 }}>{t.jobstab.nocompanieregister}</ThemedText>
                                 <TouchableOpacity onPress={() => setPublishView('create_company')} style={{ marginTop: 20, backgroundColor: DynamicColors.inputBg, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: DynamicColors.border }}>
                                     <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.accent }}>+ {t.jobstab.registerlabelcomp}</ThemedText>
                                 </TouchableOpacity>
                             </View>
                         ) : (
                             <View style={{ flexDirection: 'column', gap: 10 }}>
                                 {userCompanies.map((comp) => (
                                     <TouchableOpacity 
                                         key={comp.id} 
                                         style={{ padding: 15, backgroundColor: DynamicColors.inputBg, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: newJob.companyId === comp.id ? DynamicColors.accent : DynamicColors.border, marginBottom: 12 }} 
                                         onPress={() => { 
                                           setNewJob({
                                             ...newJob, 
                                             company: comp.name, 
                                             companyId: comp.id, 
                                             phone: comp.phone,
                                             phoneCode: comp.phoneCode || '+1',
                                             contactMethod: 'call'
                                           }); 
                                           setPublishView('form'); 
                                         }}>
                                         
                                         <View style={{ position: 'relative', marginRight: 15 }}>
                                             {comp.logoUrl ? (
                                                 <Image source={{ uri: comp.logoUrl }} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: DynamicColors.border }} />
                                             ) : (
                                                 <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: DynamicColors.border }}>
                                                     <MaterialCommunityIcons name="domain" size={24} color={DynamicColors.subtext} />
                                                 </View>
                                             )}
                                             {comp.isVerified && (
                                                 <View style={{ position: 'absolute', bottom: -2, right: -2, borderRadius: 10, padding: 2 }}>
                                                     <MaterialCommunityIcons name="check-decagram" size={16} color="#4CAF50" />
                                                 </View>
                                             )}
                                         </View>
                                         
                                         <View style={{ flex: 1 }}>
                                             <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: newJob.companyId === comp.id ? DynamicColors.accent : DynamicColors.text }}>{comp.name}</ThemedText>
                                             <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                                                 <View style={{ backgroundColor: comp.isVerified ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 183, 77, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                                     <ThemedText style={{ fontSize: 10, fontWeight: '900', color: comp.isVerified ? '#4CAF50' : '#FFB74D' }}>{comp.isVerified ? 'ACTIVA' : 'PENDIENTE'}</ThemedText>
                                                 </View>
                                                 {comp.premiumPlan && (
                                                     <View style={{ backgroundColor: planStyles[comp.premiumPlan as keyof typeof planStyles]?.unselected(isDark) || DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                                         <ThemedText style={{ fontSize: 10, fontWeight: 'bold', color: planStyles[comp.premiumPlan as keyof typeof planStyles]?.selected || DynamicColors.subtext }}>PLAN {comp.premiumPlan.toUpperCase()}</ThemedText>
                                                     </View>
                                                 )}
                                             </View>
                                         </View>
                                         <MaterialCommunityIcons name="chevron-right" size={20} color={DynamicColors.subtext} />
                                     </TouchableOpacity>
                                 ))}
                             </View>
                         )}
                     </ScrollView>
                 </View>
              ) : publishView === 'create_company' ? (
                 <View style={{ padding: 25, height: height * 0.85, zIndex: 999 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                         <TouchableOpacity onPress={() => setPublishView('company_list')} style={{ paddingRight: 15 }}>
                             <MaterialCommunityIcons name="arrow-left" size={28} color={DynamicColors.text} />
                         </TouchableOpacity>
                         <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.registerlabelcomp}</ThemedText>
                     </View>

                     <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                         <ThemedText style={{ fontSize: 14, marginBottom: 20 }}>
                             {t.jobstab.registrecompanie}
                         </ThemedText>

                         <View style={{ alignItems: 'center', marginBottom: 20 }}>
                             <TouchableOpacity onPress={handlePickLogo}>
                                 {newCompanyForm.logoUri ? (
                                     <Image source={{ uri: newCompanyForm.logoUri }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: DynamicColors.accent }} />
                                 ) : (
                                     <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: DynamicColors.border, borderStyle: 'dashed' }}>
                                         <MaterialCommunityIcons name="camera-plus" size={32} />
                                         <ThemedText style={{ fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>Logo</ThemedText>
                                     </View>
                                 )}
                             </TouchableOpacity>
                         </View>

                         <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.namecompanies}</ThemedText>
                         <TextInput 
                             value={newCompanyForm.name} 
                             onChangeText={t => setNewCompanyForm({...newCompanyForm, name: t})} 
                             placeholder="Ej. Construction LLC" 
                             placeholderTextColor="#999" 
                             autoCapitalize="words"
                             style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                         />

                         <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.labeltaxid}</ThemedText>
                         <TextInput 
                             value={newCompanyForm.ein} 
                             onChangeText={t => setNewCompanyForm({...newCompanyForm, ein: t})} 
                             placeholder="XX-XXXXXXX" 
                             placeholderTextColor="#999" 
                             style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                         />

                         <TextInput 
                             value={newCompanyForm.email} 
                             onChangeText={t => setNewCompanyForm({...newCompanyForm, email: t.toLowerCase()})} 
                             keyboardType="email-address" 
                             autoCapitalize="none"
                             autoCorrect={false}
                             placeholder={t.jobstab.labeleamil}
                             placeholderTextColor="#999" 
                             style={{ backgroundColor: DynamicColors.inputBg, padding: 15, borderRadius: 12, marginBottom: 12, color: DynamicColors.text, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                         />
                         <TextInput 
                             value={newCompanyForm.website} 
                             onChangeText={t => setNewCompanyForm({...newCompanyForm, website: t.toLowerCase()})} 
                             keyboardType="url" 
                             autoCapitalize="none"
                             autoCorrect={false}
                             placeholder="Web (Ej. www.empresa.com)..." 
                             placeholderTextColor="#999" 
                             style={{ backgroundColor: DynamicColors.inputBg, padding: 15, borderRadius: 12, marginBottom: 15, color: DynamicColors.text, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                         />

                         <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8, marginTop: 10 }}>{t.jobstab.labelplan}</ThemedText>
                         <View style={{ flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                             {[
                                 { id: 'coupon', name: 'Cupón', price: companyTariffs.coupon, desc: 'Cupón o periodod de prueba.' },
                                 { id: 'basic', name: 'Básico', price: companyTariffs.basic, desc: 'Ideal para independientes y PyMEs.' },
                                 { id: 'premium', name: 'Premium', price: companyTariffs.premium, desc: 'Mayor visibilidad y hasta 5 publicaciones activas.' },
                                 { id: 'unlimited', name: 'Ilimitado', price: companyTariffs.unlimited, desc: 'Acceso VIP, recluta todo el año sin límites.' }
                             ].map(plan => {
                                 const pStyle = planStyles[plan.id as keyof typeof planStyles];
                                 const isSelected = newCompanyForm.premiumPlan === plan.id;
                                 
                                 return (
                                 <TouchableOpacity 
                                     key={plan.id}
                                     onPress={() => setNewCompanyForm({...newCompanyForm, premiumPlan: plan.id})}
                                     style={{ 
                                        padding: 15, 
                                        borderRadius: 14, 
                                        borderWidth: 1, 
                                        borderColor: isSelected ? pStyle.selected : DynamicColors.border, 
                                        backgroundColor: isSelected ? pStyle.unselected(isDark) : DynamicColors.inputBg 
                                     }}
                                 >
                                     <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                             <MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={20} color={isSelected ? pStyle.selected : DynamicColors.subtext} />
                                             <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: isSelected ? pStyle.selected : DynamicColors.text, marginLeft: 8 }}>{plan.name}</ThemedText>
                                         </View>
                                         <ThemedText style={{ fontWeight: '900', fontSize: 16, color: DynamicColors.text }}>${plan.price}</ThemedText>
                                     </View>
                                     <ThemedText style={{ fontSize: 13, color: isSelected ? pStyle.text(isDark) : DynamicColors.subtext, marginTop: 6, marginLeft: 28 }}>{plan.desc}</ThemedText>
                                 </TouchableOpacity>
                             )})}
                         </View>

                         <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.labeltelcompanie}</ThemedText>
                         <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, overflow: 'hidden', marginBottom: 25 }}>
                             <TouchableOpacity onPress={() => setPublishView('country')} style={{ paddingHorizontal: 15, justifyContent: 'center', borderRightWidth: 1, borderRightColor: DynamicColors.border, flexDirection: 'row', alignItems: 'center' }}>
                                 <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.text }}>{COUNTRY_CODES.find(c => c.code === newCompanyForm.phoneCode)?.flag} {newCompanyForm.phoneCode}</ThemedText>
                                 <MaterialCommunityIcons name="chevron-down" size={16} color={DynamicColors.subtext} style={{marginLeft: 4}}/>
                             </TouchableOpacity>
                             <TextInput
                                 value={newCompanyForm.phone}
                                 onChangeText={t => setNewCompanyForm({...newCompanyForm, phone: t})}
                                 keyboardType="phone-pad"
                                 placeholder="(909) 000-0000"
                                 placeholderTextColor="#999" 
                                 style={{ flex: 1, padding: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                             />
                         </View>

                         <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: DynamicColors.border }}>
                            <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: DynamicColors.accent }}>Verificación de Pago</ThemedText>
                            <ThemedText style={{ fontSize: 13, marginBottom: 12, color: DynamicColors.text }}>
                                {t.jobstab.labelregistercomp1}<ThemedText style={{fontWeight:'900', color: DynamicColors.accent}}>${(companyTariffs as any)[newCompanyForm.premiumPlan]} USD</ThemedText> {t.jobstab.labelregistercomp2}  
                            </ThemedText>
                            
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                {['Zelle'].map((method) => (
                                <TouchableOpacity 
                                    key={method}
                                    onPress={() => setFormPayMethod(method)} 
                                    style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: formPayMethod === method ? DynamicColors.accent : DynamicColors.border, backgroundColor: formPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : DynamicColors.inputBg }}
                                >
                                    <ThemedText style={{ fontWeight: '900', color: formPayMethod === method ? DynamicColors.accent : DynamicColors.subtext }}>{method}</ThemedText>
                                </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput style={{ padding: 14, borderRadius: 12, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, color: DynamicColors.text }} placeholder={t.jobstab.placehoderreference+`${formPayMethod}...`} placeholderTextColor="#999" value={formRefCode} onChangeText={t => setFormRefCode(t.toUpperCase())} />
                         </View>

                         <TouchableOpacity onPress={handleRegisterCompany} disabled={isCreatingCompany}>
                             <LinearGradient colors={isCreatingCompany || !newCompanyForm.name || !newCompanyForm.phone || !formRefCode.trim() ? disabledGradient : orangeGradient} style={{ height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                                 {isCreatingCompany ? <ActivityIndicator color="#FFF" /> : <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{t.jobstab.labelpaycomp}</ThemedText>}
                             </LinearGradient>
                         </TouchableOpacity>
                     </ScrollView>
                 </View>
              ) : (
              <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, marginBottom: 10 }}>
                    <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.labeljobs}</ThemedText>
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
                                  <MaterialCommunityIcons name={cat.icon as any} size={16} style={{marginRight:6}} />
                                  <ThemedText style={{ fontSize: 13, fontWeight: 'bold' }}>{cat.id}</ThemedText>
                              </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.titlejobs}</ThemedText>
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
                      placeholder={t.jobstab.writejob}
                      placeholderTextColor="#999" 
                      autoCapitalize="words"
                      style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    />

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.state}</ThemedText>
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

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.city}</ThemedText>
                    <View style={{ zIndex: 50, marginBottom: 20 }}>
                        <TouchableOpacity 
                            onPress={() => setPublishView('city')} 
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: DynamicColors.border }}>
                            <ThemedText style={{ flex: 1, color: newJob.city ? DynamicColors.text : '#999', fontSize: 14 }}>
                                {newJob.city || t.jobstab.labelcity}
                            </ThemedText>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={DynamicColors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.companie}</ThemedText>
                    <TouchableOpacity 
                        onPress={() => { fetchUserCompanies(); setPublishView('company_list'); }} 
                        style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: newJob.companyId ? DynamicColors.accent : DynamicColors.border, marginBottom: 20, flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="domain" size={24} color={newJob.companyId ? DynamicColors.accent : DynamicColors.subtext} style={{marginRight: 12}} />
                        <View style={{ flex: 1 }}>
                            {newJob.companyId ? (
                                <>
                                    <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.accent, fontSize: 16 }}>{newJob.company}</ThemedText>
                                    <ThemedText style={{ fontSize: 13, marginTop: 4 }}>
                                        📞 {newJob.phoneCode} {newJob.phone} • {t.genericbtn.callbton}
                                    </ThemedText>
                                </>
                            ) : (
                                <ThemedText style={{ color: DynamicColors.subtext, fontSize: 14, fontWeight: 'bold' }}>
                                    {t.jobstab.labeljobselec}
                                </ThemedText>
                            )}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={DynamicColors.subtext} />
                    </TouchableOpacity>

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.labelvalue}</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                            <ThemedText style={{ fontWeight: 'bold', marginRight: 8 }}>$</ThemedText>
                            <TextInput value={newJob.salaryMin} onChangeText={t => setNewJob({...newJob, salaryMin: t})} keyboardType="numeric" placeholder={t.jobstab.labelmin} placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 14, borderWidth: 1, borderColor: DynamicColors.border, paddingHorizontal: 15 }}>
                            <ThemedText style={{ fontWeight: 'bold', marginRight: 8 }}>$</ThemedText>
                            <TextInput value={newJob.salaryMax} onChangeText={t => setNewJob({...newJob, salaryMax: t})} keyboardType="numeric" placeholder={t.jobstab.labelmax} placeholderTextColor="#999" style={{ flex: 1, paddingVertical: 15, color: DynamicColors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                        </View>
                    </View>

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.shitfdispooued}</ThemedText>
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
                                            <MaterialCommunityIcons name="circle-outline" size={14} style={{marginRight:6}} />
                                            <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{shift}</ThemedText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <ThemedText style={{ fontSize: 15, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 8 }}>{t.jobstab.descripcion}</ThemedText>
                    <TextInput 
                      value={newJob.description} 
                      onChangeText={t => setNewJob({...newJob, description: t})} 
                      placeholder={t.jobstab.labeljobreq} 
                      placeholderTextColor="#999" 
                      multiline 
                      autoCapitalize="sentences"
                      style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 14, padding: 15, color: DynamicColors.text, height: 100, textAlignVertical: 'top', marginBottom: 25, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                    />

                    <TouchableOpacity onPress={handlePublishJob} disabled={isPublishing}>
                      <LinearGradient colors={(!newJob.title || !newJob.companyId || !newJob.city || newJob.shifts.length === 0 || !newJob.salaryMin) ? disabledGradient : orangeGradient} style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                        {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t.jobstab.publishoffert}</ThemedText>}
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
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>{t.jobstab.filterjob}</ThemedText>
                  
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'column', gap: 10 }}>
                          <TouchableOpacity 
                              style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterTitle === 'Todos' ? DynamicColors.accent : DynamicColors.border }} 
                              onPress={() => { setFilterTitle('Todos'); setShowTitlePickerModal(false); }}>
                              <ThemedText style={{ fontWeight: 'bold', color: filterTitle === 'Todos' ? DynamicColors.accent : DynamicColors.text }}>{t.jobstab.alljob}</ThemedText>
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
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: DynamicColors.text }}>{t.jobstab.filtershift}</ThemedText>
                  
                  <View style={{ flexDirection: 'column', gap: 10 }}>
                      <TouchableOpacity style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.border }} onPress={() => { setFilterShift('Todos'); setShowShiftPickerModal(false); }}>
                          <ThemedText style={{ fontWeight: 'bold', color: filterShift === 'Todos' ? DynamicColors.accent : DynamicColors.text }}>{t.jobstab.allshifts}</ThemedText>
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
                      <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.filterlocation}</ThemedText>
                      <TouchableOpacity onPress={() => setShowLocationPickerModal(false)}>
                          <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
                      </TouchableOpacity>
                  </View>
                  
                  <ThemedText style={{ fontSize: 11, fontWeight: 'bold',  marginBottom: 8, textTransform: 'uppercase' }}>{t.jobstab.selectstate}</ThemedText>
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

                  <ThemedText style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>{t.jobstab.selectcity}</ThemedText>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'column', gap: 10 }}>
                          <TouchableOpacity 
                              style={{ padding: 12, backgroundColor: DynamicColors.inputBg, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.border }} 
                              onPress={() => setFilterLocations([])}>
                              <MaterialCommunityIcons name={filterLocations.length === 0 ? "radiobox-marked" : "radiobox-blank"} size={20} color={filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.iconInactive} style={{ marginRight: 10 }} />
                              <ThemedText style={{ fontWeight: 'bold', color: filterLocations.length === 0 ? DynamicColors.accent : DynamicColors.text }}>{t.jobstab.allin}{filterState}</ThemedText>
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
                              <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{t.jobstab.aplifilter}</ThemedText>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: DynamicColors.text }}>{selectedCompany?.company}</ThemedText>
                        {selectedCompany?.isCompanyVerified && <MaterialCommunityIcons name="check-decagram" size={18} color="#4CAF50" style={{marginLeft: 6}} />}
                    </View>
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
                        <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: DynamicColors.text, marginBottom: 10 }}>{t.jobstab.ratigcompanie}</ThemedText>
                        
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
                            placeholder={t.jobstab.labeldescribe}
                            placeholderTextColor={DynamicColors.subtext}
                            multiline
                            autoCapitalize="sentences"
                            style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 12, padding: 15, color: DynamicColors.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 15, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}
                        />

                        <TouchableOpacity onPress={() => setReviewForm(prev => ({...prev, isAnonymous: !prev.isAnonymous}))} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <MaterialCommunityIcons name={reviewForm.isAnonymous ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={DynamicColors.accent} />
                            <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.labelanonimous}</ThemedText>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setReviewForm({ visible: false, text: '', rating: 0, isAnonymous: false })} style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: DynamicColors.categoryUnselected }}>
                                <ThemedText style={{ fontWeight: 'bold', color: DynamicColors.text }}>{t.jobstab.cancel}</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmitReview} style={{ flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: DynamicColors.accent }}>
                                <ThemedText style={{ fontWeight: 'bold', color: '#FFF' }}>{t.jobstab.publish}</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity onPress={() => setReviewForm(prev => ({...prev, visible: true}))} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 95, 109, 0.1)', padding: 14, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: DynamicColors.accent }}>
                        <MaterialCommunityIcons name="pencil-plus-outline" size={20} color={DynamicColors.accent} />
                        <ThemedText style={{ marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: DynamicColors.accent }}>{t.jobstab.writereview}</ThemedText>
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
                    !reviewForm.visible && <ThemedText style={{ textAlign: 'center', fontSize:13, marginTop: 20, fontWeight: 'bold' }}>{t.jobstab.firtsreview}</ThemedText>
                )}
              </ScrollView>
            </View>
        </View>
      </RNModal>
    </View>
  );
}