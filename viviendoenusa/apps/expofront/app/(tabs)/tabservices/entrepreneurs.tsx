import Head from 'expo-router/head';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useState, useEffect, useCallback } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, ActivityIndicator, Image, Linking, Alert,
  Modal as RNModal, KeyboardAvoidingView, Share, ColorValue, Text, AppState // 🚀 IMPORTAMOS AppState
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router'; // 🚀 IMPORTAMOS useFocusEffect
import { useIsFocused } from '@react-navigation/native'; // 🚀 IMPORTAMOS useIsFocused
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { createClient } from '@supabase/supabase-js'; // 🚀 IMPORTAMOS SUPABASE

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import badWordsData from '../../../utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import { useAppTheme } from 'app/src/context/ThemeContext';
import { handleUniversalShare } from '../../../utils/shareHelper';

// =====================================================================
// 📡 1. CONFIGURACIONES GLOBALES, URLS Y CONSTANTES
// =====================================================================
const API_ENTREPRENEURSHIP_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/entrepreneurship';

// 🚀 CONFIGURACIÓN SUPABASE PARA FIRMA AL VUELO
const supabaseUrlConfig = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pwznamxpdzwppmpiyizp.supabase.co';
const supabaseAnonKeyConfig = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseClient = supabaseUrlConfig && supabaseAnonKeyConfig ? createClient(supabaseUrlConfig, supabaseAnonKeyConfig) : null;

// 🚀 FUNCIÓN PURIFICADORA DE URLs CADUCADAS
const refreshSupabaseUrl = async (url: string, fallbackFolder = 'entrepreneurship') => {
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

let BANNED_WORDS: string[] = [];
try {
  BANNED_WORDS = Array.isArray((badWordsData as any).badWordsList) ? (badWordsData as any).badWordsList : [];
} catch (e) {
  console.error("Error cargando badwords.json:", e);
}

// 🚀 NUEVA LÓGICA DE VALIDACIÓN CON REGEX
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

const formatCount = (count: number) => {
  if (!count) return '0';
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count.toString();
};

// =====================================================================
// 📝 2. TIPOS E INTERFACES (TYPESCRIPT)
// =====================================================================
type Review = {
  id: string;
  userId: string;
  stars: number;
  comment: string;
  image: string | null;
  name: string | null;
  createdAt?: string;
  displayTime?: string;
};

type Emprendimiento = {
  id: string;
  name: string;
  address: string;
  categoryId: number; 
  description: string;
  rating: number;
  phone: string;
  verified: boolean;
  promo: string | null;
  image: string;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  saved: boolean;
  reviews: Review[];
  contactMethod: 'whatsapp' | 'phone'; 
  zip: string;
  status?: 'pending' | 'approved';
  estate:string;
};

const COUNTRIES = [{ code: '+1', flag: '🇺🇸', name: 'USA' }];
const ICONS_ARRAY = ['apps', 'sale', 'wrench-outline', 'silverware-fork-knife', 'heart-pulse', 'laptop'];

// =====================================================================
// 🧩 3. COMPONENTES AUXILIARES AISLADOS
// =====================================================================
const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (containsBadWords(comment)) {
      const errorMsg = t.communitytab?.textInappropriateDescription || "Comentario inapropiado";
      Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Error", errorMsg);
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>
          {t.entrepreneurshiptab?.backBtn || 'Volver'}
        </ThemedText>
      </TouchableOpacity>

      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20, color: isDark ? '#FFF' : '#1A1A1A' }}>
        {t.entrepreneurshiptab?.viewExpe || 'Tu Experiencia'}
      </ThemedText>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <MaterialCommunityIcons 
              name={s <= rating ? "star" : "star-outline"} 
              size={40} 
              color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} 
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput 
          value={comment} 
          onChangeText={setComment} 
          placeholder={t.entrepreneurshiptab?.viewopinion || "Escribe tu opinión..."} 
          placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} 
          multiline 
          style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
        />
      </View>

      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="send" size={18} color="#FFF" />
          <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>
            {t.entrepreneurshiptab?.publishReviews || 'Publicar reseña'}
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// =====================================================================
// 🏗️ 4. COMPONENTE PRINCIPAL
// =====================================================================
export default function EntrepreneurshipScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';

  // 🚀 HOOK DE FOCO PARA SABER SI ESTA ES LA PESTAÑA ACTIVA
  const isFocused = useIsFocused();

  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();
  const router = useRouter();
  
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken; 

  const userRole = userMetadata?.role || userMetadata?.rol || 'User'; 
  const isAdmin = userRole === 'SAdmin' || userRole === 'admin';

  useEffect(() => {
    if (!userToken) {
      router.replace('/');
    }
  }, [userToken]);

  const handleShare = async (item: Emprendimiento) => {
    await handleUniversalShare({
      title: t.entrepreneurshiptab.label+item.name,
      description: item.description,
      phone: item.phone,
      address: item.address,
      zip: item.zip,
      image: item.image,
    });
  };

  const isWeb      = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid  = Platform.OS === 'android';
  const isIOS      = Platform.OS === 'ios';

  const CATEGORIES = t.entrepreneurshiptab.categoryentre;
  const CATEGORY_ICONS_DICT: Record<string, string> = t.entrepreneurshiptab.categoryentreicon;

  const DC = {
    text:               isDark ? '#FFFFFF'                  : '#1A1A1A',
    textmes:            isDark ? '#FFFFFF'                  : '#1A1A1A',
    subtext:            isDark ? '#B0BEC5'                  : '#546E7A',
    accent:             isDark ? '#FF5F6D'                  : '#FF5F6D',
    border:             isDark ? 'rgba(255,255,255,0.22)'   : 'rgba(0,0,0,0.1)',
    inputBg:            isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    iconInactive:       isDark ? '#B0BEC5'                  : '#364045',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    cardBg:             isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    divider:            isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(0,0,0,0.07)',
    sectionBg:          isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.02)',
  };

  const OG: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'];
  const DG: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState<Emprendimiento[]>([]);
  const [results, setResults] = useState<Emprendimiento[]>([]);
  const [pendingItems, setPendingItems] = useState<Emprendimiento[]>([]);
  
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedItems, setSavedItems] = useState<string[]>([]); 

  const [isFormVisible, setFormVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<Emprendimiento | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Emprendimiento | null>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formDesc, setFormDesc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formPromo, setFormPromo] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isZipValid = zipCode.length === 5;
  const triggerAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);

  useEffect(() => {
    const loadSavedItems = async () => {
      try {
        const storedItems = await AsyncStorage.getItem('@saved_entrepreneurships');
        if (storedItems) {
          setSavedItems(JSON.parse(storedItems));
        }
      } catch (error) { console.error(error); }
    };
    loadSavedItems();
  }, []);

  const fetchEntrepreneurships = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENTREPRENEURSHIP_URL}?zip=${searchZip.trim()}&userId=${userMetadata?.id || ''}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (res.status === 401) { router.replace('/'); return []; }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        // 🚀 FIRMA AL VUELO DE IMÁGENES Y REVIEWS
        const mappedData: Emprendimiento[] = await Promise.all(data.map(async (item: any) => {
          const rawImage = item.imageEntrepren || item.image || item.imageUrl;
          const freshImage = rawImage ? await refreshSupabaseUrl(rawImage, 'entrepreneurship') : '';
          
          const parsedReviews = Array.isArray(item.reviews) ? await Promise.all(item.reviews.map(async (r: any) => {
             const freshReviewImage = r.image ? await refreshSupabaseUrl(r.image, 'users') : null;
             return { ...r, image: freshReviewImage };
          })) : [];

          return {
            ...item,
            name: item.nameEntrepren || 'Sin nombre',
            address: item.addressentr || item.address || '', 
            categoryId: Number(item.categoryId) || 0,
            description: item.descriptionEntrepren || '',
            rating: Number(item.rating) || 5.0,
            likes: Number(item.likes) || 0,
            dislikes: Number(item.dislikes) || 0,
            userVote: item.userVote || null,
            estate: item.estate || '', 
            saved: false, 
            reviews: parsedReviews,
            image: freshImage,
          };
        }));
        
        setLocalData(mappedData);
        return mappedData;
      }
      return [];
    } catch (e) {
      console.error("Error obteniendo emprendimientos:", e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedItems = async () => {
    if (savedItems.length === 0) {
      setResults([]);
      setLocalData([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_ENTREPRENEURSHIP_URL}/batch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ ids: savedItems, userId: userMetadata?.id || '' })
      });
      if (res.status === 401) { router.replace('/'); return; }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        // 🚀 FIRMA AL VUELO PARA GUARDADOS
        const mappedData: Emprendimiento[] = await Promise.all(data.map(async (item: any) => {
          const rawImage = item.imageEntrepren || item.image || item.imageUrl;
          const freshImage = rawImage ? await refreshSupabaseUrl(rawImage, 'entrepreneurship') : '';
          
          const parsedReviews = Array.isArray(item.reviews) ? await Promise.all(item.reviews.map(async (r: any) => {
             const freshReviewImage = r.image ? await refreshSupabaseUrl(r.image, 'users') : null;
             return { ...r, image: freshReviewImage };
          })) : [];

          return {
            ...item,
            name: item.nameEntrepren || 'Sin nombre',
            address: item.addressentr || item.address || '', 
            categoryId: Number(item.categoryId) || 0,
            description: item.descriptionEntrepren || '',
            rating: Number(item.rating) || 5.0,
            likes: Number(item.likes) || 0,
            dislikes: Number(item.dislikes) || 0,
            userVote: item.userVote || null, 
            estate: userMetadata.estate,
            saved: true, 
            reviews: parsedReviews,
            image: freshImage,
          };
        }));
        
        setLocalData(mappedData);
      } else {
        setLocalData([]);
      }
    } catch (e) {
      console.error("Error cargando guardados:", e);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 1. REFRESCO SILENCIOSO AL CAMBIAR A ESTA PESTAÑA O CAMBIAR MODO GUARDADO
  useFocusEffect(
    useCallback(() => {
      if (showSavedOnly) {
        fetchSavedItems();
      } else {
        if (isZipValid) {
          fetchEntrepreneurships(zipCode);
        }
      }
    }, [showSavedOnly, zipCode])
  );

  // 🚀 2. DETECTOR DE DESPERTAR (APPSTATE) SÚPER OPTIMIZADO
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Solo dispara la consulta si la app despertó Y esta es la pestaña activa
      if (nextAppState === 'active' && isFocused) {
        console.log("🚀 La app despertó en Emprendimientos. Refrescando...");
        if (showSavedOnly) {
          fetchSavedItems();
        } else {
          if (isZipValid) {
            fetchEntrepreneurships(zipCode);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [isFocused, showSavedOnly, zipCode, isZipValid]);

  const handleSearch = async (forcedCategoryIdx?: number) => {
    if (!isZipValid) return;
    if (showSavedOnly) return; 
    
    const categoryToSearch = forcedCategoryIdx !== undefined ? forcedCategoryIdx : selectedCategoryIdx;
    await fetchEntrepreneurships(zipCode);
  };

  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) {
      setResults([]);
      setLocalData([]);
      if (!isAdminMode) setPendingItems([]);
    }
  };

  const applyFilters = (dataList: Emprendimiento[], catIdx: number, textQuery: string) => {
    let list = catIdx === 0 ? dataList : dataList.filter(l => l.categoryId === catIdx);
    
    if (showSavedOnly) {
      list = list.filter(l => savedItems.includes(l.id));
    }

    if (textQuery.trim()) {
      const q = textQuery.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    setResults(list);
  };

  useEffect(() => {
    applyFilters(localData, selectedCategoryIdx, searchText);
  }, [selectedCategoryIdx, searchText, localData, showSavedOnly, savedItems]);

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (!r.canceled) setFormImage(r.assets[0].uri);
  };

  const handleVote = async (id: string, type: 'like' | 'dislike') => {
    const currentUserId = userMetadata?.id || "baeb641a-3fa4-4fef-9846-d75947d1bca9";
    
    const applyVote = (item: Emprendimiento): Emprendimiento => {
      const isSel = item.userVote === type;
      return {
        ...item,
        likes: type === 'like' ? (isSel ? item.likes - 1 : item.likes + 1) : (item.userVote === 'like' ? item.likes - 1 : item.likes),
        dislikes: type === 'dislike' ? (isSel ? item.dislikes - 1 : item.dislikes + 1) : (item.userVote === 'dislike' ? item.dislikes - 1 : item.dislikes),
        userVote: isSel ? null : type,
      };
    };

    setLocalData(prev => prev.map(it => it.id === id ? applyVote(it) : it));
    setDetailItem(prev => prev?.id === id ? applyVote(prev) : prev);

    try {
      const res = await fetch(`${API_ENTREPRENEURSHIP_URL}/vote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ relationship_id: id, userId: currentUserId, action: type })
      });
      if (res.status === 401) { router.replace('/'); return; }
    } catch (error) { console.error("Error enviando voto al servidor:", error); }
  };

  const handleSave = async (id: string) => {
    try {
      let newSavedList = [...savedItems];
      if (savedItems.includes(id)) {
        newSavedList = savedItems.filter(itemId => itemId !== id);
        triggerAlert("Eliminado", "Eliminado de tus guardados.");
      } else {
        newSavedList = [...savedItems, id];
        triggerAlert("Guardado", "Guardado exitosamente.");
      }
      setSavedItems(newSavedList);
      await AsyncStorage.setItem('@saved_entrepreneurships', JSON.stringify(newSavedList));
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleAddReview = async (targetId: string, stars: number, comment: string) => {
    const currentUserId = userMetadata?.id || "baeb641a-3fa4-4fef-9846-d75947d1bca9";
    const currentItem = detailItem?.id === targetId ? detailItem : (reviewTarget?.id === targetId ? reviewTarget : results.find(r => r.id === targetId));

    if (currentItem?.reviews?.some((r: any) => String(r.userId) === String(currentUserId))) {
      triggerAlert("Aviso", "Ya has escrito una reseña para este negocio.");
      setShowReviewInput(false);
      return;
    }

    try {
      const payload = { reference_id: targetId, stars: stars, comment: comment, userId: currentUserId };
      const response = await fetch(`${API_ENTREPRENEURSHIP_URL}/reviews`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }, 
        body: JSON.stringify(payload)
      });

      if (response.status === 401) { router.replace('/'); return; }

      if (response.status === 400 || !response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || "Ya has escrito una reseña para este negocio.");
      }

      const savedReview = await response.json();
      
      const newReview: Review = {
        id: savedReview.id || Date.now().toString(),
        stars: savedReview.stars || stars,
        comment: savedReview.comment || comment,
        image: savedReview.image || userMetadata?.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
        name: savedReview.name || userMetadata?.name || 'Anónimo',
        userId: currentUserId, 
        displayTime: savedReview.displayTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      };

      const updateState = (prevReviews: Review[]) => {
        const updated = [newReview, ...prevReviews];
        const newAvg = updated.reduce((acc, r) => acc + r.stars, 0) / updated.length;
        return { reviews: updated, rating: newAvg };
      };

      setLocalData(prev => prev.map(it => it.id === targetId ? { ...it, ...updateState(it.reviews) } : it));
      setDetailItem(prev => prev?.id === targetId ? { ...prev, ...updateState(prev.reviews) } : prev);
      setReviewTarget(prev => prev?.id === targetId ? { ...prev, ...updateState(prev.reviews) } : prev);

      setShowReviewInput(false);
      triggerAlert('¡Gracias!', 'Tu reseña ha sido publicada exitosamente.');
    } catch (error: any) { triggerAlert('Aviso', error.message || 'No se pudo guardar la reseña.'); }
  };

  const openReviews = (item: Emprendimiento, focusInput: boolean = false) => {
    if (detailItem) {
      setDetailItem(null); 
      setTimeout(() => { setReviewTarget(item); setShowReviewInput(focusInput); }, Platform.OS === 'ios' ? 350 : 50); 
    } else {
      setReviewTarget(item); setShowReviewInput(focusInput);
    }
  };

  const handlePublish = async () => {
    if (!formName.trim() || !formAddress.trim() || !formDesc.trim() || !formPhone.trim() || !formImage || formZip.length < 5) {
      triggerAlert('Campos incompletos', 'Completa nombre, dirección, descripción, teléfono, código postal e imagen.'); return;
    }

    const contentToValidate = `${formName} ${formDesc} ${formAddress} ${formPromo}`;
    if (containsBadWords(contentToValidate)) {
      triggerAlert(
        t.communitytab?.textInappropriateTittle || "Atención", 
        t.communitytab?.textInappropriateDescription || "Contenido inapropiado detectado."
      );
      return; 
    }

    setIsSubmitting(true);
    
    try {
      let finalImageName = '';
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsSubmitting(false);
          return triggerAlert("Imagen bloqueada", "La imagen no cumple nuestras normas.");
        }
        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'imagen.jpg';
        const type = `image/${/\.(\w+)$/.exec(filename)?.[1] || 'jpeg'}`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage);
          formData.append('imagen', await responseBlob.blob() as any, filename);
        } else {
          formData.append('imagen', { uri: formImage, name: filename, type } as any);
        }

        const uploadResponse = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/entrepreneurship', {
          method: 'POST', 
          body: formData, 
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
        });

        if (uploadResponse.status === 401) { setIsSubmitting(false); router.replace('/'); return; }
        if (!uploadResponse.ok) throw new Error("Error subiendo imagen");
        finalImageName = (await uploadResponse.json()).identificadorArchivo;
      }

      const payload = {
        nameEntrepren: formName.trim(), 
        categoryId: String(formCategoryIdx), 
        descriptionEntrepren: formDesc.trim(), 
        addressEntrepren: formAddress.trim(), 
        phone: `${COUNTRIES[countryIdx].code}${formPhone.trim()}`,
        verified: false, 
        promo: formPromo.trim() || null, 
        imageEntrepren: finalImageName,
        saved: false, 
        contactMethod: formContactMethod, 
        zip: formZip.trim(),
        userId: userMetadata?.id || null,
        estate: userMetadata?.estate || ''
      };

      const response = await fetch(API_ENTREPRENEURSHIP_URL, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }, 
        body: JSON.stringify(payload)
      });
      
      if (response.status === 401) { setIsSubmitting(false); router.replace('/'); return; }
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error al guardar");

      const newEntryLocal = {
        id: savedFromDB.id, 
        name: savedFromDB.nameEntrepren, 
        address: savedFromDB.addressEntrepren || formAddress.trim(), 
        categoryId: Number(savedFromDB.categoryId) || 0, 
        description: savedFromDB.descriptionEntrepren, 
        rating: 5.0, 
        phone: savedFromDB.phone, 
        verified: false, 
        promo: savedFromDB.promo, 
        image: formImage, 
        likes: 0, 
        dislikes: 0, 
        userVote: null, 
        saved: false, 
        reviews: [],
        contactMethod: savedFromDB.contactMethod, 
        zip: savedFromDB.zip, 
        status: 'approved',
        estate:savedFromDB.estate
      } as Emprendimiento;
      
      setLocalData(prev => [newEntryLocal, ...prev]);
      setFormName(''); setFormAddress(''); setFormDesc(''); setFormPhone(''); setFormZip(''); setFormPromo(''); setFormImage(null); 
      setFormCategoryIdx(1); setCountryIdx(0); setFormContactMethod('whatsapp');
      setIsSubmitting(false); setFormVisible(false);
      
      if (!zipCode || zipCode.length < 5) { setZipCode(payload.zip); handleSearch(); }
      triggerAlert('¡Éxito!', 'Tu emprendimiento ha sido publicado y ya es visible en los resultados.');
    } catch (err: any) {
      triggerAlert("Error", err.message || "Error conectando con el servidor. Revisa tu conexión.");
      setIsSubmitting(false);
    }
  };

  const approveItem = async (item: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_ENTREPRENEURSHIP_URL}/${item.id}`, {
        method: 'PUT', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error("Error en servidor");

      setPendingItems(pendingItems.filter(s => s.id !== item.id));
      Alert.alert("Aprobado", "Emprendimiento activado.");
      
      if (zipCode.length === 5) handleSearch();
    } catch (error) { Alert.alert("Error", "No se pudo aprobar."); }
  };

  const rejectItem = async (id: string) => {
    try {
      const response = await fetch(`${API_ENTREPRENEURSHIP_URL}/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken}` } 
      });
      if (response.status === 401) { router.replace('/'); return; }
      setPendingItems(pendingItems.filter(s => s.id !== id));
      Alert.alert("Rechazado", "Emprendimiento eliminado.");
    } catch (error) { Alert.alert("Error", "No se pudo rechazar."); }
  };

  const ActionBtnLine = ({ icon, text, color, bgColor, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flexGrow: 1, flexBasis: 80, height: 40, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8, marginRight: 6 }}>
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText numberOfLines={1} style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

  const EmprendimientoCard = ({ item, renderAdminControls }: { item: Emprendimiento, renderAdminControls?: any }) => {
    const categoryName = CATEGORIES[item.categoryId] || 'Categoría';
    const categoryIcon = CATEGORY_ICONS_DICT[categoryName] || ICONS_ARRAY[item.categoryId] || 'store';
    const isPending = item.status === 'pending';
    const cardBgColor = isPending ? (isDark ? '#1E1E1E' : '#FFFFFF') : DC.cardBg;

    return (
      <TouchableOpacity activeOpacity={0.93} onPress={() => { setDetailItem(item); setShowReviewInput(false); }}
        style={[
          S.card, 
          { backgroundColor: cardBgColor, borderColor: isPending ? '#FFB74D' : DC.border },
          isLargeWeb ? { width: '48.5%' } : {} 
        ]}>
        
        {isPending && (
          <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" />
            <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>En revisión. Será publicado pronto.</ThemedText>
          </View>
        )}
        
        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ fontSize: 12, color: '#FF5F6D', fontWeight: '900' }}>{categoryName.toUpperCase()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{ marginLeft: 4, fontSize: 13, fontWeight: '900', color: DC.text }}>{item.rating > 0 ? item.rating.toFixed(1) : "Nuevo"}</ThemedText>
          </View>
        </View>

        <View style={{ width: '100%', height: isLargeWeb ? 200 : 140, position: 'relative' }}>
          {item.image && item.image.length > 5 ? (
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="image-off-outline" size={40} color={DC.subtext} />
            </View>
          )}
          
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
            <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Ver detalle</ThemedText>
          </View>
        </View>

        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <LinearGradient colors={OG as any} style={S.cardIconWrap}>
              <MaterialCommunityIcons name={categoryIcon as any} size={18} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <ThemedText style={{ fontWeight: '900', fontSize: 15, color: DC.text, flexShrink: 1 }}>{item.name}</ThemedText>
                {item.verified && <MaterialCommunityIcons name="check-decagram" size={15} color="#4FC3F7" />}
              </View>
              
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={DC.accent} />
                <ThemedText style={{ fontSize: 12, marginLeft: 3, fontWeight: '500', color: DC.subtext }} numberOfLines={1}>{item.zip +' '+ item.address}</ThemedText>
              </View>
              
            </View>
          </View>

          <ThemedText numberOfLines={2} style={{ color: DC.text, marginBottom: 10, fontSize: 13, lineHeight: 18 }}>{item.description}</ThemedText>
          
          {item.promo && (
            <View style={[S.promoBadge, { marginBottom: 12 }]}>
              <MaterialCommunityIcons name="tag-outline" size={11} color="#FFF" style={{ marginRight: 4 }} />
              <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{item.promo}</ThemedText>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4, paddingHorizontal: 4 }}>
            <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); handleVote(item.id, 'like'); }} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10, backgroundColor: item.userVote === 'like' ? (isDark ? 'rgba(25, 118, 210, 0.35)' : 'rgba(25, 118, 210, 0.25)') : (isDark ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.1)'), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <MaterialCommunityIcons name="thumb-up" size={18} color="#1976D2" />
              <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: '#1976D2' }}>{formatCount(item.likes)}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); handleVote(item.id, 'dislike'); }} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, backgroundColor: item.userVote === 'dislike' ? (isDark ? 'rgba(250, 128, 114, 0.35)' : 'rgba(250, 128, 114, 0.25)') : (isDark ? 'rgba(250, 128, 114, 0.15)' : 'rgba(250, 128, 114, 0.1)'), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <MaterialCommunityIcons name="thumb-down" size={18} color="#FA8072" />
              <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: '#FA8072' }}>{formatCount(item.dislikes)}</ThemedText>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); handleSave(item.id); }} style={{ marginRight: 16 }}>
              <MaterialCommunityIcons name={savedItems.includes(item.id) ? 'bookmark' : 'bookmark-outline'} size={24} color={savedItems.includes(item.id) ? (isDark ? '#FFF' : '#111') : DC.subtext} />
            </TouchableOpacity>

            {!isWeb && (
              <TouchableOpacity onPress={(e: any) => { e.stopPropagation?.(); handleShare(item); }}>
                <MaterialCommunityIcons name="share-variant-outline" size={24} color={DC.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: 12, borderTopWidth: 1, borderTopColor: DC.divider }}>
             <ActionBtnLine onPress={(e: any) => { e.stopPropagation?.(); openReviews(item, false); }} icon="comment-text-outline" text={(t.entrepreneurshiptab?.reviews || 'Reseñas') + ` (${formatCount(item.reviews?.length || 0)})`} color={isDark ? '#FFF' : '#444'} bgColor={isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'} />
             <ActionBtnLine onPress={(e: any) => { e.stopPropagation?.(); if(item.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`); } else { Linking.openURL(`tel:${item.phone}`); } }} icon={item.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} text={item.contactMethod === 'whatsapp' ? "WhatsApp" : (t.entrepreneurshiptab?.call || 'Llamar')} color={item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} bgColor={item.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)')} />
          </View>
        </View>
        {renderAdminControls && renderAdminControls()}
      </TouchableOpacity>
    );
  };

  const PendingItemCard = ({ item }: { item: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    
    const adminControls = () => (
      <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: DC.border, paddingTop: 15, paddingHorizontal: 15, paddingBottom: 15 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {[1, 3, 6, 12].map(m => (
            <TouchableOpacity key={m} onPress={() => setSelectedMonths(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedMonths === m ? '#4CAF50' : DC.inputBg }}>
               <Text style={{color: selectedMonths === m ? '#FFFFFF' : DC.text, fontWeight: 'bold', fontSize: 12}}>{m}M</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 5 }}>
          <TouchableOpacity onPress={() => rejectItem(item.id)} style={{ flex: 1, backgroundColor: '#FF5252', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{color:'#FFFFFF', fontWeight:'800', fontSize: 15}}>Rechazar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => approveItem(item, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{color:'#FFFFFF', fontWeight:'800', fontSize: 15}}>Aprobar</Text></TouchableOpacity>
        </View>
      </View>
    );
    return <EmprendimientoCard item={item} renderAdminControls={adminControls} />;
  };

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  // =====================================================================
  // 💻 RENDER VISTA
  // =====================================================================
  return (
    <View style={stylesUnified.container}>
      <Head>
        <title>Emprendimientos - Viviendo en USA</title>
        <meta property="og:title" content="Emprendimientos Locales en Viviendo en USA" />
        <meta property="og:description" content="Apoya y descubre los negocios creados por nuestra comunidad." />
        <meta property="og:image" content="https://tu-servidor.com/imagen-portada.jpg" />
      </Head>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>

          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DC.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DC.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder="Código postal..." keyboardType="numeric" maxLength={5} value={zipCode} 
                    onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} placeholderTextColor={DC.subtext} 
                  />
                  <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={isZipValid ? OG as any : DG as any} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={isZipValid ? "#fff" : DC.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowSavedOnly(!showSavedOnly)}>
                    <MaterialCommunityIcons name={showSavedOnly ? "bookmark" : "bookmark-outline"} size={30} color={showSavedOnly ? DC.accent : DC.text} style={{ opacity: showSavedOnly ? 1 : 0.6, marginRight: 8 }} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity >
                    <MaterialCommunityIcons name="lightbulb-multiple-outline" size={40} color={isAdminMode ? DC.accent : DC.text} style={{opacity: isAdminMode ? 1 : 0.2, marginLeft: 2}} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DC.text }]}>{t.entrepreneurshiptab.viewcategory}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map((areaName, index) => {
                        const isActive = selectedCategoryIdx === index;
                        const iconName = CATEGORY_ICONS_DICT[areaName] || ICONS_ARRAY[index] || 'store';
                        return (
                          <TouchableOpacity key={index} onPress={() => setSelectedCategoryIdx(isActive && index !== 0 ? 0 : index)} style={{ marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48, borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
                            {isActive ? (
                              <LinearGradient colors={OG as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{areaName}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DC.inputBg }}>
                                <MaterialCommunityIcons name={iconName as any} size={18} color={DC.text} style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: DC.text, fontWeight: '600', fontSize: 14 }}>{areaName}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DC.inputBg, borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: DC.border, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={DC.iconInactive} style={{ marginRight: 10 }} />
                    <TextInput value={searchText} onChangeText={setSearchText} placeholder={t.entrepreneurshiptab?.searchentrepre} placeholderTextColor={DC.iconInactive} style={{ flex: 1, color: DC.text, fontSize: 15, fontWeight: '300', height: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                    {searchText.length > 0 && ( <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 4 }}><MaterialCommunityIcons name="close-circle" size={20} color={DC.iconInactive} /></TouchableOpacity> )}
                  </View>

                  {!isLargeWeb && (
                    <View style={{ marginBottom: 12 }}>
                      {isWeb ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {CATEGORIES.map((areaName, index) => {
                            const isActive = selectedCategoryIdx === index;
                            const iconName = CATEGORY_ICONS_DICT[areaName] || ICONS_ARRAY[index] || 'store';
                            return (
                              <TouchableOpacity 
                                key={index} 
                                onPress={() => setSelectedCategoryIdx(isActive && index !== 0 ? 0 : index)} 
                                style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DC.border }}
                              >
                                {isActive ? (
                                  <LinearGradient colors={OG as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                    <MaterialCommunityIcons name={iconName as any} size={15} color="#FFF" style={{ marginRight: 6 }} />
                                    <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{areaName}</ThemedText>
                                  </LinearGradient>
                                ) : (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: DC.categoryUnselected }}>
                                    <MaterialCommunityIcons name={iconName as any} size={15} color={DC.iconInactive} style={{ marginRight: 6 }} />
                                    <ThemedText style={{ color: DC.iconInactive, fontWeight: '600', fontSize: 13 }}>{areaName}</ThemedText>
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
                          contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                        >
                          {CATEGORIES.map((areaName, index) => {
                            const isActive = selectedCategoryIdx === index;
                            const iconName = CATEGORY_ICONS_DICT[areaName] || ICONS_ARRAY[index] || 'store';
                            return (
                              <TouchableOpacity 
                                key={index} 
                                onPress={() => setSelectedCategoryIdx(isActive && index !== 0 ? 0 : index)} 
                                style={{ flexShrink: 0, borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DC.border }}
                              >
                                {isActive ? (
                                  <LinearGradient colors={OG as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                    <MaterialCommunityIcons name={iconName as any} size={15} color="#FFF" style={{ marginRight: 6 }} />
                                    <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{areaName}</ThemedText>
                                  </LinearGradient>
                                ) : (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: DC.categoryUnselected }}>
                                    <MaterialCommunityIcons name={iconName as any} size={15} color={DC.iconInactive} style={{ marginRight: 6 }} />
                                    <ThemedText style={{ color: DC.iconInactive, fontWeight: '600', fontSize: 13 }}>{areaName}</ThemedText>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {isAdminMode && pendingItems.length > 0 && (
                      <View style={{ marginBottom: 20 }}>
                        <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15, fontSize: 16 }}>Pendientes de Revisión ({pendingItems.length})</ThemedText>
                        <View style={isLargeWeb ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : {}}>
                          {pendingItems.map(item => <PendingItemCard key={item.id} item={item} />)}
                        </View>
                      </View>
                    )}

                    {results.length > 0 ? (
                      <>
                        <ThemedText style={{ fontSize: 13, color: DC.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? t.genericbtn?.resultdomore : t.genericbtn?.resultone)}</ThemedText>
                        <View style={isLargeWeb ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : {}}>
                          {results.map(item => <EmprendimientoCard key={item.id} item={item} />)}
                        </View>
                      </>
                    ) : (
                      (!loading && zipCode.length === 5) ? (
                        <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="store-off-outline" size={56} color={DC.subtext} />
                          <ThemedText style={{ color: DC.subtext, marginTop: 14, fontWeight: '700', fontSize: 14 }}>{t.entrepreneurshiptab?.nofoundresults || 'No hay resultados'}</ThemedText>
                        </View>
                      ) : (
                        (!zipCode || zipCode.length < 5) && !isAdminMode && !showSavedOnly && (
                          <View style={{ flex: 1, alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}><MaterialCommunityIcons name="map-marker-radius" size={40} color={DC.subtext} /></View>
                            <ThemedText style={{ textAlign: 'center', color: DC.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>Descubre Emprendimientos</ThemedText>
                            <ThemedText style={{ textAlign: 'center', color: DC.subtext, fontSize: 14, lineHeight: 20 }}>Ingresa un código postal para apoyar a emprendedores en tu zona.</ThemedText>
                          </View>
                        )
                      )
                    )}

                    {showSavedOnly && results.length === 0 && (
                        <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="bookmark-off-outline" size={56} color={DC.subtext} />
                          <ThemedText style={{ color: DC.subtext, marginTop: 14, fontWeight: '700', fontSize: 14, textAlign: 'center' }}>No tienes emprendimientos guardados aún.</ThemedText>
                        </View>
                    )}

                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity onPress={() => setFormVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={OG as any} style={{ flex: 1, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}><MaterialCommunityIcons name="lightbulb-multiple-outline" size={30} color="#fff" /></LinearGradient>
      </TouchableOpacity>

      {/* MODAL DETALLE */}
      <RNModal visible={!!detailItem} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setDetailItem(null)}>
        {detailItem && (
          <View style={isLargeWeb ? { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' } : { flex: 1 }}>
            {isLargeWeb ? (
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDetailItem(null)} />
            ) : (
              <BlurView style={StyleSheet.absoluteFill} intensity={90} tint={isDark ? 'dark' : 'light'} />
            )}

            <View style={isLargeWeb ? { width: 550, height: height * 0.85, borderRadius: 32, overflow: 'hidden', backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderWidth: 1, borderColor: DC.border } : { flex: 1 }}>
              {isLargeWeb && !isAndroid && <BlurView style={StyleSheet.absoluteFill} intensity={100} tint={isDark ? 'dark' : 'light'} />}

              <View style={{ position: 'relative' }}>
                 {detailItem.image && detailItem.image.length > 5 ? ( <Image source={{ uri: detailItem.image }} style={S.detailHeroImage} resizeMode="cover" /> ) : ( <View style={[S.detailHeroImage, { backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center' }]}><MaterialCommunityIcons name="image-off-outline" size={50} color={DC.subtext} /></View> )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
                <TouchableOpacity onPress={() => setDetailItem(null)} style={[S.detailCloseBtn, { top: isLargeWeb ? 16 : insets.top + 12 }]}><MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" /></TouchableOpacity>
                {detailItem.rating > 0 && (
                  <View style={S.detailRatingBadge}><MaterialCommunityIcons name="star" size={14} color="#FFC371" /><ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 14, marginLeft: 4 }}>{detailItem.rating.toFixed(1)}</ThemedText></View>
                )}
              </View>
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={isIOS ? 'padding' : 'height'}>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: isLargeWeb ? 40 : insets.bottom + 40 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                    <LinearGradient colors={OG as any} style={[S.cardIconWrap, { width: 48, height: 48, borderRadius: 15, marginRight: 14 }]}><MaterialCommunityIcons name={CATEGORY_ICONS_DICT[CATEGORIES[detailItem.categoryId]] || ICONS_ARRAY[detailItem.categoryId] || 'store' as any} size={24} color="#FFF" /></LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}><ThemedText style={{ fontWeight: '900', fontSize: 20, color: DC.text }}>{detailItem.name}</ThemedText>{detailItem.verified && <MaterialCommunityIcons name="check-decagram" size={20} color="#4FC3F7" />}</View>
                      <ThemedText style={{ color: DC.subtext, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{CATEGORIES[detailItem.categoryId]}</ThemedText>
                      
                      {detailItem.address ? (
                        <ThemedText style={{ color: '#FF5F6D', fontSize: 14, fontWeight: '700', marginTop: 4 }}>
                          <MaterialCommunityIcons name="map-marker-outline" size={13} />
                           {detailItem.zip +' '+detailItem.address}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                  {detailItem.promo && ( <View style={[S.promoBadge, { marginBottom: 16 }]}><MaterialCommunityIcons name="tag-outline" size={14} color="#FFF" style={{ marginRight: 6 }} /><ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{detailItem.promo}</ThemedText></View> )}
                  <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}><MaterialCommunityIcons name="text-box-outline" size={17} color={DC.accent} style={{ marginRight: 8 }} /><ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>{t.entrepreneurshiptab?.aboutBussines || 'Sobre el negocio'}</ThemedText></View>
                    <ThemedText style={{ color: DC.subtext, fontSize: 14, lineHeight: 22 }}>{detailItem.description}</ThemedText>
                  </View>
                  <View style={[S.contactRow, { marginBottom: 16, flexWrap: 'wrap' }]}>
                    <TouchableOpacity onPress={() => { if(detailItem.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${detailItem.phone.replace(/\D/g, '')}`); } else { Linking.openURL(`tel:${detailItem.phone}`); } }} style={[S.contactBtn, { backgroundColor: detailItem.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)'), flexGrow: 1, minWidth: 130 }]}>
                      <MaterialCommunityIcons name={detailItem.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color={detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} />
                      <ThemedText style={[S.contactBtnText, { color: detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D", fontSize: 14 }]}>{detailItem.contactMethod === 'whatsapp' ? "WhatsApp" : (t.entrepreneurshiptab?.call || "Llamar")}</ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg, marginBottom: 20 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleVote(detailItem.id, 'like')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10, backgroundColor: detailItem.userVote === 'like' ? (isDark ? 'rgba(25, 118, 210, 0.35)' : 'rgba(25, 118, 210, 0.25)') : (isDark ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.1)'), paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                          <MaterialCommunityIcons name="thumb-up" size={20} color="#1976D2" />
                          <ThemedText style={{ marginLeft: 6, fontSize: 14, fontWeight: '800', color: '#1976D2' }}>{formatCount(detailItem.likes)}</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleVote(detailItem.id, 'dislike')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, backgroundColor: detailItem.userVote === 'dislike' ? (isDark ? 'rgba(250, 128, 114, 0.35)' : 'rgba(250, 128, 114, 0.25)') : (isDark ? 'rgba(250, 128, 114, 0.15)' : 'rgba(250, 128, 114, 0.1)'), paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                          <MaterialCommunityIcons name="thumb-down" size={20} color="#FA8072" />
                          <ThemedText style={{ marginLeft: 6, fontSize: 14, fontWeight: '800', color: '#FA8072' }}>{formatCount(detailItem.dislikes)}</ThemedText>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleSave(detailItem.id)} style={{ marginRight: 16 }}>
                          <MaterialCommunityIcons name={savedItems.includes(detailItem.id) ? 'bookmark' : 'bookmark-outline'} size={26} color={savedItems.includes(detailItem.id) ? (isDark ? '#FFF' : '#111') : DC.subtext} />
                        </TouchableOpacity>

                        {!isWeb && (
                          <TouchableOpacity onPress={() => handleShare(detailItem)}>
                            <MaterialCommunityIcons name="share-variant-outline" size={26} color={DC.subtext} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color={DC.accent} style={{ marginRight: 8 }} />
                        <ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>{t.entrepreneurshiptab?.reviews || 'Reseñas'}</ThemedText>
                        {detailItem.reviews.length > 0 && ( <View style={[S.reviewCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }]}><ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '800' }}>{formatCount(detailItem.reviews.length)}</ThemedText></View> )}
                      </View>
                      {!showReviewInput && (
                          <TouchableOpacity onPress={() => setShowReviewInput(true)} style={{ borderRadius: 12, overflow: 'hidden' }}>
                            <LinearGradient colors={OG as any} style={{ paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}><MaterialCommunityIcons name="pencil-outline" size={14} color="#FFF" /><ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{t.entrepreneurshiptab?.writing || 'Escribir'}</ThemedText></LinearGradient>
                          </TouchableOpacity>
                      )}
                    </View>
                    {showReviewInput ? ( <ReviewForm isDark={isDark} t={t} onCancel={() => setShowReviewInput(false)} onPublish={(stars: number, comment: string) => handleAddReview(detailItem.id, stars, comment)} />
                    ) : ( detailItem.reviews.length === 0 ? (
                          <View style={{ alignItems: 'center', paddingVertical: 20, opacity: 0.5 }}><MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.iconInactive} /><ThemedText style={{ color: DC.iconInactive, marginTop: 10, fontSize: 13 }}>{t.entrepreneurshiptab?.whitoutReviews || 'Aún no hay reseñas.'}</ThemedText></View>
                        ) : (
                          <>
                              {detailItem.reviews.slice(0, 2).map((r: any) => (
                                <View key={r.id} style={[S.reviewCard, { backgroundColor: DC.inputBg, borderColor: DC.border }]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', gap: 3 }}>{[1, 2, 3, 4, 5].map(s => ( <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} /> ))}</View>
                                    <ThemedText style={{ color: DC.subtext, fontSize: 11 }}>{r.displayTime || 'Nuevo'}</ThemedText>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 5 }}>
                                    {r.image ? ( <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/> ) : ( <MaterialCommunityIcons name="account-circle" size={24} color={DC.subtext} /> )}
                                    <ThemedText style={{ color: DC.text, fontSize: 12 ,alignContent:'flex-end',fontStyle: 'italic'}}>{r.name}</ThemedText>
                                  </View> 
                                  <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>{r.comment}</ThemedText>
                                </View>
                              ))}
                              {detailItem.reviews.length > 2 && ( <TouchableOpacity onPress={() => openReviews(detailItem, false)} style={{ alignItems: 'center', paddingVertical: 10 }}><ThemedText style={{ color: DC.accent, fontWeight: '800', fontSize: 14 }}>{t.entrepreneurshiptab?.viewAllreviews || 'Ver todas las reseñas'}</ThemedText></TouchableOpacity> )}
                          </>
                        )
                    )}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </View>
        )}
      </RNModal>

      {/* MODAL RESEÑAS INDEPENDIENTE (VER TODAS) */}
      <RNModal visible={!!reviewTarget} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { setReviewTarget(null); setShowReviewInput(false); }}>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setReviewTarget(null); setShowReviewInput(false); }} />
            <View style={[S.reviewModalBox, { backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderColor: DC.border }]}>
              {!isAndroid && ( <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> )}
              <View style={{ padding: 25, flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View style={{ flex: 1 }}><ThemedText style={{ fontSize: 20, fontWeight: '900', color: DC.text }}>{reviewTarget?.name}</ThemedText><ThemedText style={{ color: DC.text, fontWeight: '700' }}>{t.entrepreneurshiptab?.communityopinions || 'Opiniones de la comunidad'}</ThemedText></View>
                  <TouchableOpacity onPress={() => { setReviewTarget(null); setShowReviewInput(false); }}><MaterialCommunityIcons name="close" size={28} color={DC.text} /></TouchableOpacity>
                </View>
                {!showReviewInput ? (
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => setShowReviewInput(true)} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}><LinearGradient colors={OG as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.entrepreneurshiptab?.writingReviews || 'Escribir reseña'}</ThemedText></LinearGradient></TouchableOpacity>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {(reviewTarget?.reviews ?? []).length > 0
                        ? (reviewTarget?.reviews ?? []).map((r: any) => (
                            <View key={r.id} style={[S.reviewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderColor: DC.border }]}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 3 }}>{[1, 2, 3, 4, 5].map(s => ( <MaterialCommunityIcons key={s} name="star" size={15} color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} /> ))}</View>
                                <ThemedText style={{ color: DC.iconInactive, fontSize: 11, marginLeft: 6, alignContent:'flex-end' ,fontStyle: 'italic' }}>{r.displayTime || 'Nuevo'}</ThemedText>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 5 }}>
                                {r.image ? ( <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/> ) : ( <MaterialCommunityIcons name="account-circle" size={24} color={DC.subtext} /> )}
                                <ThemedText style={{ color: DC.text, fontSize: 12 ,alignContent:'flex-end',fontStyle: 'italic'}}>{r.name}</ThemedText>
                              </View> 
                              <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>{r.comment}</ThemedText>
                            </View>
                          ))
                        : ( <View style={{ alignItems: 'center', marginTop: 30, opacity: 0.5 }}><MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.iconInactive} /><ThemedText style={{ color: DC.iconInactive, marginTop: 10 }}>{t.entrepreneurshiptab?.whitoutReviews || 'Aún no hay reseñas.'}</ThemedText></View> )
                      }
                    </ScrollView>
                  </View>
                ) : (
                  <ReviewForm isDark={isDark} t={t} onCancel={() => setShowReviewInput(false)} onPublish={(stars: number, comment: string) => handleAddReview(reviewTarget!.id, stars, comment)} />
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      {/* MODAL FORMULARIO PUBLICAR EMPRENDIMIENTO */}
      <RNModal visible={isFormVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isSubmitting && setFormVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={[S.modalBlur, { backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DC.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40 }]}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={[S.modalHeader, { paddingHorizontal: 25, marginTop: isLargeWeb ? 25 : 0 }]}>
                <TouchableOpacity onPress={() => setFormVisible(false)} disabled={isSubmitting}><MaterialCommunityIcons name="close" size={24} color={DC.text} /></TouchableOpacity>
                <ThemedText style={[S.modalTitle, { color: DC.text }]}>{t.entrepreneurshiptab?.newentrepreneurship || 'Nuevo Emprendimiento'}</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <TouchableOpacity onPress={pickImage} style={[S.imagePicker, { borderColor: DC.border, backgroundColor: DC.inputBg }]}>
                  {formImage ? <Image source={{ uri: formImage }} style={S.formImagePreview} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} color={DC.text} /><ThemedText style={{  marginTop: 1, fontWeight: '800', fontSize: 11 ,textTransform:'none', color:DC.iconInactive }}>{t.entrepreneurshiptab?.businessphoto || 'FOTO'}</ThemedText></View> }
                </TouchableOpacity>

                <ThemedText style={[S.label, { color: DC.text }]}>{t.entrepreneurshiptab?.viewcategory || 'CATEGORÍA'}</ThemedText>
                
                {/* 🚀 CATEGORÍAS DEL MODAL: FlexWrap para que fluyan en Web */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {CATEGORIES.map((catName, index) => {
                    if (index === 0) return null; 
                    const isActive = formCategoryIdx === index;
                    const iconName = CATEGORY_ICONS_DICT[catName] || ICONS_ARRAY[index] || 'store';
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
                        {isActive ? (
                          <LinearGradient colors={OG as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={13} color="#FFF" style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '900' ,textTransform:'none'}}>{catName}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DC.categoryUnselected }}>
                            <MaterialCommunityIcons name={iconName as any} size={13} color={DC.iconInactive} style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: DC.iconInactive, fontSize: 12, fontWeight: '700'  ,textTransform:'none'}}>{catName}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput value={formName} onChangeText={(text) => setFormName(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" placeholder={t.entrepreneurshiptab?.namebussinesplac || 'Nombre del negocio'} placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                
                <TextInput value={formAddress} onChangeText={(text) => setFormAddress(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" placeholder={'Dirección del negocio'} placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <TextInput value={formZip} onChangeText={setFormZip} placeholder="Código Postal (Zip)" keyboardType="numeric" maxLength={5} placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />
                <TextInput value={formDesc} onChangeText={(text) => setFormDesc(text ? text.charAt(0).toUpperCase() + text.slice(1) : '')} multiline autoCapitalize="sentences" placeholder={t.entrepreneurshiptab?.descripservicesplace || 'Descripción de servicios...'} placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} numberOfLines={3} style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, minHeight: 80, textAlignVertical: 'top', paddingTop: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <ThemedText style={[S.label, { color: DC.text }]}>{t.entrepreneurshiptab?.contactMethod || 'Método de contacto'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : DC.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : DC.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : DC.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : DC.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? '#FF5F6D' : DC.border, backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : DC.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? '#FF5F6D' : DC.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'phone' ? '#FF5F6D' : DC.subtext }}>{t.entrepreneurshiptab?.call || 'Llamar'}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DC.inputBg, borderRadius: 15, borderWidth: 1, borderColor: DC.border, marginBottom: 14, overflow: 'hidden' }}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DC.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DC.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DC.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone} placeholder="(909) 000-0000" placeholderTextColor={isDark ? '#B0BEC5' : '#364045'} keyboardType="phone-pad" style={{ flex: 1, color: DC.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <ThemedText style={[S.label, { color: DC.text }]}>{t.entrepreneurshiptab?.promotion || 'Promoción'}</ThemedText>
                <TextInput value={formPromo}  onChangeText={(text) => setFormPromo(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" placeholder={t.entrepreneurshiptab?.exampleoffet || 'Ej: 10% de descuento'} placeholderTextColor={isDark ? '#B0BEC5' : '#364045'} style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, marginBottom: 20, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <TouchableOpacity onPress={handlePublish} disabled={!formName.trim() || !formAddress.trim() || !formDesc.trim() || !formPhone.trim() || !formImage || formZip.length < 5 || isSubmitting}>
                  <LinearGradient colors={(formName.trim() && formAddress.trim() && formDesc.trim() && formPhone.trim() && formImage && formZip.length === 5) ? OG as any : DG as any} style={[S.publishBtn, { opacity: (formName.trim() && formAddress.trim() && formDesc.trim() && formPhone.trim() && formImage && formZip.length === 5) ? 1 : 0.55 }]}>
                    {isSubmitting ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="store-plus-outline" size={20} color="#fff" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{t.entrepreneurshiptab?.publishEntrepre || 'Publicar'}</ThemedText></>}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>
    </View>
  );
}

// =====================================================================
// 🎨 6. ESTILOS (STYLESHEET)
// =====================================================================
const S = StyleSheet.create({
  card:         { borderRadius: 28, marginBottom: 20, borderWidth: 1, overflow: 'hidden', width: '100%' },
  cardImage:    { width: '100%', height: 140 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  promoBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5F6D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, alignSelf: 'flex-start' },
  verMasBadge:  { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 },
  footer:         { borderTopWidth: 1, paddingTop: 10, gap: 9 },
  reviewsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  contactRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  contactBtn:     { height: 38, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  contactBtnText: { fontSize: 12, fontWeight: '800' },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rxBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, gap: 4 },
  rxCount:      { fontSize: 11, fontWeight: '800' },
  detailHeroImage:   { width: '100%', height: 260 },
  detailCloseBtn:    { position: 'absolute', left: 16, backgroundColor: 'rgba(0,0,0,0.5)', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  detailRatingBadge: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  detailSection:     { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  detailRxBtn:       { height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  detailRxText:      { fontSize: 13, fontWeight: '800' },
  reviewCountBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewCard:       { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewModalBox:   { width: '92%', height: '78%', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
  fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30, shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  modalBlur:        { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalContent:     { padding: 22 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle:       { fontWeight: '900', fontSize: 17 },
  label:            { fontSize: 14, marginBottom: 9, letterSpacing: 0.2 },
  input:            { borderRadius: 15, padding: 15, fontSize: 14, marginBottom: 14, borderWidth: 1, fontWeight: '600' },
  imagePicker:      { width: '100%', height: 148, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 6 },
  formImagePreview: { width: '100%', height: '100%' },
  editImageIcon:    { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  publishBtn:       { height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 8 },
});