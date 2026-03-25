import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ColorValue, ActivityIndicator, Platform,
  Modal as RNModal, // Usaremos este para todo
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';

import * as ImagePicker from 'expo-image-picker';
// ELIMINADO: import Modal from 'react-native-modal'; 
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import * as BadWordsLib from 'bad-words';
import { badWordsList } from '../../../utils/babwords.json';

import { contentCardStyles as stylesOriginal } from "app/src/styles/contentcard";

export default function CommunityScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark' ;
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const styles = useUnifiedCardStyles();
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');

  // --- LÓGICA DE ICONOS Y FILTROS ---
  const tagIcons: Record<string, any> = {
    'All': 'apps', 'Todos': 'apps',
    'Experience': 'star-outline', 'Experiencia': 'star-outline',
    'Question': 'help-circle-outline', 'Pregunta': 'help-circle-outline',
    'Advice': 'lightbulb-on-outline', 'Consejo': 'lightbulb-on-outline'
  };

  const tagMapping: Record<string, string> = {
    'All': 'All', 'Todos': 'All', 'Experience': 'Experience', 'Experiencia': 'Experience',
    'Question': 'Question', 'Pregunta': 'Question', 'Advice': 'Advice', 'Consejo': 'Advice'
  };

  const subCategories = [
    { id: t.communitytab.subCategories[0], icon: 'earth' }, 
    { id: t.communitytab.subCategories[1], icon: 'silverware-fork-knife' },
    { id: t.communitytab.subCategories[2], icon: 'briefcase-outline' }, 
    { id: t.communitytab.subCategories[3], icon: 'file-document-outline' },
    { id: t.communitytab.subCategories[4], icon: 'heart-pulse' },
  ];

  const filter = useMemo(() => {
    try {
      const Lib = BadWordsLib as any;
      const Constructor = Lib.default || Lib.Filter || (typeof Lib === 'function' ? Lib : null);
      if (Constructor) {
        const instance = new Constructor();
        const badWords = Array.isArray(badWordsList) ? badWordsList : [];
        if (instance.addWords) instance.addWords(...badWords);
        return instance;
      }
      return null;
    } catch (e) { return null; }
  }, []);

  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('Experience'); 
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

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#ddd', '#ccc'] as const;

  const handlePost = async () => {
    const trimmedText = postText.trim();
    if (!trimmedText || isPublishing) return;
    if (filter && (filter.isProfane(trimmedText.toLowerCase()))) {
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
      const newPost = {
        id: Date.now(), text: trimmedText, image: selectedImage, tag: tagMapping[selectedTag] || selectedTag,
        subCategory: selectedSubCategory, likes: 0, dislikes: 0, userVote: null,
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userName: userMetadata?.name || 'User'
      };
      setPosts(prev => [newPost, ...prev]);
      setPostText(''); setSelectedImage(null); setModalVisible(false);
    } catch (err) { triggerAlert("Error", t.communitytab.errorServer); } finally { setIsPublishing(false); }
  };

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

  const handleVote = (postId: number, type: 'like' | 'dislike') => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const isSelected = p.userVote === type;
      return { ...p,
        likes: type === 'like' ? (isSelected ? p.likes - 1 : p.likes + 1) : (p.userVote === 'like' ? p.likes - 1 : p.likes),
        dislikes: type === 'dislike' ? (isSelected ? p.dislikes - 1 : p.dislikes + 1) : (p.userVote === 'dislike' ? p.dislikes - 1 : p.dislikes),
        userVote: isSelected ? null : type
      };
    }));
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !activeCommentId) return;
    const newComment = { id: Date.now(), text: trimmed, displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), userName: userMetadata?.name || 'User' };
    setComments(prev => ({ ...prev, [activeCommentId]: [...(prev[activeCommentId] || []), newComment] }));
    setCommentText(''); setShowCommentInput(false); setVisibleComments(prev => ({ ...prev, [activeCommentId]: true }));
  };

  const filteredPosts = useMemo(() => {
    let res = posts.filter(p => {
      const matchTag = activeFilter === 'All' || tagMapping[p.tag] === tagMapping[activeFilter];
      const matchSub = activeSubFilter === 'All' || p.subCategory === activeSubFilter;
      return matchTag && matchSub;
    });
    return res.sort((a, b) => isRecentFirst ? b.id - a.id : a.id - b.id);
  }, [posts, activeFilter, activeSubFilter, isRecentFirst]);

  // --- UI COMPONENTS ---
  const renderModalContent = () => (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
      <KeyboardAvoidingView 
        behavior={isIOS ? "padding" : "height"} 
        style={{ width: '100%' }}
      >
        <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={styles.modalBlur}>
          <View style={[styles.modalContent, { paddingBottom: isIOS ? insets.bottom + 20 : 40 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText style={{ color: '#FF5F6D' }}>Cerrar</ThemedText></TouchableOpacity>
              <ThemedText style={styles.modalTitle}>Nueva Publicación</ThemedText>
              <View style={{ width: 45 }} />
            </View>

            <ThemedText style={styles.label}>TIPO DE POST</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
              {t.communitytab.typepostAdd.map((tag: string) => {
                const isActive = selectedTag === tag;
                return (
                  <TouchableOpacity key={tag} onPress={() => setSelectedTag(tag)} style={[styles.tagChip, isActive && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                    <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={14} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 6}} />
                    <ThemedText style={{ color: isActive ? '#fff' : (isDark ? '#fff' : '#333'), fontSize: 11, fontWeight: '600' }}>{tag}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ThemedText style={styles.label}>{t.communitytab.category}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {subCategories.map(sub => (
                <TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(sub.id)} style={[styles.subChip, selectedSubCategory === sub.id && { borderColor: '#FF5F6D' }]}>
                  <MaterialCommunityIcons name={sub.icon as any} size={14} color={selectedSubCategory === sub.id ? '#FF5F6D' : '#999'} />
                  <ThemedText style={{ marginLeft: 5, fontSize: 11, color: selectedSubCategory === sub.id ? '#FF5F6D' : '#999' }}>{sub.id}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput 
              value={postText} onChangeText={setPostText} 
              placeholder="¿Qué estás pensando?" placeholderTextColor="#999" 
              multiline style={styles.postInput} 
            />

            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImg} />
                <TouchableOpacity style={styles.removeImg} onPress={() => setSelectedImage(null)}><MaterialCommunityIcons name="close-circle" size={20} color="#FF5F6D" /></TouchableOpacity>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({quality:0.7}); if(!r.canceled) setSelectedImage(r.assets[0].uri); }} disabled={isPublishing}>
                <MaterialCommunityIcons name="image-plus" size={32} color="#FF5F6D" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePost} disabled={!postText.trim() || isPublishing}>
                <LinearGradient colors={postText.trim() ? orangeGradient : disabledGradient} style={styles.publishBtn}>
                  {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Publicar</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );

  // --- AJUSTES DE LAYOUT ---
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  // AJUSTE WEB: Subimos la tarjeta hacia el header en escritorio
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: isWeb ? 'flex-start' : 'center', paddingTop: isWeb ? 20 : 0 }} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
          <View style={[stylesOriginal.cardWrapper, { 
            width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28,
            backgroundColor: isAndroid ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0, borderColor: borderColor
          }]}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                {isLargeWeb && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: 10}}>
                    <TouchableOpacity onPress={() => setActiveSubFilter('All')} style={[styles.headerSubChip, activeSubFilter === 'All' && {borderColor: '#FF5F6D', backgroundColor: 'rgba(255,95,109,0.1)'}]}>
                       <ThemedText style={[styles.subChipText, activeSubFilter === 'All' && {color: '#FF5F6D'}]}>Todas</ThemedText>
                    </TouchableOpacity>
                    {subCategories.map(cat => (
                      <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(cat.id)} style={[styles.headerSubChip, activeSubFilter === cat.id && {borderColor: '#FF5F6D', backgroundColor: 'rgba(255,95,109,0.1)'}]}>
                        <MaterialCommunityIcons name={cat.icon as any} size={14} color={activeSubFilter === cat.id ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                        <ThemedText style={[styles.subChipText, activeSubFilter === cat.id && {color: '#FF5F6D'}]}>{cat.id}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <View style={{flex:1}} />
                <MaterialCommunityIcons name="account-group" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.15}}/>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                {isLargeWeb && (
                  <View style={styles.webSidebar}>
                    <ThemedText style={styles.sideMenuTitle}>FILTRAR</ThemedText>
                    {t.communitytab.typepost.map((f: string) => {
                      const isActive = tagMapping[f] === tagMapping[activeFilter];
                      return (
                        <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.webCapsuleBtn, isActive ? { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0, 0, 0, 0.03)', borderColor: borderColor }]}>
                          <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={18} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 10}} />
                          <ThemedText style={[styles.webCapsuleText, isActive && { color: '#fff' }]}>{f}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}  
                  </View>
                )}

                {!isLargeWeb && (
                  <View style={{marginBottom: 10}}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                      <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={[styles.filterChipBase, { marginRight: 8, borderColor: isRecentFirst ? '#FF5F6D' : borderColor, backgroundColor: isRecentFirst ? 'rgba(255,95,109,0.1)' : 'transparent' } ]} >
                         <MaterialCommunityIcons name="clock-outline" size={15} color={isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                         <ThemedText style={[styles.filterChipText, {marginLeft: 5, color: isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')}]}>{t.communitytab.subCategories[5]}</ThemedText>
                      </TouchableOpacity>
                      {t.communitytab.typepost.map((f: string) => {
                         const isActive = tagMapping[f] === tagMapping[activeFilter];
                         return (
                          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.filterChipBase, { marginRight: 8, backgroundColor: isActive ? '#FF5F6D' : 'transparent', borderColor: isActive ? '#FF5F6D' : borderColor }]}>
                            <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={14} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 5}} />
                            <ThemedText style={[styles.filterChipText, { color: isActive ? '#fff' : (isDark ? '#fff' : '#666') }]}>{f}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 5}}>
                      {subCategories.map(cat => (
                        <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(cat.id)} style={[styles.subFilterChip, activeSubFilter === cat.id && {borderColor: '#FF5F6D'}]}>
                          <MaterialCommunityIcons name={cat.icon as any} size={14} color={activeSubFilter === cat.id ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                          <ThemedText style={[styles.subChipText, activeSubFilter === cat.id && {color: '#FF5F6D'}]}>{cat.id}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isIOS ? 130 : 100 }}>
                    {filteredPosts.map(post => (
                      <View key={post.id} style={styles.postCard}>
                        <View style={styles.postHeaderRow}>
                          <ThemedText style={styles.tagText}>#{post.tag} • {post.subCategory}</ThemedText>
                          <ThemedText style={styles.timeText}>{post.displayTime}</ThemedText>
                        </View>
                        <ThemedText style={styles.bodyText}>{post.text}</ThemedText>
                        {post.image && (
                          <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}>
                            <Image source={{ uri: post.image }} style={styles.postImage} />
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
                            ) : <ThemedText style={styles.noCommentsText}>Sé el primero en publicar algo.</ThemedText>}
                            <TouchableOpacity onPress={() => { setActiveCommentId(post.id); setShowCommentInput(true); }} style={styles.replyBtn}><MaterialCommunityIcons name="pencil-outline" size={12} color="#FF5F6D" /><ThemedText style={styles.replyBtnText}>Responder</ThemedText></TouchableOpacity>
                          </View>
                        )}
                        <View style={styles.postFooter}>
                          <View style={styles.reaccionGroup}>
                            <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'like' ? '#1976D2' : 'rgba(25, 118, 210, 0.1)' }]}><MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? '#fff' : '#1976D2'} /><ThemedText style={[styles.reaccionCount, { color: post.userVote === 'like' ? '#fff' : '#1976D2' }]}>{post.likes}</ThemedText></TouchableOpacity>
                            <TouchableOpacity onPress={() => setVisibleComments(v => ({...v, [post.id]: !v[post.id]}))} style={[styles.reaccionBtn, { backgroundColor: visibleComments[post.id] ? (isDark ? '#FFF' : '#000') : 'rgba(128,128,128,0.1)' }]}><MaterialCommunityIcons name="comment-text-multiple" size={14} color={visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : (isDark ? '#bbb' : '#666')} /><ThemedText style={[styles.reaccionCount, { color: visibleComments[post.id] ? (isDark ? '#000' : '#FFF') : (isDark ? '#bbb' : '#666') }]}>{(comments[post.id] || []).length}</ThemedText></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[styles.reaccionBtn, { backgroundColor: post.userVote === 'dislike' ? '#FA8072' : 'rgba(250, 128, 114, 0.1)' }]}><MaterialCommunityIcons name="thumb-down" size={14} color={post.userVote === 'dislike' ? '#fff' : '#FA8072'} /><ThemedText style={[styles.reaccionCount, { color: post.userVote === 'dislike' ? '#fff' : '#FA8072' }]}>{post.dislikes}</ThemedText></TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => Share.share({ message: post.text })}><MaterialCommunityIcons name="share-variant" size={18} color={isDark ? "#fff" : "#666"} /></TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {isCommunityScreen && (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.fab, { 
          // Lógica condicional por plataforma:
          bottom: isWeb 
            ? 75  // <--- Ajusta este número (menor = más abajo en Web)
            : (isIOS ? insets.bottom + 50 : 100) 
        }]}>
          <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}>
            <MaterialCommunityIcons name="plus" size={30} color="#fff" /></LinearGradient>
        </TouchableOpacity>
      )}

      {/* MODAL NUEVA PUBLICACIÓN (CORREGIDO PARA REACT 19 USANDO RNMODAL) */}
      <RNModal 
        visible={isModalVisible} 
        transparent={true} 
        animationType="slide" 
        onRequestClose={() => setModalVisible(false)}
      >
        {renderModalContent()}
      </RNModal>

      {/* MODAL COMENTARIOS INTEGRADO */}
      <RNModal transparent visible={showCommentInput} animationType="fade" onRequestClose={() => setShowCommentInput(false)}>
         <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCommentInput(false)} />
            <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{width: '100%'}}>
              <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { paddingBottom: isIOS ? insets.bottom + 20 : 30 }]}>
                <TextInput style={[{backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 15, padding: 15, color: isDark ? '#fff' : '#000', minHeight: 80}]} placeholder="Escribe algo..." placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} multiline autoFocus />
                <TouchableOpacity onPress={handleAddComment} style={[styles.publishBtn, {backgroundColor: '#FF5F6D', marginTop: 15, alignItems: 'center'}]}><ThemedText style={{color:'#fff', fontWeight:'bold'}}>Enviar</ThemedText></TouchableOpacity>
              </BlurView>
            </KeyboardAvoidingView>
         </View>
      </RNModal>

      {/* VISUALIZADOR DE IMAGEN */}
      <RNModal transparent visible={viewerVisible} onRequestClose={() => setViewerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeViewerBtn}><MaterialCommunityIcons name="close" size={28} color="#fff" /></TouchableOpacity>
          {imageToView && <Image source={{ uri: imageToView }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </RNModal>
    </View>
  );
}