import React, { useState, useMemo, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, ActivityIndicator, Share,
  Platform, Modal as RNModal, KeyboardAvoidingView
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
import { contentCardStyles as stylesOriginal } from "app/src/styles/contentcard";
import { useTranslation } from '@/hooks/useTranslation';

const CATEGORIES = [
  { id: 'Todos', icon: 'calendar-range' },
  { id: 'Salud', icon: 'heart-pulse' },
  { id: 'Educación', icon: 'school' },
  { id: 'Deportes', icon: 'basketball' },
  { id: 'Social', icon: 'account-group' },
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
  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.82)', 
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    imgPlaceholder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
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
      description: 'Atención médica gratuita, chequeos de presión arterial y vacunas para toda la comunidad local.', 
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800', 
      location: 'Rancho Cucamonga Park' 
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Social');
  const [formLocation, setFormLocation] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState(new Date());
  const [formTimeEnd, setFormTimeEnd] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimeEndPicker, setShowTimeEndPicker] = useState(false);

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

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `¡Mira este evento en ViviendoenUSA! 🇺🇸\n\n📌 ${event.title}\n📅 ${event.date}\n⏰ ${event.time}\n📍 ${event.location}`,
      });
    } catch (error) { console.log(error); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Necesitamos acceso a tu galería.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 1 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishEvent = () => {
    if (!formImage || !formTitle || !formLocation) return Alert.alert("Atención", "Título, ubicación e imagen son obligatorios.");
    setIsPublishing(true);
    setTimeout(() => {
      const newEvent = { 
        id: Date.now(), title: formTitle, category: formCategory, 
        date: formDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        time: formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        timeEnd: formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(), 
        description: formDescription, image: formImage, location: formLocation 
      };
      setEvents(prev => [newEvent, ...prev]);
      setIsPublishing(false);
      setModalVisible(false);
      resetForm();
    }, 1500);
  };

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormImage(null); setFormLocation(''); setFormDate(new Date()); setFormTime(new Date()); setFormTimeEnd(new Date());
  };

  const filteredEvents = useMemo(() => events.filter(item => (selectedCategory === 'Todos' || item.category === selectedCategory) && item.title.toLowerCase().includes(searchQuery.toLowerCase())), [events, selectedCategory, searchQuery]);

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={[stylesOriginal.cardWrapper, { width: cardWidth, height: cardHeight, borderRadius: 32, overflow: 'hidden', backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }]}>
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 20 }]}>
                <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                <MaterialCommunityIcons name="calendar-star" size={32} color={Colors.accent} style={{opacity: 0.2}}/>
              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: Colors.text }]}>{t.eventstab.filter}</ThemedText>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={[styles.sidebarBtn, { backgroundColor: selectedCategory === cat.id ? 'transparent' : Colors.inputBg, borderColor: Colors.border }]}>
                        {selectedCategory === cat.id && <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />}
                        <MaterialCommunityIcons name={cat.icon as any} size={18} color={selectedCategory === cat.id ? '#fff' : Colors.text} style={{zIndex: 1}} />
                        <ThemedText style={{ fontSize: 13, fontWeight: '800', color: selectedCategory === cat.id ? '#fff' : Colors.text, marginLeft: 10, zIndex: 1 }}>{cat.id}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  <TextInput style={[styles.searchBar, { backgroundColor: Colors.inputBg, color: Colors.text, borderColor: Colors.border }]} placeholder="Buscar eventos..." placeholderTextColor={Colors.subtext} value={searchQuery} onChangeText={setSearchQuery} />
                  
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 20 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {CATEGORIES.map((cat) => (
                          <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={[styles.mobileCatBtn, { borderColor: Colors.border, backgroundColor: selectedCategory === cat.id ? 'transparent' : Colors.inputBg }]}>
                            {selectedCategory === cat.id ? (
                              <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.mobileCatGradient}><MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" /><ThemedText style={styles.mobileCatTextActive}>{cat.id}</ThemedText></LinearGradient>
                            ) : (
                              <View style={styles.mobileCatGradient}><MaterialCommunityIcons name={cat.icon as any} size={16} color={Colors.text} /><ThemedText style={[styles.mobileCatText, { color: Colors.text }]}>{cat.id}</ThemedText></View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {filteredEvents.map(item => (
                        <EventCard key={item.id} item={item} isLargeWeb={isLargeWeb} isDark={isDark} Colors={Colors} orangeGradient={orangeGradient} onOpen={(it: any) => setSelectedEventDetails(it)} />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85 }]}><LinearGradient colors={orangeGradient} style={styles.fabGradient}><MaterialCommunityIcons name="calendar-plus" size={28} color="#fff" /></LinearGradient></TouchableOpacity>

      {/* MODAL CREAR EVENTO - FIXED FOR ANDROID KEYBOARD AND WEB PICKERS */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView 
             behavior={isIOS ? "padding" : "height"} 
             style={{ width: isLargeWeb ? 550 : '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: height * 0.9, borderColor: Colors.border }]}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 17, fontWeight: '900', color: Colors.text }}>{t.eventstab.botonEvent}</ThemedText>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView 
                style={{ paddingHorizontal: 20 }} 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: isAndroid ? 250 : 60 }} 
              >
                
                <TouchableOpacity onPress={pickImage} style={[styles.imageUpload, { borderColor: Colors.border, backgroundColor: 'transparent' }]}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={{alignItems:'center'}}><MaterialCommunityIcons name="camera-plus" size={30} color={Colors.accent} /><ThemedText style={{color: Colors.accent, fontWeight:'800', fontSize:13, marginTop:5}}>{t.eventstab.photoEvent}</ThemedText></View>}
                </TouchableOpacity>

                <ThemedText style={styles.label}>{t.eventstab.typeEvent}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                  {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => setFormCategory(cat.id)} style={[styles.catPick, { borderColor: formCategory === cat.id ? Colors.accent : Colors.border, backgroundColor: formCategory === cat.id ? Colors.accent : 'rgba(128,128,128,0.08)' }]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={14} color={formCategory === cat.id ? '#fff' : Colors.text} />
                      <ThemedText style={{ fontSize: 11, fontWeight: '800', color: formCategory === cat.id ? '#fff' : Colors.text, marginLeft: 5 }}>{cat.id.toUpperCase()}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <ThemedText style={styles.label}>{t.eventstab.dateEvent}</ThemedText>
                {isWeb ? (
                  <View style={styles.webPickerContainer}>
                    <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.accent} style={styles.webIcon} />
                    <View style={[styles.webVisualMock, { backgroundColor: Colors.inputBg, borderColor: Colors.border }]}>
                      <ThemedText style={{ color: Colors.text, fontWeight: '700' }}>{formDate.toLocaleDateString()}</ThemedText>
                    </View>
                    <input type="date" value={formatDateForWeb(formDate)} onChange={(e:any) => setFormDate(new Date(e.target.value))} className="native-web-input" />
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }]}>
                    <ThemedText style={{ color: Colors.text, fontWeight: '700' }}>{formDate.toLocaleDateString()}</ThemedText>
                    <MaterialCommunityIcons name="calendar-edit" size={20} color={Colors.accent} />
                  </TouchableOpacity>
                )}
                {showDatePicker && !isWeb && (
                  <View style={isIOS ? styles.pickerBox : null}>
                    <DateTimePicker value={formDate} mode="date" display={isIOS ? "spinner" : "default"} minimumDate={new Date()} onChange={onDateChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtnIOS}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>{t.eventstab.readyBtn || "Hecho"}</ThemedText></TouchableOpacity>}
                  </View>
                )}

                <ThemedText style={styles.label}>{t.eventstab.timeEvent}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  {isWeb ? (
                    <>
                      <View style={[styles.webPickerContainer, { flex: 1 }]}>
                        <View style={[styles.webVisualMock, { backgroundColor: Colors.inputBg, borderColor: Colors.border, paddingLeft: 15 }]}>
                          <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize: 12 }}>{formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        </View>
                        <input type="time" value={formatTimeForWeb(formTime)} onChange={(e:any) => handleWebTimeChange(e.target.value, 'start')} className="native-web-input" />
                      </View>
                      <View style={[styles.webPickerContainer, { flex: 1 }]}>
                        <View style={[styles.webVisualMock, { backgroundColor: Colors.inputBg, borderColor: Colors.border, paddingLeft: 15 }]}>
                          <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize: 12 }}>{formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        </View>
                        <input type="time" value={formatTimeForWeb(formTimeEnd)} onChange={(e:any) => handleWebTimeChange(e.target.value, 'end')} className="native-web-input" />
                      </View>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, { flex:1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize:12 }}>{formTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setShowTimeEndPicker(true)} style={[styles.input, { flex:1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                        <ThemedText style={{ color: Colors.text, fontWeight: '700', fontSize:12 }}>{formTimeEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</ThemedText>
                        <MaterialCommunityIcons name="clock-check" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {showTimePicker && !isWeb && (
                   <View style={isIOS ? styles.pickerBox : null}>
                    <DateTimePicker value={formTime} mode="time" display={isIOS ? "spinner" : "default"} onChange={onTimeChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.doneBtnIOS}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>Hecho</ThemedText></TouchableOpacity>}
                  </View>
                )}
                {showTimeEndPicker && !isWeb && (
                   <View style={isIOS ? styles.pickerBox : null}>
                    <DateTimePicker value={formTimeEnd} mode="time" display={isIOS ? "spinner" : "default"} onChange={onTimeEndChange} textColor={Colors.text} style={isIOS ? { height: 120 } : null} />
                    {isIOS && <TouchableOpacity onPress={() => setShowTimeEndPicker(false)} style={styles.doneBtnIOS}><ThemedText style={{ color: Colors.accent, fontWeight: '800' }}>Hecho</ThemedText></TouchableOpacity>}
                  </View>
                )}

                <TextInput value={formTitle} onChangeText={setFormTitle} placeholder={t.eventstab.nameEvent} placeholderTextColor={Colors.subtext} style={[styles.input, { color: Colors.text, borderColor: Colors.border, marginBottom: 10 }]} />
                <TextInput value={formLocation} onChangeText={setFormLocation} placeholder={t.eventstab.addressEvent} placeholderTextColor={Colors.subtext} style={[styles.input, { color: Colors.text, borderColor: Colors.border, marginBottom: 10 }]} />
                <TextInput value={formDescription} onChangeText={setFormDescription} placeholder={t.eventstab.detailsEvent} multiline style={[styles.input, { color: Colors.text, borderColor: Colors.border, height: 80, textAlignVertical:'top' }]} />
                
                <TouchableOpacity onPress={handlePublishEvent} disabled={isPublishing} style={{ marginTop: 25, marginBottom: 20, alignSelf: 'center' }}>
                  <LinearGradient colors={orangeGradient} style={styles.publishBtnSmall}>
                    {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.publishBtnText}>CREAR EVENTO</ThemedText>}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* MODAL DETALLE EXPANDIDO */}
      <RNModal visible={!!selectedEventDetails} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedEventDetails(null)} />
          <View style={[styles.detailContent, { backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: Colors.border }]}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={[styles.detailImgContainer, { backgroundColor: 'transparent' }]}>
               <Image source={{ uri: selectedEventDetails?.image }} style={styles.detailImg} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.detailImgOverlay} />
            </View>
            <TouchableOpacity onPress={() => setSelectedEventDetails(null)} style={styles.closeBtnDetail}><MaterialCommunityIcons name="close" size={24} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare(selectedEventDetails)} style={styles.shareBtnDetail}><MaterialCommunityIcons name="share-variant" size={22} color="#FFF" /></TouchableOpacity>
            <ScrollView style={{ padding: 25 }}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}>
                <LinearGradient colors={orangeGradient} style={styles.detailBadge}><ThemedText style={styles.detailBadgeText}>{selectedEventDetails?.category}</ThemedText></LinearGradient>
                <ThemedText style={{marginLeft:10, fontWeight:'700', color:Colors.subtext}}>{selectedEventDetails?.date}</ThemedText>
              </View>
              <ThemedText style={[styles.detailTitle, { color: Colors.text }]}>{selectedEventDetails?.title}</ThemedText>
              <View style={styles.detailRow}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.accent} /><ThemedText style={[styles.detailInfoText, { color: Colors.text }]}>{selectedEventDetails?.time} - {selectedEventDetails?.timeEnd}</ThemedText></View>
              <View style={styles.detailRow}><MaterialCommunityIcons name="map-marker" size={20} color={Colors.accent} /><ThemedText style={[styles.detailInfoText, { color: Colors.text }]}>{selectedEventDetails?.location}</ThemedText></View>
              <View style={{height:1, backgroundColor:Colors.border, marginVertical:20}} />
              <ThemedText style={{color:Colors.text, lineHeight:22, fontSize:15}}>{selectedEventDetails?.description}</ThemedText>
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

const EventCard = memo(({ item, isLargeWeb, isDark, Colors, orangeGradient, onOpen }: any) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onOpen(item)} style={[styles.card, { width: isLargeWeb ? '48.5%' : '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: Colors.border, borderRadius: 28 }]}>
    <View style={styles.cardHeader}>
      <LinearGradient colors={orangeGradient} style={styles.cardIconBox}><MaterialCommunityIcons name="calendar-check" size={14} color="#FFF" /></LinearGradient>
      <ThemedText style={[styles.cardDate, { color: Colors.text }]}>{item.date}</ThemedText>
      <View style={styles.cardBadge}><ThemedText style={{ fontSize: 9, color: '#FF5F6D', fontWeight: '900' }}>{item.category.toUpperCase()}</ThemedText></View>
    </View>
    <View style={[styles.cardImgContainer, { backgroundColor: 'transparent' }]}>
       <Image source={{ uri: item.image }} style={styles.cardImg} resizeMode="cover" />
    </View>
    <View style={[styles.cardFooter, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)' }]}>
      <ThemedText style={[styles.cardTitle, { color: Colors.text }]} numberOfLines={1}>{item.title}</ThemedText>
      <ThemedText style={{ color: Colors.subtext, fontSize: 13, marginTop: 4, marginBottom: 8 }} numberOfLines={2}>{item.description}</ThemedText>
      <View style={{ marginTop: 4 }}>
        <View style={{flexDirection:'row', alignItems:'center', marginBottom:4}}><MaterialCommunityIcons name="clock-outline" size={14} color={Colors.accent} /><ThemedText style={[styles.cardInfoText, { color: Colors.text }]}>{item.time} - {item.timeEnd}</ThemedText></View>
        <View style={{flexDirection:'row', alignItems:'center'}}><MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.accent} /><ThemedText style={[styles.cardInfoText, { color: Colors.subtext }]} numberOfLines={1}>{item.location}</ThemedText></View>
      </View>
    </View>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  sidebarBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, overflow: 'hidden' },
  searchBar: { borderRadius: 18, padding: 15, marginBottom: 15, borderWidth: 1, fontWeight: '600' },
  mobileCatBtn: { marginRight: 8, borderRadius: 12, overflow: 'hidden', height: 40, borderWidth: 1 },
  mobileCatGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  mobileCatTextActive: { color: '#FFF', fontWeight: '800', fontSize: 12, marginLeft: 6 },
  mobileCatText: { fontWeight: '700', fontSize: 12, marginLeft: 6 },
  fabGradient: { flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden', borderTopWidth: 1 },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(128,128,128,0.2)', alignSelf: 'center', borderRadius: 2, marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  imageUpload: { width: '100%', height: 160, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 20 },
  input: { padding: 14, borderRadius: 15, borderWidth: 1, fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(128,128,128,0.05)', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '900', color: '#FF5F6D', marginBottom: 6, letterSpacing: 1 },
  catPick: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center' },
  pickerBox: { backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', marginBottom: 10 },
  doneBtnIOS: { padding: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)' },
  publishBtnSmall: { height: 55, minWidth: 220, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  card: { borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  cardHeader: { padding: 12, flexDirection: 'row', alignItems: 'center' },
  cardIconBox: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardDate: { marginLeft: 10, fontSize: 13, fontWeight: '800', flex: 1 },
  cardBadge: { backgroundColor: 'rgba(255,95,109,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  cardImgContainer: { width: '100%', height: 180 },
  cardImg: { width: '100%', height: '100%' },
  cardFooter: { padding: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  cardInfoText: { fontSize: 12, marginLeft: 8, fontWeight: '700' },
  detailContent: { width: '92%', height: '80%', borderRadius: 35, overflow: 'hidden', borderWidth: 1 },
  detailImgContainer: { width: '100%', height: 240 },
  detailImgOverlay: { position: 'absolute', width: '100%', height: 80 },
  detailImg: { width: '100%', height: '100%' },
  closeBtnDetail: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 6, zIndex: 10 },
  shareBtnDetail: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 10 },
  detailBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 12 },
  detailBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  detailTitle: { fontSize: 26, fontWeight: '900', marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailInfoText: { fontSize: 16, fontWeight: '700', marginLeft: 10 },
  webPickerContainer: { position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 15 },
  webIcon: { position: 'absolute', left: 15, zIndex: 1 },
  webVisualMock: { width: '100%', padding: 14, paddingLeft: 45, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
});