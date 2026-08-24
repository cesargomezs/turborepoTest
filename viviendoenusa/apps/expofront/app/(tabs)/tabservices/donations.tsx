import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking, ColorValue, AppState // 🚀 AÑADIDO AppState
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router'; // 🚀 AÑADIDO useFocusEffect
import { useIsFocused } from '@react-navigation/native'; // 🚀 AÑADIDO useIsFocused
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createClient } from '@supabase/supabase-js'; // 🚀 AÑADIDO SUPABASE

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';
import { useAppTheme } from 'app/src/context/ThemeContext';
import { handleUniversalShare } from '../../../utils/shareHelper';

// 🚀 CONFIGURACIÓN SUPABASE PARA FIRMA AL VUELO
const supabaseUrlConfig = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pwznamxpdzwppmpiyizp.supabase.co';
const supabaseAnonKeyConfig = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseClient = supabaseUrlConfig && supabaseAnonKeyConfig ? createClient(supabaseUrlConfig, supabaseAnonKeyConfig) : null;

// 🚀 FUNCIÓN PURIFICADORA DE URLs CADUCADAS
const refreshSupabaseUrl = async (url: string, fallbackFolder = 'donations') => {
  if (!url || typeof url !== 'string' || url.length < 5) return null;
  if (!supabaseClient) return url;

  if (url.includes('supabase.co')) {
    let cleanPath = '';
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/images/');
      if (parts.length > 1) {
        cleanPath = parts[1]; 
      } else {
        cleanPath = url.split('/').pop()?.split('?')[0] || '';
      }
    } catch (e) {
      cleanPath = url.split('/').pop()?.split('?')[0] || '';
    }

    if (!cleanPath.includes('/')) {
        cleanPath = `${fallbackFolder}/${cleanPath}`;
    }

    try {
      const { data } = await supabaseClient.storage.from('images').createSignedUrl(cleanPath, 604800);
      return data?.signedUrl || url;
    } catch (e) {
      return url;
    }
  }

  if (!url.startsWith('http')) {
     const path = url.includes('/') ? url : `${fallbackFolder}/${url}`;
     try {
       const { data } = await supabaseClient.storage.from('images').createSignedUrl(path, 604800);
       return data?.signedUrl || url;
     } catch(e) { return url; }
  }

  return url; 
};

// --- 1. LÓGICA DE VALIDACIÓN GLOBAL ---
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const containsBadWords = (text: string): boolean => {
  if (!text) return false;
  
  const wordsInText = text.toLowerCase().match(/\b[\wáéíóúüñ]+\b/g) || [];

  return wordsInText.some(userWord => {
    return BANNED_WORDS.some(bannedWord => {
      if (!bannedWord) return false;
      const lowerBanned = bannedWord.toLowerCase();
      if (userWord === lowerBanned) return true;
      if (userWord === `${lowerBanned}s` || userWord === `${lowerBanned}es`) return true;
      if (userWord === `re${lowerBanned}`) return true;
      return false;
    });
  });
};

const toSentenceCase = (text: string) => {
  if (text.length === 0) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

// 📡 URL BASE PARA LAS DONACIONES
const API_DONATIONS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/donations';

// --- 2. COMPONENTE PRINCIPAL ---
export default function DonationsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';

  // 🚀 HOOK DE FOCO PARA SABER SI ESTA ES LA PESTAÑA ACTIVA
  const isFocused = useIsFocused();

  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken; 
  
  useEffect(() => {
    if (!userToken) {
      router.replace('/');
    }
  }, [userToken]);

  const currentUserName = userMetadata?.name || 'Usuario';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const stylesUnified = useUnifiedCardStyles();
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const INTERNAL_IDS = t.donationstab.subCategories;
  const ICONS_ARRAY = t.donationstab.subCategoriesIcon ;

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue] = isDark ? ['#333333', '#444444'] : ['#dddddd', '#cccccc'];

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#364045',
    locationtext: isDark ? '#F57F71' : '#731709',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    cardBg: isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.82)', 
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    inputBgRed: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    iconInactive: isDark ? '#B0BEC5' : '#364045',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    success: '#4CAF50'
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const rawCategories = (t.donationstab as any)?.subCategories || (t.donationstab as any)?.categories;
  const CATEGORY_LABELS = Array.isArray(rawCategories) && rawCategories.length >= INTERNAL_IDS.length
      ? rawCategories 
      : t.donationstab.subCategories;

  // 🚀 ESTADOS
  const [zipCode, setZipCode] = useState('');
  const [donations, setDonations] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryIdx, setFormCategoryIdx] = useState(4); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [formPhone, setFormPhone] = useState('');
  const [formZip, setFormZip] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 

  // 🚀 FETCH (CON REFRESH AL VUELO DE SUPABASE)
  const fetchDonations = async (searchZip?: string) => {
    if (!searchZip || searchZip.trim().length !== 5) return;
    try {
      setIsLoadingPosts(true);
      const res = await fetch(`${API_DONATIONS_URL}?zip=${searchZip.trim()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) { router.replace('/'); return; }

      const data = await res.json();
      if (Array.isArray(data)) {
        // 🚀 FIRMAMOS TODAS LAS IMÁGENES AL VUELO AQUÍ
        const mappedData = await Promise.all(data.map(async (item: any) => {
          const rawImage = item.image || item.imageUrl;
          const freshImage = rawImage ? await refreshSupabaseUrl(rawImage, 'donations') : null;
          return { ...item, image: freshImage };
        }));
        setDonations(mappedData);
      } else {
        setDonations([]);
      }
    } catch (e) {
      console.error("Error obteniendo donaciones:", e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // 🚀 1. REFRESCO SILENCIOSO AL CAMBIAR A ESTA PESTAÑA
  useFocusEffect(
    useCallback(() => {
      if (zipCode && zipCode.length === 5) {
        fetchDonations(zipCode);
      }
    }, [zipCode])
  );

  // 🚀 2. DETECTOR DE DESPERTAR (APPSTATE) SÚPER OPTIMIZADO
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Solo dispara la consulta si la app despertó Y esta es la pestaña activa en la pantalla
      if (nextAppState === 'active' && isFocused) {
        console.log("🚀 La app despertó en Donaciones. Refrescando donaciones...");
        if (zipCode && zipCode.length === 5) {
          fetchDonations(zipCode);
        }
      }
    });

    return () => subscription.remove();
  }, [isFocused, zipCode]);

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n${message}`); 
    else Alert.alert(title, message);
  };

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIdx(index);
    setSearchQuery('');
  };

  const handleShare = async (item: any) => {
    await handleUniversalShare({
      title: t.donationstab.label+item.title,
      description: item.descriptionDon || item.description,
      phone: item.phone,
      address: item.locationDon || item.location,
      zip: item.zip,
      image: item.image,
    });
  };

  const handleToggleStatus = async (id: any) => {
    const currentItem = donations.find(d => d.id === id);
    if (!currentItem) return;

    const newStatus = currentItem.status === 'active' ? 'delivered' : 'active';
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));

    try {
      const response = await fetch(`${API_DONATIONS_URL}/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error("Fallo en servidor");
    } catch (e) {
      setDonations(prev => prev.map(d => d.id === id ? { ...d, status: currentItem.status } : d));
      triggerAlert("Error", "No se pudo actualizar el estado en el servidor.");
    }
  };

  const handlePublish = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();
    const trimmedPhone = formPhone.trim();
    const trimmedZip = formZip.trim();

    if (!trimmedTitle || !formImage || !trimmedPhone || trimmedZip.length !== 5 || isPublishing) {
      triggerAlert((t.donationstab as any)?.error || "Error", (t.donationstab as any)?.missingFields || "Faltan campos o el Zip Code es inválido.");
      return;
    }

    const contentToValidate = `${trimmedTitle} ${trimmedDesc}`;
    if (containsBadWords(contentToValidate)) {
      triggerAlert((t.communitytab as any)?.textInappropriateTittle || "Atención", (t.communitytab as any)?.textInappropriateDescription || "Contenido inapropiado detectado.");
      return; 
    }

    setIsPublishing(true);
    try {
      const esSegura = await validarImagenEnServidor(formImage);
      if (!esSegura) {
        setIsPublishing(false);
        triggerAlert((t.communitytab as any)?.imageInappropriateTittle || "Imagen bloqueada", (t.communitytab as any)?.imageInappropriateDescription || "La imagen no cumple nuestras normas.");
        return;
      }

      const formData = new FormData();
      const filename = formImage.split('/').pop() || 'imagen.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      if (Platform.OS === 'web') {
        const responseBlob = await fetch(formImage);
        const blob = await responseBlob.blob();
        formData.append('imagen', blob as any, filename);
      } else {
        formData.append('imagen', { uri: formImage, name: filename, type } as any);
      }

      const uploadResponse = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/donations', {
        method: 'POST',
        body: formData,
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
      });

      if (uploadResponse.status === 401) { setIsPublishing(false); router.replace('/'); return; }

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
      
      const finalImageName = uploadData.identificadorArchivo; 
      const fullPhone = `${COUNTRIES[countryIdx].code}${trimmedPhone}`;

      const newEntryPayload = {
        title: trimmedTitle, 
        categoryIdx: formCategoryIdx,
        status: 'active',
        estate: userMetadata?.estate,
        description: trimmedDesc, 
        image: finalImageName, 
        location: userMetadata?.city || 'Rancho Cucamonga',
        zip: trimmedZip, 
        phone: fullPhone, 
        ownerName: currentUserName, 
        contactMethod: formContactMethod,
        userId: userMetadata?.id || userMetadata?.userId || null
      };

      const response = await fetch(API_DONATIONS_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        },
        body: JSON.stringify(newEntryPayload)
      });
      
      if (response.status === 401) { setIsPublishing(false); router.replace('/'); return; }
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando registro");

      const newEntryLocal = {
        ...savedFromDB,
        image: formImage
      };

      setDonations(prev => [newEntryLocal, ...prev]);
      setFormTitle(''); 
      setFormDescription(''); 
      setFormPhone('');
      setFormZip('');
      setFormImage(null); 
      setCountryIdx(0);
      setFormCategoryIdx(4); 
      setModalVisible(false);
      
      if (!zipCode || zipCode.length < 5) {
        setZipCode(trimmedZip);
        fetchDonations(trimmedZip);
      }

      Alert.alert((t.donationstab as any)?.success || "¡Éxito!", (t.donationstab as any)?.publishedSuccess || "Donación publicada correctamente.");
    } catch (err: any) {
      triggerAlert("Error", err.message || "Ocurrió un error.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredDonations = useMemo(() => {
    return donations.filter(item => {
      const title = item.title || '';
      const isActive = item.status === 'active' || item.statusId === '31a06434-8ed8-45d2-b95f-65bd314bc021';
      return isActive && 
             (selectedCategoryIdx === 0 || Number(item.categoryIdx) === selectedCategoryIdx) && 
             title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [donations, selectedCategoryIdx, searchQuery]);

  const isFormValid = !!(formTitle.trim() && formImage && formPhone.trim() && formZip.length === 5);

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>

          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
          
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={stylesUnified.cardContent}>
              
              {/* 🚀 HEADER LIMPIO: Solo la flecha atrás y el buscador de Zip */}
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder="Buscar código postal..." 
                    keyboardType="numeric" 
                    maxLength={5} 
                    value={zipCode} 
                    onChangeText={(text) => {
                      setZipCode(text);
                      if (text.length < 5) {
                        if (donations.length > 0) setDonations([]); 
                      } else if (text.length === 5) {
                        fetchDonations(text); 
                      }
                    }} 
                    onSubmitEditing={() => zipCode.length === 5 && fetchDonations(zipCode)} 
                    placeholderTextColor={DynamicColors.subtext} 
                  />
                  <TouchableOpacity onPress={() => fetchDonations(zipCode)} disabled={zipCode.length !== 5} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={zipCode.length === 5 ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {isLoadingPosts ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={zipCode.length === 5 ? "#fff" : DynamicColors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                </View>
                <MaterialCommunityIcons name="hand-heart" size={40} color={DynamicColors.text} style={{opacity: 0.15, paddingLeft: 5}} />

              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>{(t.donationstab as any)?.category || 'Categorías'}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORY_LABELS.map((catLabel: string, index: number) => {
                        const isActive = selectedCategoryIdx === index;
                        const iconName = ICONS_ARRAY[index] || 'tag';
                        return (
                          <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{catLabel}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color={DynamicColors.iconInactive} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 14 }}>{catLabel}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, paddingHorizontal: 16, height: 52 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={DynamicColors.subtext} style={{ marginRight: 10 }} />
                    <TextInput 
                      style={{ flex: 1, color: DynamicColors.text, fontSize: 15, height: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                      placeholder={(t.donationstab as any)?.placeholInput || 'Buscar...'} value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={DynamicColors.subtext} 
                    />
                  </View>

                  {!isLargeWeb && (
                    <View style={{ marginBottom: 15 }}>
                      {isWeb ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {CATEGORY_LABELS.map((catLabel: string, index: number) => {
                            const isActive = selectedCategoryIdx === index;
                            const iconName = ICONS_ARRAY[index] || 'tag';
                            return (
                              <TouchableOpacity 
                                key={index} 
                                onPress={() => handleCategorySelect(index)} 
                                style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}
                              >
                                {isActive ? (
                                  <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                    <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{catLabel}</ThemedText>
                                  </LinearGradient>
                                ) : (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                                    <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{catLabel}</ThemedText>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false} 
                          contentContainerStyle={{ paddingVertical: 2, paddingHorizontal: 2, flexDirection: 'row', gap: 8 }}
                        >
                          {CATEGORY_LABELS.map((catLabel: string, index: number) => {
                            const isActive = selectedCategoryIdx === index;
                            const iconName = ICONS_ARRAY[index] || 'tag';
                            return (
                              <TouchableOpacity 
                                key={index} 
                                onPress={() => handleCategorySelect(index)} 
                                style={{ flexShrink: 0, borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}
                              >
                                {isActive ? (
                                  <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                    <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{catLabel}</ThemedText>
                                  </LinearGradient>
                                ) : (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                                    <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{catLabel}</ThemedText>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
                    {isLoadingPosts ? (
                       <ActivityIndicator size="large" color="#FF5F6D" style={{ marginTop: 50 }} />
                    ) : (!zipCode || zipCode.length < 5) ? (
                      <View style={{ alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                          <MaterialCommunityIcons name="map-marker-radius" size={40} color={DynamicColors.subtext} />
                        </View>
                        <ThemedText style={{ textAlign: 'center', color: DynamicColors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                          Descubre Donaciones
                        </ThemedText>
                        <ThemedText style={{ textAlign: 'center', color: DynamicColors.subtext, fontSize: 14, lineHeight: 20 }}>
                          Ingresa un código postal de 5 dígitos para ver las donaciones disponibles en la zona.
                        </ThemedText>
                      </View>
                    ) : (
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
                            onToggleStatus={handleToggleStatus}
                            t={t}
                            categoryLabels={CATEGORY_LABELS}
                            isWeb={isWeb} 
                            handleShare={handleShare} 
                          />
                        )) : (
                          <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                            <MaterialCommunityIcons name="package-variant" size={48} color={DynamicColors.text} />
                            <ThemedText style={{ marginTop: 10, color: DynamicColors.text }}>{(t.donationstab as any)?.messagenotdonnations || 'No hay donaciones en este código postal.'}</ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="hand-heart" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL NUEVA DONACIÓN */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: DynamicColors.text }}>{(t.donationstab as any)?.messageMessageDonation || 'Nueva Donación'}</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 70 }}>
                <TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if(!r.canceled) setFormImage(r.assets[0].uri); }} 
                  style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: DynamicColors.border }}>
                  {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus"  size={32} color={DynamicColors.text} /><ThemedText style={{ fontSize: 11, fontWeight: '800', marginTop: 5, color:DynamicColors.subtext }}>{(t.donationstab as any)?.choisephoto || 'FOTO'}</ThemedText></View>}
                </TouchableOpacity>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, color:DynamicColors.text  }}>{(t.donationstab as any)?.category || 'CATEGORÍA'}</ThemedText>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {CATEGORY_LABELS.map((catLabel: string, index: number) => {
                    if (index === 0) return null; 

                    const isActive = formCategoryIdx === index;
                    const iconName = ICONS_ARRAY[index] || 'tag';

                    return (
                      <TouchableOpacity 
                        key={index} 
                        onPress={() => setFormCategoryIdx(index)} 
                        style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}
                      >
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{catLabel.toUpperCase()}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                            <MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 11, fontWeight: '600' }}>{catLabel.toUpperCase()}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8 , color:DynamicColors.text }}>{(t.donationstab as any)?.typeContact || 'Contacto'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : DynamicColors.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : DynamicColors.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? '#FF5F6D' : DynamicColors.border,backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : DynamicColors.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? '#FF5F6D' : DynamicColors.iconInactive} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '900', color: formContactMethod === 'phone' ? '#FF5F6D' : DynamicColors.subtext }}>{(t.donationstab as any)?.callbton || 'Llamada'}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DynamicColors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: DynamicColors.border, marginBottom: 15, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 0 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DynamicColors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DynamicColors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DynamicColors.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    placeholderTextColor={DynamicColors.subtext}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: DynamicColors.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <TextInput value={formZip} onChangeText={setFormZip} keyboardType="numeric" maxLength={5} placeholder="Código Postal" placeholderTextColor={DynamicColors.subtext} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, marginBottom: 15, color: DynamicColors.text, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                <TextInput value={formTitle} onChangeText={(val) => setFormTitle(toSentenceCase(val))} autoCapitalize="sentences" placeholder={(t.donationstab as any)?.newdonnationTittle || 'Título'} placeholderTextColor={DynamicColors.subtext} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, marginBottom: 15, color: DynamicColors.text, borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }}  />
                <TextInput value={formDescription} onChangeText={(val) => setFormDescription(toSentenceCase(val))} autoCapitalize="sentences" placeholder={(t.donationstab as any)?.newdonnationdescription || 'Descripción'} placeholderTextColor={DynamicColors.subtext} multiline numberOfLines={4} style={{ backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, height: 90, marginBottom: 20, color: DynamicColors.text, textAlignVertical: 'top', borderWidth: 1, borderColor: DynamicColors.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />

                <TouchableOpacity onPress={handlePublish} disabled={isPublishing || !isFormValid} style={{ alignSelf: 'center' }}>
                  <LinearGradient colors={isFormValid ? orangeGradient : ['#CFD8DC', '#B0BEC5']} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{(t.donationstab as any)?.savebutton || 'Guardar'}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

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
const DonationCard = ({ item, currentUserName, isLargeWeb, isDark, Colors, orangeGradient, stylesUnified, onPreview, onToggleStatus, t, categoryLabels, isWeb, handleShare }: any) => {
  
  const safeOwnerName = item.ownerName || item.userId || 'Usuario';
  const isOwner = safeOwnerName === currentUserName;
  const isDelivered = item.statusId === '6a226ffa-9edf-4886-931f-64299f8a6f7f';
  const isWhatsapp = item.contactMethod === 'whatsapp';

  const catLabel = categoryLabels[item.categoryIdx] || 'Otros';

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
          <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>
            {safeOwnerName.charAt(0).toUpperCase()}
          </ThemedText>
        </LinearGradient>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: Colors.text }}>
            {isOwner ? ((t.donationstab as any)?.username || 'Mío') : safeOwnerName}
          </ThemedText>
        </View>
        <View style={{ backgroundColor: 'rgba(255,95,109,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <ThemedText style={{ fontSize: 12, color: Colors.accent, fontWeight: '900' }}>{catLabel.toUpperCase()}</ThemedText>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(item.image)}>
        {item.image && item.image.length > 5 ? (
          <Image 
            source={{ uri: item.image }} 
            style={{ width: '100%', aspectRatio: 16 / 10, opacity: isDelivered ? 0.6 : 1 }} 
            resizeMode="cover" 
          />
        ) : (
          <View style={{ width: '100%', aspectRatio: 16 / 10, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
             <MaterialCommunityIcons name="image-off-outline" size={40} color={Colors.subtext} />
          </View>
        )}
        
        <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
          <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
          <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
            {(t.entrepreneurshiptab as any)?.viewdetail || 'Ver detalle'}
          </ThemedText>
        </View>

        {isDelivered && (
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>{(t.donationstab as any)?.deliveredBadge || 'Entregado'}</ThemedText>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ padding: 15 }}>
        <ThemedText style={{ fontSize: 18, fontWeight: '800', color: Colors.text }}>{item.title}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.accent} />
          <ThemedText style={{ fontSize: 12, color: Colors.subtext, marginLeft: 8 ,fontWeight: '700'}}>{item.locationDon}</ThemedText>
        </View>
        <ThemedText style={{ fontSize: 13, color: Colors.text, opacity: 0.7, marginTop: 6 }} numberOfLines={2}>{item.descriptionDon}</ThemedText>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
          {!isDelivered && (
            <TouchableOpacity onPress={handleContact} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isWhatsapp ? 'rgba(37,211,102,0.1)' : 'rgba(255, 95, 109, 0.15)' }}>
               <MaterialCommunityIcons name={isWhatsapp ? 'whatsapp' : 'phone'} size={18} color={isWhatsapp ? '#25D366' : Colors.accent} />
               <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isWhatsapp ? '#25D366' : Colors.accent }}>{(t.genericbtn as any)?.contactme || 'Contactar'}</ThemedText>
            </TouchableOpacity>
          )}

          {!isWeb && (
            <TouchableOpacity onPress={() => handleShare(item)} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
              <MaterialCommunityIcons name="share-variant" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>{(t.genericbtn as any)?.sharingbtn || 'Compartir'}</ThemedText>
            </TouchableOpacity>
          )}

          {isOwner && (
            <TouchableOpacity onPress={() => onToggleStatus(item.id)} style={{ flexGrow: 1, minWidth: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDelivered ? 'rgba(76, 175, 80, 0.1)' : (isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0') }}>
              <MaterialCommunityIcons name={isDelivered ? "refresh" : "archive-check"} size={18} color={isDelivered ? Colors.success : (isDark ? '#FFF' : '#444')} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDelivered ? Colors.success : (isDark ? '#FFF' : '#444') }}>
                {isDelivered 
                  ? (t.donationstab?.activateBtn || t?.activateBtn || 'Activar') 
                  : (t.donationstab?.deliverBtn || t?.deliverBtn || 'Entregar')}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};