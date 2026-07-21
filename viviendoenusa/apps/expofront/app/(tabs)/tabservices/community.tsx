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
import * as ImageManipulator from 'expo-image-manipulator'; 
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import badWordsData from '../../../utils/babwords.json';
import { useAppTheme } from 'app/src/context/ThemeContext';

// --- LÓGICA DE VALIDACIÓN ---
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

// 🚀 PARSER DEFINITIVO Y A PRUEBA DE BALAS PARA REACT NATIVE
const parseSafeDate = (dateString: string | Date) => {
  if (!dateString) return new Date();
  const s = dateString.toString();
  
  const match = s.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  
  if (match) {
    return new Date(
      parseInt(match[1]),      
      parseInt(match[2]) - 1,  
      parseInt(match[3]),      
      parseInt(match[4]),      
      parseInt(match[5]),      
      parseInt(match[6])       
    );
  }
  
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// 🚀 CÁLCULO DE TIEMPO RELATIVO
const getRelativeTime = (dateString: string | Date) => {
  const past = parseSafeDate(dateString);
  const now = new Date();
  
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0 || diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  return past.toLocaleDateString();
};

// 📡 URL BASE PARA LA COMUNIDAD
const API_COMMUNITY_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/community'; 

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  /*
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';*/

  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';

  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000; 
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const styles = useUnifiedCardStyles();
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');

  const currentUserId =  "baeb641a-3fa4-4fef-9846-d75947d1bca9";

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#364045',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    iconInactive: isDark ? '#B0BEC5' : '#364045',  
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
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
  const [selectedSubCategory, setSelectedSubCategory] = useState('All'); // 🚀 Iniciamos en 'All' por defecto
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSubFilter, setActiveSubFilter] = useState('All'); 
  const [isRecentFirst, setIsRecentFirst] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false); 
  
  const [comments, setComments] = useState<Record<string, any[]>>({}); 
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [visibleComments, setVisibleComments] = useState<Record<string, boolean>>({});
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  const fetchCommunityPosts = async (searchZip?: string) => {
    if (!searchZip || searchZip.length !== 5) return;

    try {
      setLoadingPosts(true);
      const url = `${API_COMMUNITY_URL}?zip=${searchZip}`;

      const response = await fetch(url);
      const textResponse = await response.text();
      
      if (!textResponse) {
        setPosts([]);
        return;
      }
      
      const apiData = JSON.parse(textResponse);
      
      if (Array.isArray(apiData)) {
        const formattedPosts = apiData.map((p: any) => ({
          ...p,
          likes: p.likes || 0,
          dislikes: p.dislikes || 0,
          userVote: p.userVote || null, 
          createdAt: p.createdAt || new Date().toISOString(), 
          displayTime: p.createdAt ? getRelativeTime(p.createdAt) : 'Hace un momento'
        }));
        
        setPosts(formattedPosts);
        
        const commentsMap: Record<string, any[]> = {};
        formattedPosts.forEach((p: any) => {
          if (p.commentsList && Array.isArray(p.commentsList)) {
            commentsMap[p.id] = p.commentsList.map((c: any) => ({
              id: c.id,
              text: c.comment || c.review || c.text || '',
              createdAt: c.createdAt || new Date().toISOString(),
              displayTime: c.createdAt ? getRelativeTime(c.createdAt) : 'Hace un momento',
              userName: c.userName || 'Usuario Anónimo',
              image: c.image || null
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
  }, []);

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

  const handlePost = async () => {
    const trimmedText = postText.trim();
    if (!trimmedText || isPublishing) return;

    if (!validateComment(trimmedText)) {
      triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return; 
    }

    setIsPublishing(true);
    try {
      let finalImageName = null; 

      if (selectedImage) {
        const esSegura = await validarImagenEnServidor(selectedImage);
        if (!esSegura) {
          setIsPublishing(false);
          triggerAlert(t.communitytab.imageInappropriateTittle, t.communitytab.imageInappropriateDescription);
          return;
        }

        const formData = new FormData();
        const filename = selectedImage.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(selectedImage);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { 
            uri: selectedImage, 
            name: filename, 
            type 
          } as any);
        }

        const uploadResponse = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/community', {
          method: 'POST',
          body: formData,
          headers: { 
            'Accept': 'application/json' 
          },
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Error al subir la imagen a la nube.");
        }

        finalImageName = uploadData.identificadorArchivo; 
      }

      const targetZip = zipCode && zipCode.length === 5 ? zipCode : "91730";

      const newPostPayload = {
        textContent: trimmedText, 
        imageUrl: finalImageName, 
        tag: tagMapping[selectedTag] || selectedTag,
        subCategory: selectedSubCategory,
        userId: currentUserId,
        zip: targetZip,
        estate: "CA"
      };
      
      const response = await fetch(API_COMMUNITY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPostPayload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Error desconocido en el servidor");
      }
      
      const rawCreatedAt = responseData.createdAt || new Date().toISOString();

      const newPost = { 
        ...responseData, 
        image: selectedImage || responseData.imageUrl, 
        likes: 0, 
        dislikes: 0, 
        userVote: null, 
        commentsList: [],
        createdAt: rawCreatedAt, 
        displayTime: getRelativeTime(rawCreatedAt)
      };

      setPosts(prev => [newPost, ...prev]);
      setPostText('');
      setSelectedImage(null);
      setModalVisible(false);

      if (!zipCode || zipCode.length < 5) {
        setZipCode(targetZip);
        fetchCommunityPosts(targetZip);
      }

    } catch (err: any) {
      console.error("❌ ERROR EN FETCH:", err.message);
      triggerAlert("Error", err.message || t.communitytab.errorServer);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !activeCommentId) return;

    if (!validateComment(trimmed)) {
      triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return;
    }

    try {
      const reviewPayload = {
        typeDetailId: "771c41ff-802d-4df9-8d89-d6fa58c8b3c6", 
        relationshipId: String(activeCommentId),              
        comment: trimmed,                                     
        userId: currentUserId        
      };

      const response = await fetch(`${API_COMMUNITY_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewPayload)
      });
      const savedReview = await response.json();

      const rawCreatedAt = savedReview.createdAt || new Date().toISOString();

      const newLocalComment = {
        id: savedReview.id || Date.now(),
        text: trimmed,
        createdAt: rawCreatedAt,
        displayTime: getRelativeTime(rawCreatedAt),
        userName: userMetadata?.name || 'Tú'
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

  const handleVote = async (postId: string, type: 'like' | 'dislike') => {
    setPosts(prev => prev.map(p => {
      if (String(p.id) !== String(postId)) return p;

      let newLikes = p.likes || 0;
      let newDislikes = p.dislikes || 0;
      let newVote = p.userVote;

      if (type === 'like') {
        if (p.userVote === 'like') {
          newLikes = Math.max(0, newLikes - 1);
          newVote = null;
        } else if (p.userVote === 'dislike') {
          newLikes += 1;
          newDislikes = Math.max(0, newDislikes - 1);
          newVote = 'like';
        } else {
          newLikes += 1;
          newVote = 'like';
        }
      } else { 
        if (p.userVote === 'dislike') {
          newDislikes = Math.max(0, newDislikes - 1);
          newVote = null;
        } else if (p.userVote === 'like') {
          newDislikes += 1;
          newLikes = Math.max(0, newLikes - 1);
          newVote = 'dislike';
        } else {
          newDislikes += 1;
          newVote = 'dislike';
        }
      }

      return { ...p, likes: newLikes, dislikes: newDislikes, userVote: newVote };
    }));

    try {
      const response = await fetch(`${API_COMMUNITY_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId: postId,
          userId: currentUserId, 
          voteType: type 
        })
      });

      if (!response.ok) {
        fetchCommunityPosts(zipCode);
        return; 
      }

      const data = await response.json();
      
      if (data.success || data.likes !== undefined) {
        setPosts(prev => prev.map(p => 
          String(p.id) === String(postId) ? {
            ...p,
            likes: data.likes,
            dislikes: data.dislikes,
            userVote: data.userVote
          } : p
        ));
      }

    } catch (error) {
      fetchCommunityPosts(zipCode); 
    }
  };

  const filteredPosts = useMemo(() => {
    let res = posts.filter(p => {
      const matchTag = (activeFilter === 'All' || activeFilter === 'Todos') || tagMapping[p.tag] === tagMapping[activeFilter];
      // Si activeSubFilter es 'All', no filtramos por subcategoría
      const matchSub = (activeSubFilter === 'All' || activeSubFilter === 'Todos') || p.subCategory === activeSubFilter;
      return matchTag && matchSub;
    });
    
    return res.sort((a, b) => {
      const timeA = parseSafeDate(a.createdAt).getTime();
      const timeB = parseSafeDate(b.createdAt).getTime();
      return isRecentFirst ? timeB - timeA : timeA - timeB;
    });
  }, [posts, activeFilter, activeSubFilter, isRecentFirst]);

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: verticalOffset, width: '100%', alignItems: 'center' }]}>
          <View style={{ 
            width: cardWidth, 
            height: cardHeight, 
            overflow: 'hidden', 
            borderRadius: 28, 
            backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', 
            borderWidth: isAndroid ? 1 : 0, 
            borderColor: Colors.border 
          }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              
              {/* Header Panorámico */}
              <View style={[styles.headerRow, { marginBottom: 25, alignItems: 'center', justifyContent: 'space-between' }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 15 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} />
                </TouchableOpacity>

                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  flex: 1, 
                  marginHorizontal: 10
                }}>
                  <TextInput 
                    style={[{ 
                      flex: 1, 
                      height: 44, 
                      borderRadius: 12, 
                      paddingHorizontal: 15, 
                      fontSize: 14,
                      color: Colors.text, 
                      backgroundColor: Colors.inputBg, 
                      borderColor: Colors.border, 
                      borderWidth: 1, 
                      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) 
                    }]} 
                    placeholder="Buscar código postal..." 
                    keyboardType="numeric" 
                    maxLength={5} 
                    value={zipCode} 
                    onChangeText={(text) => {
                      setZipCode(text);
                      if (text.length < 5) {
                        if (posts.length > 0) setPosts([]); 
                      } else if (text.length === 5) {
                        fetchCommunityPosts(text); 
                      }
                    }} 
                    onSubmitEditing={() => zipCode.length === 5 && fetchCommunityPosts(zipCode)} 
                    placeholderTextColor={Colors.subtext} 
                  />
                  <TouchableOpacity 
                    onPress={() => fetchCommunityPosts(zipCode)} 
                    disabled={zipCode.length !== 5} 
                    style={{ width: 44, height: 44, marginLeft: 8 }}
                  >
                    <LinearGradient 
                      colors={zipCode.length === 5 ? orangeGradient : disabledGradient} 
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
                    >
                      {loadingPosts ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={zipCode.length === 5 ? "#fff" : Colors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <MaterialCommunityIcons name="account-group" size={30} color={Colors.text} style={{ opacity: 0.4, paddingLeft: 15 }} />
              </View>

              {/* LAYOUT PRINCIPAL DE COLUMNAS (WEB vs MÓVIL) */}
              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column', paddingTop: 10 }}>
                
                {/* COLUMNA IZQUIERDA: SIDEBAR (Solo Web) */}
                {isLargeWeb && (
                  <View style={{ width: 280, paddingRight: 25, marginRight: 25, borderRightWidth: 1, borderColor: Colors.border }}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <ThemedText style={[styles.sideMenuTitle, { color: Colors.text, fontSize: 15, marginBottom: 15 }]}>{t.communitytab.filter}</ThemedText>
                      {t.communitytab.typepost.map((f: string) => {
                        const isActive = tagMapping[f] === tagMapping[activeFilter];
                        return (
                          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={{ borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={tagIcons[f]} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{f}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: Colors.inputBg }}>
                                <MaterialCommunityIcons name={tagIcons[f]} size={18} color={Colors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: Colors.text, fontWeight: '600', fontSize: 14 }}>{f}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}  
                    </ScrollView>
                  </View>
                )}

                {/* 👉 COLUMNA DERECHA: FEED DE POSTS */}
                <View style={{ flex: 1, alignItems: 'stretch' }}>
                  <View style={{ width: '100%', flex: 1 }}>
                    
                    <View style={{marginBottom: 10}}>
                      {isLargeWeb ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 15 }}>
                          {/* 1. Botón de Recientes/Nuevos */}
                          <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isRecentFirst ? 0 : 1, borderColor: Colors.border }}>
                            {isRecentFirst ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                <MaterialCommunityIcons name="clock-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{t.communitytab.subCategories[5] || 'Nuevos'}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.categoryUnselected }}>
                                <MaterialCommunityIcons name="clock-outline" size={15} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{t.communitytab.subCategories[5] || 'Nuevos'}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>

                          {/* 2. Botón "Ver Todos" integrado en web */}
                          <TouchableOpacity onPress={() => setActiveSubFilter('All')} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: activeSubFilter === 'All' ? 0 : 1, borderColor: Colors.border }}>
                            {activeSubFilter === 'All' ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                <MaterialCommunityIcons name="apps" size={15} color="#FFF" style={{ marginRight: 6 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Ver todos</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.categoryUnselected }}>
                                <MaterialCommunityIcons name="apps" size={15} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>Ver todos</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                          
                          {subCategories.map(cat => {
                            const isActive = activeSubFilter === cat.id;
                            return (
                              <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(isActive ? 'All' : cat.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                                 {isActive ? (
                                   <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                                     <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText>
                                   </LinearGradient>
                                 ) : (
                                   <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: Colors.categoryUnselected }}>
                                     <MaterialCommunityIcons name={cat.icon as any} size={16} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                     <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText>
                                   </View>
                                 )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <View>
                          {/* Scroll horizontal en móvil con Nuevos, Ver Todos y Subcategorías */}
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}} contentContainerStyle={{ paddingHorizontal: 5, gap: 8 }}>
                            {/* 1. Botón Nuevos/Recientes en móvil */}
                            <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isRecentFirst ? 0 : 1, borderColor: Colors.border }}>
                              {isRecentFirst ? (
                                <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                  <MaterialCommunityIcons name="clock-outline" size={15} color="#FFF" style={{ marginRight: 5 }} />
                                  <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{t.communitytab.subCategories[5] || 'Nuevos'}</ThemedText>
                                </LinearGradient>
                              ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.categoryUnselected }}>
                                  <MaterialCommunityIcons name="clock-outline" size={15} color={Colors.iconInactive} style={{ marginRight: 5 }} />
                                  <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{t.communitytab.subCategories[5] || 'Nuevos'}</ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>

                            {/* 2. Botón Ver Todos en móvil */}
                            <TouchableOpacity onPress={() => setActiveSubFilter('All')} style={{ borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: activeSubFilter === 'All' ? 0 : 1, borderColor: Colors.border }}>
                              {activeSubFilter === 'All' ? (
                                <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}>
                                  <MaterialCommunityIcons name="apps" size={15} color="#FFF" style={{ marginRight: 5 }} />
                                  <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Ver todos</ThemedText>
                                </LinearGradient>
                              ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.categoryUnselected }}>
                                  <MaterialCommunityIcons name="apps" size={15} color={Colors.iconInactive} style={{ marginRight: 5 }} />
                                  <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>Ver todos</ThemedText>
                                </View>
                              )}
                            </TouchableOpacity>

                            {subCategories.map(cat => {
                              const isActive = activeSubFilter === cat.id;
                              return (
                                <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(isActive ? 'All' : cat.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                                   {isActive ? (
                                     <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                                       <MaterialCommunityIcons name={cat.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                                       <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText>
                                     </LinearGradient>
                                   ) : (
                                     <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: Colors.categoryUnselected }}>
                                       <MaterialCommunityIcons name={cat.icon as any} size={16} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                                       <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText>
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
                      ) : (!zipCode || zipCode.length < 5) ? (
                        <View style={{ alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={40} color={Colors.subtext} />
                          </View>
                          <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 18, fontWeight: '900', marginBottom: 8 }}>
                            {t.communitytab.messageemptytitle}
                          </ThemedText>
                          <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                            {t.communitytab.messageempty}
                          </ThemedText>
                        </View>
                      ) : filteredPosts.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: height * 0.05, paddingHorizontal: 30 }}>
                          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                            <MaterialCommunityIcons name="post-outline" size={40} color={Colors.subtext} />
                          </View>
                          <ThemedText style={{ textAlign: 'center', color: Colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
                            {t.communitytab.messageNodatatitle}
                          </ThemedText>
                          <ThemedText style={{ textAlign: 'center', color: Colors.subtext, fontSize: 14, lineHeight: 20 }}>
                            {t.communitytab.messageNodata}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={isLargeWeb ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : {}}>
                          {filteredPosts.map(post => (
                            <View 
                              key={post.id} 
                              style={[styles.postCard, isLargeWeb ? { width: '48.5%', marginBottom: 20, alignSelf: 'flex-start' } : { marginBottom: 20 }]}
                            >
                              <View style={styles.postHeaderRow}>
                                <ThemedText style={styles.tagText}>#{post.tag} • {post.subCategory}</ThemedText>
                                <ThemedText style={styles.timeText}>{post.displayTime}</ThemedText>
                              </View>
                              
                              <ThemedText style={[styles.bodyText, { marginBottom: post.image ? 6 : 0, lineHeight: 20 }]}>{post.text}</ThemedText>
                              
                              {post.image && (
                                <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}>
                                  <Image 
                                    source={{ uri: post.image }} 
                                    style={[
                                      styles.postImage, 
                                      isLargeWeb ? { width: '100%', height: 250, resizeMode: 'cover', borderRadius: 16, marginTop: 10 } : {}
                                    ]} 
                                  />
                                  <View style={{ position: 'absolute', top: 20, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
                                    <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
                                    <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                                      {(t as any)?.entrepreneurshiptab?.viewdetail || 'Ver detalle'}
                                    </ThemedText>
                                  </View>
                                </TouchableOpacity>
                              )}
                              
                              {visibleComments[post.id] && (
                                <View style={[styles.commentSection, { marginTop: 6, paddingTop: 4 }]}>
                                  {(comments[post.id] || []).length > 0 ? (
                                    (comments[post.id] || []).map(c => (
                                <View key={c.id} style={[styles.commentBubble, { flexDirection: 'row', alignItems: 'center', padding: 4, gap: 8 }]}>
                                  <Image 
                                    source={{ uri: c.image }} 
                                    style={{ width: 28, height: 28, borderRadius: 14 }} 
                                    resizeMode="cover"
                                  />
                                  <ThemedText style={{ flex: 1, lineHeight: 18 }}>
                                    <ThemedText style={[styles.commentUser, { fontWeight: 'bold' , fontStyle:'italic' }]}>
                                      {c.userName}{': '}
                                    </ThemedText>
                                    <ThemedText style={[styles.commentText, {fontStyle:'italic'}]}>
                                      {c.text}
                                    </ThemedText>
                                  </ThemedText>
                                </View>
                                    ))
                                  ) : 

                                  <ThemedText style={[styles.noCommentsText, { marginBottom: 4 }]}>{t.communitytab.firtscomment}</ThemedText>}
                                  
                                  <TouchableOpacity onPress={() => { setActiveCommentId(post.id); setShowCommentInput(true); }} style={[styles.replyBtn, { marginTop: 4 }]}>
                                    <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.accent} />
                                    <ThemedText style={[styles.replyBtnText, { color: Colors.accent }]}>{t.communitytab.responsebutton}</ThemedText>
                                  </TouchableOpacity>
                                </View>
                              )}
                              <View style={[styles.postFooter, { marginTop: 10 }]}>
                                <View style={styles.reaccionGroup}>
                                  <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'like' ? '#1976D2' : 'rgba(25, 118, 210, 0.1)' }]}>
                                    <MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? '#fff' : '#1976D2'} />
                                    <ThemedText style={[styles.reaccionCount, { color: post.userVote === 'like' ? '#fff' : '#1976D2' }]}>{post.likes || 0}</ThemedText>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => setVisibleComments(v => ({...v, [post.id]: !v[post.id]}))} style={[styles.reaccionBtn, { backgroundColor: visibleComments[post.id] ? (isDark ? '#FFF' : '#000') : 'rgba(128,128,128,0.1)' }]}>
                                    <MaterialCommunityIcons name="comment-text-multiple" size={14} color={visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : Colors.iconInactive} />
                                    <ThemedText style={[styles.reaccionCount, { color: visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : Colors.iconInactive }]}>{(comments[post.id] || []).length}</ThemedText>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'dislike' ? '#FA8072' : 'rgba(250, 128, 114, 0.1)' }]}>
                                    <MaterialCommunityIcons name="thumb-down" size={14} color={post.userVote === 'dislike' ? '#fff' : '#FA8072'} />
                                    <ThemedText style={[styles.reaccionCount, { color: post.userVote === 'dislike' ? '#fff' : '#FA8072' }]}>{post.dislikes || 0}</ThemedText>
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={() => Share.share({ message: post.text })}>
                                  <MaterialCommunityIcons name="share-variant" size={18} color={Colors.iconInactive} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal para crear post */}
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
            <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
                <ThemedText style={{ fontSize: 16, fontWeight: '900', color: Colors.text }}>{t.communitytab.messagenewpost}</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
                <ThemedText style={[{fontSize: 12, fontWeight: '900', marginBottom: 8, color:Colors.text}]}>{t.communitytab.labeltypepost}</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {t.communitytab.typepostAdd.map((tag: string) => {
                    const isActive = selectedTag === tag;
                    return (
                      <TouchableOpacity key={tag} onPress={() => setSelectedTag(tag)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                         {isActive ? (
                           <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                             <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={16} color="#FFF" style={{ marginRight: 6 }} />
                             <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{tag}</ThemedText>
                           </LinearGradient>
                         ) : (
                           <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                             <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={16} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                             <ThemedText style={{ color: Colors.iconInactive, fontSize: 13, fontWeight: '600' }}>{tag}</ThemedText>
                           </View>
                         )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <ThemedText style={[{ color:Colors.text,fontSize: 12, fontWeight: '900', marginBottom: 8}]}>{t.communitytab.category}</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                  {subCategories.map(sub => {
                    const isActive = selectedSubCategory === sub.id;
                    return (
                      <TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(sub.id)} style={{ borderRadius: 12, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                        {isActive ? (
                          <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={sub.icon as any} size={16} color="#FFF" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{sub.id}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                            <MaterialCommunityIcons name={sub.icon as any} size={16} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: Colors.iconInactive, fontSize: 13, fontWeight: '600' }}>{sub.id}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput 
                  value={postText} onChangeText={setPostText} 
                  placeholder={t.communitytab.messageNewPost} placeholderTextColor={Colors.iconInactive} 
                  multiline style={{ color: Colors.text, backgroundColor: Colors.inputBg, borderRadius: 18, padding: 15, fontSize: 15, fontWeight: '600', borderColor: Colors.border, borderWidth: 1, height: 120, textAlignVertical: 'top', marginBottom: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
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
                  <TouchableOpacity onPress={async () => { 
                      let r = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 0.8
                      }); 
                      
                      if(!r.canceled) {
                        const originalUri = r.assets[0].uri;
                        
                        const manipResult = await ImageManipulator.manipulateAsync(
                          originalUri,
                          [], 
                          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        
                        setSelectedImage(manipResult.uri); 
                      }
                    }}
                    style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }}>
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
                <TextInput style={[{backgroundColor: Colors.inputBg, borderRadius: 15, padding: 15, color: Colors.text, minHeight: 80, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {})}]} placeholder={t.communitytab.placeHolderModal} placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} multiline autoFocus />
                
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