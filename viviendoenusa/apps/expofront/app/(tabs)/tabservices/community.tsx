import React, { useState, useMemo, useEffect } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView,
  ColorValue
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';

import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';

// --- LÓGICA DE VALIDACIÓN ---
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

// 📡 URL BASE PARA LA COMUNIDAD CONECTADA A TU EXPRESS
const API_COMMUNITY_URL = 'http://192.168.1.248:3000/community'; 

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark'; 
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const styles = useUnifiedCardStyles();
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#546E7A',
    accent: isDark ? '#4FC3F7' : '#2D54B3',
    accenticon: isDark ? '#607D8B' : '#1A1A1A',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    iconInactive: isDark ? '#E0E0E0' : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.15)' : 'transparent',
  };

  const orangeGradient: readonly [ColorValue, ColorValue] = ['#FF5F6D', '#FFC371'];
  const disabledGradient: readonly [ColorValue, ColorValue] = isDark 
    ? ['#333333', '#444444'] 
    : ['#dddddd', '#cccccc'];

  const tagIcons: Record<string, any> = {
    'All': 'apps', 'Todos': 'apps',
    'Experience': 'star-outline', 'Experiencia': 'star-outline',
    'Question': 'help-circle-outline', 'Pregunta': 'help-circle-outline',
    'Advice': 'lightbulb-on-outline', 'Consejo': 'lightbulb-on-outline'
  };

  const tagMapping: Record<string, string> = {
    'All': 'All', 'Todos': 'All',
    'Experience': 'Experience', 'Experiencia': 'Experience',
    'Question': 'Question', 'Pregunta': 'Question',
    'Advice': 'Advice', 'Consejo': 'Advice'
  };

  const subCategories = [
    { id: t.communitytab.subCategories[0], icon: 'earth' }, 
    { id: t.communitytab.subCategories[1], icon: 'silverware-fork-knife' },
    { id: t.communitytab.subCategories[2], icon: 'briefcase-outline' }, 
    { id: t.communitytab.subCategories[3], icon: 'file-document-outline' },
    { id: t.communitytab.subCategories[4], icon: 'heart-pulse' },
  ];

  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [zipCode, setZipCode] = useState(''); 

  const defaultTag = (t.communitytab.typepostAdd && t.communitytab.typepostAdd.length > 0) ? t.communitytab.typepostAdd[0] : 'Experience';
  const [selectedTag, setSelectedTag] = useState(defaultTag); 
  const [selectedSubCategory, setSelectedSubCategory] = useState(subCategories[0].id); 
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSubFilter, setActiveSubFilter] = useState('All'); 
  const [isRecentFirst, setIsRecentFirst] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false); 
  const [comments, setComments] = useState<Record<number, any[]>>({}); 
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [visibleComments, setVisibleComments] = useState<Record<number, boolean>>({});
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  // 🚀 OBTENER POSTS DESDE EL BACKEND
  const fetchCommunityPosts = async (searchZip?: string) => {
    try {
      setLoadingPosts(true);
      const url = searchZip && searchZip.length === 5 
        ? `${API_COMMUNITY_URL}?zip=${searchZip}` 
        : API_COMMUNITY_URL;

      const response = await fetch(url);
      const apiData = await response.json();
      
      if (Array.isArray(apiData)) {
        setPosts(apiData);
        
        // Extraer comentarios del leftJoin y mapearlos al estado de la interfaz
        const commentsMap: Record<number, any[]> = {};
        apiData.forEach((p: any) => {
          if (p.commentsList && Array.isArray(p.commentsList)) {
            commentsMap[p.id] = p.commentsList.map((c: any) => ({
              id: c.id,
              text: c.review || c.text || '',
              displayTime: c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              userName: c.userName || 'User'
            }));
          }
        });
        setComments(commentsMap);

      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error cargando posts de la comunidad:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchCommunityPosts();
  }, []);

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

  // 🚀 CREAR UN NUEVO POST (POST al backend) CON DEBUGGER
  const handlePost = async () => {
    const trimmedText = postText.trim();
    if (!trimmedText || isPublishing) return;

    if (!validateComment(trimmedText)) {
      triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return; 
    }

    setIsPublishing(true);
    try {
      if (selectedImage) {
        const esSegura = await validarImagenEnServidor(selectedImage);
        if (!esSegura) {
          setIsPublishing(false);
          triggerAlert(t.communitytab.imageInappropriateTittle, t.communitytab.imageInappropriateDescription);
          return;
        }
      }

      // ⚠️ REVISA ESTOS NOMBRES: Deben coincidir EXACTAMENTE con los de tu Drizzle schema
      /*const newPostPayload = {
        text: trimmedText,
        image: selectedImage,
        tag: tagMapping[selectedTag] || selectedTag,
        subCategory: selectedSubCategory,
        zip: zipCode || null, 
        likes: 0,
        dislikes: 0,
        userName: userMetadata?.name || 'User',
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };*/
      // ⚠️ PAYLOAD CORREGIDO: Usando los nombres exactos que pide tu base de datos
      const newPostPayload = {
        // En lugar de 'text', Drizzle espera 'textContent' o 'text_content'
        textContent: trimmedText, 
        // En lugar de 'image', Drizzle espera 'imageUrl' o 'image_url'
        // imageUrl: selectedImage || null, validacion de carpeta
        tag: tagMapping[selectedTag] || selectedTag,
        // En lugar de 'subCategory', el DB espera 'sub_category' (o subCategory en JS)
        subCategory: selectedSubCategory,
        // La BD exige un user_id válido (usaremos el UUID que usamos en Abogados para pruebas)
        userId: "baeb641a-3fa4-4fef-9846-d75947d1bca9",
        zip: zipCode || "91730",
        estate: "CA"

      };
      
      console.log("Intentando enviar a BD:", newPostPayload);

      const response = await fetch(API_COMMUNITY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPostPayload)
      });

      const responseData = await response.json();

      // Si el backend devuelve status 400 o 500, lanzamos el error para verlo
      if (!response.ok) {
        console.error("❌ ERROR DEL BACKEND:", responseData);
        throw new Error(responseData.error || "Error desconocido en el servidor");
      }

      console.log("✅ GUARDADO EXITOSO EN BD:", responseData);
      
      // Actualización reactiva instantánea
      setPosts(prev => [{ ...responseData, commentsList: [] }, ...prev]);
      
      setPostText('');
      setSelectedImage(null);
      setModalVisible(false);
    } catch (err: any) {
      console.error("❌ ERROR EN FETCH:", err.message);
      triggerAlert("Error de Base de Datos", err.message || t.communitytab.errorServer);
    } finally {
      setIsPublishing(false);
    }
  };

  // 🚀 AGREGAR COMENTARIO (POST a tabla de reviews)
  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !activeCommentId) return;

    if (!validateComment(trimmed)) {
      triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return;
    }

    try {

      const reviewPayload = {
        typeDetailId: "771c41ff-802d-4df9-8d89-d6fa58c8b3c6", // Sin guión bajo
        relationshipId: String(activeCommentId),              // Sin guión bajo
        comment: trimmed,                                     // Este está bien
        userId: "baeb641a-3fa4-4fef-9846-d75947d1bca9"        // Sin guión bajo
      };

      console.log("Enviando Comentario a BD:", reviewPayload);

      const response = await fetch(`${API_COMMUNITY_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });
      const savedReview = await response.json();

      console.log("Respuesta del backend para nuevo comentario:", savedReview);

      const newLocalComment = {
        id: savedReview.id || Date.now(),
        text: trimmed,
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userName: userMetadata?.name || 'User'
      };

      setComments(prev => ({
        ...prev,
        [activeCommentId]: [...(prev[activeCommentId] || []), newLocalComment]
      }));
      setCommentText('');
      setShowCommentInput(false);
      setVisibleComments(prev => ({ ...prev, [activeCommentId]: true }));
    } catch (error) {
       triggerAlert("Error", "No se pudo guardar el comentario.");
    }
  };

  // 🚀 ACTUALIZAR VOTOS (PUT al backend para actualizar likes)
  const handleVote = async (postId: number, type: 'like' | 'dislike') => {
    let newLikes = 0;
    let newDislikes = 0;

    // Actualizamos la UI inmediatamente (Optimistic update)
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const isSelected = p.userVote === type;
      
      newLikes = type === 'like' ? (isSelected ? p.likes - 1 : p.likes + 1) : (p.userVote === 'like' ? p.likes - 1 : p.likes);
      newDislikes = type === 'dislike' ? (isSelected ? p.dislikes - 1 : p.dislikes + 1) : (p.userVote === 'dislike' ? p.dislikes - 1 : p.dislikes);
      
      return {
        ...p,
        likes: newLikes,
        dislikes: newDislikes,
        userVote: isSelected ? null : type
      };
    }));

    // Sincronizamos en segundo plano
    try {
      await fetch(`${API_COMMUNITY_URL}/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes: newLikes, dislikes: newDislikes })
      });
    } catch (error) {
      console.error("Error al actualizar voto:", error);
    }
  };

  const filteredPosts = useMemo(() => {
    let res = posts.filter(p => {
      const matchTag = activeFilter === 'All' || tagMapping[p.tag] === tagMapping[activeFilter];
      const matchSub = activeSubFilter === 'All' || p.subCategory === activeSubFilter;
      return matchTag && matchSub;
    });
    return res.sort((a, b) => isRecentFirst ? b.id - a.id : a.id - b.id);
  }, [posts, activeFilter, activeSubFilter, isRecentFirst]);

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
        <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} />
                </TouchableOpacity>
                <View style={{flex:1}} />
                <MaterialCommunityIcons name="account-group" size={40} color={DynamicColors.text} style={{opacity: 0.2}} />
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                
                {isLargeWeb && (
                  <View style={styles.webSidebar}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>{t.communitytab.filter}</ThemedText>
                      {t.communitytab.typepost.map((f: string) => {
                        const isActive = tagMapping[f] === tagMapping[activeFilter];
                        return (
                          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={tagIcons[f]} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{f}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}>
                                <MaterialCommunityIcons name={tagIcons[f]} size={18} color={DynamicColors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: DynamicColors.text, fontWeight: '600', fontSize: 14 }}>{f}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}  
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  
                  {/* BARRAS DE BÚSQUEDA Y FILTROS */}
                  <View style={{marginBottom: 15}}>
                    
                    {/* BARRA DE CÓDIGO POSTAL */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10, paddingRight: isLargeWeb ? 0 : 20 }}>
                      <TextInput 
                        style={[{ flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                        placeholder={t.lawyerstab?.messagezip || "Filtrar por código postal..."} 
                        keyboardType="numeric" 
                        maxLength={5} 
                        value={zipCode} 
                        onChangeText={(text) => {
                          setZipCode(text);
                          if(text.length === 0) fetchCommunityPosts(); 
                        }} 
                        onSubmitEditing={() => fetchCommunityPosts(zipCode)} 
                        placeholderTextColor={DynamicColors.subtext} 
                      />
                      <TouchableOpacity onPress={() => fetchCommunityPosts(zipCode)} disabled={zipCode.length > 0 && zipCode.length < 5} style={{ width: 48, height: 48 }}>
                        <LinearGradient colors={zipCode.length === 5 || zipCode.length === 0 ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                          {loadingPosts ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={22} color="#fff" />}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    {isLargeWeb ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 5 }}>
                        <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isRecentFirst ? 0 : 1, borderColor: DynamicColors.border }}>
                          {isRecentFirst ? (
                            <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                              <MaterialCommunityIcons name="clock-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                              <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{t.communitytab.subCategories[5]}</ThemedText>
                            </LinearGradient>
                          ) : (
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: DynamicColors.categoryUnselected }}>
                              <MaterialCommunityIcons name="clock-outline" size={15} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                              <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 13 }}>{t.communitytab.subCategories[5]}</ThemedText>
                            </View>
                          )}
                        </TouchableOpacity>
                        
                        {subCategories.map(cat => {
                          const isActive = activeSubFilter === cat.id;
                          return (
                            <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(isActive ? 'All' : cat.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                               {isActive ? (
                                 <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                   <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                                   <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText>
                                 </LinearGradient>
                               ) : (
                                 <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: DynamicColors.categoryUnselected }}>
                                   <MaterialCommunityIcons name={cat.icon as any} size={16} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                                   <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText>
                                 </View>
                               )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}} contentContainerStyle={{ paddingRight: 20 }}>
                          <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={{ marginRight: 10, borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isRecentFirst ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isRecentFirst ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                <MaterialCommunityIcons name="clock-outline" size={15} color="#FFF" style={{ marginRight: 5 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{t.communitytab.subCategories[5]}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                <MaterialCommunityIcons name="clock-outline" size={15} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 13 }}>{t.communitytab.subCategories[5]}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                          {t.communitytab.typepost.map((f: string) => {
                            const isActive = tagMapping[f] === tagMapping[activeFilter];
                            return (
                              <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={{ marginRight: 10, borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                                {isActive ? (
                                  <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                    <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{f}</ThemedText>
                                  </LinearGradient>
                                ) : (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                    <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} />
                                    <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 13 }}>{f}</ThemedText>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                          {subCategories.map(cat => {
                            const isActive = activeSubFilter === cat.id;
                            return (
                              <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(isActive ? 'All' : cat.id)} style={{ marginRight: 8, borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                                 {isActive ? (
                                   <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                                     <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText>
                                   </LinearGradient>
                                 ) : (
                                   <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: DynamicColors.categoryUnselected }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={16} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                                     <ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText>
                                   </View>
                                 )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {loadingPosts ? (
                      <ActivityIndicator size="large" color="#FF5F6D" style={{ marginTop: 50 }} />
                    ) : filteredPosts.length === 0 ? (
                      <ThemedText style={{ textAlign: 'center', marginTop: 50, color: DynamicColors.subtext }}>
                        No hay publicaciones para mostrar.
                      </ThemedText>
                    ) : (
                      filteredPosts.map(post => (
                        <View key={post.id} style={styles.postCard}>
                          <View style={styles.postHeaderRow}>
                            <ThemedText style={styles.tagText}>#{post.tag} • {post.subCategory}</ThemedText>
                            <ThemedText style={styles.timeText}>{post.displayTime}</ThemedText>
                          </View>
                          <ThemedText style={styles.bodyText}>{post.text}</ThemedText>
                          {post.image && (
                            <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}>
                              <Image source={{ uri: post.image }} style={styles.postImage} />
                              <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
                                <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
                                <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                                  {(t as any)?.entrepreneurshiptab?.viewdetail || 'Ver detalle'}
                                </ThemedText>
                              </View>
                            </TouchableOpacity>
                          )}
                          {visibleComments[post.id] && (
                            <View style={styles.commentSection}>
                              {(comments[post.id] || []).length > 0 ? (
                                (comments[post.id] || []).map(c => (
                                  <View key={c.id} style={styles.commentBubble}>
                                    <ThemedText style={styles.commentUser}>{c.userName}: <ThemedText style={styles.commentText}>{c.text}</ThemedText></ThemedText>
                                  </View>
                                ))
                              ) : <ThemedText style={styles.noCommentsText}>{t.communitytab.firtscomment}</ThemedText>}
                              <TouchableOpacity onPress={() => { setActiveCommentId(post.id); setShowCommentInput(true); }} style={styles.replyBtn}>
                                <MaterialCommunityIcons name="pencil-outline" size={12} color={DynamicColors.accent} />
                                <ThemedText style={[styles.replyBtnText, { color: DynamicColors.accent }]}>{t.communitytab.responsebutton}</ThemedText>
                              </TouchableOpacity>
                            </View>
                          )}
                          <View style={styles.postFooter}>
                            <View style={styles.reaccionGroup}>
                              <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'like' ? '#1976D2' : 'rgba(25, 118, 210, 0.1)' }]}>
                                <MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? '#fff' : '#1976D2'} />
                                <ThemedText style={[styles.reaccionCount, { color: post.userVote === 'like' ? '#fff' : '#1976D2' }]}>{post.likes}</ThemedText>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setVisibleComments(v => ({...v, [post.id]: !v[post.id]}))} style={[styles.reaccionBtn, { backgroundColor: visibleComments[post.id] ? (isDark ? '#FFF' : '#000') : 'rgba(128,128,128,0.1)' }]}>
                                <MaterialCommunityIcons name="comment-text-multiple" size={14} color={visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : DynamicColors.iconInactive} />
                                <ThemedText style={[styles.reaccionCount, { color: visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : DynamicColors.iconInactive }]}>{(comments[post.id] || []).length}</ThemedText>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'dislike' ? '#FA8072' : 'rgba(250, 128, 114, 0.1)' }]}>
                                <MaterialCommunityIcons name="thumb-down" size={14} color={post.userVote === 'dislike' ? '#fff' : '#FA8072'} />
                                <ThemedText style={[styles.reaccionCount, { color: post.userVote === 'dislike' ? '#fff' : '#FA8072' }]}>{post.dislikes}</ThemedText>
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => Share.share({ message: post.text })}>
                              <MaterialCommunityIcons name="share-variant" size={18} color={DynamicColors.iconInactive} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {isCommunityScreen && (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
          <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
            <MaterialCommunityIcons name="account-group-outline" size={30} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <RNModal visible={isModalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%' }}>
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DynamicColors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: DynamicColors.text }}>{t.communitytab.messagenewpost}</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <ThemedText style={[styles.label, {fontSize: 12, fontWeight: '900', marginBottom: 8}]}>{t.communitytab.labeltypepost}</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {t.communitytab.typepostAdd.map((tag: string) => {
                    const isActive = selectedTag === tag;
                    return (
                      <TouchableOpacity key={tag} onPress={() => setSelectedTag(tag)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                         {isActive ? (
                           <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                             <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={16} color="#FFF" style={{ marginRight: 6 }} />
                             <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{tag}</ThemedText>
                           </LinearGradient>
                         ) : (
                           <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                             <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={16} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                             <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 13, fontWeight: '600' }}>{tag}</ThemedText>
                           </View>
                         )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <ThemedText style={[styles.label, { fontSize: 12, fontWeight: '900', marginBottom: 8}]}>{t.communitytab.category}</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                  {subCategories.map(sub => {
                    const isActive = selectedSubCategory === sub.id;
                    return (
                      <TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(sub.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={sub.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{sub.id}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}>
                            <MaterialCommunityIcons name={sub.icon as any} size={16} color={DynamicColors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: DynamicColors.iconInactive, fontSize: 13, fontWeight: '600' }}>{sub.id}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput 
                  value={postText} onChangeText={setPostText} 
                  placeholder={t.communitytab.messageNewPost} placeholderTextColor={isDark ? "#888" : "#999"} 
                  multiline style={{ color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderRadius: 18, padding: 15, fontSize: 15, fontWeight: '600', borderColor: DynamicColors.border, borderWidth: 1, height: 120, textAlignVertical: 'top', marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                />

                {selectedImage && (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImg} />
                    <TouchableOpacity style={styles.removeImg} onPress={() => setSelectedImage(null)}>
                      <MaterialCommunityIcons name="close-circle" size={20} color="#FF5F6D" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({quality:0.7}); if(!r.canceled) setSelectedImage(r.assets[0].uri); }}
                    style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: DynamicColors.inputBg, borderWidth: 1, borderColor: DynamicColors.border, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="camera-plus" size={32} color="#FF5F6D" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePost} disabled={!postText.trim() || isPublishing} style={{ flex: 1 }}>
                    <LinearGradient colors={postText.trim() ? orangeGradient : disabledGradient} style={{ height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      {isPublishing ? <ActivityIndicator color="#fff" /> : <>
                        <MaterialCommunityIcons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>{t.communitytab.botonpost}</ThemedText>
                      </>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>

      <RNModal transparent visible={showCommentInput} animationType="fade" onRequestClose={() => setShowCommentInput(false)}>
         <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCommentInput(false)} />
            <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"}>
              <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { paddingBottom: isIOS ? insets.bottom + 20 : 30 }]}>
                <TextInput style={[{backgroundColor: DynamicColors.inputBg, borderRadius: 15, padding: 15, color: DynamicColors.text, minHeight: 80, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {})}]} placeholder={t.communitytab.placeHolderModal} placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} multiline autoFocus />
                
                <TouchableOpacity 
                  onPress={handleAddComment} 
                  style={{ backgroundColor: '#FF5F6D', marginTop: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', alignSelf: 'center', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 }}>
                  <MaterialCommunityIcons name="check-all" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <ThemedText style={{color:'#fff', fontWeight:'bold', fontSize: 16}}>{t.communitytab.sendbutton}</ThemedText>
                </TouchableOpacity>
              </BlurView>
            </KeyboardAvoidingView>
         </View>
      </RNModal>

      <RNModal transparent visible={viewerVisible} onRequestClose={() => setViewerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeViewerBtn}>
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imageToView && <Image source={{ uri: imageToView }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </RNModal>
    </View>
  );
}