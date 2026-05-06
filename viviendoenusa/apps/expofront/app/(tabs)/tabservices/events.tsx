import React, { useState, useMemo, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, ActivityIndicator, Share, Linking,
  Modal as RNModal, KeyboardAvoidingView, ColorValue
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
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

let BANNED_WORDS: string[] = [];
try {
  BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : [];
} catch (e) {
  console.error("Error cargando badwords.json:", e);
}

const isTextInappropriate = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const CATEGORIES = [
  { id: 'Todos', icon: 'calendar-range' },
  { id: 'Social', icon: 'account-group' },
  { id: 'Salud', icon: 'heart-pulse' },
  { id: 'Educación', icon: 'school' },
  { id: 'Deportes', icon: 'basketball' },
  
];

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

export default function EventsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const stylesUnified = useUnifiedCardStyles();
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';
  
  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'];
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  // COLORES UNIFICADOS BASE TIENDAS
  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : width * 0.92);
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : height * 0.69);
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  // --- ESTADOS ---
  const [events, setEvents] = useState([
    { 
      id: 1, 
      title: 'Feria de Salud Rancho', 
      category: 'Salud', 
      date: '15 May', 
      time: '10:00 AM', 
      timeEnd: '02:00 PM', 
      description: 'Atención médica gratuita para toda la comunidad local.', 
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800', 
      location: 'Rancho Cucamonga Park',
      zip: '91730',
      phone: '+1909000000',
      contactMethod: 'whatsapp',
      approved: true 
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);

  // --- ESTADOS FORMULARIO Y ADMIN ---
  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Social');
  const [formLocation, setFormLocation] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formTimeEnd, setFormTimeEnd] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);

  // Estados Admin
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Validación de formulario estricta
  const isFormValid = !!(formTitle.trim() && formLocation.trim() && formZip.trim() && formPhone.trim() && formImage);

  // --- BOTÓN AUTOAJUSTABLE BASE TIENDAS ---
  const ActionBtn = ({ icon, text, color, bgColor, onPress, minWidth = 100 }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flexGrow: 1, minWidth: minWidth, height: 42, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8, marginRight: 8 }}>
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

  // Auxiliares Web
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
        return triggerAlert("Atención", "Título, ubicación, ZIP Code, teléfono e imagen son obligatorios.");
    }

    if (isTextInappropriate(trimmedTitle) || isTextInappropriate(trimmedDesc) || isTextInappropriate(trimmedLoc)) {
      triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return; 
    }

    setIsPublishing(true);
    try {
      const esSegura = await validarImagenEnServidor(formImage);
      if (!esSegura) {
        setIsPublishing(false);
        triggerAlert(t.communitytab.imageInappropriateTittle, t.communitytab.imageInappropriateDescription);
        return;
      }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';

      const newEvent = { 
        id: Date.now(), title: trimmedTitle, category: formCategory, 
        date: formDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        time: formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        timeEnd: formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        description: trimmedDesc, image: formImage, location: trimmedLoc,
        zip: trimmedZip, phone: fullPhone, contactMethod: formContactMethod,
        approved: false 
      };

      setPendingEvents(prev => [newEvent, ...prev]);
      setModalVisible(false);
      resetForm();
      
      triggerAlert("¡Recibido!", "Tu evento ha sido enviado. Aparecerá en la lista una vez sea aprobado por el administrador.");
      
    } catch (err) {
      triggerAlert("Error", t.communitytab.errorServer);
    } finally {
      setIsPublishing(false);
    }
  };

  const approveEvent = (event: any) => {
    const approvedEvent = { ...event, approved: true };
    setEvents(prev => [approvedEvent, ...prev]);
    setPendingEvents(pendingEvents.filter(e => e.id !== event.id));
    triggerAlert("Aprobado", "El evento se ha publicado en la cartelera.");
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormImage(null); setFormLocation(''); setFormZip('');
    setFormPhone(''); setCountryIdx(0); setFormContactMethod('whatsapp');
    setFormDate(new Date()); setFormTime(new Date()); setFormTimeEnd(new Date());
  };

  const filteredEvents = useMemo(() => 
    events.filter(item => 
      item.approved === true && 
      (selectedCategory === 'Todos' || item.category === selectedCategory) && 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), 
  [events, selectedCategory, searchQuery]);

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }}>  
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 20 }]}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                {/* MANTENER PRESIONADO PARA ENTRAR A MODO ADMINISTRADOR */}
                <TouchableOpacity onLongPress={() => setIsAdminMode(!isAdminMode)}>
                  <MaterialCommunityIcons name="calendar-star" size={40} color={isAdminMode ? Colors.accent : Colors.accenticon} style={{opacity: isAdminMode ? 1 : 0.2}}/>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                
                {/* SIDEBAR WEB */}
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: Colors.text }]}>{t.eventstab.filter}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.id;
                        return (
                          <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{cat.id}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: Colors.inputBg }}>
                                <MaterialCommunityIcons name={cat.icon as any} size={18} color={Colors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: Colors.text, fontWeight: '600', fontSize: 14 }}>{cat.id}</ThemedText>
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
                  
                  {/* CAJA DE APROBACIÓN ADMIN */}
                  {isAdminMode && pendingEvents.length > 0 && (
                    <View style={{ backgroundColor: 'rgba(255,255,0,0.1)', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#FFD700' }}>
                      <ThemedText style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 10 }}>REVISIÓN ({pendingEvents.length})</ThemedText>
                      {pendingEvents.map(ev => (
                        <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <View style={{flex:1}}><ThemedText style={{ fontSize: 13, fontWeight:'bold', color: Colors.text }}>{ev.title}</ThemedText></View>
                          <TouchableOpacity onPress={() => approveEvent(ev)}><MaterialCommunityIcons name="check-circle" size={24} color="green" /></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 15, paddingHorizontal: 16, height: 48 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={Colors.iconInactive} style={{ marginRight: 10 }} />
                    <TextInput style={{ flex: 1, color: Colors.text, fontSize: 15, height: '100%', fontWeight: '600' }} placeholder="Buscar eventos..." placeholderTextColor={Colors.iconInactive} value={searchQuery} onChangeText={setSearchQuery} />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}><MaterialCommunityIcons name="close-circle" size={20} color={Colors.iconInactive} /></TouchableOpacity>
                    )}
                  </View>
                  
                  {/* FILTROS MÓVILES */}
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 15 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        {CATEGORIES.map((cat) => {
                          const isActive = selectedCategory === cat.id;
                          return (
                            <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                              {isActive ? (
                                <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                  <MaterialCommunityIcons name={cat.icon as any} size={15} color="#FFF" style={{ marginRight: 6 }} />
                                  <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText>
                                </LinearGradient>
                              ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: Colors.categoryUnselected }}>
                                  <MaterialCommunityIcons name={cat.icon as any} size={15} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                  <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {filteredEvents.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="calendar-remove" size={56} color={Colors.subtext} />
                          <ThemedText style={{ color: Colors.subtext, marginTop: 14, fontWeight: '700', fontSize: 14 }}>No hay eventos disponibles</ThemedText>
                        </View>
                      ) : (
                        filteredEvents.map(item => (
                          <EventCard key={item.id} item={item} isLargeWeb={isLargeWeb} isDark={isDark} Colors={Colors} orangeGradient={orangeGradient} onOpen={(it: any) => setSelectedEventDetails(it)} ActionBtn={ActionBtn} />
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

      {/* FAB - BOTÓN UNIVERSAL DE CREAR EVENTO */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}><LinearGradient colors={orangeGradient} style={{ flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}><MaterialCommunityIcons name="calendar-plus" size={28} color="#fff" /></LinearGradient></TouchableOpacity>

      {/* MODAL CREAR EVENTO (FORMULARIO UNIFICADO TIPO TIENDAS) */}
      <RNModal visible={isModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isPublishing}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: Colors.text }}>{t.eventstab.botonEvent}</ThemedText>
                <View style={{ width: 24 }} />
              </View>
              
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                
                {/* IMAGEN */}
                <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: Colors.border, backgroundColor: Colors.inputBg }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={{alignItems:'center'}}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight:'800', fontSize:11, marginTop:8}}>{t.eventstab.photoEvent}</ThemedText></View>}
                </TouchableOpacity>

                {/* CATEGORÍA */}
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 }}>{t.eventstab.typeEvent}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20, paddingBottom: 6 }}>
                  {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => {
                    const isActive = formCategory === cat.id;
                    return (
                      <TouchableOpacity key={cat.id} onPress={() => setFormCategory(cat.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={cat.icon as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'capitalize' }}>{cat.id}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                            <MaterialCommunityIcons name={cat.icon as any} size={14} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600' }}>{cat.id.toUpperCase()}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                
                {/* FECHA */}
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 }}>{t.eventstab.dateEvent}</ThemedText>
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
                    {isIOS && <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border }}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>{t.eventstab.readyBtn || "Hecho"}</ThemedText></TouchableOpacity>}
                  </View>
                )}

                {/* TIEMPO (HORAS) */}
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 }}>{t.eventstab.timeEvent}</ThemedText>
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

                {/* TEXTOS Y LOCALIZACIÓN */}
                <ThemedText style={{ fontSize: 12, fontWeight: '900',  marginBottom: 8, textTransform:'capitalize' }}>{t.eventstab.informationevent}</ThemedText>
                <TextInput value={formTitle} onChangeText={setFormTitle} placeholder={t.eventstab.nameEvent} style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontSize: 15, fontWeight: '600', borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15 }} />
                <TextInput value={formLocation} onChangeText={setFormLocation} placeholder={t.eventstab.addressEvent}  style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontSize: 15, fontWeight: '600', color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15 }} />
                <TextInput value={formZip} onChangeText={setFormZip} placeholder="ZIP Code" keyboardType="numeric" maxLength={5} style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontSize: 15, fontWeight: '600', color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, marginBottom: 15 }} />
                <TextInput value={formDescription} onChangeText={setFormDescription} placeholder={t.eventstab.detailsEvent} multiline style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontSize: 15, fontWeight: '600', color: Colors.text, borderColor: Colors.border, backgroundColor: Colors.inputBg, height: 90, textAlignVertical:'top', marginBottom: 15 }} />
                
                {/* MÉTODO DE CONTACTO Y PREFIJO UNIFICADO */}
                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 ,textTransform:'capitalize'}}>{t.eventstab.typeContact}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : Colors.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : Colors.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : Colors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : Colors.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? '#FF5F6D' : Colors.border, backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : Colors.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? '#FF5F6D' : Colors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'phone' ? '#FF5F6D' : Colors.subtext }}>{t.eventstab.call}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: Colors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: Colors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: Colors.text, padding: 15, fontSize: 14, fontWeight: '600' }} />
                </View>

                {/* BOTÓN GUARDAR DINÁMICO */}
                <TouchableOpacity onPress={handlePublishEvent} disabled={!isFormValid || isPublishing} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <>
                      <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                      <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{t.eventstab.createEvent}</ThemedText>
                    </>}
                  </LinearGradient>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* MODAL DETALLE EXPANDIDO */}
      <RNModal visible={!!selectedEventDetails} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedEventDetails(null)} />
          <View style={{ width: '92%', height: '80%', borderRadius: 35, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240, backgroundColor: 'transparent' }}>
               <Image source={{ uri: selectedEventDetails?.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={{ position: 'absolute', width: '100%', height: 80 }} />
            </View>
            <TouchableOpacity onPress={() => setSelectedEventDetails(null)} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 6, zIndex: 10 }}><MaterialCommunityIcons name="close" size={24} color="#FFF" /></TouchableOpacity>
            
            <ScrollView style={{ padding: 25 }}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 }}><ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>{selectedEventDetails?.category}</ThemedText></LinearGradient>
                <ThemedText style={{marginLeft:10, fontWeight:'700', color:Colors.subtext}}>{selectedEventDetails?.date}</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 26, fontWeight: '900', marginBottom: 15, color: Colors.text }}>{selectedEventDetails?.title}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.time} - {selectedEventDetails?.timeEnd}</ThemedText></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><MaterialCommunityIcons name="map-marker" size={20} color={Colors.accent} /><ThemedText style={{ fontSize: 15, fontWeight: '700', marginLeft: 10, color: Colors.text }}>{selectedEventDetails?.location}</ThemedText></View>
              <View style={{height:1, backgroundColor:Colors.border, marginVertical:20}} />
              <ThemedText style={{color:Colors.text, lineHeight:22, fontSize:15}}>{selectedEventDetails?.description}</ThemedText>
              
              {/* BOTONES ACCIÓN DETALLE */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 25 }}>
                {selectedEventDetails?.phone && (
                  <ActionBtn 
                    minWidth={130}
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
                <ActionBtn minWidth={130} onPress={() => handleShare(selectedEventDetails)} icon="share-variant" text="Compartir" color={isDark ? '#4FC3F7' : '#1976D2'} bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} />
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

const EventCard = memo(({ item, isLargeWeb, isDark, Colors, orangeGradient, onOpen, ActionBtn }: any) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onOpen(item)} style={{ borderWidth: 1, marginBottom: 20, overflow: 'hidden', width: isLargeWeb ? '48.5%' : '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: Colors.border, borderRadius: 28 }}>
    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
      <LinearGradient colors={orangeGradient} style={{ width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}><MaterialCommunityIcons name="calendar-check" size={14} color="#FFF" /></LinearGradient>
      <ThemedText style={{ marginLeft: 10, fontSize: 13, fontWeight: '800', flex: 1, color: Colors.text }}>{item.date}</ThemedText>
      <View style={{ backgroundColor: 'rgba(255,95,109,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}><ThemedText style={{ fontSize: 9, color: '#FF5F6D', fontWeight: '900' }}>{item.category.toUpperCase()}</ThemedText></View>
    </View>
    <View style={{ width: '100%', height: 180, backgroundColor: 'transparent' }}>
       <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
    <View style={{ padding: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)' }}>
      <ThemedText style={{ fontSize: 17, fontWeight: '800', color: Colors.text }} numberOfLines={1}>{item.title}</ThemedText>
      <ThemedText style={{ color: Colors.subtext, fontSize: 13, marginTop: 4, marginBottom: 8 }} numberOfLines={2}>{item.description}</ThemedText>
      <View style={{ marginTop: 4 }}>
        <View style={{flexDirection:'row', alignItems:'center', marginBottom:4}}><MaterialCommunityIcons name="clock-outline" size={14} color={Colors.accent} /><ThemedText style={{ fontSize: 12, marginLeft: 8, fontWeight: '700', color: Colors.text }}>{item.time} - {item.timeEnd}</ThemedText></View>
        <View style={{flexDirection:'row', alignItems:'center'}}><MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.accent} /><ThemedText style={{ fontSize: 12, marginLeft: 8, fontWeight: '700', color: Colors.subtext }} numberOfLines={1}>{item.location}</ThemedText></View>
      </View>

      {/* BOTONES DE CONTACTO EN LA TARJETA */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
        {item.phone && (
          <ActionBtn 
            minWidth={100}
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
        <ActionBtn minWidth={100} onPress={(e: any) => { e.stopPropagation?.(); Share.share({ message: item.title }) }} icon="share-variant" text="Compartir" color={isDark ? '#4FC3F7' : '#1976D2'} bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} />
      </View>

    </View>
  </TouchableOpacity>
));