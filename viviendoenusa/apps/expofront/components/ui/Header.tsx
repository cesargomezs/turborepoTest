import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react'; 
import { 
  View, Image, Platform, TouchableOpacity, Modal, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, TextInput, Alert, useWindowDimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 
import { Colors } from '../../constants/Colors';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';

// --- IMPORTACIONES DE ENRUTAMIENTO Y REDUX ---
import { useRouter, usePathname } from 'expo-router'; 
import { useMockDispatch, useMockSelector } from '../../redux/slices'; 
import { setLanguage } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation'; 

// 🚀 IMPORTAMOS EL CONTEXTO GLOBAL (ESTO HACE LA MAGIA EN TIEMPO REAL)
import { useAppTheme } from '../../app/src/context/ThemeContext';

const API_NOTIFICATIONS_URL = 'http://192.168.1.201:3000/notifications';
const API_USERS_URL = 'http://192.168.1.201:3000/users'; 

export default function Header({ title }: { title?: string }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const router = useRouter(); 
  const pathname = usePathname(); 
  const dispatch = useMockDispatch();
  
  const { t } = useTranslation();
  const selectedLanguage = useMockSelector((state: any) => state.language.code);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // 🚀 NOS CONECTAMOS AL CEREBRO CENTRAL (Eliminamos el estado local aislado)
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const isWeb = Platform.OS === 'web';

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    email: userMetadata?.email || 'usuario@correo.com',
    name: userMetadata?.name || '',
    last_name: userMetadata?.last_name || '',
    phone: userMetadata?.phone || '',
    zip: userMetadata?.zip || '',
    estate: userMetadata?.estate || '',
    birth: userMetadata?.birth ? new Date(userMetadata.birth).toISOString().split('T')[0] : '',
    image_url: userMetadata?.image_url || null,
    new_image_uri: null as string | null
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  
  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  useEffect(() => {
    if (isWeb && typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  }, [pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(API_NOTIFICATIONS_URL);
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (error) { console.error("Error al cargar notificaciones:", error); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(), 60000); 
    return () => clearInterval(interval);
  }, []);

  const hasUnread = notifications.some(n => !n.read);

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
    try { await fetch(`${API_NOTIFICATIONS_URL}/${notif.id}`, { method: 'DELETE' }); } catch (error) {}

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

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfileData({ ...profileData, new_image_uri: result.assets[0].uri });
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const payload = {
        name: profileData.name, last_name: profileData.last_name, phone: profileData.phone,
        zip: profileData.zip, estate: profileData.estate, birth: profileData.birth,
      };
      const res = await fetch(`${API_USERS_URL}/${userMetadata?.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error al actualizar");
      Platform.OS === 'web' ? window.alert("Perfil actualizado correctamente") : Alert.alert("Éxito", "Perfil actualizado correctamente");
      setProfileModalVisible(false);
    } catch (error) {
      Platform.OS === 'web' ? window.alert("No se pudo actualizar el perfil") : Alert.alert("Error", "No se pudo actualizar el perfil");
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
            <TouchableOpacity activeOpacity={0.8} onPress={() => setProfileModalVisible(true)} style={[styles.avatarContainer, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
              <Image source={currentDisplayImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}><ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: Colors[localTheme].text }}>{t.welcome}</ThemedText></View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { fetchNotifications(); setNotifModalVisible(true); }} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', position: 'relative' }]}>
              <MaterialCommunityIcons size={22} color={Colors[localTheme].text} name={hasUnread ? "bell-ring" : "bell-outline"} />
              {hasUnread && <View style={styles.unreadBadge} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLangModalVisible(true)} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons size={22} color={Colors[localTheme].text} name="translate" />
            </TouchableOpacity>
          </View>
        </View>
        {!isWeb && (
          <View style={styles.titleContainer}>
            <ThemedText className="text-center text-2xl" style={{ color: Colors[localTheme].tabIconDefault , fontWeight: 'bold' }}>{title}</ThemedText>
          </View>
        )}
      </BlurView>

      {/* --- MODAL DE IDIOMA --- */}
      <Modal animationType="fade" transparent={true} visible={langModalVisible} onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangModalVisible(false)}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
            <ThemedText style={styles.modalTitle}>{t.select_lang}</ThemedText>
            <View style={styles.optionsWrapper}>
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <TouchableOpacity key={lang.code} style={[styles.langOption, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]} onPress={() => { dispatch(setLanguage(lang.code)); setLangModalVisible(false); }}>
                    <ThemedText style={[styles.langText, isSelected && { color: Colors[localTheme].tint, fontWeight: 'bold' }]}>{lang.label}</ThemedText>
                    {isSelected && <MaterialCommunityIcons name="check" size={22} color={Colors[localTheme].tint} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </Pressable>
      </Modal>

      {/* --- MODAL DE EDICIÓN DE PERFIL Y AJUSTES --- */}
      <Modal visible={profileModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setProfileModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !isSavingProfile && setProfileModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={[styles.notifModalContent, { backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', paddingBottom: Math.max(insets.bottom, 25), width: isWeb && width > 768 ? 500 : '100%', maxHeight: '92%' }]}>
              {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

              <View style={styles.notifHeader}>
                <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors[localTheme].text} />
                </TouchableOpacity>
                <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: Colors[localTheme].text }}>Mi Perfil</ThemedText>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8} style={{ position: 'relative' }}>
                    <View style={{ width: 110, height: 110, borderRadius: 55, overflow: 'hidden', borderWidth: 2, borderColor: Colors[localTheme].tint }}>
                      <Image source={currentDisplayImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors[localTheme].tint, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: isDark ? '#1E1E1E' : '#FFF' }}>
                      <MaterialCommunityIcons name="camera-plus" size={16} color={isDark ? '#888' : '#fff'} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 🚀 ESTOS BOTONES AHORA LE AVISAN A TODA LA APP EN TIEMPO REAL */}
                <View style={{ marginBottom: 25, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="theme-light-dark" size={24} color={Colors[localTheme].text} style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>Apariencia</ThemedText>
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
                </View>

                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Correo Electrónico</ThemedText>
                <View style={[styles.profileInput, { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <MaterialCommunityIcons name="email-lock" size={20} color={isDark ? '#888' : '#AAA'} style={{ marginRight: 10 }} />
                  <TextInput value={profileData.email} editable={false} style={{ flex: 1, color: isDark ? '#888' : '#AAA', fontSize: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Nombre</ThemedText>
                    <TextInput value={profileData.name} onChangeText={(val) => setProfileData({...profileData, name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Apellido</ThemedText>
                    <TextInput value={profileData.last_name} onChangeText={(val) => setProfileData({...profileData, last_name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Teléfono</ThemedText>
                    <TextInput value={profileData.phone} keyboardType="phone-pad" onChangeText={(val) => setProfileData({...profileData, phone: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Zip Code</ThemedText>
                    <TextInput value={profileData.zip} keyboardType="numeric" maxLength={5} onChangeText={(val) => setProfileData({...profileData, zip: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Estado</ThemedText>
                    <TextInput value={profileData.estate} onChangeText={(val) => setProfileData({...profileData, estate: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Nacimiento</ThemedText>
                    <TextInput value={profileData.birth} placeholder="YYYY-MM-DD" placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} onChangeText={(val) => setProfileData({...profileData, birth: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                  </View>
                </View>

                <TouchableOpacity disabled={isSavingProfile} onPress={handleSaveProfile} style={{ marginTop: 5, borderRadius: 16, overflow: 'hidden' }}>
                  <LinearGradient colors={['#FF5F6D', '#FFC371']} style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{isSavingProfile ? "Guardando..." : "Guardar Cambios"}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- MODAL DE NOTIFICACIONES --- */}
      <Modal animationType="slide" transparent={true} visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setNotifModalVisible(false)} />
          <View style={[styles.notifModalContent, { backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', paddingBottom: Math.max(insets.bottom, 25) }]}>
            {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

            <View style={styles.notifHeader}>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                <MaterialCommunityIcons name="close" size={28} color={Colors[localTheme].text} />
              </TouchableOpacity>
              <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: Colors[localTheme].text }}>Notificaciones</ThemedText>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  const iconConfig = getNotificationIcon(notif.type);
                  return (
                    <TouchableOpacity key={notif.id} activeOpacity={0.7} onPress={() => handleNotificationPress(notif)} style={[styles.notifItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }, !notif.read && { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : 'rgba(79, 195, 247, 0.1)' }]}>
                      <View style={[styles.notifIconWrapper, { backgroundColor: `${iconConfig.color}20` }]}><MaterialCommunityIcons name={iconConfig.name as any} size={22} color={iconConfig.color} /></View>
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: !notif.read ? 'bold' : '600', color: Colors[localTheme].text }}>{notif.title}</ThemedText>
                        <ThemedText style={{ fontSize: 13, color: isDark ? '#B0BEC5' : '#546E7A', marginTop: 4, lineHeight: 18 }}>{notif.description}</ThemedText>
                        <ThemedText style={{ fontSize: 11,  marginTop: 8, fontWeight: 'bold', color: Colors[localTheme].text }}>{notif.time}</ThemedText>
                      </View>
                      {!notif.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4FC3F7', alignSelf: 'center', marginLeft: 8 }} />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                  <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors[localTheme].text} />
                  <ThemedText style={{ marginTop: 15, fontWeight: 'bold', color: Colors[localTheme].text }}>No tienes notificaciones nuevas</ThemedText>
                </View>
              )}
            </ScrollView>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '75%', borderRadius: 28, overflow: 'hidden', paddingVertical: 20, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 }, android: { elevation: 10 }}) },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, textAlign: 'center', opacity: 0.8 },
  optionsWrapper: { paddingHorizontal: 10 },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, borderRadius: 16, marginVertical: 2 },
  langText: { fontSize: 16 },
  notifModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  notifModalContent: { width: '100%', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 20, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 20 }}) },
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 0, justifyContent: 'space-between' },
  notifItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10 },
  notifIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginLeft: 4 },
  profileInput: { padding: 14, borderRadius: 14, borderWidth: 1, fontSize: 15, marginBottom: 15, width: '100%' }
});