import React, { useState, useMemo, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking, ColorValue
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';

// --- 1. LÓGICA DE VALIDACIÓN GLOBAL ---
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

const toSentenceCase = (text: string) => {
  if (text.length === 0) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

const DONATIONS_MOCK = [
  { id: 1, title: 'Coche de bebé (Stroller)', category: 'Otros', status: 'active', description: 'Marca Graco, excelente estado.', image: 'https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=800', location: 'Rancho Cucamonga', phone: '+19090000000', ownerName: 'Admin', contactMethod: 'whatsapp' },
  { id: 2, title: 'Mesa de comedor', category: 'Muebles', status: 'active', description: 'Madera clara, firme.', image: 'https://images.unsplash.com/photo-1577145946459-39a587ed504e?w=800', location: 'Ontario', phone: '+19091112222', ownerName: 'Maria Silva', contactMethod: 'phone' },
];

// --- 2. COMPONENTE PRINCIPAL ---
export default function DonationsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata) as any;
  const currentUserName = userMetadata?.name || "Cesar Gomez"; 
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const stylesUnified = useUnifiedCardStyles();
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;

  // ESTILOS DINÁMICOS UNIFICADOS
  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    locationtext: isDark ? '#F57F71' : '#731709',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    cardBg: isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.82)', 
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    success: '#4CAF50'
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const CATEGORIES = [
    { id: 'Todos', icon: 'apps' },
    { id: 'Ropa', icon: 'tshirt-crew' },
    { id: 'Muebles', icon: 'sofa' },
    { id: 'Alimentos', icon: 'food-apple' },
    { id: 'Otros', icon: 'dots-horizontal-circle' },
  ];

  const [donations, setDonations] = useState(DONATIONS_MOCK);
  
  // BÚSQUEDA EN VIVO
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [viewStatus, setViewStatus] = useState<'active' | 'delivered'>('active');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Otros');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [formPhone, setFormPhone] = useState('');
  const [countryIdx, setCountryIdx] = useState(0); 

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n${message}`); 
    else Alert.alert(title, message);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
  };

  const handlePublish = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();
    const trimmedPhone = formPhone.trim();

    if (!trimmedTitle || !formImage || !trimmedPhone || isPublishing) {
      triggerAlert("Error", "Falta el título, la foto o el número.");
      return;
    }

    if (isTextInappropriate(trimmedTitle) || isTextInappropriate(trimmedDesc)) {
      const errorMsg = t.communitytab?.textInappropriateDescription || "Contenido inapropiado detectado.";
      triggerAlert(t.communitytab?.textInappropriateTittle || "Atención", errorMsg);
      return; 
    }

    setIsPublishing(true);
    try {
      const esSegura = await validarImagenEnServidor(formImage);
      if (!esSegura) {
        setIsPublishing(false);
        triggerAlert(t.communitytab?.imageInappropriateTittle || "Imagen bloqueada", t.communitytab?.imageInappropriateDescription || "La imagen no cumple nuestras normas.");
        return;
      }

      const fullPhone = `${COUNTRIES[countryIdx].code}${trimmedPhone}`;

      const newEntry = {
        id: Date.now(), 
        title: trimmedTitle, 
        category: formCategory, 
        status: 'active' as const,
        description: trimmedDesc, 
        image: formImage, 
        location: userMetadata?.city || 'Rancho Cucamonga',
        phone: fullPhone, 
        ownerName: currentUserName, 
        contactMethod: formContactMethod
      };

      setDonations(prev => [newEntry, ...prev]);
      setFormTitle(''); 
      setFormDescription(''); 
      setFormPhone('');
      setFormImage(null); 
      setCountryIdx(0);
      setModalVisible(false);
      Alert.alert("¡Éxito!", "Donación publicada correctamente.");
    } catch (err) {
      triggerAlert("Error", t.communitytab?.errorServer || "Ocurrió un error.");
    } finally {
      setIsPublishing(false);
    }
  };

  // FILTRO EN TIEMPO REAL
  const filteredDonations = useMemo(() => {
    return donations.filter(item => 
      item.status === viewStatus && 
      (selectedCategory === 'Todos' || item.category === selectedCategory) && 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [donations, viewStatus, selectedCategory, searchQuery]);

  const isFormValid = !!(formTitle.trim() && formImage && formPhone.trim());

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>

          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
          
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={stylesUnified.cardContent}>
              
              <View style={[stylesUnified.headerRow, { marginBottom: 20 }]}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} /></TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', backgroundColor: DynamicColors.inputBg, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: DynamicColors.border }}>
                        <TouchableOpacity onPress={() => setViewStatus('active')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: viewStatus === 'active' ? DynamicColors.accent : 'transparent' }}><ThemedText style={{ fontSize: 11, fontWeight: '900', color: viewStatus === 'active' ? '#FFF' : DynamicColors.subtext }}>{t.donationstab.statusBottonModalDis}</ThemedText></TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewStatus('delivered')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: viewStatus === 'delivered' ? DynamicColors.accent : 'transparent' }}><ThemedText style={{ fontSize: 11, fontWeight: '900', color: viewStatus === 'delivered' ? '#FFF' : DynamicColors.subtext }}>{t.donationstab.statusBottonModalDel}</ThemedText></TouchableOpacity>
                    </View>
                </View>
                <MaterialCommunityIcons name="hand-heart" size={40} color={DynamicColors.text} style={{opacity: 0.2}}/>
              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>{t.donationstab.category}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                          <TouchableOpacity key={cat.id} onPress={() => handleCategorySelect(cat.id)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
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
                  
                  {/* BUSCADOR INTEGRADO Y ELEGANTE (SIN BOTÓN EXTRA) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, paddingHorizontal: 16, height: 52 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={DynamicColors.subtext} style={{ marginRight: 10 }} />
                    <TextInput 
                      style={{ flex: 1, color: DynamicColors.text, fontSize: 15, height: '100%' }} 
                      placeholder="¿Qué buscas hoy?" value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={DynamicColors.subtext} 
                    />
                  </View>

                  {!isLargeWeb && (
                    <View style={{ height: 50, marginBottom: 15 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5, paddingHorizontal: 2 }}>
                        {CATEGORIES.map((cat) => {
                          const isActive = selectedCategory === cat.id;
                          return (
                            <TouchableOpacity key={cat.id} onPress={() => handleCategorySelect(cat.id)} style={{ marginRight: 8, borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                              {isActive ? (
                                <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
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
                      </ScrollView>
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {filteredDonations.length > 0 ? filteredDonations.map(item => (
                        <DonationCard 
                          key={item.id} 
                          item={item} 
                          currentUserName={currentUserName} 
                          isLargeWeb={isLargeWeb} 
                          isDark={isDark} 
                          Colors={DynamicColors} 
                          orangeGradient={orangeGradient} 
                          stylesUnified={stylesUnified}
                          onPreview={(img: string) => { setImageToView(img); setViewerVisible(true); }}
                          onToggleStatus={(id: any) => setDonations(prev => prev.map(d => d.id === id ? {...d, status: d.status === 'active' ? 'delivered' : 'active'} : d))}
                        />
                      )) : (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="package-variant" size={48} color={DynamicColors.text} />
                          <ThemedText style={{ marginTop: 10, color: DynamicColors.text }}>{t.donationstab.messagenotdonnations}</ThemedText>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB: Botón Flotante UNIVERSAL */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="hand-heart" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL NUEVA DONACIÓN - CENTRADO EN WEB */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              

                
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: DynamicColors.text }}>{t.donationstab.messageMessageDonation}</ThemedText>
                <View style={{ width: 24 }} />
              </View>


              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 70 }}>
                <TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if(!r.canceled) setFormImage(r.assets[0].uri); }} 
                  style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: DynamicColors.border }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" style={{color: DynamicColors.iconInactive}} size={32}  /><ThemedText style={{ fontSize: 11, fontWeight: '800', marginTop: 5 }}>{t.donationstab.choisephoto}</ThemedText></View>}
                </TouchableOpacity>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 }}>{t.donationstab.category}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                  {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => {
                    const isActive = formCategory === cat.id;
                    return (
                      <TouchableOpacity key={cat.id} onPress={() => setFormCategory(cat.id)} style={{ marginRight: 8, borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={cat.icon as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{cat.id.toUpperCase()}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                            <MaterialCommunityIcons name={cat.icon as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 11, fontWeight: '600' }}>{cat.id.toUpperCase()}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 }}>{t.donationstab.typeContact}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : DynamicColors.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? DynamicColors.locationtext : DynamicColors.border, backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : DynamicColors.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? DynamicColors.locationtext : DynamicColors.iconInactive} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '900', color: formContactMethod === 'phone' ? DynamicColors.locationtext : DynamicColors.subtext }}>{t.donationstab.callbton || 'Llamada'}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DynamicColors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DynamicColors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DynamicColors.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="Número de contacto"
                    placeholderTextColor={DynamicColors.subtext}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: DynamicColors.text, padding: 15, fontSize: 14, fontWeight: '600' }} />
                </View>

                <TextInput value={formTitle} onChangeText={(val) => setFormTitle(toSentenceCase(val))} autoCapitalize="sentences" placeholder={t.donationstab.newdonnationTittle} placeholderTextColor={DynamicColors.subtext} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, marginBottom: 15, color: DynamicColors.text, borderWidth: 1, borderColor: DynamicColors.border }} />
                <TextInput value={formDescription} onChangeText={(val) => setFormDescription(toSentenceCase(val))} autoCapitalize="sentences" placeholder={t.donationstab.newdonnationdescription} multiline numberOfLines={4} placeholderTextColor={DynamicColors.subtext} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, height: 90, marginBottom: 20, color: DynamicColors.text, textAlignVertical: 'top', borderWidth: 1, borderColor: DynamicColors.border }} />

                {/* BOTÓN GUARDAR EN UNA LÍNEA */}
                <TouchableOpacity onPress={handlePublish} disabled={isPublishing || !isFormValid} style={{ alignSelf: 'center' }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : ['#CFD8DC', '#B0BEC5']} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>Guardar</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      {/* VISUALIZADOR DE IMÁGENES */}
      <RNModal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setViewerVisible(false)} />
          {imageToView && <Image source={{ uri: imageToView }} style={{ width: width, height: height * 0.8 }} resizeMode="contain" />}
          <TouchableOpacity onPress={() => setViewerVisible(false)} style={{ position: 'absolute', top: insets.top + 20, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 25 }}>
            <MaterialCommunityIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </RNModal>
    </View>
  );
}

// --- 3. COMPONENTE DE TARJETA DE DONACIÓN ---
const DonationCard = memo(({ item, currentUserName, isLargeWeb, isDark, Colors, orangeGradient, stylesUnified, onPreview, onToggleStatus }: any) => {
  const isOwner = item.ownerName === currentUserName;
  const isDelivered = item.status === 'delivered';
  const isWhatsapp = item.contactMethod === 'whatsapp';

  const handleContact = () => {
    if (isWhatsapp) Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`);
    else Linking.openURL(`tel:${item.phone}`);
  };

  return (
    <View style={[stylesUnified.postCard, { 
      marginBottom: 20, padding: 0, overflow: 'hidden', 
      width: isLargeWeb ? '48.5%' : '100%', 
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      borderWidth: 1, borderColor: Colors.border, borderRadius: 28
    }]}>
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
        <LinearGradient colors={orangeGradient} style={{ width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{item.ownerName.charAt(0)}</ThemedText>
        </LinearGradient>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: Colors.text }}>{isOwner ? 'Mío' : item.ownerName}</ThemedText>
        </View>
        <View style={{ backgroundColor: 'rgba(255,95,109,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <ThemedText style={{ fontSize: 10, color: Colors.accent, fontWeight: '900' }}>{item.category.toUpperCase()}</ThemedText>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(item.image)}>
        <Image source={{ uri: item.image }} style={{ width: '100%', aspectRatio: 16 / 10, opacity: isDelivered ? 0.6 : 1 }} resizeMode="cover" />
        {isDelivered && (
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>Entregado</ThemedText>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ padding: 15 }}>
        <ThemedText style={{ fontSize: 18, fontWeight: '800', color: Colors.text }}>{item.title}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, opacity: 0.6 }}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.locationtext} />
          <ThemedText style={{ fontSize: 14, color: Colors.locationtext, marginLeft: 4 ,fontWeight: '600'}}>{item.location}</ThemedText>
        </View>
        <ThemedText style={{ fontSize: 14, color: Colors.text, opacity: 0.7, marginTop: 6 }} numberOfLines={2}>{item.description}</ThemedText>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
          {!isDelivered && (
            <TouchableOpacity onPress={handleContact} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isWhatsapp ? 'rgba(37,211,102,0.1)' : 'rgba(255, 95, 109, 0.15)' }}>
               <MaterialCommunityIcons name={isWhatsapp ? 'whatsapp' : 'phone'} size={18} color={isWhatsapp ? '#25D366' : Colors.accent} />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isWhatsapp ? '#25D366' : Colors.accent }}>Contactar</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => Share.share({ message: item.title })} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
            <MaterialCommunityIcons name="share-variant" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
            <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>Compartir</ThemedText>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity onPress={() => onToggleStatus(item.id)} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDelivered ? 'rgba(76, 175, 80, 0.1)' : (isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0') }}>
              <MaterialCommunityIcons name={isDelivered ? "refresh" : "archive-check"} size={18} color={isDelivered ? Colors.success : (isDark ? '#FFF' : '#444')} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDelivered ? Colors.success : (isDark ? '#FFF' : '#444') }}>{isDelivered ? "Activar" : "Entregar"}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});