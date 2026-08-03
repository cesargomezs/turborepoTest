import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState, useEffect, useRef } from 'react'; 
import { 
  View, Image, Platform, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, TextInput, Alert, useWindowDimensions, Keyboard, Animated, PanResponder, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 

import { Colors } from '../../constants/Colors';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter, usePathname } from 'expo-router'; 
import { setUserMetadata, useMockDispatch, useMockSelector, setLanguage } from '../../redux/slices'; 
import { useTranslation } from '../../hooks/useTranslation'; 
import { useAppTheme } from '@/app/src/context/ThemeContext'; 
import { useAuth } from '../../context/AuthContext';
import ITSupportButton from './ITSupportButton';

const API_BASE_URL = process.env.EXPO_PUBLIC_URL_BACKEND || process.env.EXPO_PUBLIC_URL_BACKEND;
const API_NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;
const API_USERS_URL = `${API_BASE_URL}/auth/profile`; 
const API_REGISTER_URL = `${API_BASE_URL}/auth/register`; 
const API_UPLOAD_URL = `${API_BASE_URL}/api/subir-imagen-optimizada/users`; 
const API_DELETE_ACCOUNT_URL = `${API_BASE_URL}/auth/delete-account`; // 🚀 Endpoint para dar de baja la cuenta

// ==========================================
// 🚀 COMPONENTE: ITEM DESLIZABLE (SWIPE TO DELETE)
// ==========================================
const SwipeableNotificationItem = ({ children, onSwipeRight }: { children: any, onSwipeRight: () => void }) => {
  const pan = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) { 
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 100) {
          Animated.timing(pan, {
            toValue: Dimensions.get('window').width,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onSwipeRight());
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    })
  ).current;

  const bgOpacity = pan.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  return (
    <View style={{ position: 'relative', marginBottom: 10, borderRadius: 16 }}>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#FF5F6D', borderRadius: 16, justifyContent: 'center', paddingLeft: 20, opacity: bgOpacity }}>
        <MaterialCommunityIcons name="trash-can-outline" size={28} color="#FFF" />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

export default function Header({ title }: { title?: string }) {
  // 🔐 ESTADO GLOBAL DE AUTENTICACIÓN
  const { user, token, logout } = useAuth(); // Incluimos logout para limpiar sesión al dar de baja

  const REAL_USER_ID = user?.id;

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const router = useRouter(); 
  const pathname = usePathname(); 
  const dispatch = useMockDispatch();
  
  const { t } = useTranslation();
  const selectedLanguage = useMockSelector((state: any) => state.language.code);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 

  // 🚀 ESTADOS PARA IT SUPPORT (SOPORTE TÉCNICO)
  const [itMessage, setItMessage] = useState('');
  const [isSendingIT, setIsSendingIT] = useState(false);
  const [showITSupportModal, setShowITSupportModal] = useState(false);

  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [activeProfileRole, setActiveProfileRole] = useState('User'); 

  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    last_name: '',
    phone: '',
    zip: '',
    birth: '',
    typeDetail: '',
    password: '', 
    estate: '',
    image_url: null as string | null,
    new_image_uri: null as string | null,
  });

  const isSuperAdmin = userMetadata?.role === 'SAdmin' || profileData.typeDetail === 'SAdmin' || profileData.email === 'cesargomez853@gmail.com';
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  const fetchUserData = async () => {
    if (!REAL_USER_ID || !token) return;

    try {
      const res = await fetch(`${API_USERS_URL}/${REAL_USER_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText}`);
      }
      
      const userData = await res.json();
      if (userData && !userData.error) {
        setActiveProfileRole(userData.typeDetail || 'User');
        
        setProfileData(prev => ({
          ...prev,
          email: userData.email || '',
          name: userData.name || '',
          last_name: userData.lastName || userData.last_name || '',
          phone: userData.phone || '',
          zip: userData.zip || '',
          estate: userData.estate || userData.state || '',
          birth: userData.birth ? new Date(userData.birth).toISOString().split('T')[0] : '',
          typeDetail: userData.typeDetail || '', 
          image_url: userData.imageUrl || userData.image_url || null,
          password: '', 
          new_image_uri: null,
        }));

        dispatch(setUserMetadata({
          ...userMetadata,
          estate: userData.estate || userData.state || ''
        }));
      }
    } catch (error) { console.error("Error al obtener datos:", error); }
  };

  useEffect(() => {
    if (!isCreatingUser) fetchUserData();
  }, [isCreatingUser, settingsModalVisible, REAL_USER_ID, token]);

  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  }, [pathname]);

  const fetchNotifications = async () => {
    if (!REAL_USER_ID || !token) return;

    try {
      const url = `${API_BASE_URL}/notifications?userId=${REAL_USER_ID}`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      
      let fetchedNotifs: any[] = [];
      if (Array.isArray(data)) {
        fetchedNotifs = data;
      } else if (data && Array.isArray(data.data)) {
        fetchedNotifs = data.data;
      } else if (data && Array.isArray(data.notifications)) {
        fetchedNotifs = data.notifications;
      }

      fetchedNotifs.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || a.visibleAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || b.visibleAt || 0).getTime();
        return dateB - dateA;
      });

      setNotifications(fetchedNotifs);
    } catch (error: any) { 
      console.error("Error al cargar notificaciones:", error?.message || "Error desconocido"); 
    }
  };

  useEffect(() => {
    if (REAL_USER_ID && token) {
      fetchNotifications();
      const interval = setInterval(() => fetchNotifications(), 60000); 
      return () => clearInterval(interval);
    }
  }, [REAL_USER_ID, token]);

  const hasUnread = notifications.some(n => n.read === false || n.isRead === false || n.is_read === false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job': return { name: 'briefcase', color: '#4CAF50' }; 
      case 'store': return { name: 'store', color: '#FFB300' }; 
      case 'alert': return { name: 'alert-circle', color: '#FF5F6D' }; 
      case 'event': return { name: 'calendar', color: '#9C27B0' }; 
      case 'lawyer': return { name: 'scale-balance', color: '#FF5F6D' }; 
      case 'support': return { name: 'heart-pulse', color: '#FF5F6D' }; 
      default: return { name: 'bell', color: Colors[localTheme].text };
    }
  };

  const handleNotificationPress = async (notif: any) => {
    setNotifModalVisible(false);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    try { 
      await fetch(`${API_NOTIFICATIONS_URL}/${notif.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }); 
    } catch (error) {}

    setTimeout(() => {
      const routes: Record<string, { path: string, param: string }> = {
        'job': { path: '/jobs', param: 'openJobId' },
        'store': { path: '/tabservices/stores', param: 'id' },
        'community': { path: '/tabservices/community', param: 'openEventId' },
        'event': { path: '/tabservices/events', param: 'openEventId' },
        'lawyer': { path: '/tabservices/lawyers', param: 'id' },
        'support': { path: '/tabservices/support', param: 'id' },
      };
      const target = routes[notif.type];
      if (target) {
        const targetId = notif.referenceId || notif.reference_id || notif.id;
        router.navigate({ pathname: target.path as any, params: { [target.param]: targetId } }); 
      }
    }, 300); 
  };

  const handleDeleteNotificationOnly = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    try { 
      await fetch(`${API_NOTIFICATIONS_URL}/${notifId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }); 
    } catch (error) {}
  };

  const handleSendITSupport = async () => {
    if (!itMessage.trim()) {
      return Alert.alert("Aviso", "Por favor escribe tu mensaje o problema técnico.");
    }

    setIsSendingIT(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/it-support`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          email: profileData.email,
          userName: `${profileData.name} ${profileData.last_name}`,
          message: itMessage
        })
      });

      if (!response.ok) throw new Error("No se pudo enviar el mensaje");

      Alert.alert("¡Enviado!", "Tu reporte ha sido enviado al equipo de IT. Te responderemos pronto.");
      setItMessage('');
      setShowITSupportModal(false);
    } catch (error) {
      console.error("Error enviando IT Support:", error);
      Alert.alert("Error", "Ocurrió un error al enviar el mensaje. Inténtalo de nuevo.");
    } finally {
      setIsSendingIT(false);
    }
  };

  // =====================================================================
  // 🚀 FUNCIÓN PARA DAR DE BAJA LA CUENTA (MANTIENE RESEÑAS ANÓNIMAS)
  // =====================================================================
  const handleDeleteAccount = () => {
    const confirmTitle = "Eliminar Cuenta Definitivamente";
    const confirmMessage = "⚠️ Esta acción es irreversible. Se borrarán tus datos personales y credenciales de acceso de nuestros servidores, aunque tus reseñas y publicaciones permanecerán de forma anónima en la comunidad.";

    const executeDelete = async () => {
      try {
        const response = await fetch(API_DELETE_ACCOUNT_URL, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        if (!response.ok) {
          throw new Error("No se pudo eliminar la cuenta. Intenta más tarde.");
        }

        if (isWeb) {
          window.alert("Tu cuenta y datos personales han sido eliminados con éxito.");
        } else {
          Alert.alert("Cuenta Eliminada", "Tus datos personales han sido borrados con éxito.");
        }
        
        closeSettingsModal();
        if (typeof logout === 'function') {
          await logout();
        }
        router.replace('/');
        
      } catch (error: any) {
        if (isWeb) {
          window.alert(`Error: ${error.message}`);
        } else {
          Alert.alert("Error", error.message);
        }
      }
    };

    if (isWeb) {
      if (window.confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Sí, eliminar mi cuenta", 
            style: "destructive", 
            onPress: () => executeDelete() 
          }
        ]
      );
    }
  };

  const toggleCreateMode = (create: boolean) => {
    setIsCreatingUser(create);
    setShowPassword(false);
    if (create) {
      setProfileData({ email: '', name: '', last_name: '', phone: '', zip: '', birth: '', password: '', typeDetail: 'User', image_url: null, new_image_uri: null ,estate: ''});
      setActiveProfileRole('User');
    } else {
      fetchUserData(); 
    }
  };

  const closeSettingsModal = () => {
    setSettingsModalVisible(false);
    setIsCreatingUser(false);
    setShowPassword(false);
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, 
    });
    if (!result.canceled) {
      setProfileData({ ...profileData, new_image_uri: result.assets[0].uri });
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      let finalImageName = profileData.image_url;

      if (profileData.new_image_uri) {
        const imageFormData = new FormData();
        const filename = profileData.new_image_uri.split('/').pop() || 'upload.jpg';
        
        if (Platform.OS === 'web') {
          const response = await fetch(profileData.new_image_uri);
          const blob = await response.blob();
          imageFormData.append('imagen', blob, filename); 
        } else {
          imageFormData.append('imagen', {
            uri: profileData.new_image_uri,
            name: filename,
            type: 'image/jpeg', 
          } as any);
        }

        const uploadRes = await fetch(API_UPLOAD_URL, {
          method: 'POST',
          body: imageFormData,
          headers: { 
            'Authorization': `Bearer ${token}`
          } 
        });

        if (!uploadRes.ok) {
           const errResp = await uploadRes.json();
           throw new Error(errResp.error || "Error al subir la imagen al servidor");
        }
        
        const uploadData = await uploadRes.json();
        finalImageName = uploadData.identificadorArchivo ? uploadData.identificadorArchivo.split('/').pop() : uploadData.url;
      }

      const payload = {
        data: {
          email: profileData.email,
          name: profileData.name,
          lastName: profileData.last_name,
          phone: profileData.phone,
          zip: profileData.zip,
          birth: profileData.birth,
          typeDetail: activeProfileRole,
          estate: profileData?.estate || '',
          ...(profileData.password ? { password: profileData.password } : {})
        },
        newImageUri: profileData.new_image_uri ? finalImageName : null 
      };

      const endpoint = isCreatingUser ? API_REGISTER_URL : `${API_USERS_URL}/${REAL_USER_ID}`;
      const method = isCreatingUser ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error en el servidor al actualizar perfil");
      }
      
      Alert.alert("Éxito", isCreatingUser ? "Usuario creado correctamente" : "Perfil actualizado correctamente");
      closeSettingsModal();
      fetchUserData(); 
      
    } catch (error: any) {
      console.error("Error al guardar perfil:", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const currentDisplayImage = profileData.new_image_uri 
    ? { uri: profileData.new_image_uri } 
    : (profileData.image_url ? { uri: profileData.image_url } : require('../../assets/images/cesar.webp'));

  return (
    <View style={{ width: '100%', backgroundColor: 'transparent' }}>
      <BlurView tint={isDark ? 'dark' : 'light'} intensity={Platform.OS === 'ios' ? 85 : 100} style={{ paddingTop: insets.top }} className="border-b border-white/10">
        <View style={[styles.headerRow, isWeb && { paddingBottom: 15 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setSettingsModalVisible(true)} style={[styles.avatarContainer, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
              <Image source={currentDisplayImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: Colors[localTheme].text }}>
                {t.welcome + profileData.name + ' ' + (profileData.last_name ? profileData.last_name.substring(0, 1) : '')}
              </ThemedText>
              {isSuperAdmin && (
                 <ThemedText style={{ fontSize: 11, color: '#FF5F6D', fontWeight: 'bold' }}>SAdmin Panel</ThemedText>
              )}
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity 
                onPress={() => setShowITSupportModal(true)} 
                activeOpacity={0.7} 
                style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              >
                <MaterialCommunityIcons size={22} style={{ color: isDark ? '#4FC3F7' : '#007AFF' , fontWeight: 'bold' }} name="headset" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { fetchNotifications(); setNotifModalVisible(true); }} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', position: 'relative' }]}>
                <MaterialCommunityIcons size={22} color={Colors[localTheme].text} name={hasUnread ? "bell-ring" : "bell-outline"} />
                {hasUnread && <View style={styles.unreadBadge} />}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSettingsModalVisible(true)} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <MaterialCommunityIcons size={22} color={Colors[localTheme].text} name="cog" />
              </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <ThemedText className="text-center text-2xl" style={{ color: isDark ? '#4FC3F7' : '#007AFF' , fontWeight: 'bold' }}>{title}</ThemedText>
        </View>
      </BlurView>
      
      {/* 🚀 MODAL DE CONFIGURACIÓN */}
      <Modal visible={settingsModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={closeSettingsModal}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !isSavingProfile && closeSettingsModal()} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={[styles.notifModalContent, { backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', paddingBottom: Math.max(insets.bottom, 25), width: isWeb && width > 768 ? 500 : '100%', maxHeight: '92%' }]}>
              {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

              <View style={styles.notifHeader}>
                <TouchableOpacity onPress={closeSettingsModal} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors[localTheme].text} />
                </TouchableOpacity>
                <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: Colors[localTheme].text }}>{isCreatingUser ? 'Crear Usuario' : 'Configuración'}</ThemedText>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isWeb ? 150 : 30 }}>
                
                {isSuperAdmin && (
                  <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                    <TouchableOpacity onPress={() => toggleCreateMode(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: !isCreatingUser ? (isDark ? '#333' : '#FFF') : 'transparent', alignItems: 'center' }}>
                      <ThemedText style={{ fontWeight: !isCreatingUser ? 'bold' : '600', color: !isCreatingUser ? Colors[localTheme].tint : '#888' }}>Mi Perfil</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleCreateMode(true)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: isCreatingUser ? (isDark ? '#333' : '#FFF') : 'transparent', alignItems: 'center' }}>
                      <ThemedText style={{ fontWeight: isCreatingUser ? 'bold' : '600', color: isCreatingUser ? '#FF5F6D' : '#888' }}>Nuevo Usuario</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ alignItems: 'center', marginBottom: 25 }}>
                  <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8} style={{ position: 'relative' }}>
                    <View style={{ width: 110, height: 110, borderRadius: 55, overflow: 'hidden', borderWidth: 2, borderColor: Colors[localTheme].tint }}>
                      <Image source={currentDisplayImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors[localTheme].tint, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: isDark ? '#1E1E1E' : '#FFF' }}>
                      <MaterialCommunityIcons name="camera-plus" size={16} color={isDark ? '#888' : '#fff'} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 🎨 APARIENCIA E IDIOMA */}
                <View style={{ marginBottom: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="theme-light-dark" size={22} color={Colors[localTheme].text} style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>{t.headertab.appearance}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 4 }}>
                      <TouchableOpacity onPress={() => toggleTheme('light')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: !isDark ? '#FFF' : 'transparent', shadowColor: !isDark ? '#000' : 'transparent', shadowOpacity: !isDark ? 0.1 : 0, shadowRadius: 4 }}>
                        <MaterialCommunityIcons name="weather-sunny" size={18} color={!isDark ? '#FFB300' : '#888'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleTheme('dark')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? '#333' : 'transparent', shadowColor: isDark ? '#000' : 'transparent', shadowOpacity: isDark ? 0.3 : 0, shadowRadius: 4 }}>
                        <MaterialCommunityIcons name="weather-night" size={18} color={isDark ? '#4FC3F7' : '#888'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginBottom: 15 }} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="translate" size={22} color={Colors[localTheme].text} style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>{t.headertab.languaje}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 4 }}>
                      {languages.map((lang) => {
                        const isSelected = selectedLanguage === lang.code;
                        return (
                          <TouchableOpacity key={lang.code} onPress={() => dispatch(setLanguage(lang.code))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isSelected ? (isDark ? '#333' : '#FFF') : 'transparent', shadowColor: isSelected ? '#000' : 'transparent', shadowOpacity: isSelected ? (isDark ? 0.3 : 0.1) : 0, shadowRadius: 4 }}>
                            <ThemedText style={{ fontSize: 13, fontWeight: isSelected ? 'bold' : '600', color: isSelected ? Colors[localTheme].tint : '#888' }}>{lang.label}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* 🚀 BOTÓN DE SOPORTE TÉCNICO / IT SUPPORT */}
                <TouchableOpacity 
                  onPress={() => setShowITSupportModal(true)} 
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="headset" size={22} color="#4FC3F7" style={{ marginRight: 10 }} />
                    <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>Soporte Técnico / IT</ThemedText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? '#B0BEC5' : '#666'} />
                </TouchableOpacity>

                {isSuperAdmin && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="shield-account" size={22} color="#FF5F6D" style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>{t.headertab.rol}</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 4 }}>
                      <TouchableOpacity onPress={() => setActiveProfileRole('Admin')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: activeProfileRole === 'Admin' ? (isDark ? '#333' : '#FFF') : 'transparent' }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: activeProfileRole === 'Admin' ? 'bold' : '600', color: activeProfileRole === 'Admin' ? '#FF5F6D' : '#888' }}>Admin</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setActiveProfileRole('User')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: activeProfileRole === 'User' ? (isDark ? '#333' : '#FFF') : 'transparent' }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: activeProfileRole === 'User' ? 'bold' : '600', color: activeProfileRole === 'User' ? Colors[localTheme].tint : '#888' }}>{t.headertab.rolUser}</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text, marginBottom: 10, fontSize: 16 }]}>{t.headertab.labelpersonal}</ThemedText>
                
                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.email}</ThemedText>
                <TextInput value={profileData.email} onChangeText={(val) => setProfileData({...profileData, email: val})} editable={isCreatingUser} keyboardType="email-address" autoCapitalize="none" style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.name}</ThemedText>
                    <TextInput value={profileData.name} onChangeText={(val) => setProfileData({...profileData, name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.lastName}</ThemedText>
                    <TextInput value={profileData.last_name} onChangeText={(val) => setProfileData({...profileData, last_name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                </View>

                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{isCreatingUser ? "Contraseña" : "Nueva Contraseña (Opcional)"}</ThemedText>
                
                {isCreatingUser && (
                  <>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>
                    {t.headertab.labelPassword}
                    </ThemedText>
                    <View style={{ width: '100%', position: 'relative', marginBottom: 15 }}>
                      <TextInput 
                        value={profileData.password} 
                        onChangeText={(val) => setProfileData({...profileData, password: val})} 
                        secureTextEntry={!showPassword}
                        placeholder="********"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        style={[styles.profileInput, { 
                          color: Colors[localTheme].text, 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', 
                          borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', 
                          marginBottom: 0, 
                          paddingRight: 45 
                        }]} 
                      />
                      <TouchableOpacity 
                        style={{ position: 'absolute', right: 15, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} 
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <MaterialCommunityIcons 
                          name={showPassword ? "eye-outline" : "eye-off-outline"} 
                          size={22} 
                          color={isDark ? '#888' : '#AAA'} 
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.phone}</ThemedText>
                    <TextInput value={profileData.phone} keyboardType="phone-pad" onChangeText={(val) => setProfileData({...profileData, phone: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.zipCode}</ThemedText>
                    <TextInput value={profileData.zip} keyboardType="numeric" maxLength={5} onChangeText={(val) => setProfileData({...profileData, zip: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                </View>

                <View style={{ width: '100%', marginBottom: 15 }}>
                  <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Estado (Ej: CA)</ThemedText>
                  <TextInput 
                    value={profileData.estate} 
                    onChangeText={(val) => setProfileData({...profileData, estate: val})} 
                    maxLength={2}
                    autoCapitalize="characters"
                    placeholder="CA"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} 
                  />
                </View>

                <View style={{ width: '100%', marginBottom: 15 }}>
                  <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{t.headertab.birth}</ThemedText>
                  <View style={{ position: 'relative' }}>
                    <View style={[styles.profileInput, { marginBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
                      <ThemedText style={{ color: profileData.birth ? Colors[localTheme].text : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)') }}>{profileData.birth || 'yyyy-mm-dd'}</ThemedText>
                      <MaterialCommunityIcons name="calendar-month" size={20} color={isDark ? '#888' : '#AAA'} />
                    </View>
                    {!isWeb && (
                      <TouchableOpacity activeOpacity={0} onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }} style={[StyleSheet.absoluteFill, { zIndex: 10 }]} />
                    )}
                  </View>
                </View>

                {showDatePicker && !isWeb && (
                  <View style={isIOS ? styles.iosPickerContainer : null}>
                    {isIOS && (
                      <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosPickerDoneButton}>
                        <ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>Listo</ThemedText>
                      </TouchableOpacity>
                    )}
                    <DateTimePicker 
                      value={profileData.birth ? new Date(`${profileData.birth}T12:00:00`) : new Date()} 
                      mode="date" display={isIOS ? "spinner" : "default"} 
                      onChange={(event, selectedDate) => {
                        if (isAndroid) setShowDatePicker(false);
                        if (selectedDate) setProfileData({ ...profileData, birth: selectedDate.toISOString().split('T')[0] });
                      }} 
                      textColor={Colors[localTheme].text} maximumDate={new Date()}
                    />
                  </View>
                )}

                <TouchableOpacity disabled={isSavingProfile} onPress={handleSaveProfile} style={{ marginTop: 5, borderRadius: 16, overflow: 'hidden' }}>
                  <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                      {isSavingProfile ? "Guardando..." : (isCreatingUser ? "Crear Usuario" : "Guardar Cambios")}
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>

                {/* 🚀 BOTÓN PARA DAR DE BAJA / ELIMINAR CUENTA (CUMPLE CON REQUISITOS DE APPLE/GOOGLE) */}
                {!isCreatingUser && (
                  <TouchableOpacity 
                    onPress={handleDeleteAccount} 
                    style={{ 
                      marginTop: 25, 
                      paddingVertical: 15, 
                      paddingHorizontal: 20, 
                      borderRadius: 16, 
                      borderWidth: 1, 
                      borderColor: '#EF4444', 
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}
                  >
                    <MaterialCommunityIcons name="delete-forever" size={22} color="#EF4444" />
                    <ThemedText style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 15, marginLeft: 10 }}>
                      Eliminar mi cuenta y datos
                    </ThemedText>
                  </TouchableOpacity>
                )}

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 🚀 MODAL PARA ESCRIBIR EL MENSAJE DE IT SUPPORT */}
      <Modal visible={showITSupportModal} transparent animationType="fade" onRequestClose={() => setShowITSupportModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: isDark ? '#1E1E1E' : '#FFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: Colors[localTheme].text }}>Soporte Técnico / IT</ThemedText>
              <TouchableOpacity onPress={() => setShowITSupportModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={Colors[localTheme].text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 13, color: isDark ? '#B0BEC5' : '#666', marginBottom: 15 }}>
              Escribe tu problema técnico o duda. El mensaje llegará directo al equipo de administración y te responderemos a: {profileData.email}
            </ThemedText>

            <TextInput 
              value={itMessage}
              onChangeText={setItMessage}
              placeholder="¿Qué inconveniente presentas?"
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: Colors[localTheme].text, padding: 12, borderRadius: 12, height: 120, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            />

            <TouchableOpacity disabled={isSendingIT} onPress={handleSendITSupport} style={{ borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 14, alignItems: 'center' }}>
                <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>
                  {isSendingIT ? "Enviando..." : "Enviar a Soporte IT"}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* 🚀 MODAL DE NOTIFICACIONES */}
      <Modal animationType="slide" transparent={true} visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setNotifModalVisible(false)} />
          
          <View style={{ width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={[styles.notifModalContent, { backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', paddingBottom: Math.max(insets.bottom, 25), width: isWeb && width > 768 ? 500 : '100%', maxHeight: '92%' }]}>
              {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

              <View style={styles.notifHeader}>
                <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors[localTheme].text} />
                </TouchableOpacity>
                
                <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: Colors[localTheme].text }}>{t.headertab.notification}</ThemedText>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 , flexGrow: 1 }}>
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const iconConfig = getNotificationIcon(notif.type);
                    const isRead = notif.read === true || notif.isRead === true || notif.is_read === true;
                    const timeString = notif.time || notif.createdAt || notif.created_at || notif.visibleAt || '';
                    const displayTime = notif.time || '';

                    return (
                      <SwipeableNotificationItem key={notif.id} onSwipeRight={() => handleDeleteNotificationOnly(notif.id)}>
                        <TouchableOpacity 
                          activeOpacity={0.7} 
                          onPress={() => handleNotificationPress(notif)} 
                          style={[styles.notifItem, { marginBottom: 0, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }, !isRead && { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : 'rgba(79, 195, 247, 0.1)' }]}
                        >
                          <View style={[styles.notifIconWrapper, { backgroundColor: `${iconConfig.color}20` }]}><MaterialCommunityIcons name={iconConfig.name as any} size={22} color={iconConfig.color} /></View>
                          <View style={{ flex: 1, paddingLeft: 12 }}>
                            <ThemedText style={{ fontSize: 15, fontWeight: !isRead ? 'bold' : '600', color: Colors[localTheme].text }}>{notif.title}</ThemedText>
                            <ThemedText style={{ fontSize: 13, color: isDark ? '#B0BEC5' : '	#0e1425', marginTop: 4, lineHeight: 18 }}>{notif.description}</ThemedText>
                            <ThemedText style={{ fontSize: 11,  marginTop: 8, fontWeight: 'bold', color: Colors[localTheme].text }}>{displayTime}</ThemedText>
                          </View>
                          {!isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4FC3F7', alignSelf: 'center', marginLeft: 8 }} />}
                        </TouchableOpacity>
                      </SwipeableNotificationItem>
                    );
                  })
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                    <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors[localTheme].text} />
                    <ThemedText style={{ marginTop: 15, fontWeight: 'bold', color: Colors[localTheme].text }}>{t.headertab.labelnotification}</ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 5 },
  avatarContainer: { width: 55, height: 55, borderRadius: 27.5, overflow: 'hidden', borderWidth: 1.5 },
  actionButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5F6D' },
  titleContainer: { width: '100%', alignItems: 'center', paddingBottom: 10 },
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifModalContent: { width: '100%', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 20, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 20 }}) },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 0, justifyContent: 'center', position: 'relative' },
  notifItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10 },
  notifIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginLeft: 4 },
  profileInput: { padding: 14, borderRadius: 14, borderWidth: 1, fontSize: 15, marginBottom: 15, width: '100%' },
  iosPickerContainer: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginTop: 5, overflow: 'hidden', marginBottom: 15 },
  iosPickerDoneButton: { alignItems: 'flex-end', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
});