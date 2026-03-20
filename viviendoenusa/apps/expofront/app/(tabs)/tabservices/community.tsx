import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ColorValue, ActivityIndicator, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';

import * as ImagePicker from 'expo-image-picker';
import Modal from 'react-native-modal';
import { useTranslation } from '../../../hooks/useTranslation';
import { getContentCardStyles } from 'app/src/styles/contentcommunity';

import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import * as BadWordsLib from 'bad-words';
import { badWordsList } from '../../../utils/babwords.json';


export default function CommunityScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark' ;
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';

  const styles = getContentCardStyles(isDark);
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');

  // --- MAPEO DE ICONOS PARA TIPOS DE POST ---
  const tagIcons: Record<string, any> = {
    'All': 'apps', 'Todos': 'apps',
    'Experience': 'star-outline', 'Experiencia': 'star-outline',
    'Question': 'help-circle-outline', 'Pregunta': 'help-circle-outline',
    'Advice': 'lightbulb-on-outline', 'Consejo': 'lightbulb-on-outline'
  };

  // --- FILTRO PROFANIDAD ---
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

  // --- ESTADOS ---
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('Experience'); 
  const [selectedSubCategory, setSelectedSubCategory] = useState('General'); 
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

  const tagMapping: Record<string, string> = {
    'All': 'All', 'Todos': 'All', 'Experience': 'Experience', 'Experiencia': 'Experience',
    'Question': 'Question', 'Pregunta': 'Question', 'Advice': 'Advice', 'Consejo': 'Advice'
  };

  const subCategories = [
    { id: 'General', icon: 'earth' }, { id: 'Comida', icon: 'silverware-fork-knife' },
    { id: 'Trabajo', icon: 'briefcase-outline' }, { id: 'Trámites', icon: 'file-document-outline' },
    { id: 'Salud', icon: 'heart-pulse' },
  ];

  // --- FUNCIONES ---
  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

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

  // --- DIMENSIONES Y ESTILOS ---
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.72 : (loggedIn ? height * 0.69 : height * 0.65));
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { justifyContent: 'flex-start' }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.centerContainer, { marginTop: isAndroid ? -55 : (isLargeWeb ? -80 : 0) }]}>
          
          <View style={[styles.cardWrapper, { 
            width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28,
            backgroundColor: isAndroid ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0, borderColor: borderColor, elevation: 0
          }]}>
            
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

            <View style={styles.cardContent}>
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                
                {isLargeWeb && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: 10}}>
                    <TouchableOpacity onPress={() => setActiveSubFilter('All')} style={[localStyles.headerSubChip, activeSubFilter === 'All' && {borderColor: '#FF5F6D', backgroundColor: 'rgba(255,95,109,0.1)'}]}>
                       <ThemedText style={[localStyles.subChipText, activeSubFilter === 'All' && {color: '#FF5F6D'}]}>Todas</ThemedText>
                    </TouchableOpacity>
                    {subCategories.map(cat => (
                      <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(cat.id)} style={[localStyles.headerSubChip, activeSubFilter === cat.id && {borderColor: '#FF5F6D', backgroundColor: 'rgba(255,95,109,0.1)'}]}>
                        <MaterialCommunityIcons name={cat.icon as any} size={14} color={activeSubFilter === cat.id ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                        <ThemedText style={[localStyles.subChipText, activeSubFilter === cat.id && {color: '#FF5F6D'}]}>{cat.id}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                <View style={{flex:1}} />
                <MaterialCommunityIcons name="account-group" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.15}}/>
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>
                
                {/* SIDEBAR WEB */}
                {isLargeWeb && (
                  <View style={localStyles.webSidebar}>
                    <ThemedText style={[localStyles.sideMenuTitle , { color: isDark ? '#fffafa' : '#000' }]} >FILTRAR</ThemedText>
                    {t.communitytab.typepost.map((f: string) => {
                      const isActive = tagMapping[f] === tagMapping[activeFilter];
                      return (
                        <TouchableOpacity 
                          key={f} onPress={() => setActiveFilter(f)} 
                          style={[localStyles.webCapsuleBtn, isActive ? { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' } : { backgroundColor: isDark ? 'rgba(128,128,128,0.2)' : 'rgba(0, 0, 0, 0.05)', borderColor: borderColor }]}
                        >
                          <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={18} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 10}} />
                          <ThemedText style={[localStyles.webCapsuleText, { color: isActive ? '#fff' : (isDark ? '#fff' : '#333') }]}>{f}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}  
                    <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={[localStyles.webCapsuleBtn, { marginTop: 15 }, isRecentFirst ? { backgroundColor: 'rgba(255,95,109,0.1)', borderColor: '#FF5F6D' } : { backgroundColor: isDark ? 'rgba(128,128,128,0.2)' : 'rgba(0, 0, 0, 0.05)', borderColor: borderColor }]}>
                       <MaterialCommunityIcons name="clock-outline" size={18} color={isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                       <ThemedText style={[localStyles.webCapsuleText, { marginLeft: 8, color: isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666') }]}>Nuevos</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                {/* FILTROS MÓVIL */}
                {!isLargeWeb && (
                  <View style={{marginBottom: 10}}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                      <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={[localStyles.filterChipBase, { marginRight: 8, borderColor: isRecentFirst ? '#FF5F6D' : 'rgba(128,128,128,0.2)', backgroundColor: isRecentFirst ? 'rgba(255,95,109,0.1)' : 'rgba(128,128,128,0.05)' }]} >
                         <MaterialCommunityIcons name="clock-outline" size={15} color={isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                         <ThemedText style={[localStyles.filterChipText, {marginLeft: 5, color: isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')}]}>Nuevos</ThemedText>
                      </TouchableOpacity>
                      {t.communitytab.typepost.map((f: string) => {
                         const isActive = tagMapping[f] === tagMapping[activeFilter];
                         return (
                          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[localStyles.filterChipBase, { marginRight: 8, backgroundColor: isActive ? '#FF5F6D' : 'rgba(128,128,128,0.05)', borderColor: isActive ? '#FF5F6D' : 'rgba(128,128,128,0.2)' }]}>
                            <MaterialCommunityIcons name={tagIcons[f] || 'tag-outline'} size={14} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 5}} />
                            <ThemedText style={[localStyles.filterChipText, { color: isActive ? '#fff' : (isDark ? '#fff' : '#666') }]}>{f}</ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 5}}>
                      {subCategories.map(cat => (
                        <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(cat.id)} style={[localStyles.subFilterChip, activeSubFilter === cat.id && {borderColor: '#FF5F6D'}]}>
                          <MaterialCommunityIcons name={cat.icon as any} size={14} color={activeSubFilter === cat.id ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                          <ThemedText style={[localStyles.subChipText, activeSubFilter === cat.id && {color: '#FF5F6D'}]}>{cat.id}</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    {filteredPosts.map(post => (
                      <View key={post.id} style={[localStyles.postCard, { borderColor: borderColor }]}>
                        <View style={localStyles.postHeaderRow}>
                          <ThemedText style={localStyles.tagText}>#{post.tag} • {post.subCategory}</ThemedText>
                          <ThemedText style={localStyles.timeText}>{post.displayTime}</ThemedText>
                        </View>
                        <ThemedText style={[localStyles.bodyText, {color: isDark ? '#fff' : '#333'}]}>{post.text}</ThemedText>
                        {post.image && (
                          <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}>
                            <Image source={{ uri: post.image }} style={localStyles.postImage} />
                          </TouchableOpacity>
                        )}
                        {visibleComments[post.id] && (
                          <View style={localStyles.commentSection}>
                            {(comments[post.id] || []).length > 0 ? (
                              (comments[post.id] || []).map(c => (
                                <View key={c.id} style={localStyles.commentBubble}>
                                  <ThemedText style={localStyles.commentUser}>{c.userName}: <ThemedText style={[localStyles.commentText,{color: isDark ? '#fff' : '#333'}]}>{c.text}</ThemedText></ThemedText>
                                </View>
                              ))
                            ) : <ThemedText style={localStyles.noCommentsText}>Se el primero en publicar algo.</ThemedText>}
                            <TouchableOpacity onPress={() => { setActiveCommentId(post.id); setShowCommentInput(true); }} style={localStyles.replyBtn}><MaterialCommunityIcons name="pencil-outline" size={12} color="#FF5F6D" /><ThemedText style={localStyles.replyBtnText}>Responder</ThemedText></TouchableOpacity>
                          </View>
                        )}
                        <View style={localStyles.postFooter}>
                          <View style={localStyles.reaccionGroup}>
                            <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[localStyles.reaccionBtn, { backgroundColor: post.userVote === 'like' ? '#1976D2' : 'rgba(25, 118, 210, 0.1)' }]}><MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? '#fff' : '#1976D2'} /><ThemedText style={[localStyles.reaccionCount, { color: post.userVote === 'like' ? '#fff' : '#1976D2' }]}>{post.likes}</ThemedText></TouchableOpacity>
                            <TouchableOpacity onPress={() => setVisibleComments(v => ({...v, [post.id]: !v[post.id]}))} style={[localStyles.reaccionBtn, { backgroundColor: visibleComments[post.id] ? (isDark ? '#2A2A2A' : '#000') : 'rgba(128,128,128,0.1)' }]}><MaterialCommunityIcons name="comment-text-multiple" size={14} color={visibleComments[post.id] ? '#fff' : (isDark ? '#bbb' : '#666')} /><ThemedText style={[localStyles.reaccionCount, { color: visibleComments[post.id] ? '#fff' : (isDark ? '#bbb' : '#666') }]}>{(comments[post.id] || []).length}</ThemedText></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[localStyles.reaccionBtn, { backgroundColor: post.userVote === 'dislike' ? '#FA8072' : 'rgba(250, 128, 114, 0.1)' }]}><MaterialCommunityIcons name="thumb-down" size={14} color={post.userVote === 'dislike' ? '#fff' : '#FA8072'} /><ThemedText style={[localStyles.reaccionCount, { color: post.userVote === 'dislike' ? '#fff' : '#FA8072' }]}>{post.dislikes}</ThemedText></TouchableOpacity>
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

      {/* FAB */}
      {isCommunityScreen && (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[localStyles.fab, isLargeWeb && { bottom: 70, right: 35 }]}>
          <LinearGradient colors={orangeGradient} style={{flex:1, borderRadius:32, justifyContent:'center', alignItems:'center'}}><MaterialCommunityIcons name="plus" size={30} color="#fff" /></LinearGradient>
        </TouchableOpacity>
      )}

      {/* MODAL NUEVA PUBLICACIÓN */}
      <Modal isVisible={isModalVisible} onBackdropPress={() => !isPublishing && setModalVisible(false)} avoidKeyboard style={{ margin: 0, justifyContent: 'flex-end' }}>
        <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={localStyles.modalBlur}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}><TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText style={{ color: '#FF5F6D' }}>Cerrar</ThemedText></TouchableOpacity><ThemedText style={localStyles.modalTitle}>Nueva Publicación</ThemedText><View style={{ width: 45 }} /></View>
            <ThemedText style={localStyles.label}>TIPO DE POST</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
              {t.communitytab.typepostAdd.map((tag: string) => {
                const isActive = selectedTag === tag;
                return (
                  <TouchableOpacity key={tag} onPress={() => setSelectedTag(tag)} style={[localStyles.tagChip, isActive && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                    <MaterialCommunityIcons name={tagIcons[tag] || 'tag-outline'} size={14} color={isActive ? '#fff' : (isDark ? '#fff' : '#666')} style={{marginRight: 6}} />
                    <ThemedText style={{ color: isActive ? '#fff' : (isDark ? '#fff' : '#333'), fontSize: 11, fontWeight: '600' }}>{tag}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ThemedText style={localStyles.label}>CATEGORÍA</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{subCategories.map(sub => (<TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(sub.id)} style={[localStyles.subChip, selectedSubCategory === sub.id && { borderColor: '#FF5F6D' }]}><MaterialCommunityIcons name={sub.icon as any} size={14} color={selectedSubCategory === sub.id ? '#FF5F6D' : '#999'} /><ThemedText style={{ marginLeft: 5, fontSize: 11, color: selectedSubCategory === sub.id ? '#FF5F6D' : '#999' }}>{sub.id}</ThemedText></TouchableOpacity>))}</ScrollView>
            <TextInput value={postText} onChangeText={setPostText} placeholder="¿Qué estás pensando?" placeholderTextColor="#999" multiline style={[localStyles.postInput, { color: isDark ? '#fff' : '#000' }]} />
            {selectedImage && (<View style={localStyles.previewContainer}><Image source={{ uri: selectedImage }} style={localStyles.previewImg} /><TouchableOpacity style={localStyles.removeImg} onPress={() => setSelectedImage(null)}><MaterialCommunityIcons name="close-circle" size={20} color="#FF5F6D" /></TouchableOpacity></View>)}
            <View style={localStyles.actions}><TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({quality:0.7}); if(!r.canceled) setSelectedImage(r.assets[0].uri); }} disabled={isPublishing}><MaterialCommunityIcons name="image-plus" size={32} color="#FF5F6D" /></TouchableOpacity><TouchableOpacity onPress={handlePost} disabled={!postText.trim() || isPublishing}><LinearGradient colors={postText.trim() ? orangeGradient : disabledGradient} style={localStyles.publishBtn}>{isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Publicar</ThemedText>}</LinearGradient></TouchableOpacity></View>
          </View>
        </BlurView>
      </Modal>

      {/* MODAL COMENTARIOS */}
      <Modal isVisible={showCommentInput} onBackdropPress={() => setShowCommentInput(false)} avoidKeyboard style={{ margin: 0, justifyContent: 'flex-end' }}>
        <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={{padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30}}>
           <TextInput style={{backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 15, padding: 15, color: isDark ? '#fff' : '#000', minHeight: 80}} placeholder="Escribe algo..." placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} multiline autoFocus />
           <TouchableOpacity onPress={handleAddComment} style={{backgroundColor: '#FF5F6D', borderRadius: 25, padding: 15, alignItems: 'center', marginTop: 15}}><ThemedText style={{color:'#fff', fontWeight:'bold'}}>Enviar</ThemedText></TouchableOpacity>
        </BlurView>
      </Modal>

      {/* VISUALIZADOR DE IMAGEN */}
      <Modal isVisible={viewerVisible} onBackdropPress={() => setViewerVisible(false)} onBackButtonPress={() => setViewerVisible(false)} style={{ margin: 0 }} animationIn="fadeIn" animationOut="fadeOut">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => setViewerVisible(false)} style={localStyles.closeViewerBtn}><MaterialCommunityIcons name="close" size={28} color="#fff" /></TouchableOpacity>
          {imageToView && <Image source={{ uri: imageToView }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, paddingHorizontal: 5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerSubChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', marginRight: 8 },
  webSidebar: { width: 220, borderRightWidth: 0.5, borderRightColor: 'rgba(128,128,128,0.2)', paddingRight: 15 },
  
  webCapsuleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  
  webCapsuleText: { fontSize: 14, fontWeight: '700' },
  sideMenuTitle: { fontSize: 11, fontWeight: '800', marginBottom: 20, letterSpacing: 1.2 ,textTransform: 'uppercase'},
  filterChipBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, height: 32, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontWeight: '600' },
  subFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', marginRight: 8 },
  subChipText: { fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
  postCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 22, padding: 18, marginBottom: 15, borderWidth: 1 },
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tagText: { fontSize: 9, color: '#FF5F6D', fontWeight: 'bold', textTransform: 'uppercase' },
  timeText: { fontSize: 9, opacity: 0.4 },
  bodyText: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  postImage: { width: '100%', height: 160, borderRadius: 18, marginBottom: 12, resizeMode: 'cover' },
  commentSection: { marginTop: 10, borderTopWidth: 0.5, borderColor: 'rgba(128,128,128,0.1)', paddingTop: 10, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 10 },
  commentBubble: { marginBottom: 6 },
  commentUser: { fontSize: 11, fontWeight: 'bold', color: '#FF5F6D' },
  commentText: { fontWeight: 'normal', fontSize: 11 },
  noCommentsText: { fontSize: 10, opacity: 0.4, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  replyBtnText: { color: '#FF5F6D', fontSize: 10, marginLeft: 5, fontWeight: 'bold' },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  reaccionGroup: { flexDirection: 'row', gap: 8 },
  reaccionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 18 },
  reaccionCount: { fontSize: 11, marginLeft: 5, fontWeight: '700' },
  modalBlur: { borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' },
  modalContent: { padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, opacity: 0.6 },
  postInput: { minHeight: 120, fontSize: 16, textAlignVertical: 'top', marginVertical: 15 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 15, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', justifyContent: 'center' },
  subChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.05)' },
  previewContainer: { width: 80, height: 80, borderRadius: 12, marginBottom: 15, position: 'relative' },
  previewImg: { width: '100%', height: '100%', borderRadius: 12 },
  removeImg: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  publishBtn: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  fab: { position: 'absolute', bottom: 65, right: 30, width: 64, height: 64, borderRadius: 32, elevation: 8 },
  closeViewerBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 }
});