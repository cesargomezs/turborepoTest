import React, { useState, useMemo, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, Linking, Alert, Share,
  Modal as RNModal, KeyboardAvoidingView, ActivityIndicator,
  ColorValue, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { useMockSelector } from '@/redux/slices';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

import badWordsData from '../../../utils/babwords.json';

// --- VALIDACIÓN ---
const BANNED_WORDS = Array.isArray((badWordsData as any).badWordsList)
  ? (badWordsData as any).badWordsList : [];
const validateComment = (text: string): boolean =>
  !BANNED_WORDS.some((w: string) => text.toLowerCase().includes(w.toLowerCase()));

// 📡 URL BASE PARA LOS EMPRENDIMIENTOS
const API_ENTREPRENEURSHIP_URL = 'http://192.168.1.107:3000/entrepreneurship';

// --- TIPOS ---
type Review = {
  id: string;
  stars: number;
  comment: string;
  displayTime: string;
};

type Emprendimiento = {
  id: string;
  name: string;
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
};

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' }
];

const ICONS_ARRAY = ['apps', 'sale', 'wrench-outline', 'silverware-fork-knife', 'heart-pulse', 'laptop'];

// --- COMPONENTE: FORMULARIO DE RESEÑA ---
const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (!validateComment(comment)) {
      const errorMsg = t.communitytab?.textInappropriateDescription || "Comentario inapropiado";
      if (Platform.OS === 'web') { window.alert(errorMsg); } 
      else { Alert.alert("Error", errorMsg); }
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>{t.entrepreneurshiptab?.backBtn || 'Volver'}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20, color: isDark ? '#FFF' : '#1A1A1A' }}>
        {t.entrepreneurshiptab?.viewExpe || 'Tu Experiencia'}
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <MaterialCommunityIcons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput value={comment} onChangeText={setComment} placeholder={t.entrepreneurshiptab?.viewopinion || "Escribe tu opinión..."} placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} multiline style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="send" size={18} color="#FFF" />
          <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>{t.entrepreneurshiptab?.publishReviews || 'Publicar reseña'}</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

export default function EntrepreneurshipScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();
  const router = useRouter();
  
  // 🚀 BLINDAJE REDUX
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;

  const isWeb      = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid  = Platform.OS === 'android';
  const isIOS      = Platform.OS === 'ios';

  const rawCategories = t.entrepreneurshiptab?.categoryentre;
  const CATEGORIES = Array.isArray(rawCategories) && rawCategories.length > 0 
      ? rawCategories 
      : ['Todas', 'Venta de garaje', 'Reparaciones', 'Comida', 'Salud', 'Tecnología'];
  
  const CATEGORY_ICONS_DICT: Record<string, string> = t.entrepreneurshiptab?.categoryentreicon || {
      'Todas':             'apps',
      'Venta de garaje':   'sale',
      'Reparaciones':      'wrench-outline', 
      'Comida':            'silverware-fork-knife',
      'Salud':             'heart-pulse',
      'Tecnología':        'laptop',
  };

  const DC = {
    text:               isDark ? '#FFFFFF'                  : '#1A1A1A',
    textmes:            isDark ? '#FFFFFF'                  : '#1A1A1A',
    subtext:            isDark ? '#B0BEC5'                  : '#546E7A',
    accent:             isDark ? '#FF5F6D'                  : '#FF5F6D',
    border:             isDark ? 'rgba(255,255,255,0.22)'   : 'rgba(0,0,0,0.1)',
    inputBg:            isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    iconInactive:       isDark ? '#B0BEC5'                  : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    cardBg:             isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    divider:            isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(0,0,0,0.07)',
    sectionBg:          isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.02)',
  };

  const OG: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'];
  const DG: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  // --- State Principal ---
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState<Emprendimiento[]>([]);
  const [results, setResults] = useState<Emprendimiento[]>([]);
  
  // --- State Modales ---
  const [isFormVisible, setFormVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<Emprendimiento | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Emprendimiento | null>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  // --- Formulario nuevo emprendimiento ---
  const [formName, setFormName] = useState('');
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

  const triggerAlert = (title: string, msg: string) =>
    isWeb ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);

  // --- FETCH DESDE EL BACKEND ---
  const fetchEntrepreneurships = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENTREPRENEURSHIP_URL}?zip=${searchZip.trim()}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData: Emprendimiento[] = data.map(item => ({
          id: item.id,
          name: item.nameEntrepren || 'Sin nombre',
          categoryId: Number(item.categoryId) || 0,
          description: item.descriptionEntrepren || '',
          rating: item.rating || 5.0, // <-- Ahora recibe el promedio del backend
          phone: item.phone || '',
          verified: item.verified || false,
          promo: item.promo || null,
          image: item.imageEntrepren || '',
          likes: 0, dislikes: 0, userVote: null, saved: item.saved || false, 
          reviews: item.reviews || [], // <-- Recibe las reseñas del backend
          contactMethod: item.contactMethod || 'whatsapp',
          zip: item.zip || ''
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

  const handleSearch = async (forcedCategoryIdx?: number) => {
    if (!isZipValid) return;
    const categoryToSearch = forcedCategoryIdx !== undefined ? forcedCategoryIdx : selectedCategoryIdx;
    
    const backendData = await fetchEntrepreneurships(zipCode);
    applyFilters(backendData, categoryToSearch, searchText);
  };

  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) {
      setResults([]);
      setLocalData([]);
    }
  };

  const applyFilters = (dataList: Emprendimiento[], catIdx: number, textQuery: string) => {
    let list = catIdx === 0 ? dataList : dataList.filter(l => l.categoryId === catIdx);
    if (textQuery.trim()) {
      const q = textQuery.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    setResults(list);
  };

  useEffect(() => {
    applyFilters(localData, selectedCategoryIdx, searchText);
  }, [selectedCategoryIdx, searchText, localData]);

  // --- Image picker ---
  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!r.canceled) setFormImage(r.assets[0].uri);
  };

  // --- Votos Local ---
  const applyVote = (item: Emprendimiento, type: 'like' | 'dislike'): Emprendimiento => {
    const isSel = item.userVote === type;
    return {
      ...item,
      likes:    type === 'like'    ? (isSel ? item.likes - 1 : item.likes + 1)       : (item.userVote === 'like'    ? item.likes - 1    : item.likes),
      dislikes: type === 'dislike' ? (isSel ? item.dislikes - 1 : item.dislikes + 1) : (item.userVote === 'dislike' ? item.dislikes - 1 : item.dislikes),
      userVote: isSel ? null : type,
    };
  };

  const handleVote = (id: string, type: 'like' | 'dislike') => {
    setLocalData(prev => prev.map(it => it.id === id ? applyVote(it, type) : it));
    setDetailItem(prev => prev?.id === id ? applyVote(prev, type) : prev);
  };

  const applySave = (item: Emprendimiento): Emprendimiento => ({ ...item, saved: !item.saved });
  const handleSave = (id: string) => {
    setLocalData(prev => prev.map(it => it.id === id ? applySave(it) : it));
    setDetailItem(prev => prev?.id === id ? applySave(prev) : prev);
  };

  const handleShare = (item: Emprendimiento) =>
    Share.share({ message: `${item.name}\n${item.description}\nTel: ${item.phone}` });

  // 🚀 --- RESEÑAS CONECTADAS AL BACKEND ---
  const handleAddReview = async (targetId: string, stars: number, comment: string) => {
    try {
      const payload = {
        reference_id: targetId,
        stars: stars,
        comment: comment,
        userId: userMetadata?.id || null
      };

      // 1. Guardar en PostgreSQL
      const response = await fetch(`${API_ENTREPRENEURSHIP_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Fallo al guardar reseña en el servidor");

      const savedReview = await response.json();

      // 2. Formatear para la vista local
      const newReview: Review = {
        id: savedReview.id || Date.now().toString(),
        stars: savedReview.stars || stars,
        comment: savedReview.comment || comment,
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      let newAverage = 0;

      // 3. Actualizar los estados visuales sin recargar
      setLocalData(prev => prev.map(it => {
          if (it.id === targetId) {
              const updatedReviews = [newReview, ...it.reviews];
              newAverage = updatedReviews.reduce((acc, r) => acc + r.stars, 0) / updatedReviews.length;
              return { ...it, reviews: updatedReviews, rating: newAverage };
          }
          return it;
      }));

      setDetailItem(prev => {
          if (prev?.id === targetId) {
             const updatedReviews = [newReview, ...prev.reviews];
             return { ...prev, reviews: updatedReviews, rating: newAverage };
          }
          return prev;
      });

      setReviewTarget(prev => {
          if (prev?.id === targetId) {
             const updatedReviews = [newReview, ...prev.reviews];
             return { ...prev, reviews: updatedReviews, rating: newAverage };
          }
          return prev;
      });

      setShowReviewInput(false);
      triggerAlert('¡Gracias!', 'Tu reseña ha sido publicada exitosamente.');

    } catch (error) {
      triggerAlert('Error', 'No se pudo guardar la reseña. Revisa tu conexión.');
    }
  };

  const openReviews = (item: Emprendimiento, focusInput: boolean = false) => {
    if (detailItem) {
      setDetailItem(null); 
      setTimeout(() => {
        setReviewTarget(item);
        setShowReviewInput(focusInput);
      }, Platform.OS === 'ios' ? 350 : 50); 
    } else {
      setReviewTarget(item);
      setShowReviewInput(focusInput);
    }
  };

  // --- PUBLICAR EMPRENDIMIENTO AL BACKEND ---
  const handlePublish = async () => {
    if (!formName.trim() || !formDesc.trim() || !formPhone.trim() || !formImage || formZip.length < 5) {
      triggerAlert('Campos incompletos', 'Completa nombre, descripción, teléfono, código postal e imagen.'); return;
    }
    setIsSubmitting(true);
    
    try {
      let finalImageName = '';
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsSubmitting(false);
          triggerAlert("Imagen bloqueada", "La imagen no cumple nuestras normas.");
          return;
        }

        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('imagen', { uri: formImage, name: filename, type } as any);

        const uploadResponse = await fetch('http://192.168.1.107:3000/api/subir-imagen-optimizada/entrepreneurship', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' },
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || "Error subiendo imagen");
        finalImageName = uploadData.identificadorArchivo;
      }

      const fullPhone = `${COUNTRIES[countryIdx].code}${formPhone.trim()}`;

      const payload = {
        nameEntrepren: formName.trim(), 
        categoryId: String(formCategoryIdx), 
        descriptionEntrepren: formDesc.trim(), 
        phone: fullPhone,
        verified: false, 
        promo: formPromo.trim() || null, 
        imageEntrepren: finalImageName,
        saved: false, 
        contactMethod: formContactMethod,
        zip: formZip.trim(),
        userId: userMetadata?.id || null
      };

      const response = await fetch(API_ENTREPRENEURSHIP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error al guardar");

      const newLocalItem: Emprendimiento = {
        id: savedFromDB.id, 
        name: savedFromDB.nameEntrepren, 
        categoryId: Number(savedFromDB.categoryId) || 0, 
        description: savedFromDB.descriptionEntrepren, 
        rating: 5.0, 
        phone: savedFromDB.phone,
        verified: false, 
        promo: savedFromDB.promo, 
        image: formImage,
        likes: 0, dislikes: 0, userVote: null, saved: false, reviews: [],
        contactMethod: savedFromDB.contactMethod,
        zip: savedFromDB.zip
      };
      
      setLocalData(prev => [newLocalItem, ...prev]);
      
      setFormName(''); setFormDesc(''); setFormPhone(''); setFormZip('');
      setFormPromo(''); setFormImage(null); setFormCategoryIdx(1); setCountryIdx(0); setFormContactMethod('whatsapp');
      setIsSubmitting(false); setFormVisible(false);
      
      if (!zipCode || zipCode.length < 5) {
        setZipCode(payload.zip);
        handleSearch();
      }

      triggerAlert('¡Éxito!', 'Tu emprendimiento fue publicado.');

    } catch (err: any) {
      triggerAlert("Error", err.message || "Error conectando con el servidor. Revisa tu conexión.");
      setIsSubmitting(false);
    }
  };

  // --- Dimensiones ---
  const cardWidth      = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight     = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const ActionGridBtn = ({ icon, text, color, bgColor, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flexBasis: '48%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8 }}>
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

  const ActionBtnLine = ({ icon, text, color, bgColor, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flexGrow: 1, flexBasis: 80, height: 40, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8, marginRight: 6 }}>
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText numberOfLines={1} style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

  const EmprendimientoCard = ({ item }: { item: Emprendimiento }) => {
    const categoryName = CATEGORIES[item.categoryId] || 'Categoría';
    const categoryIcon = CATEGORY_ICONS_DICT[categoryName] || ICONS_ARRAY[item.categoryId] || 'store';

    return (
      <TouchableOpacity activeOpacity={0.93}
        onPress={() => { setDetailItem(item); setShowReviewInput(false); }}
        style={[S.card, { backgroundColor: DC.cardBg, borderColor: DC.border }]}>
        
        {item.image && item.image.length > 5 ? (
          <Image source={{ uri: item.image }} style={S.cardImage} resizeMode="cover" />
        ) : (
          <View style={[S.cardImage, { backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="image-off-outline" size={40} color={DC.subtext} />
          </View>
        )}
        
        <View style={S.verMasBadge}>
          <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
          <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{t.entrepreneurshiptab?.viewdetail || 'Ver detalle'}</ThemedText>
        </View>

        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <LinearGradient colors={OG} style={S.cardIconWrap}>
              <MaterialCommunityIcons name={categoryIcon as any} size={18} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <ThemedText style={{ fontWeight: '900', fontSize: 15, color: DC.text, flexShrink: 1 }}>
                  {item.name}
                </ThemedText>
                {item.verified && <MaterialCommunityIcons name="check-decagram" size={15} color="#4FC3F7" />}
              </View>
              <ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '600' }}>{categoryName}</ThemedText>
            </View>
            {item.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,195,113,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                <MaterialCommunityIcons name="star" size={12} color="#FFC371" />
                <ThemedText style={{ color: DC.text, fontWeight: '800', fontSize: 12 }}>{item.rating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>

          <ThemedText numberOfLines={2} style={{ color: DC.subtext, marginBottom: 10, fontSize: 13, lineHeight: 18 }}>
            {item.description}
          </ThemedText>

          {item.promo && (
            <View style={[S.promoBadge, { marginBottom: 12 }]}>
              <MaterialCommunityIcons name="tag-outline" size={11} color="#FFF" style={{ marginRight: 4 }} />
              <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{item.promo}</ThemedText>
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: DC.divider }}>
             <ActionBtnLine 
               onPress={(e: any) => { e.stopPropagation?.(); openReviews(item, false); }} 
               icon="comment-text-outline" 
               text={(t.entrepreneurshiptab?.reviews || 'Reseñas') + ` (${item.reviews.length})`} 
               color={isDark ? '#FFF' : '#444'} 
               bgColor={isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'} 
             />
             
             <ActionBtnLine 
               onPress={(e: any) => {
                 e.stopPropagation?.();
                 if(item.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`); } 
                 else { Linking.openURL(`tel:${item.phone}`); }
               }} 
               icon={item.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} 
               text={item.contactMethod === 'whatsapp' ? "WhatsApp" : (t.entrepreneurshiptab?.call || 'Llamar')} 
               color={item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} 
               bgColor={item.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)')} 
             />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>

          <View style={{
            width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28,
            backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0, borderColor: DC.border,
          }}>
            {!isAndroid && (
              <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            )}

            <View style={stylesUnified.cardContent}>

              {/* 🚀 HEADER CON BUSCADOR INTEGRADO */}
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DC.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder="Código postal..." 
                    keyboardType="numeric" maxLength={5} value={zipCode} 
                    onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} 
                    placeholderTextColor={DC.subtext} 
                  />
                  <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={isZipValid ? OG : DG} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={isZipValid ? "#fff" : DC.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="lightbulb-multiple-outline" size={40} color={DC.text} style={{opacity: 0.2, marginLeft: 5}} />
                </View>
              </View>

              
              

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>

                {/* --- SIDEBAR IZQUIERDO (solo isLargeWeb) --- */}
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DC.text }]}>{t.entrepreneurshiptab.viewcategory}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map((areaName, index) => {
                        const isActive = selectedCategoryIdx === index;
                        const iconName = CATEGORY_ICONS_DICT[areaName] || ICONS_ARRAY[index] || 'store';
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() => setSelectedCategoryIdx(isActive && index !== 0 ? 0 : index)}
                            style={{
                              marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48,
                              borderWidth: isActive ? 0 : 1, borderColor: DC.border,
                            }}>
                            {isActive ? (
                              <LinearGradient
                                colors={OG}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
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

                {/* --- CONTENIDO PRINCIPAL --- */}
                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DC.inputBg, borderRadius: 16, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: DC.border, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="magnify" size={22} color={DC.iconInactive} style={{ marginRight: 10 }} />
                    <TextInput value={searchText} onChangeText={setSearchText}
                      placeholder={t.entrepreneurshiptab?.searchentrepre}
                      placeholderTextColor={DC.iconInactive}
                      style={{ flex: 1, color: DC.text, fontSize: 15, fontWeight: '600', height: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                    {searchText.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 4 }}>
                        <MaterialCommunityIcons name="close-circle" size={20} color={DC.iconInactive} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {!isLargeWeb && (
                    <View style={{ marginBottom: 12 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        {CATEGORIES.map((areaName, index) => {
                            const isActive = selectedCategoryIdx === index;
                            const iconName = CATEGORY_ICONS_DICT[areaName] || ICONS_ARRAY[index] || 'store';
                            
                            return (
                                <TouchableOpacity key={index} onPress={() => setSelectedCategoryIdx(isActive && index !== 0 ? 0 : index)}
                                  style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
                                  {isActive ? (
                                    <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
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
                    </View>
                  )}

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {results.length > 0 ? (
                      <>
                        <ThemedText style={{ fontSize: 13, color: DC.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? t.genericbtn?.resultdomore : t.genericbtn?.resultone)}</ThemedText>
                        {results.map(item => <EmprendimientoCard key={item.id} item={item} />)}
                      </>
                    ) : (
                      (!loading && zipCode.length === 5) ? (
                        <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="store-off-outline" size={56} color={DC.subtext} />
                          <ThemedText style={{ color: DC.subtext, marginTop: 14, fontWeight: '700', fontSize: 14 }}>
                            {t.entrepreneurshiptab?.nofoundresults || 'No hay resultados'}
                          </ThemedText>
                        </View>
                      ) : (
                        (!zipCode || zipCode.length < 5) && (
                          <View style={{ flex: 1, alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                              <MaterialCommunityIcons name="map-marker-radius" size={40} color={DC.subtext} />
                            </View>
                            <ThemedText style={{ textAlign: 'center', color: DC.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                              Descubre Emprendimientos
                            </ThemedText>
                            <ThemedText style={{ textAlign: 'center', color: DC.subtext, fontSize: 14, lineHeight: 20 }}>
                              Ingresa un código postal para apoyar a emprendedores en tu zona.
                            </ThemedText>
                          </View>
                        )
                      )
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB - BOTÓN FLOTANTE UNIVERSAL */}
      <TouchableOpacity onPress={() => setFormVisible(true)}
        style={[S.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={OG}
          style={{ flex: 1, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="lightbulb-multiple-outline" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════
          MODAL DETALLE DE EMPRENDIMIENTO
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={!!detailItem} transparent animationType="slide"
        statusBarTranslucent onRequestClose={() => setDetailItem(null)}>
        {detailItem && (
          <View style={{ flex: 1 }}>
            <BlurView style={StyleSheet.absoluteFill} intensity={90} tint={isDark ? 'dark' : 'light'} />

            <View style={{ position: 'relative' }}>
               {detailItem.image && detailItem.image.length > 5 ? (
                 <Image source={{ uri: detailItem.image }} style={S.detailHeroImage} resizeMode="cover" />
               ) : (
                 <View style={[S.detailHeroImage, { backgroundColor: DC.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                   <MaterialCommunityIcons name="image-off-outline" size={50} color={DC.subtext} />
                 </View>
               )}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
              <TouchableOpacity onPress={() => setDetailItem(null)}
                style={[S.detailCloseBtn, { top: insets.top + 12 }]}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
              </TouchableOpacity>
              {detailItem.rating > 0 && (
                <View style={S.detailRatingBadge}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFC371" />
                  <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 14, marginLeft: 4 }}>
                    {detailItem.rating.toFixed(1)}
                  </ThemedText>
                </View>
              )}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={isIOS ? 'padding' : 'height'}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 40 }}>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                  <LinearGradient colors={OG}
                    style={[S.cardIconWrap, { width: 48, height: 48, borderRadius: 15, marginRight: 14 }]}>
                    <MaterialCommunityIcons name={CATEGORY_ICONS_DICT[CATEGORIES[detailItem.categoryId]] || ICONS_ARRAY[detailItem.categoryId] || 'store' as any} size={24} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <ThemedText style={{ fontWeight: '900', fontSize: 20, color: DC.text }}>{detailItem.name}</ThemedText>
                      {detailItem.verified && <MaterialCommunityIcons name="check-decagram" size={20} color="#4FC3F7" />}
                    </View>
                    <ThemedText style={{ color: DC.subtext, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                      {CATEGORIES[detailItem.categoryId]}
                    </ThemedText>
                  </View>
                </View>

                {detailItem.promo && (
                  <View style={[S.promoBadge, { marginBottom: 16 }]}>
                    <MaterialCommunityIcons name="tag-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{detailItem.promo}</ThemedText>
                  </View>
                )}

                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <MaterialCommunityIcons name="text-box-outline" size={17} color={DC.accent} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>{t.entrepreneurshiptab?.aboutBussines || 'Sobre el negocio'}</ThemedText>
                  </View>
                  <ThemedText style={{ color: DC.subtext, fontSize: 14, lineHeight: 22 }}>
                    {detailItem.description}
                  </ThemedText>
                </View>

                {/* Botón de contacto en Detalle */}
                <View style={[S.contactRow, { marginBottom: 16, flexWrap: 'wrap' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      if(detailItem.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${detailItem.phone.replace(/\D/g, '')}`); } 
                      else { Linking.openURL(`tel:${detailItem.phone}`); }
                    }}
                    style={[S.contactBtn, { 
                      backgroundColor: detailItem.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)'), 
                      flexGrow: 1, minWidth: 130 
                    }]}>
                    <MaterialCommunityIcons name={detailItem.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color={detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} />
                    <ThemedText style={[S.contactBtnText, { color: detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D", fontSize: 14 }]}>
                      {detailItem.contactMethod === 'whatsapp' ? "WhatsApp" : (t.entrepreneurshiptab?.call || "Llamar")}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* --- SECCIÓN DE VOTOS (GRID 2x2 SOLO EN DETALLE) --- */}
                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg, marginBottom: 20 }]}>
                  <ThemedText style={{ fontWeight: '800', fontSize: 13, color: DC.subtext, marginBottom: 12 }}>
                   {t.entrepreneurshiptab?.businesshelpful || '¿Te fue útil este negocio?'}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <ActionGridBtn onPress={() => handleVote(detailItem.id, 'like')} icon="thumb-up" text={t.genericbtn.likebtn+` (${detailItem.likes})`} color={detailItem.userVote === 'like' ? '#fff' : '#1976D2'} bgColor={detailItem.userVote === 'like' ? '#1976D2' : 'rgba(25,118,210,0.1)'} />
                    <ActionGridBtn onPress={() => handleVote(detailItem.id, 'dislike')} icon="thumb-down" text={t.genericbtn.dislikebtn+ ` (${detailItem.dislikes})`} color={detailItem.userVote === 'dislike' ? '#fff' : '#FA8072'} bgColor={detailItem.userVote === 'dislike' ? '#FA8072' : 'rgba(250,128,114,0.1)'} />
                    <ActionGridBtn onPress={() => handleSave(detailItem.id)} icon={detailItem.saved ? 'bookmark' : 'bookmark-outline'} text={t.genericbtn.savebtn} color={detailItem.saved ? (isDark ? '#111' : '#FFF') : DC.iconInactive} bgColor={detailItem.saved ? (isDark ? '#FFF' : '#111') : 'rgba(128,128,128,0.1)'} />
                    <ActionGridBtn onPress={() => handleShare(detailItem)} icon="share-variant" text={t.genericbtn.sharingbtn} color={isDark ? '#4FC3F7' : '#1976D2'} bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} />
                  </View>
                </View>

                {/* SECCIÓN RESEÑAS INTEGRADAS AL DETALLE */}
                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color={DC.accent} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>{t.entrepreneurshiptab?.reviews || 'Reseñas'}</ThemedText>
                      {detailItem.reviews.length > 0 && (
                        <View style={[S.reviewCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }]}>
                          <ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '800' }}>
                            {detailItem.reviews.length}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    
                    {!showReviewInput && (
                        <TouchableOpacity onPress={() => setShowReviewInput(true)}
                          style={{ borderRadius: 12, overflow: 'hidden' }}>
                          <LinearGradient colors={OG}
                            style={{ paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFF" />
                            <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{t.entrepreneurshiptab?.writing || 'Escribir'}</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                    )}
                  </View>

                  {showReviewInput ? (
                     <ReviewForm
                        isDark={isDark} t={t}
                        onCancel={() => setShowReviewInput(false)}
                        onPublish={(stars: number, comment: string) => handleAddReview(detailItem.id, stars, comment)}
                      />
                  ) : (
                      detailItem.reviews.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.subtext} />
                          <ThemedText style={{ color: DC.subtext, marginTop: 10, fontSize: 13 }}>
                            {t.entrepreneurshiptab?.whitoutReviews || 'Aún no hay reseñas.'}
                          </ThemedText>
                        </View>
                      ) : (
                        <>
                            {detailItem.reviews.slice(0, 2).map(r => (
                              <View key={r.id}
                                style={[S.reviewCard, { backgroundColor: DC.inputBg, borderColor: DC.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <View style={{ flexDirection: 'row', gap: 3 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <MaterialCommunityIcons key={s} name="star" size={14}
                                        color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} />
                                    ))}
                                  </View>
                                  <ThemedText style={{ color: DC.subtext, fontSize: 11 }}>{r.displayTime}</ThemedText>
                                </View>
                                <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>{r.comment}</ThemedText>
                              </View>
                            ))}
                            
                            {detailItem.reviews.length > 2 && (
                                <TouchableOpacity onPress={() => openReviews(detailItem, false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                                    <ThemedText style={{ color: DC.accent, fontWeight: '800', fontSize: 14 }}>{t.entrepreneurshiptab?.viewAllreviews || 'Ver todas las reseñas'}</ThemedText>
                                </TouchableOpacity>
                            )}
                        </>
                      )
                  )}
                </View>

              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        )}
      </RNModal>

      {/* ══════════════════════════════════════════════════════════
          MODAL RESEÑAS INDEPENDIENTE (CUANDO SE QUIEREN VER TODAS)
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={!!reviewTarget} transparent animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { setReviewTarget(null); setShowReviewInput(false); }}>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1}
              onPress={() => { setReviewTarget(null); setShowReviewInput(false); }} />

            <View style={[S.reviewModalBox, {
              backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent',
              borderColor: DC.border,
            }]}>
              {!isAndroid && (
                <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}

              <View style={{ padding: 25, flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 20, fontWeight: '900', color: DC.text }}>
                      {reviewTarget?.name}
                    </ThemedText>
                    <ThemedText style={{ color: DC.text, fontWeight: '700' }}>
                      {t.entrepreneurshiptab?.communityopinions || 'Opiniones de la comunidad'}
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => { setReviewTarget(null); setShowReviewInput(false); }}>
                    <MaterialCommunityIcons name="close" size={28} color={DC.text} />
                  </TouchableOpacity>
                </View>

                {!showReviewInput ? (
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => setShowReviewInput(true)}
                      style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                      <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{ marginRight: 10 }} />
                        <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.entrepreneurshiptab?.writingReviews || 'Escribir reseña'}</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      {(reviewTarget?.reviews ?? []).length > 0
                        ? (reviewTarget?.reviews ?? []).map(r => (
                            <View key={r.id}
                              style={[S.reviewCard, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                                borderColor: DC.border,
                              }]}>
                              <View style={{ flexDirection: 'row', gap: 3, marginBottom: 8 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <MaterialCommunityIcons key={s} name="star" size={15}
                                    color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} />
                                ))}
                                <ThemedText style={{ color: DC.subtext, fontSize: 11, marginLeft: 6, alignSelf: 'center' }}>
                                  {r.displayTime}
                                </ThemedText>
                              </View>
                              <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>
                                {r.comment}
                              </ThemedText>
                            </View>
                          ))
                        : (
                          <View style={{ alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                            <MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.subtext} />
                            <ThemedText style={{ color: DC.subtext, marginTop: 10 }}>
                              {t.entrepreneurshiptab?.whitoutReviews || 'Aún no hay reseñas.'}
                            </ThemedText>
                          </View>
                        )
                      }
                    </ScrollView>
                  </View>
                ) : (
                  <ReviewForm
                    isDark={isDark} t={t}
                    onCancel={() => setShowReviewInput(false)}
                    onPublish={(stars: number, comment: string) => handleAddReview(reviewTarget!.id, stars, comment)}
                  />
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      {/* ══════════════════════════════════════════════════════════
          MODAL FORMULARIO — Publicar nuevo emprendimiento
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={isFormVisible} transparent animationType="slide"
        statusBarTranslucent onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isSubmitting && setFormVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={[S.modalBlur, { backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DC.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40 }]}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={[S.modalHeader, { paddingHorizontal: 25, marginTop: isLargeWeb ? 25 : 0 }]}>
                <TouchableOpacity onPress={() => setFormVisible(false)} disabled={isSubmitting}>
                  <MaterialCommunityIcons name="close" size={24} color={DC.text} />
                </TouchableOpacity>
                <ThemedText style={[S.modalTitle, { color: DC.text }]}>{t.entrepreneurshiptab?.newentrepreneurship || 'Nuevo Emprendimiento'}</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>

                <TouchableOpacity onPress={pickImage} style={[S.imagePicker, { borderColor: DC.border, backgroundColor: DC.inputBg }]}>
                  {formImage
                    ? <Image source={{ uri: formImage }} style={S.formImagePreview} />
                    : <View style={{ alignItems: 'center' }}>
                        <MaterialCommunityIcons name="camera-plus" size={32} color={DC.subtext} />
                        <ThemedText style={{  marginTop: 1, fontWeight: '800', fontSize: 11 ,textTransform:'capitalize' }}>{t.entrepreneurshiptab?.businessphoto || 'FOTO'}</ThemedText>
                      </View>
                  }
                </TouchableOpacity>

                <ThemedText style={[S.label, { color: DC.accent }]}>{t.entrepreneurshiptab?.viewcategory || 'CATEGORÍA'}</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                  
                  {/* SE OCULTA LA CATEGORÍA "TODAS" POR MEDIO DEL ÍNDICE (index !== 0) */}
                  {CATEGORIES.map((catName, index) => {
                    if (index === 0) return null; // <--- ESTO PROTEGE EL CÓDIGO EN CUALQUIER IDIOMA
                    
                    const isActive = formCategoryIdx === index;
                    const iconName = CATEGORY_ICONS_DICT[catName] || ICONS_ARRAY[index] || 'store';
                    
                    return (
                      <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)}
                        style={{ borderRadius: 12, overflow: 'hidden', height: 36,
                          borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
                        {isActive ? (
                          <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={iconName as any} size={13} color="#FFF" style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '900' ,textTransform:'capitalize'}}>{catName}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, backgroundColor: DC.categoryUnselected }}>
                            <MaterialCommunityIcons name={iconName as any} size={13} color={DC.iconInactive} style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: DC.iconInactive, fontSize: 12, fontWeight: '700'  ,textTransform:'capitalize'}}>{catName}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput value={formName} onChangeText={setFormName}
                  placeholder={t.entrepreneurshiptab?.namebussinesplac || 'Nombre del negocio'}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <TextInput value={formZip} onChangeText={setFormZip}
                  placeholder="Código Postal (Zip)" keyboardType="numeric" maxLength={5}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <TextInput value={formDesc} onChangeText={setFormDesc}
                  placeholder={t.entrepreneurshiptab?.descripservicesplace || 'Descripción de servicios...'}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  multiline numberOfLines={3}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border,
                    minHeight: 80, textAlignVertical: 'top', paddingTop: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

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
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DC.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DC.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DC.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: DC.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
                </View>

                <ThemedText style={[S.label, { color: DC.text }]}>{t.entrepreneurshiptab?.promotion || 'Promoción'}</ThemedText>
                <TextInput value={formPromo} onChangeText={setFormPromo}
                  placeholder={t.entrepreneurshiptab?.exampleoffet || 'Ej: 10% de descuento'}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg,
                    borderColor: DC.border, marginBottom: 20, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} />

                <TouchableOpacity onPress={handlePublish}
                  disabled={!formName.trim() || !formDesc.trim() || !formPhone.trim() || !formImage || formZip.length < 5 || isSubmitting}>
                  <LinearGradient
                    colors={(formName.trim() && formDesc.trim() && formPhone.trim() && formImage && formZip.length === 5) ? OG : DG}
                    style={[S.publishBtn, {
                      opacity: (formName.trim() && formDesc.trim() && formPhone.trim() && formImage && formZip.length === 5) ? 1 : 0.55,
                    }]}>
                    {isSubmitting
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <MaterialCommunityIcons name="store-plus-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                          <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                            {t.entrepreneurshiptab?.publishEntrepre || 'Publicar'}
                          </ThemedText>
                        </>
                    }
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

// --- STYLES ---
const S = StyleSheet.create({
  card:         { borderRadius: 28, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  cardImage:    { width: '100%', height: 140 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  promoBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5F6D',
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, alignSelf: 'flex-start' },
  verMasBadge:  { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 },

  footer:         { borderTopWidth: 1, paddingTop: 10, gap: 9 },
  reviewsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7,
                    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  
  contactRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  contactBtn:     { height: 38, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  contactBtnText: { fontSize: 12, fontWeight: '800' },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rxBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, gap: 4 },
  rxCount:      { fontSize: 11, fontWeight: '800' },

  detailHeroImage:   { width: '100%', height: 260 },
  detailCloseBtn:    { position: 'absolute', left: 16, backgroundColor: 'rgba(0,0,0,0.5)',
                       width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  detailRatingBadge: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', alignItems: 'center',
                       backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  detailSection:     { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  detailRxBtn:       { height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  detailRxText:      { fontSize: 13, fontWeight: '800' },

  reviewCountBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewCard:       { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewModalBox:   { width: '92%', height: '78%', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },

  fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30,
         shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 6 },
         shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },

  modalBlur:        { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
                      borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalContent:     { padding: 22 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle:       { fontWeight: '900', fontSize: 17 },
  label:            { fontWeight: '800', fontSize: 13, marginBottom: 9, letterSpacing: 0.2 },
  input:            { borderRadius: 15, padding: 15, fontSize: 14, marginBottom: 14, borderWidth: 1, fontWeight: '600' },
  imagePicker:      { width: '100%', height: 148, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed',
                      justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 6 },
  formImagePreview: { width: '100%', height: '100%' },
  editImageIcon:    { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)',
                      width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
                      borderWidth: 2, borderColor: '#FFF' },
  publishBtn:       { height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'row', marginTop: 8 },
});