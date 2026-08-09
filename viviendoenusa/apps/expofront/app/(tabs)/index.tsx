import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Alert,
  Modal, 
  TextInput,
  ActivityIndicator,
  Text,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import Head from 'expo-router/head'; 
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { default as ThemedTextInput } from '../../components/ThemedTextInput';
import { toggleAuth, setUserMetadata, useMockDispatch, useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppTheme } from '../src/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@supabase/supabase-js'; 

// 🚀 CREDENCIALES DE SUPABASE DESDE .ENV 🚀
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pwznamxpdzwppmpiyizp.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const NOMBRE_BUCKET = 'images'; 

WebBrowser.maybeCompleteAuthSession();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const INITIAL_SERVICES_DATA = [
  { id: '1', path: `logoorimages/0.webp`, title: "Emprendimientos", desc: "Impulsa tu negocio o descubre lo mejor del talento local.", img: '' },
  { id: '2', path: `logoorimages/1.webp`, title: "Bolsa de Empleos", desc: "Encuentra el trabajo ideal o contrata personal de confianza.", img: '' },
  { id: '3', path: `logoorimages/2.webp`, title: "Eventos Locales", desc: "Asiste a encuentros culturales, talleres y eventos en tu ciudad.", img: '' },
  { id: '4', path: `logoorimages/3.webp`, title: "Donaciones", desc: "Participa en nuestra red de apoyo e intercambio solidario.", img: '' },
  { id: '5', path: `logoorimages/4.webp`, title: "Comunidad Viva", desc: "Crea lazos duraderos y siéntete como en casa, estés donde estés.", img: '' },
];

const AnimatedStat = ({ endValue, label, icon, isDark }: { endValue: number, label: string, icon: string, isDark: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000; 
    const increment = endValue / (duration / 16); 
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= endValue) {
        setCount(endValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [endValue]);

  return (
    <View style={{ alignItems: 'center', padding: 20, minWidth: 150 }}>
      <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.1)', padding: 15, borderRadius: 50, marginBottom: 15 }}>
        <MaterialCommunityIcons name={icon as any} size={36} color="#FF5F6D" />
      </View>
      <Text style={{ fontSize: 42, fontWeight: '900', color: isDark ? '#FFFFFF' : '#1E3A8A' }}>
        {count.toLocaleString()}+
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#B0BEC5' : '#607D8B', marginTop: 5 }}>
        {label}
      </Text>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter(); 
  const params = useLocalSearchParams(); 
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  
  // 🚀 IMPORTAMOS toggleTheme PARA EL MODO OSCURO/CLARO 🚀
  const { isDark, toggleTheme } = useAppTheme();
  
  const colorScheme = isDark ? 'dark' : 'light';

  const isWebPlatform = Platform.OS === 'web';
  const isLargeWeb = isWebPlatform && width > 1000; 
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);

  const CAROUSEL_ITEM_WIDTH = width <= 768 ? width * 0.85 : 320; 
  const SPACING = 20;
  const FULL_ITEM_WIDTH = CAROUSEL_ITEM_WIDTH + SPACING;
  
  const landingScrollRef = useRef<ScrollView>(null);
  const carouselRef = useRef<FlatList>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [showWebLanding, setShowWebLanding] = useState(() => {
    if (isWebPlatform) {
      if (params?.login === 'true') return false;
      return true;
    }
    return false;
  });
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false); 
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [returnToCompletion, setReturnToCompletion] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  // 🚀 ESTADO PARA MOSTRAR/OCULTAR LA CONTRASEÑA 🚀
  const [showPassword, setShowPassword] = useState(false);
  
  const [termsData, setTermsData] = useState({ version: '', content_html: '' });
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  
  const [form, setForm] = useState({ 
    email: '', password: '', firstName: '', lastName: '', phone: '', zipCode: '', birthDate: new Date() 
  });

  const [platformStats, setPlatformStats] = useState({ users: 1250, jobs: 340, companies: 180 });

  const [mainLogoUrl, setMainLogoUrl] = useState<string>('');
  const [servicesData, setServicesData] = useState<any[]>(INITIAL_SERVICES_DATA);

  const dispatch = useMockDispatch();
  const { t } = useTranslation();

  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];

  useEffect(() => {
    const loadSignedImages = async () => {
      if (!supabase) return;
      
      try {
        const { data: logoData, error: logoError } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('logoorimages/backgroundusa.webp', 604800); 
        if (logoData?.signedUrl) {
          setMainLogoUrl(logoData.signedUrl);
        } else {
          console.warn("No se pudo cargar el logo:", logoError);
        }

        const signedServices = await Promise.all(
          INITIAL_SERVICES_DATA.map(async (service) => {
            const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(service.path, 604800);
            if (error) console.warn(`Error en ${service.path}:`, error);
            return { ...service, img: data?.signedUrl || '' };
          })
        );
        
        setServicesData(signedServices);
      } catch (error) {
        console.error("❌ Error consumiendo imágenes de Supabase:", error);
      }
    };

    loadSignedImages();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
        const response = await fetch(`${API_URL}/auth/stats`); 
        
        if (response.ok) {
          const data = await response.json();
          setPlatformStats({
            users: data.users > 0 ? data.users : 1250,
            jobs: data.jobs > 0 ? data.jobs : 340,
            companies: data.companies > 0 ? data.companies : 180
          });
        }
      } catch (error) {
        console.log("Aviso: Usando estadísticas por defecto (Error de conexión)");
      }
    };
    
    if (isWebPlatform && showWebLanding && !loggedIn) {
      fetchStats();
    }
  }, [loggedIn, showWebLanding, isWebPlatform]);

  useEffect(() => {
    if (!loggedIn && isWebPlatform) {
      if (params?.login === 'true') {
        setShowWebLanding(false);
        setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', zipCode: '', birthDate: new Date() });
      }
    }
  }, [params, loggedIn, isWebPlatform]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'viviendoenusa'
    })
  });

  const cardWidth = loggedIn 
    ? (isLargeWeb ? '96%' : (width > 768 ? 500 : width * 0.92))
    : (isLargeWeb ? 900 : (width > 768 ? 500 : width * 0.92));
    
  const getCardHeight = () => {
    if (loggedIn) {
       return isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : height * 0.69);
    }
    return undefined; 
  };
  const finalCardHeight = getCardHeight();
  
  const verticalOffset = loggedIn 
    ? (isWebPlatform ? -90 : (isIOS ? -85 : -100))
    : (isWebPlatform ? -20 : 0);

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    modalBg: isDark ? '#121212' : '#FFFFFF', 
    heroBg: isDark ? '#0F172A' : '#F8FAFC',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    iconInactive: isDark ? '#B0BEC5' : '#364045',  
  };

  // 🚀 LÓGICA DE VALIDACIÓN DE CONTRASEÑA 🚀
  const currentPwd = form.password || "";
  const isPasswordStrong = 
    currentPwd.length >= 8 && 
    /[A-Z]/.test(currentPwd) && 
    /[a-z]/.test(currentPwd) && 
    /[0-9]/.test(currentPwd) && 
    /[^A-Za-z0-9]/.test(currentPwd);

  const isSubmitDisabled = isRegistering && (!acceptedTerms || !isPasswordStrong);

  const scrollToBottom = () => { landingScrollRef.current?.scrollToEnd({ animated: true }); };
  const closeDatePickerIOS = () => { setShowDatePicker(false); };

  useEffect(() => {
    if (!showWebLanding || loggedIn || servicesData.length === 0) return;
    if (!servicesData[0].img) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => {
        const nextSlide = (prev + 1) % servicesData.length;
        if (carouselRef.current) {
          carouselRef.current.scrollToIndex({ index: nextSlide, animated: true });
        }
        return nextSlide;
      });
    }, 4500); 
    return () => clearInterval(interval);
  }, [showWebLanding, loggedIn, servicesData]); 

  const handleNextSlide = () => {
    setCurrentSlide(prev => {
      const next = Math.min(servicesData.length - 1, prev + 1);
      if (carouselRef.current) {
        carouselRef.current.scrollToIndex({ index: next, animated: true });
      }
      return next;
    });
  };

  const handlePrevSlide = () => {
    setCurrentSlide(prev => {
      const prevSlide = Math.max(0, prev - 1);
      if (carouselRef.current) {
        carouselRef.current.scrollToIndex({ index: prevSlide, animated: true });
      }
      return prevSlide;
    });
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      verifyGoogleUser(id_token);
    }
  }, [response]);

  const registerPushTokenInBackend = async (expoPushToken: string, userJwtToken: string) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      await fetch(`${API_URL}/auth/save-device-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userJwtToken}` },
        body: JSON.stringify({ token: expoPushToken, deviceType: Platform.OS })
      });
    } catch (error) {}
  };

  useEffect(() => {
    async function setupNotifications() {
      if (isWebPlatform) return;
      if (Device.isDevice) {
        try {
          const settings = await Notifications.getPermissionsAsync() as any;
          let isGranted = settings.granted || settings.status === 'granted';
          if (!isGranted) {
            const request = await Notifications.requestPermissionsAsync() as any;
            isGranted = request.granted || request.status === 'granted';
          }
          if (!isGranted) return;
          const projectId = "486f501f-ae6e-484d-92ab-5a9c40319e6f";
          await Notifications.getExpoPushTokenAsync({ projectId });
        } catch (error) {}
      }
    }
    setupNotifications();
  }, []);

  useEffect(() => {
    if (showTermsModal && !termsData.version) fetchActiveTerms();
  }, [showTermsModal]);

  const fetchActiveTerms = async () => {
    setIsLoadingTerms(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      const res = await fetch(`${API_URL}/api/terms/active`);
      if (res.ok) {
        const data = await res.json();
        setTermsData(data);
      }
    } catch (error) {} 
    finally { setIsLoadingTerms(false); }
  };

  const stripHtmlTags = (htmlString: string) => {
    if (!htmlString) return "No hay términos disponibles en este momento.";
    return htmlString.replace(/<\/(p|div|h[1-6])>/gi, '\n\n').replace(/<br\s*[\/]?>/gi, '\n').replace(/<li>/gi, '• ').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  };

  const recordTermsAcceptance = async (userId: string) => {
    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      await fetch(`${API_URL}/api/terms/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }) 
      });
    } catch (error) {}
  };

  const handlePostLoginSuccess = async (user: any, token: string) => {
    await login(user, token);
    dispatch(setUserMetadata({ ...user, token }));

    if (Device.isDevice && !isWebPlatform) {
      try {
        const projectId = "486f501f-ae6e-484d-92ab-5a9c40319e6f";
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (tokenData?.data) {
          await registerPushTokenInBackend(tokenData.data, token);
        }
      } catch (e) {}
    }
    dispatch(toggleAuth());
    setShowWebLanding(false);

    setTimeout(() => {
      const successMsg = `¡Hola${user?.firstName ? ', ' + user.firstName : ''}! Has ingresado exitosamente.`;
      if (isWebPlatform) window.alert(successMsg);
      else Alert.alert("¡Éxito!", successMsg);
    }, 300);
  };

  const verifyGoogleUser = async (idToken: string) => {
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const claims = JSON.parse(jsonPayload);

      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND; 
      const res = await fetch(`${API_URL}/auth/login`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, isGoogle: true }) 
      });

      if (!res.ok) throw new Error("Error consultando el servidor");
      const dataRes = await res.json();

      if (dataRes.requiresProfileCompletion) {
        const randomPassword = Math.random().toString(36).slice(-12);
        setForm(prev => ({ ...prev, email: claims.email, firstName: claims.given_name || '', lastName: claims.family_name || '', password: randomPassword }));
        setAcceptedTerms(false);
        setShowCompletionModal(true);
      } else {
        await handlePostLoginSuccess(dataRes.user, dataRes.token);
      }
    } catch (error) {
      isWebPlatform ? window.alert("Error al verificar tu cuenta.") : Alert.alert("Error", "Error al verificar tu cuenta.");
    }
  };

  const submitProfileCompletion = async () => {
    Keyboard.dismiss();
    if (!form.phone || !form.zipCode) {
      isWebPlatform ? window.alert("Por favor completa tu teléfono y Zip Code") : Alert.alert("Atención", "Por favor completa tu teléfono y Zip Code");
      return;
    }

    const today = new Date();
    const birthDate = form.birthDate;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) { age--; }

    if (age < 18) {
      isWebPlatform ? window.alert("Debes tener al menos 18 años.") : Alert.alert("Acceso denegado", "Debes tener al menos 18 años.");
      return; 
    }

    try {
      const finalPayload = { email: form.email, firstName: form.firstName, lastName: form.lastName, password: form.password, phone: form.phone, zip: form.zipCode, birth: form.birthDate.toISOString(), isVerified: true, authProvider: 'google' };
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND; 
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: finalPayload, newImageUri: null })
      });

      const dataRes = await response.json();
      if (!response.ok) {
        if (dataRes.error && dataRes.error.includes("ya está registrado")) {
          setShowCompletionModal(false);
          dispatch(toggleAuth());
          return;
        }
        throw new Error(dataRes.error || `Error en el servidor: ${response.status}`);
      }

      setShowCompletionModal(false);
      const newUserId = dataRes.user?.id || dataRes.id;
      if (acceptedTerms && newUserId) { await recordTermsAcceptance(newUserId); }
      await handlePostLoginSuccess(dataRes.user, dataRes.token);
      
      setTimeout(() => {
        const successMsg = "¡Tu cuenta ha sido creada y configurada exitosamente!";
        if (isWebPlatform) window.alert(successMsg);
        else Alert.alert("¡Bienvenido!", successMsg);
      }, 300);

    } catch (error: any) {
      const msg = error.message || "Ocurrió un error de conexión.";
      isWebPlatform ? window.alert(msg) : Alert.alert("Error", msg);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (isAndroid) setShowDatePicker(false);
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    if (selectedDate) setForm({ ...form, birthDate: selectedDate });
  };

  const handleWebDateChange = (e: any) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        setForm({ ...form, birthDate: new Date(year, month - 1, day) });
      }
    }
  };
  
  const getSafeDateString = () => {
    return !isNaN(form.birthDate.getTime()) ? form.birthDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  };

  const handleAuthAction = async () => {
    Keyboard.dismiss();
    if (isRegistering && !acceptedTerms) {
      isWebPlatform ? window.alert("Debes aceptar los términos y condiciones.") : Alert.alert("Atención", "Debes aceptar los términos y condiciones.");
      return;
    }

    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      const endpoint = isRegistering ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;

      const payload = isRegistering 
        ? { data: { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, phone: form.phone, zip: form.zipCode, birth: form.birthDate.toISOString(), isVerified: false } }
        : { email: form.email, password: form.password, isGoogle: false }; 

      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      const dataRes = await response.json();
      if (!response.ok) throw new Error(dataRes.error || "Error al autenticar");
      
      if (isRegistering) {
        const newUserId = dataRes.user?.id || dataRes.id;
        if (acceptedTerms && newUserId) { await recordTermsAcceptance(newUserId); }
        
        setTimeout(() => {
          const successMsg = "Cuenta creada con éxito. Por favor, inicia sesión.";
          if (isWebPlatform) window.alert(successMsg);
          else Alert.alert("¡Bienvenido!", successMsg);
        }, 200);
        
        setIsRegistering(false); 
        setForm({ ...form, password: '' }); 
        return; 
      }

      await handlePostLoginSuccess(dataRes.user, dataRes.token);

    } catch (error: any) {
      const msg = error.message || "Ocurrió un error al intentar acceder.";
      
      if (msg.toLowerCase().includes("google") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("credenciales")) {
        const customMsg = "Esta cuenta utiliza Google para iniciar sesión. Por favor, usa el botón 'Continuar con Google' abajo.";
        if (isWebPlatform) {
          window.alert(customMsg);
        } else {
          Alert.alert("Inicio con Google", customMsg);
        }
        return;
      }

      if (msg.includes("bloqueada por múltiples intentos")) {
        if (isWebPlatform) {
          if (window.confirm(`${msg}\n\n¿Deseas recuperar tu contraseña ahora?`)) {
            setResetEmail(form.email); setShowResetModal(true);
          }
        } else {
          Alert.alert("Cuenta Bloqueada", msg, [
              { text: "Cancelar", style: "cancel" },
              { text: "Recuperar", onPress: () => { setResetEmail(form.email); setShowResetModal(true); } }
          ]);
        }
        return; 
      }
      isWebPlatform ? window.alert(`Error: ${msg}`) : Alert.alert("Error", msg);
    }
  };  

  const handlePasswordReset = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      isWebPlatform ? window.alert("Correo inválido.") : Alert.alert("Atención", "Correo inválido.");
      return;
    }
    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error");

      setShowResetModal(false);
      setResetEmail('');
      const successMsg = "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.";
      isWebPlatform ? window.alert(successMsg) : Alert.alert("Correo enviado", successMsg);
    } catch (error: any) {
      isWebPlatform ? window.alert(`Error: ${error.message}`) : Alert.alert("Error", error.message);
    }
  };

  const renderInputPair = (l1: string, v1: string, k1: string, p1: string, t1: any, l2: string, v2: string, k2: string, p2: string, t2: any) => {
    if (isLargeWeb) {
      return (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><ThemedTextInput label={l1} value={v1} onChangeText={(v: string) => setForm({...form, [k1]: v})} placeholder={p1} keyboardType={t1} /></View>
          <View style={{ flex: 1 }}><ThemedTextInput label={l2} value={v2} onChangeText={(v: string) => setForm({...form, [k2]: v})} placeholder={p2} keyboardType={t2} /></View>
        </View>
      );
    }
    return (
      <><ThemedTextInput label={l1} value={v1} onChangeText={(v: string) => setForm({...form, [k1]: v})} placeholder={p1} keyboardType={t1} />
        <ThemedTextInput label={l2} value={v2} onChangeText={(v: string) => setForm({...form, [k2]: v})} placeholder={p2} keyboardType={t2} /></>
    );
  };

  if (isWebPlatform && showWebLanding && !loggedIn) {
    return (
      <>
        <Head>
          <title>Viviendo en USA | La App de la Comunidad Hispana</title>
          
          <meta name="description" content="Únete a Viviendo en USA, la red principal para la comunidad hispana. Encuentra abogados, médicos, emprendimientos, red de apoyo, empleos y negocios locales." />
          <meta name="keywords" content="hispanos en usa, comunidad latina, abogados para hispanos, asesoría legal, red de apoyo, emprendimientos latinos, buscar empleo, negocios hispanos, servicios médicos, latinos en estados unidos, directorio hispano" />
          <meta name="robots" content="index, follow" />
          
          <meta property="og:title" content="Viviendo en USA | Directorio y Comunidad Hispana" />
          <meta property="og:description" content="Encuentra abogados, emprendimientos, red de apoyo y oportunidades para la comunidad hispana en Estados Unidos." />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://viviendoenusa.app" />
          <meta property="og:image" content={mainLogoUrl} />
          
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Viviendo en USA | Directorio Hispano" />
          <meta name="twitter:description" content="Encuentra abogados, emprendimientos, empleos y red de apoyo para latinos en USA." />
          <meta name="twitter:image" content={mainLogoUrl} />
        </Head>

        <ScrollView 
          ref={landingScrollRef}
          style={{ flex: 1, backgroundColor: '#13112E' }} 
          contentContainerStyle={{ flexGrow: 1 }} 
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]} 
        >
          {/* 🚀 BARRA DE NAVEGACIÓN DE LA PORTADA CON EL BOTÓN DE MODO CLARO/OSCURO A LA IZQUIERDA 🚀 */}
          <View style={{ width: '100%', height: 65, backgroundColor: '#13112E', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', zIndex: 100 }}>
            
            <TouchableOpacity 
              onPress={() => toggleTheme(isDark ? 'light' : 'dark')} 
              style={{ position: 'absolute', left: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <MaterialCommunityIcons 
                name={isDark ? "weather-sunny" : "weather-night"} 
                size={24} 
                color="#FFF" 
              />
              {isLargeWeb && (
                 <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
                   {isDark ? 'Modo Claro' : 'Modo Oscuro'}
                 </Text>
              )}
            </TouchableOpacity>

            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }}>Viviendo en USA</Text>
          </View>

          <View style={{ width: '100%', minHeight: isLargeWeb ? height * 0.85 : height * 0.9, justifyContent: 'center', alignItems: 'center', backgroundColor: '#13112E', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#13112E' }}>
              <iframe 
                 src="https://player.vimeo.com/video/950018738?h=6d8edaba23&autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0&transparent=1" 
                 style={{ width: '110vw', height: '100vh', pointerEvents: 'none', backgroundColor: 'transparent' }} 
                 frameBorder="0" 
                 allow="autoplay; fullscreen"
              ></iframe>
            </div>
            
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(19, 17, 46, 0.55)', zIndex: 1 }]} />

            <View style={{ zIndex: 2, paddingHorizontal: 20, width: '100%', maxWidth: 1000, marginTop: 40 }}>
              <Text accessibilityRole="header" aria-level={1} style={{ color: '#FFF', fontSize: isLargeWeb ? 64 : 46, fontWeight: '900', marginBottom: 10, letterSpacing: -1 }}>
                Unidos Somos <Text style={{ color: '#FF5F6D' }}>Más Fuertes</Text>
              </Text>
              
              <Text style={{ color: '#FFF', fontSize: isLargeWeb ? 22 : 18, fontWeight: '400', lineHeight: 30, maxWidth: 800, marginBottom: 40 }}>
                Conectando corazones, celebrando cultura y construyendo futuro juntos. Un espacio donde cada voz cuenta y cada historia importa.
              </Text>

              <TouchableOpacity accessibilityRole="button" onPress={scrollToBottom} style={{ alignSelf: 'flex-start' }}>
                <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryWrapper}>
                  <View style={styles.gradientContainer}>
                    <Text style={styles.primaryText}>:: Únete ahora ::</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingVertical: 80, paddingHorizontal: 20, alignItems: 'center', backgroundColor: isDark ? '#111827' : '#FFFFFF' }}>
            <Text accessibilityRole="header" aria-level={2} style={{ fontSize: isLargeWeb ? 40 : 30, fontWeight: 'bold', color: isDark ? '#FFF' : '#1E3A8A', marginBottom: 50, textAlign: 'center' }}>
              Acerca de nosotros
            </Text>

            <View style={{ flexDirection: isLargeWeb ? 'row' : 'column', gap: 30, maxWidth: 1100, width: '100%', justifyContent: 'center' }}>
              <View style={[styles.aboutCard, { backgroundColor: DynamicColors.cardBg, borderColor: DynamicColors.border }]}>
                 <MaterialCommunityIcons name="bullseye-arrow" size={50} color="#3B82F6" style={{ marginBottom: 20 }} />
                 <Text accessibilityRole="header" aria-level={3} style={[styles.aboutCardTitle, { color: isDark ? '#FFF' : '#1E3A8A' }]}>{t?.hometab?.vision || 'Visión'}</Text>
                 <Text style={[styles.aboutCardText, { color: DynamicColors.subtext }]}>
                   {t?.hometab?.visiondesc || 'Fortalecer las economías locales conectando a los residentes con los comercios y servicios de su barrio, promoviendo el consumo local.'}
                 </Text>
              </View>

              <View style={[styles.aboutCard, { backgroundColor: DynamicColors.cardBg, borderColor: DynamicColors.border }]}>
                 <MaterialCommunityIcons name="rocket-launch" size={50} color="#F59E0B" style={{ marginBottom: 20 }} />
                 <Text accessibilityRole="header" aria-level={3} style={[styles.aboutCardTitle, { color: isDark ? '#FFF' : '#1E3A8A' }]}>{t?.hometab?.mission || 'Misión'}</Text>
                 <Text style={[styles.aboutCardText, { color: DynamicColors.subtext }]}>
                   {t?.hometab?.missiondesc || 'Crear comunidades más unidas, participativas y solidarias, donde cada residente se sienta conectado, seguro y orgulloso de su barrio.'}
                 </Text>
              </View>
            </View>
          </View>

          <View style={{ paddingVertical: 60, backgroundColor: isDark ? '#1F2937' : '#F8FAFC', alignItems: 'center', borderTopWidth: 1, borderTopColor: DynamicColors.border }}>
            <Text accessibilityRole="header" aria-level={2} style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#FFF' : '#1E3A8A', marginBottom: 40, textAlign: 'center', paddingHorizontal: 20 }}>
              El impacto de nuestra red en tiempo real
            </Text>
            
            <View style={{ flexDirection: isLargeWeb ? 'row' : 'column', gap: isLargeWeb ? 60 : 30, justifyContent: 'center', alignItems: 'center' }}>
              <AnimatedStat endValue={platformStats.users} label="Miembros Activos" icon="account-group" isDark={isDark} />
              <AnimatedStat endValue={platformStats.jobs} label="Oportunidades de Empleo" icon="briefcase-search" isDark={isDark} />
              <AnimatedStat endValue={platformStats.companies} label="Negocios Conectados" icon="storefront" isDark={isDark} />
            </View>
          </View>

          <View style={{ paddingVertical: 80, backgroundColor: isDark ? '#1F2937' : '#F1F5F9', alignItems: 'center', width: '100%' }}>
            <View style={{ maxWidth: 800, paddingHorizontal: 20, marginBottom: 40, alignItems: 'center' }}>
               <Text accessibilityRole="header" aria-level={2} style={{ fontSize: isLargeWeb ? 36 : 28, fontWeight: 'bold', color: isDark ? '#FFF' : '#1E3A8A', marginBottom: 15, textAlign: 'center' }}>
                 Explora Nuestros Servicios
               </Text>
               <Text style={{ fontSize: 16, color: DynamicColors.subtext, textAlign: 'center', lineHeight: 24 }}>
                 Descubre todo lo que Viviendo en USA tiene para ofrecerte. Promueve tu negocio, encuentra el trabajo ideal o conecta con tu comunidad local.
               </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 10 }}>
              {isWebPlatform && width > 768 && (
                 <TouchableOpacity accessibilityRole="button" onPress={handlePrevSlide} style={styles.carouselArrowButton}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color={isDark ? '#FFF' : '#1A1A1A'} />
                 </TouchableOpacity>
              )}

              <View style={{ width: width > 768 ? '85%' : '100%', maxWidth: 1200 }}>
                {servicesData[0]?.img ? (
                  <FlatList
                    ref={carouselRef}
                    data={servicesData}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={FULL_ITEM_WIDTH} 
                    snapToAlignment="start"
                    decelerationRate="fast"
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: width > 768 ? 10 : 20, paddingBottom: 20 }}
                    getItemLayout={(data, index) => ({
                      length: FULL_ITEM_WIDTH,
                      offset: FULL_ITEM_WIDTH * index,
                      index,
                    })}
                    onScrollToIndexFailed={(info) => {
                      const wait = new Promise(resolve => setTimeout(resolve, 100));
                      wait.then(() => {
                        if (carouselRef.current) {
                          carouselRef.current.scrollToIndex({ index: info.index, animated: true });
                        }
                      });
                    }}
                    onScroll={(event) => {
                      const index = Math.round(event.nativeEvent.contentOffset.x / FULL_ITEM_WIDTH);
                      if (index !== currentSlide && index >= 0 && index < servicesData.length) {
                        setCurrentSlide(index);
                      }
                    }}
                    scrollEventThrottle={16}
                    renderItem={({ item }) => (
                      <View style={{ width: CAROUSEL_ITEM_WIDTH, marginRight: SPACING, borderRadius: 24, overflow: 'hidden', backgroundColor: DynamicColors.cardBg, elevation: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, borderColor: DynamicColors.border, borderWidth: 1 }}>
                          {item.img ? (
                             <Image source={{ uri: item.img }} style={{ width: '100%', height: 200 }} resizeMode="cover" accessibilityLabel={item.title} />
                          ) : (
                             <View style={{ width: '100%', height: 200, backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#FF5F6D" />
                             </View>
                          )}
                          <View style={{ padding: 24 }}>
                            <Text accessibilityRole="header" aria-level={3} style={{ fontSize: 20, fontWeight: '800', color: '#FF5F6D', marginBottom: 10 }}>{item.title}</Text>
                            <Text style={{ fontSize: 14, color: DynamicColors.subtext, lineHeight: 22 }}>{item.desc}</Text>
                          </View>
                      </View>
                    )}
                  />
                ) : (
                  <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
                     <ActivityIndicator size="large" color="#FF5F6D" />
                  </View>
                )}
              </View>

              {isWebPlatform && width > 768 && (
                 <TouchableOpacity accessibilityRole="button" onPress={handleNextSlide} style={styles.carouselArrowButton}>
                    <MaterialCommunityIcons name="chevron-right" size={30} color={isDark ? '#FFF' : '#1A1A1A'} />
                 </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 8 }}>
              {servicesData.map((_, idx) => (
                <View key={idx} style={{ width: currentSlide === idx ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: currentSlide === idx ? '#FF5F6D' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') }} />
              ))}
            </View>
          </View>

          <View style={{ paddingVertical: 80, backgroundColor: DynamicColors.heroBg, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text accessibilityRole="header" aria-level={2} style={{ fontSize: 32, fontWeight: '900', color: DynamicColors.text, marginBottom: 5, textAlign: 'center' }}>
              Viviendo en <Text style={{ color: '#FF5F6D' }}>USA</Text>
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#F5A623', marginBottom: 25, textAlign: 'center' }}>
              La App de la Comunidad Hispana
            </Text>
            <Text style={{ color: DynamicColors.subtext, textAlign: 'center', maxWidth: 650, marginBottom: 40, fontSize: 16, lineHeight: 24 }}>
              Elige la plataforma de tu preferencia. Regístrate gratis y comienza a descubrir y conectar con la comunidad hoy mismo.
            </Text>

            <View style={[styles.landingButtonsContainer, { flexDirection: width > 900 ? 'row' : 'column' }]}>
              {/* Botones de tiendas bloqueados temporalmente */}
              <View style={[styles.storeButtonBlackBig, { opacity: 0.5 }]}>
                <MaterialCommunityIcons name="apple" size={32} color="#FFF" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.storeButtonSubBig}>PRÓXIMAMENTE EN</Text>
                  <Text style={styles.storeButtonTitleBig}>App Store</Text>
                </View>
              </View>

              <View style={[styles.storeButtonBlackBig, { opacity: 0.5 }]}>
                <MaterialCommunityIcons name="google-play" size={28} color="#FFF" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.storeButtonSubBig}>PRÓXIMAMENTE EN</Text>
                  <Text style={styles.storeButtonTitleBig}>Google Play</Text>
                </View>
              </View>

              <TouchableOpacity accessibilityRole="button" onPress={() => setShowWebLanding(false)} style={[styles.storeButtonLightBig, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF', borderColor: DynamicColors.accent }]}>
                <MaterialCommunityIcons name="web" size={30} color={DynamicColors.accent} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.storeButtonSubBig, { color: DynamicColors.subtext }]}>Navegar en</Text>
                  <Text style={[styles.storeButtonTitleBig, { color: DynamicColors.accent }]}>Versión Web</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingVertical: 40, alignItems: 'center', backgroundColor: '#0B0A1D' }}>
             <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
                {t?.hometab.copyright || '© 2024 Viviendo en USA. Todos los derechos reservados.'}
             </Text>
             <View style={{ width: 60, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>
        </ScrollView>
      </>
    );
  }

  const RootComponent = isWebPlatform ? View : KeyboardAvoidingView;

  return (
    <>
      <Head>
        <title>{loggedIn ? 'Panel de Inicio | Viviendo en USA' : 'Ingresar | Viviendo en USA'}</title>
        <meta name="robots" content={loggedIn ? "noindex, nofollow" : "index, follow"} />
      </Head>
      <RootComponent behavior={isIOS ? 'padding' : undefined} style={styles.container}>
        
        {isWebPlatform && (
          <View style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
            {mainLogoUrl ? (
              <Image 
                source={{ uri: mainLogoUrl }} 
                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} 
                resizeMode="cover" 
              />
            ) : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.2)' }]} />
          </View>
        )}

        <ScrollView 
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: loggedIn ? 'flex-start' : 'center', 
            alignItems: isWebPlatform ? undefined : 'center', 
            paddingVertical: loggedIn ? 0 : (isWebPlatform ? 30 : 50) 
          }} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.centerContainer, { paddingVertical: loggedIn ? 0 : 10, marginTop: verticalOffset }]}>
            
            <View style={[
              styles.mainCard, 
              { 
                flexShrink: 1, 
                width: cardWidth, 
                height: finalCardHeight, 
                minHeight: !loggedIn && isWebPlatform ? (isRegistering ? 760 : 520) : (!loggedIn ? 480 : undefined), 
                borderColor: DynamicColors.border, 
                backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
                paddingBottom: loggedIn ? 1 : 1
              }
            ]}>
              
              {Platform.OS === 'web' ? (
                <View 
                  style={[
                    StyleSheet.absoluteFill, 
                    { 
                      backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)',
                      // @ts-ignore
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)'
                    }
                  ]} 
                />
              ) : (
                !isAndroid && (
                  <BlurView 
                    intensity={isDark ? 100 : 75} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={StyleSheet.absoluteFill} 
                  />
                )
              )}

              <View style={[styles.cardContent, { zIndex: 1 }]}>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  
                  {isLargeWeb && !loggedIn && (
                    <View style={[styles.webSidebar, { justifyContent: 'space-between', paddingBottom: 10 }]}>
                      <View>
                        {mainLogoUrl ? (
                          <Image source={{ uri: mainLogoUrl }} style={[styles.sidebarLogo, { width: 100, height: 100, borderRadius: 50 }]} resizeMode="cover" />
                        ) : (
                          <View style={[styles.sidebarLogo, { width: 100, height: 100, borderRadius: 50, backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color="#FF5F6D" />
                          </View>
                        )}
                        <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                        <ThemedText style={{ color: DynamicColors.subtext, fontSize: 13, fontWeight: '600' }}>Portal de recursos</ThemedText>

                        <View style={[styles.webSidebarBenefits, { marginTop: 30 }]}>
                          <View style={styles.benefitItem}><MaterialCommunityIcons name="storefront-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Impulsa y descubre negocios.</ThemedText></View>
                          <View style={styles.benefitItem}><MaterialCommunityIcons name="briefcase-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Encuentra oportunidades laborales.</ThemedText></View>
                          <View style={styles.benefitItem}><MaterialCommunityIcons name="account-group-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Crea una red de contactos.</ThemedText></View>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={{ flex: 1, paddingLeft: (isLargeWeb && !loggedIn) ? 40 : 0 }}>
                    {loggedIn ? (
                      <View style={{ flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: isLargeWeb ? 40 : 10 }}>
                        
                        <View style={[styles.topHeaderRow, { justifyContent: 'space-between', marginBottom: 20 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText style={[styles.sectionTitle, { color: DynamicColors.text, fontSize: 24, fontWeight: '900' }]}>
                              Viviendo en USA
                            </ThemedText>
                          </View>
                          <MaterialCommunityIcons name="home-variant" size={40} color={DynamicColors.text} style={{ opacity: 0.2 }} />
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isWebPlatform ? 10 : 80 }}>
                          
                          <View style={{ alignItems: 'center', marginBottom: 30, marginTop: 10 }}>
                            <View style={{ 
                              width: isLargeWeb ? 160 : 140, 
                              height: isLargeWeb ? 160 : 140, 
                              borderRadius: 100, 
                              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                              justifyContent: 'center', 
                              alignItems: 'center',
                              borderWidth: 1,
                              borderColor: DynamicColors.border,
                              elevation: 4,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.1,
                              shadowRadius: 10,
                            }}>
                               {mainLogoUrl ? (
                                 <Image 
                                    source={{ uri: mainLogoUrl }} 
                                    style={{ width: '92%', height: '92%', borderRadius: 100 }} 
                                    resizeMode="cover" 
                                 />
                               ) : <ActivityIndicator size="small" color="#FF5F6D" />}
                            </View>
                            <ThemedText style={{ fontSize: 22, fontWeight: '800', color: DynamicColors.text, marginTop: 15 }}>
                              ¡Bienvenido! 👋
                            </ThemedText>
                          </View>

                          <View style={{ flexDirection: isLargeWeb ? 'row' : 'column', gap: isLargeWeb ? 20 : 0, justifyContent: 'space-between' }}>
                            
                            <View style={{ flex: isLargeWeb ? 1 : undefined, backgroundColor: isLargeWeb ? DynamicColors.inputBg : 'transparent', padding: isLargeWeb ? 25 : 0, borderRadius: 24, borderWidth: isLargeWeb ? 1 : 0, borderColor: DynamicColors.border, marginBottom: isLargeWeb ? 0 : 20 }}>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                 <MaterialCommunityIcons name="bullseye-arrow" size={28} color="#3B82F6" style={{ marginRight: 10 }} />
                                 <ThemedText style={{ fontSize: 20, fontWeight: '800', color: DynamicColors.text }}>{t.vision || 'Visión'}</ThemedText>
                               </View>
                               <ThemedText style={{ fontSize: 16, lineHeight: 24, color: DynamicColors.iconInactive }}>
                                 {t.hometab?.visiondesc || 'Fortalecer las economías locales conectando a los residentes con los comercios y servicios de su barrio, promoviendo el consumo local.'}
                               </ThemedText>
                            </View>

                            {!isLargeWeb && <View style={[styles.separator, { backgroundColor: DynamicColors.border, marginVertical: 0, marginBottom: 30 }]} />}

                            <View style={{ flex: isLargeWeb ? 1 : undefined, backgroundColor: isLargeWeb ? DynamicColors.inputBg : 'transparent', padding: isLargeWeb ? 25 : 0, borderRadius: 24, borderWidth: isLargeWeb ? 1 : 0, borderColor: DynamicColors.border }}>
                               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                 <MaterialCommunityIcons name="rocket-launch" size={28} color="#F59E0B" style={{ marginRight: 10 }} />
                                 <ThemedText style={{ fontSize: 20, fontWeight: '800', color: DynamicColors.text }}>{t.mision || 'Misión'}</ThemedText>
                               </View>
                               <ThemedText style={{ fontSize: 16, lineHeight: 24, color: DynamicColors.iconInactive }}>
                                 {t.hometab?.missiondesc || 'Crear comunidades más unidas, participativas y solidarias, donde cada residente se sienta conectado, seguro y orgulloso de su barrio.'}
                               </ThemedText>
                            </View>

                          </View>

                        </ScrollView>
                      </View>
                    ) : (
                      <View style={styles.loginFullContainer}>
                        <View style={{ flex: 1 }}>
                          
                          {isWebPlatform && (
                            <TouchableOpacity onPress={() => setShowWebLanding(true)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 2 }}>
                              <MaterialCommunityIcons name="arrow-left" size={18} color={DynamicColors.text} />
                              <Text style={{ color: DynamicColors.text, marginLeft: 5, fontWeight: '600', fontSize: 13 }}>Volver a la Portada</Text>
                            </TouchableOpacity>
                          )}

                          {!isLargeWeb && (
                            <View style={styles.brandHeaderContainer}>
                              <View style={{ 
                                width: 72, 
                                height: 72, 
                                borderRadius: 36, 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                justifyContent: 'center', 
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: DynamicColors.border,
                                marginBottom: 6,
                                elevation: 3,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                              }}>
                                {mainLogoUrl ? (
                                  <Image 
                                    source={{ uri: mainLogoUrl }} 
                                    style={{ width: '92%', height: '92%', borderRadius: 36 }} 
                                    resizeMode="cover" 
                                  />
                                ) : <ActivityIndicator size="small" color="#FF5F6D" />}
                              </View>
                              <ThemedText style={[styles.brandMainTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                            </View>
                          )}

                          <View style={styles.customTabsWrapper}>
                            <TouchableOpacity 
                              onPress={() => { setIsRegistering(false); setAcceptedTerms(false); setShowPassword(false); }} 
                              style={[styles.singleTab, !isRegistering && styles.activeTabStyle]}
                            >
                              <Text style={[styles.tabText, { color: !isRegistering ? '#FFFFFF' : DynamicColors.subtext }]}>
                                Iniciar Sesión
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => { setIsRegistering(true); setAcceptedTerms(false); setShowPassword(false); }} 
                              style={[styles.singleTab, isRegistering && styles.activeTabStyle]}
                            >
                              <Text style={[styles.tabText, { color: isRegistering ? '#FFFFFF' : DynamicColors.subtext }]}>
                                Registrarse
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <ScrollView 
                            showsVerticalScrollIndicator={false} 
                            style={{ flex: 1 }} 
                            contentContainerStyle={{ 
                              flexGrow: 1, 
                              paddingBottom: 40, 
                              paddingTop: 2,
                              justifyContent: !isRegistering ? 'center' : 'flex-start'
                            }}
                          >
                            <View style={styles.inputGap}>
                              {isRegistering ? (
                                <>
                                  {renderInputPair("Nombre", form.firstName, "firstName", "Tu nombre", "default", "Apellido", form.lastName, "lastName", "Tu apellido", "default")}
                                  <ThemedTextInput label="Correo electrónico" value={form.email} onChangeText={(v: string) => setForm({...form, email: v})} placeholder="ejemplo@correo.com" keyboardType="email-address" autoCapitalize="none" />
                                  
                                  {renderInputPair("Teléfono", form.phone, "phone", "+1 234 567 8900", isWebPlatform ? "default" : "phone-pad", "Zip Code", form.zipCode, "zipCode", "90210", isWebPlatform ? "default" : "number-pad")}
                                  
                                  <ThemedText style={styles.labelDate}>{t.hometab?.dateBirthday || "Fecha de Nacimiento"}</ThemedText>
                                  
                                  <View style={[styles.dateInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, padding: isWebPlatform ? 0 : 10 }]}>
                                    {isWebPlatform ? (
                                      <input type="date" onChange={handleWebDateChange} value={getSafeDateString()} style={{ width: '100%', padding: '10px', border: 'none', background: 'transparent', color: DynamicColors.text, outline: 'none', fontSize: '15px', cursor: 'pointer' }} />
                                    ) : (
                                      <>
                                        <ThemedText style={{ color: DynamicColors.text, fontWeight: '700' }}>{!isNaN(form.birthDate.getTime()) ? form.birthDate.toLocaleDateString() : ''}</ThemedText>
                                        <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "calendar-edit"} size={20} color="#FF5F6D" />
                                        <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowDatePicker(!showDatePicker); }} style={StyleSheet.absoluteFill} />
                                      </>
                                    )}
                                  </View>
                                  {showDatePicker && !isAndroid && !isWebPlatform && (
                                      <View style={isIOS ? styles.iosPickerContainer : null}>
                                          {isIOS && (<TouchableOpacity onPress={closeDatePickerIOS} style={styles.iosPickerDoneButton}><ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>Listo</ThemedText></TouchableOpacity>)}
                                          <DateTimePicker value={form.birthDate} mode="date" display={isIOS ? "spinner" : "default"} onChange={onDateChange} textColor={DynamicColors.text} maximumDate={new Date()} />
                                      </View>
                                  )}

                                  {/* 🚀 CONTRASEÑA CON MEDIDOR DE FUERZA Y BOTÓN DE VER 🚀 */}
                                  <View style={{ width: '100%', marginBottom: 10 }}>
                                    <View style={{ position: 'relative', justifyContent: 'center' }}>
                                      <ThemedTextInput 
                                        label="Contraseña" 
                                        value={form.password} 
                                        onChangeText={(v: string) => setForm({...form, password: v})} 
                                        placeholder="********" 
                                        secureTextEntry={!showPassword} 
                                      />
                                      <TouchableOpacity 
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: 15, bottom: 12, zIndex: 10 }}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                      >
                                        <MaterialCommunityIcons 
                                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                          size={22} 
                                          color={DynamicColors.subtext} 
                                        />
                                      </TouchableOpacity>
                                    </View>
                                    
                                    {(() => {
                                      const pwd = form.password || "";
                                      const reqs = {
                                        length: pwd.length >= 8,
                                        upper: /[A-Z]/.test(pwd),
                                        lower: /[a-z]/.test(pwd),
                                        num: /[0-9]/.test(pwd),
                                        spec: /[^A-Za-z0-9]/.test(pwd),
                                      };
                                      
                                      const score = Object.values(reqs).filter(Boolean).length;
                                      
                                      let strengthText = "";
                                      let strengthColor = DynamicColors.border; 
                                      let barWidth = "0%";
                                      
                                      if (pwd.length > 0) {
                                        if (score <= 2) { 
                                          strengthText = "Débil"; 
                                          strengthColor = "#FF5F6D"; 
                                          barWidth = "33%"; 
                                        }
                                        else if (score <= 4) { 
                                          strengthText = "Buena"; 
                                          strengthColor = "#F5A623"; 
                                          barWidth = "66%"; 
                                        }
                                        else { 
                                          strengthText = "Fuerte"; 
                                          strengthColor = "#4CAF50"; 
                                          barWidth = "100%"; 
                                        }
                                      }

                                      const ValidationItem = ({ label, isValid }: { label: string, isValid: boolean }) => (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                          <MaterialCommunityIcons 
                                            name={isValid ? "check-circle" : "close-circle-outline"} 
                                            size={14} 
                                            color={isValid ? "#4CAF50" : (isDark ? '#555' : '#AAA')} 
                                          />
                                          <Text style={{ 
                                            fontSize: 11, 
                                            color: isValid ? (isDark ? '#FFF' : '#333') : (isDark ? '#777' : '#999'), 
                                            fontWeight: isValid ? '700' : '500' 
                                          }}>
                                            {label}
                                          </Text>
                                        </View>
                                      );

                                      return (
                                        <View style={{ marginTop: 10, paddingHorizontal: 4 }}>
                                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text style={{ fontSize: 12, color: DynamicColors.subtext, fontWeight: '600' }}>
                                              Fuerza de la contraseña
                                            </Text>
                                            {score > 0 && (
                                              <Text style={{ fontSize: 12, color: strengthColor, fontWeight: '800' }}>
                                                {strengthText}
                                              </Text>
                                            )}
                                          </View>

                                          <View style={{ height: 4, width: '100%', backgroundColor: DynamicColors.border, borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                                            <View style={{ height: '100%', width: barWidth as any, backgroundColor: strengthColor, borderRadius: 2 }} />
                                          </View>

                                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                            <ValidationItem label="8 Chars" isValid={reqs.length} />
                                            <ValidationItem label="A-Z" isValid={reqs.upper} />
                                            <ValidationItem label="a-z" isValid={reqs.lower} />
                                            <ValidationItem label="123" isValid={reqs.num} />
                                            <ValidationItem label="@#$" isValid={reqs.spec} />
                                          </View>
                                        </View>
                                      );
                                    })()}
                                  </View>

                                  <View style={styles.termsContainer}>
                                    <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={{ padding: 4 }}>
                                      <MaterialCommunityIcons name={acceptedTerms ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={acceptedTerms ? DynamicColors.accent : DynamicColors.subtext} />
                                    </TouchableOpacity>
                                    <ThemedText style={[styles.termsText, { color: DynamicColors.subtext }]}>
                                      He leído y acepto los <ThemedText style={{ color: DynamicColors.accent, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => setShowTermsModal(true)}>Términos y Condiciones</ThemedText>
                                   </ThemedText>
                                  </View>
                                </>
                              ) : (
                                <>
                                  <ThemedTextInput label="Correo electrónico" value={form.email} onChangeText={(v: string) => setForm({...form, email: v})} placeholder="ejemplo@correo.com" autoCapitalize="none" keyboardType="email-address" />
                                  
                                  {/* 🚀 BOTÓN DE VER CONTRASEÑA EN LOGIN TAMBIÉN 🚀 */}
                                  <View style={{ position: 'relative', justifyContent: 'center' }}>
                                    <ThemedTextInput 
                                      label="Contraseña" 
                                      value={form.password} 
                                      onChangeText={(v: string) => setForm({...form, password: v})} 
                                      placeholder="********" 
                                      secureTextEntry={!showPassword} 
                                    />
                                    <TouchableOpacity 
                                      onPress={() => setShowPassword(!showPassword)}
                                      style={{ position: 'absolute', right: 15, bottom: 12, zIndex: 10 }}
                                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    >
                                      <MaterialCommunityIcons 
                                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={22} 
                                        color={DynamicColors.subtext} 
                                      />
                                    </TouchableOpacity>
                                  </View>
                                  
                                  <TouchableOpacity onPress={() => setShowResetModal(true)} style={{ alignSelf: 'flex-end', marginBottom: 10, padding: 5 }}>
                                    <ThemedText style={{ fontSize: 12, color: DynamicColors.subtext, fontWeight: '700' }}>¿Olvidaste tu contraseña?</ThemedText>
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>

                            <View style={styles.actionsContainer}>
                              <TouchableOpacity activeOpacity={0.85} onPress={handleAuthAction} disabled={isSubmitDisabled} style={[styles.primaryWrapper, isSubmitDisabled && { opacity: 0.4 }]}>
                                <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
                                  <MaterialCommunityIcons name={isRegistering ? "account-plus" : "login-variant"} size={20} color="white" style={{ marginRight: 8 }} />
                                  <Text style={styles.primaryText}>{isRegistering ? (t.hometab?.registerhome || "Crear Cuenta") : (t.hometab?.acces || "Acceder")}</Text>
                                </LinearGradient>
                              </TouchableOpacity>

                              <TouchableOpacity disabled={!request || isSubmitDisabled} style={[styles.socialButton, { borderColor: DynamicColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }, isSubmitDisabled && { opacity: 0.4 }]} onPress={() => promptAsync()}>
                                <MaterialCommunityIcons name="google" size={20} color={isDark ? '#fff' : '#4285F4'} />
                                <Text style={[styles.socialText, { color: DynamicColors.text }]}>{t.hometab?.googleacount || "Continuar con Google"}</Text>
                              </TouchableOpacity>
                            </View>

                          </ScrollView>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        
        <Modal visible={showResetModal} transparent={true} animationType="fade" onRequestClose={() => setShowResetModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: Math.min(width * 0.92, 400) }]}>
              <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
                <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Recuperar Contraseña</ThemedText>
                <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 5 }}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <ThemedText style={{ color: DynamicColors.subtext, marginBottom: 20, fontSize: 14 }}>Ingresa el correo asociado a tu cuenta. Te enviaremos instrucciones.</ThemedText>
                <TextInput value={resetEmail} onChangeText={setResetEmail} placeholder="ejemplo@correo.com" placeholderTextColor={DynamicColors.subtext} style={[styles.nativeInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, color: DynamicColors.text, marginBottom: 10 }, ...(isWebPlatform ? [{ outlineStyle: 'none' as any }] : []) ]} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
                <TouchableOpacity style={[styles.primaryWrapper, { width: '100%', height: 45 }]} onPress={handlePasswordReset}>
                  <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
                    <Text style={styles.primaryText}>Enviar Enlace</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showCompletionModal} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: width > 768 ? 500 : width * 0.92 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
                <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Completa tu perfil</ThemedText>
              </View>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <ThemedText style={{ color: DynamicColors.subtext, marginBottom: 20, fontSize: 14 }}>Para brindarte la mejor experiencia, necesitamos unos datos adicionales.</ThemedText>
                <View style={{ gap: 20, marginBottom: 10, width: '100%' }}>
                  <View style={{ width: '100%' }}>
                    <ThemedText style={styles.labelDate}>Teléfono</ThemedText>
                    <TextInput value={form.phone} onChangeText={(v: string) => setForm({...form, phone: v})} placeholder="+1 234 567 8900" placeholderTextColor={DynamicColors.subtext} style={[styles.nativeInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, color: DynamicColors.text}, ...(isWebPlatform ? [{ outlineStyle: 'none' as any }] : []) ]} keyboardType={isWebPlatform ? "default" : "phone-pad"} autoComplete="off" />
                  </View>
                  <View style={{ width: '100%' }}>
                    <ThemedText style={styles.labelDate}>Zip Code</ThemedText>
                    <TextInput value={form.zipCode} onChangeText={(v: string) => setForm({...form, zipCode: v})} placeholder="90210" placeholderTextColor={DynamicColors.subtext} style={[styles.nativeInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, color: DynamicColors.text }, ...(isWebPlatform ? [{ outlineStyle: 'none' as any }] : []) ]} keyboardType={isWebPlatform ? "default" : "number-pad"} autoComplete="off" />
                  </View>
                  <View style={{ width: '100%' }}>
                    <ThemedText style={styles.labelDate}>Fecha de Nacimiento</ThemedText>
                    <View style={[styles.dateInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, padding: isWebPlatform ? 0 : 12 }]}>
                      {isWebPlatform ? (
                        <input type="date" onChange={handleWebDateChange} value={getSafeDateString()} style={{ width: '100%', padding: '12px', border: 'none', background: 'transparent', color: DynamicColors.text, outline: 'none', fontSize: '16px', cursor: 'pointer' }} />
                      ) : (
                        <>
                          <ThemedText style={{ color: DynamicColors.text, fontWeight: '700' }}>{!isNaN(form.birthDate.getTime()) ? form.birthDate.toLocaleDateString() : ''}</ThemedText>
                          <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "calendar-edit"} size={20} color="#FF5F6D" />
                          <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)} style={StyleSheet.absoluteFill} />
                        </>
                      )}
                    </View>
                    {showDatePicker && !isAndroid && !isWebPlatform && (
                        <View style={isIOS ? styles.iosPickerContainer : null}>
                            {isIOS && (<TouchableOpacity onPress={closeDatePickerIOS} style={styles.iosPickerDoneButton}><ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>Listo</ThemedText></TouchableOpacity>)}
                            <DateTimePicker value={form.birthDate} mode="date" display={isIOS ? "spinner" : "default"} onChange={onDateChange} textColor={DynamicColors.text} maximumDate={new Date()} />
                        </View>
                    )}
                  </View>
                  <View style={styles.termsContainer}>
                    <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={{ padding: 4 }}><MaterialCommunityIcons name={acceptedTerms ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={acceptedTerms ? DynamicColors.accent : DynamicColors.subtext} /></TouchableOpacity>
                    <ThemedText style={[styles.termsText, { color: DynamicColors.subtext }]}>He leído y acepto los <ThemedText style={{ color: DynamicColors.accent, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => {
                        setReturnToCompletion(true);
                        setShowCompletionModal(false);
                        setTimeout(() => setShowTermsModal(true), 300);
                    }}>Términos y Condiciones</ThemedText></ThemedText>
                  </View>
                </View>
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
                <TouchableOpacity style={[styles.primaryWrapper, { width: '100%', height: 45 }, !acceptedTerms && { opacity: 0.4 }]} onPress={submitProfileCompletion} disabled={!acceptedTerms}>
                  <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
                    <Text style={styles.primaryText}>Guardar y Continuar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showTermsModal} transparent={true} animationType="slide" onRequestClose={() => {
            setShowTermsModal(false);
            if (returnToCompletion) {
                setTimeout(() => { setShowCompletionModal(true); setReturnToCompletion(false); }, 300);
            }
        }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: cardWidth, maxHeight: height * 0.8 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
                <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Términos y Condiciones</ThemedText>
                <TouchableOpacity onPress={() => {
                    setShowTermsModal(false);
                    if (returnToCompletion) {
                        setTimeout(() => { setShowCompletionModal(true); setReturnToCompletion(false); }, 300);
                    }
                }} style={{ padding: 5 }}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
                {isLoadingTerms ? <ActivityIndicator size="large" color="#FF5F6D" style={{ marginTop: 20 }} /> : <><ThemedText style={{ color: DynamicColors.text, fontWeight: 'bold', marginBottom: 15 }}>Versión {termsData.version || 'Actual'}</ThemedText><ThemedText style={{ color: DynamicColors.text, marginBottom: 20, lineHeight: 24 }}>{stripHtmlTags(termsData.content_html)}</ThemedText></>}
              </ScrollView>
              <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
                <TouchableOpacity style={[styles.primaryWrapper, { width: '100%', height: 45 }]} onPress={() => { 
                    setAcceptedTerms(true); 
                    setShowTermsModal(false); 
                    if (returnToCompletion) {
                        setTimeout(() => { setShowCompletionModal(true); setReturnToCompletion(false); }, 300);
                    }
                }}>
                  <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
                    <Text style={styles.primaryText}>Aceptar y Cerrar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </RootComponent>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' }, 
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  mainCard: { overflow: 'hidden', borderRadius: 28, borderWidth: Platform.OS === 'android' ? 1 : 0 },
  cardContent: { flex: 1, padding: 20 },
  
  landingButtonsContainer: { gap: 20, alignItems: 'center', justifyContent: 'center', width: '100%' },
  storeButtonBlackBig: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 25, minWidth: 260, justifyContent: 'center' },
  storeButtonLightBig: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 2, paddingVertical: 14, paddingHorizontal: 25, minWidth: 260, justifyContent: 'center' },
  storeButtonSubBig: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  storeButtonTitleBig: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: -2 },

  aboutCard: { flex: 1, padding: 40, borderRadius: 24, borderWidth: 1, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  aboutCardTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  aboutCardText: { fontSize: 17, lineHeight: 26, textAlign: 'center' },

  carouselArrowButton: { padding: 10, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.05)', elevation: 2 },

  webSidebar: { width: 250, borderRightWidth: 1, borderColor: 'rgba(128,128,128,0.1)', paddingRight: 20 },
  sidebarLogo: { width: 100, height: 100, marginBottom: 15 },
  sideMenuTitle: { fontSize: 24, fontWeight: '900', marginBottom: 2, letterSpacing: -0.5 },
  webSidebarBenefits: { marginTop: 30, gap: 15 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '600' },
  
  topHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  infoSection: { paddingVertical: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  descriptionText: { fontSize: 15, lineHeight: 22, opacity: 0.8, marginBottom: 10 },
  separator: { width: '100%', height: 1, marginVertical: 10 },
  loginFullContainer: { flex: 1, width: '100%' },
  
  brandHeaderContainer: { alignItems: 'center', marginBottom: 10, marginTop: 2 },
  brandMainTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  
  customTabsWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
  },
  singleTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabStyle: {
    backgroundColor: '#FF5F6D',
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },

  inputGap: { width: '100%', gap: 10 },
  labelDate: { fontSize: 11, fontWeight: '900', color: '#FF5F6D', marginBottom: 2, textTransform: 'uppercase' },
  dateInput: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  iosPickerContainer: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginTop: 5, overflow: 'hidden' },
  iosPickerDoneButton: { alignItems: 'flex-end', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  termsText: { fontSize: 12, marginLeft: 4, flex: 1 },
  actionsContainer: { width: '100%', alignItems: 'center', marginTop: 18 },
  
  primaryWrapper: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginVertical: 6,
  },
  gradientContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialText: {
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 14,
  },
  
  switchModeContainer: { marginTop: 20, paddingBottom: 10 },
  switchModeText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 20 },
  modalFooter: { padding: 15, borderTopWidth: 1, alignItems: 'center' },
  nativeInput: { height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, fontSize: 15, marginTop: 4 },
  storeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, height: 52 },
  storeButtonSub: { color: '#FFF', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  storeButtonTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginTop: -2 }
});