import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react'; 
import { 
  View, Image, Platform, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, TextInput, Alert, useWindowDimensions, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 

import { Colors } from '../../constants/Colors';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter, usePathname } from 'expo-router'; 
import { setUserMetadata, useMockDispatch, useMockSelector } from '../../redux/slices'; 
import { setLanguage } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation'; 
import { useAppTheme } from '@/app/src/context/ThemeContext'; 

const API_BASE_URL = 'http://192.168.1.201:3000';
const API_NOTIFICATIONS_URL = `${API_BASE_URL}/notifications`;
const API_USERS_URL = `${API_BASE_URL}/auth/profile`; 
const API_REGISTER_URL = `${API_BASE_URL}/auth/register`; 
const API_UPLOAD_URL = `${API_BASE_URL}/api/subir-imagen-optimizada/users`; 

// 🚀 ID TEMPORAL MIENTRAS SE IMPLEMENTA EL LOGIN REAL
const TEMP_USER_ID = 'baeb641a-3fa4-4fef-9846-d75947d1bca9';

export default function Header({ title }: { title?: string }) {
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

  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  


  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [activeProfileRole, setActiveProfileRole] = useState('Admin'); 

  const [profileData, setProfileData] = useState({
    email: '',
    name: '',
    last_name: '',
    phone: '',
    zip: '',
    birth: '',
    typeDetail: '',
    password: '', // 🚀 NUEVO: Campo Password
    image_url: null as string | null,
    new_image_uri: null as string | null,
  });

  const isSuperAdmin = userMetadata?.role === 'SAdmin' || profileData.typeDetail === 'SAdmin';

  const [notifications, setNotifications] = useState<any[]>([]);
  
  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  // 🚀 Cargar datos del usuario actual
  const fetchUserData = async () => {
    try {
      const res = await fetch(`${API_USERS_URL}/${TEMP_USER_ID}`);
      if (res.ok) {
        const userData = await res.json();
        if (userData && !userData.error) {
          setProfileData(prev => ({
            ...prev,
            email: userData.email || '',
            name: userData.name || '',
            last_name: userData.lastName || userData.last_name || '',
            phone: userData.phone || '',
            zip: userData.zip || '',
            birth: userData.birth ? new Date(userData.birth).toISOString().split('T')[0] : '',
            typeDetail: userData.typeDetail || '',
            image_url: userData.imageUrl || userData.image_url || null,
            password: '', // No cargamos el password por seguridad
            new_image_uri: null,
          }));
        }
      }
    } catch (error) { console.error("Error al obtener datos:", error); }
  };



  useEffect(() => {
    if (!isCreatingUser) fetchUserData();
  }, [isCreatingUser]);

  // Manejar el cambio de modo
  const toggleCreateMode = (create: boolean) => {
    setIsCreatingUser(create);
    if (create) {
      setProfileData({ email: '', name: '', last_name: '', phone: '', zip: '', birth: '', password: '', typeDetail:'', image_url: null, new_image_uri: null });
      setActiveProfileRole('User');
    }
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Calidad máxima, el backend la optimizará
    });
    if (!result.canceled) {
      setProfileData({ ...profileData, new_image_uri: result.assets[0].uri });
    }
  };

  // 🚀 LÓGICA DE GUARDADO CORREGIDA (Usa tus servicios correctamente)
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      let finalImageName = profileData.image_url;

      // 1. PASO: Si hay foto nueva, la subimos a tu endpoint optimizado
      if (profileData.new_image_uri) {
        const imageFormData = new FormData();
        const filename = profileData.new_image_uri.split('/').pop() || 'upload.jpg';
        
        imageFormData.append('imagen', {
          uri: profileData.new_image_uri,
          name: filename,
          type: 'image/jpeg', 
        } as any);

        const uploadRes = await fetch(API_UPLOAD_URL, {
          method: 'POST',
          body: imageFormData,
        });

        if (!uploadRes.ok) throw new Error("Error al subir la imagen al servidor");
        const uploadData = await uploadRes.json();
        
        // Obtenemos el nombre final (ej: users/img-123.webp)
        
        //finalImageName = uploadData.identificadorArchivo; 
        finalImageName = uploadData.identificadorArchivo.split('/').pop();
      }

      // 2. PASO: Enviamos los datos como JSON al AuthController
      const payload = {
        data: {
          email: profileData.email,
          name: profileData.name,
          lastName: profileData.last_name,
          phone: profileData.phone,
          zip: profileData.zip,
          birth: profileData.birth,
          typeDetail: activeProfileRole,
          ...(profileData.password ? { password: profileData.password } : {}) // Solo si escribió algo
        },
        newImageUri: profileData.new_image_uri ? finalImageName : null  // Enviamos el STRING de Supabase
      };

      const endpoint = isCreatingUser ? API_REGISTER_URL : `${API_USERS_URL}/${TEMP_USER_ID}`;
      const method = isCreatingUser ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error en el servidor");
      }
      
      Alert.alert("Éxito", isCreatingUser ? "Usuario creado correctamente" : "Perfil actualizado correctamente");
      setSettingsModalVisible(false);
      if (isCreatingUser) toggleCreateMode(false); // Volver al modo perfil
      
    } catch (error: any) {
      console.error("Error:", error);
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
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: Colors[localTheme].text }}>{t.welcome}</ThemedText>
              {isSuperAdmin && (
                 <ThemedText style={{ fontSize: 11, color: '#FF5F6D', fontWeight: 'bold' }}>SAdmin Panel</ThemedText>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(true)} activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons size={22} color={Colors[localTheme].text} name="cog" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <Modal visible={settingsModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !isSavingProfile && setSettingsModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={[styles.notifModalContent, { backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', paddingBottom: Math.max(insets.bottom, 25), width: isWeb && width > 768 ? 500 : '100%', maxHeight: '92%' }]}>
              {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

              <View style={styles.notifHeader}>
                <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors[localTheme].text} />
                </TouchableOpacity>
                <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: Colors[localTheme].text }}>{isCreatingUser ? 'Crear Usuario' : 'Configuración'}</ThemedText>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isWeb ? 150 : 30 }}>
                
                {/* Selector de Modo (Solo SuperAdmin) */}
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

                {/* Rol de Usuario */}
                {isSuperAdmin && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="shield-account" size={22} color="#FF5F6D" style={{ marginRight: 10 }} />
                      <ThemedText style={{ fontSize: 15, fontWeight: '600', color: Colors[localTheme].text }}>Rol Asignado</ThemedText>
                    </View>
                    <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)', borderRadius: 20, padding: 4 }}>
                      <TouchableOpacity onPress={() => setActiveProfileRole('Admin')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: activeProfileRole === 'Admin' ? (isDark ? '#333' : '#FFF') : 'transparent' }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: activeProfileRole === 'Admin' ? 'bold' : '600', color: activeProfileRole === 'Admin' ? '#FF5F6D' : '#888' }}>Admin</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setActiveProfileRole('User')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: activeProfileRole === 'User' ? (isDark ? '#333' : '#FFF') : 'transparent' }}>
                        <ThemedText style={{ fontSize: 13, fontWeight: activeProfileRole === 'User' ? 'bold' : '600', color: activeProfileRole === 'User' ? Colors[localTheme].tint : '#888' }}>Usuario</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text, marginBottom: 10, fontSize: 16 }]}>Información Personal</ThemedText>
                
                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Correo Electrónico</ThemedText>
                <TextInput value={profileData.email} onChangeText={(val) => setProfileData({...profileData, email: val})} editable={isCreatingUser} keyboardType="email-address" autoCapitalize="none" style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Nombre</ThemedText>
                    <TextInput value={profileData.name} onChangeText={(val) => setProfileData({...profileData, name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Apellido</ThemedText>
                    <TextInput value={profileData.last_name} onChangeText={(val) => setProfileData({...profileData, last_name: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                </View>

                {/* 🚀 CAMPO DE PASSWORD: Se muestra al crear, o si SAdmin quiere actualizarlo */}
                <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>{isCreatingUser ? "Contraseña" : "Nueva Contraseña (Opcional)"}</ThemedText>
                <TextInput 
                  value={profileData.password} 
                  onChangeText={(val) => setProfileData({...profileData, password: val})} 
                  secureTextEntry={true}
                  placeholder="********"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} 
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Teléfono</ThemedText>
                    <TextInput value={profileData.phone} keyboardType="phone-pad" onChangeText={(val) => setProfileData({...profileData, phone: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Zip Code</ThemedText>
                    <TextInput value={profileData.zip} keyboardType="numeric" maxLength={5} onChangeText={(val) => setProfileData({...profileData, zip: val})} style={[styles.profileInput, { color: Colors[localTheme].text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                  </View>
                </View>

                <View style={{ width: '100%', marginBottom: 15 }}>
                  <ThemedText style={[styles.inputLabel, { color: Colors[localTheme].text }]}>Nacimiento</ThemedText>
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

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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
  notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 0, justifyContent: 'space-between' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginLeft: 4 },
  profileInput: { padding: 14, borderRadius: 14, borderWidth: 1, fontSize: 15, marginBottom: 15, width: '100%' },
  iosPickerContainer: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginTop: 5, overflow: 'hidden', marginBottom: 15 },
  iosPickerDoneButton: { alignItems: 'flex-end', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
});