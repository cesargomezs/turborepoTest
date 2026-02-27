import React, { useState, useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  Image,
  Alert,
  Share,
  ColorValue,
  ActivityIndicator,
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
  const currentLanguageCode = useMockSelector((state) => state.language.code); 

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
  
  // Nuevo estado para controlar qué comentarios de qué post están visibles
  const [visibleComments, setVisibleComments] = useState<Record<number, boolean>>({});

  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [translatedPosts, setTranslatedPosts] = useState<Record<number, string>>({});
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  
  const styles = getContentCardStyles(isDark);
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');
  
  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#ddd', '#ccc'] as const;

  const tagMapping: Record<string, string> = {
    'All': 'All', 'Todos': 'All',
    'Experience': 'Experience', 'Experiencia': 'Experience',
    'Question': 'Question', 'Pregunta': 'Question',
    'Advice': 'Advice', 'Consejo': 'Advice'
  };

  const subCategories = [
    { id: 'General', icon: 'earth' },
    { id: 'Comida', icon: 'silverware-fork-knife' },
    { id: 'Trabajo', icon: 'briefcase-outline' },
    { id: 'Trámites', icon: 'file-document-outline' },
    { id: 'Salud', icon: 'heart-pulse' },
  ];

  const toggleComments = (postId: number) => {
    setVisibleComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const isTextProfane = (text: string) => {
    if (!filter) return false;
    const sanitized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return filter.isProfane(sanitized) || filter.isProfane(text);
  };

  const handlePost = async () => {
    const trimmedText = postText.trim();
    if (!trimmedText || isPublishing) return;
    if (isTextProfane(trimmedText)) {
      Alert.alert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return; 
    }
    setIsPublishing(true);
    try {
      if (selectedImage) {
        const esSegura = await validarImagenEnServidor(selectedImage);
        if (!esSegura) {
          setIsPublishing(false);
          Alert.alert(t.communitytab.imageInappropriateTittle, t.communitytab.imageInappropriateDescription);
          return;
        }
      }
      const technicalTag = tagMapping[selectedTag] || selectedTag;
      const newPost = {
        id: Date.now(),
        text: trimmedText,
        image: selectedImage,
        tag: technicalTag,
        subCategory: selectedSubCategory,
        likes: 0,
        dislikes: 0,
        userVote: null,
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userName: userMetadata?.name || 'User'
      };
      setPosts(prev => [newPost, ...prev]);
      setPostText('');
      setSelectedImage(null);
      setModalVisible(false);
    } catch (err) { 
      Alert.alert("Error", t.communitytab.errorServer); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  const handleVote = (postId: number, type: 'like' | 'dislike') => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const isSelected = p.userVote === type;
      return {
        ...p,
        likes: type === 'like' ? (isSelected ? p.likes - 1 : p.likes + 1) : (p.userVote === 'like' ? p.likes - 1 : p.likes),
        dislikes: type === 'dislike' ? (isSelected ? p.dislikes - 1 : p.dislikes + 1) : (p.userVote === 'dislike' ? p.dislikes - 1 : p.dislikes),
        userVote: isSelected ? null : type
      };
    }));
  };

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed || !activeCommentId) return;
    if (isTextProfane(trimmed)) {
      Alert.alert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
      return;
    }
    const newComment = {
      id: Date.now(),
      text: trimmed,
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userName: userMetadata?.name || 'User',
    };
    setComments(prev => ({ ...prev, [activeCommentId]: [...(prev[activeCommentId] || []), newComment] }));
    setCommentText(''); 
    setShowCommentInput(false);
    setVisibleComments(prev => ({ ...prev, [activeCommentId]: true }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const filteredPosts = useMemo(() => {
    let res = posts.filter(p => {
      const matchTag = activeFilter === 'All' || tagMapping[p.tag] === tagMapping[activeFilter];
      const matchSub = activeSubFilter === 'All' || p.subCategory === activeSubFilter;
      return matchTag && matchSub;
    });
    return res.sort((a, b) => isRecentFirst ? b.id - a.id : a.id - b.id);
  }, [posts, activeFilter, activeSubFilter, isRecentFirst]);

  const getTranslatedTag = (tag: string) => {
    const base = tagMapping[tag] || tag;
    const idx = base === 'Experience' ? 0 : base === 'Question' ? 1 : 2;
    return t.communitytab.typepostAdd[idx] || tag;
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.centerContainer}>
          <View style={[styles.cardWrapper, { width: cardWidth, height: loggedIn ? height * 0.69 : height * 0.65 }]}>
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={styles.cardContent}>
              
              <View style={localStyles.header}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} /></TouchableOpacity>
                <MaterialCommunityIcons name="account-group-outline" size={36} color={isDark ? '#fff' : '#000'} style={{opacity: 0.2}}/>
              </View>

              <View style={localStyles.filterBar}>
                <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={[styles.chip, isRecentFirst && { borderColor: '#FF5F6D' }]}><MaterialCommunityIcons name="clock-outline" size={16} color={isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')} /></TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {t.communitytab.typepost.map(f => (
                    <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.chip, tagMapping[f] === tagMapping[activeFilter] && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                      <ThemedText style={[styles.chipText, tagMapping[f] === tagMapping[activeFilter] && { color: '#fff' }]}>{f}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={localStyles.subCategoryScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity onPress={() => setActiveSubFilter('All')} style={[localStyles.subFilterChip, activeSubFilter === 'All' && {backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#eee'}]}>
                     <ThemedText style={{fontSize: 10, fontWeight: 'bold'}}># {currentLanguageCode === 'es' ? 'Todos' : 'All'}</ThemedText>
                  </TouchableOpacity>
                  {subCategories.map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => setActiveSubFilter(cat.id)} style={[localStyles.subFilterChip, activeSubFilter === cat.id && {borderColor: '#FF5F6D'}]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={14} color={activeSubFilter === cat.id ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                      <ThemedText style={[localStyles.subChipText, activeSubFilter === cat.id && {color: '#FF5F6D'}]}>{cat.id}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {filteredPosts.map(post => (
                  <View key={post.id} style={localStyles.postCard}>
                    <View style={localStyles.postHeaderRow}>
                      <ThemedText style={localStyles.tagText}>#{getTranslatedTag(post.tag)} • {post.subCategory}</ThemedText>
                      <ThemedText style={localStyles.timeText}>{post.displayTime}</ThemedText>
                    </View>
                    <ThemedText style={[localStyles.bodyText, {color: isDark ? '#fff' : '#333'}]}>{translatedPosts[post.id] || post.text}</ThemedText>
                    
                    {post.image && <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}><Image source={{ uri: post.image }} style={localStyles.postImage} /></TouchableOpacity>}
                    
                    {/* SECCIÓN DESPLEGABLE DE COMENTARIOS */}
                    {visibleComments[post.id] && (
                      <View style={localStyles.inlineCommentsContainer}>
                        {(comments[post.id] || []).length > 0 ? (
                          comments[post.id].map((c) => (
                            <View key={c.id} style={localStyles.inlineCommentBubble}>
                              <ThemedText style={localStyles.inlineCommentUser}>{c.userName}: <ThemedText style={localStyles.inlineCommentText}>{c.text}</ThemedText></ThemedText>
                            </View>
                          ))
                        ) : (
                          <ThemedText style={{fontSize: 12, opacity: 0.5, fontStyle: 'italic', marginBottom: 10}}>Sin comentarios aún...</ThemedText>
                        )}
                        <TouchableOpacity 
                          style={localStyles.addCommentInlineBtn } 
                          onPress={() => { setActiveCommentId(post.id); setShowCommentInput(true); }}
                        >
                          <MaterialCommunityIcons name="pencil-plus-outline" size={14} color="#FF5F6D" />
                          <ThemedText style={{color: '#FF5F6D', fontSize: 11, marginLeft: 5, fontWeight: 'bold'}}>Escribir respuesta</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={localStyles.postFooter}>
                      <View style={localStyles.reaccionGroup}>
                        <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[localStyles.reaccionBtn, { backgroundColor: post.userVote === 'like' ? '#1976D2' : 'rgba(25, 118, 210, 0.15)' }]}>
                            <MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? '#fff' : '#1976D2'} />
                            <ThemedText style={[localStyles.reaccionCount, { color: post.userVote === 'like' ? '#fff' : '#1976D2' }]}>{post.likes}</ThemedText>
                        </TouchableOpacity>

                        {/* BOTÓN COMENTARIO - AHORA DESPLIEGA / OCULTA */}
                        <TouchableOpacity onPress={() => toggleComments(post.id)} style={[localStyles.reaccionBtn, { backgroundColor: visibleComments[post.id] ? (isDark ? '#fff' : '#000') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)') }]}>
                          <MaterialCommunityIcons name="comment-text-multiple-outline" size={14} color={visibleComments[post.id] ? (isDark ? '#000' : '#fff') : (isDark ? "#fff" : "#666")} />
                          <ThemedText style={[localStyles.reaccionCount, { color: visibleComments[post.id] ? (isDark ? '#000' : '#fff') : (isDark ? "#fff" : "#333") }]}>{(comments[post.id] || []).length}</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[localStyles.reaccionBtn, { backgroundColor: post.userVote === 'dislike' ? '#FA8072' : 'rgba(250, 128, 114, 0.15)' }]}>
                            <MaterialCommunityIcons name="thumb-down" size={14} color={post.userVote === 'dislike' ? '#fff' : '#FA8072'} />
                            <ThemedText style={[localStyles.reaccionCount, { color: post.userVote === 'dislike' ? '#fff' : '#FA8072' }]}>{post.dislikes}</ThemedText>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => Share.share({ message: post.text })} style={localStyles.shareIcon}><MaterialCommunityIcons name="share-variant" size={16} color={isDark ? "#fff" : "#666"} /></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* MODAL PARA AGREGAR COMENTARIO */}
      <Modal isVisible={showCommentInput} onBackdropPress={() => setShowCommentInput(false)} avoidKeyboard style={{ margin: 0, justifyContent: 'flex-end' }}>
        <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={localStyles.commentPanel}>
           <View style={localStyles.panelHeader}>
              <ThemedText style={localStyles.panelTitle}>Tu respuesta</ThemedText>
              <TouchableOpacity onPress={() => setShowCommentInput(false)}><MaterialCommunityIcons name="close-circle" size={28} color="#999" /></TouchableOpacity>
           </View>
           <View style={localStyles.inputContainer}>
             <TextInput style={[localStyles.textInput, {color: isDark ? '#fff' : '#000'}]} placeholder="Escribe..." placeholderTextColor="#999" value={commentText} onChangeText={setCommentText} autoFocus multiline />
             <TouchableOpacity onPress={handleAddComment} style={localStyles.sendBtn}><MaterialCommunityIcons name="send" size={20} color="#fff" /></TouchableOpacity>
           </View>
        </BlurView>
      </Modal>

      {/* MODAL NUEVO POST */}
      <Modal isVisible={isModalVisible} onBackdropPress={() => !isPublishing && setModalVisible(false)} avoidKeyboard style={{ margin: 0, justifyContent: 'flex-end' }}>
        <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={localStyles.postModalBlur}>
          <View style={localStyles.postModalContent}>
            <View style={localStyles.postModalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText style={{ color: '#FF5F6D' }}>Cerrar</ThemedText></TouchableOpacity>
              <ThemedText style={localStyles.postModalTitle}>Nueva publicación</ThemedText>
              <View style={{ width: 45 }} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {t.communitytab.typepostAdd.map((tag: string) => (
                <TouchableOpacity key={tag} onPress={() => setSelectedTag(tagMapping[tag] || tag)} style={[localStyles.modalTagChip, selectedTag === (tagMapping[tag] || tag) && { backgroundColor: '#FF5F6D' }]}>
                  <ThemedText style={{ color: selectedTag === (tagMapping[tag] || tag) ? '#fff' : (isDark ? '#fff' : '#333'), fontSize: 12 }}>{tag}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
              {subCategories.map(sub => (
                <TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(sub.id)} style={[localStyles.modalSubChip, selectedSubCategory === sub.id && { borderColor: '#FF5F6D' }]}>
                  <MaterialCommunityIcons name={sub.icon as any} size={14} color={selectedSubCategory === sub.id ? '#FF5F6D' : '#999'} />
                  <ThemedText style={{ marginLeft: 5, fontSize: 11, color: selectedSubCategory === sub.id ? '#FF5F6D' : '#999' }}>{sub.id}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput value={postText} onChangeText={setPostText} placeholder="¿Qué estás pensando?" placeholderTextColor="#999" multiline style={[localStyles.postInput, { color: isDark ? '#fff' : '#000' }]} />
            
            {selectedImage && (
              <View style={localStyles.smallPreviewWrapper}>
                <Image source={{ uri: selectedImage }} style={localStyles.smallPreviewImage} />
                <TouchableOpacity style={localStyles.smallRemoveBtn} onPress={() => setSelectedImage(null)}><MaterialCommunityIcons name="close-circle" size={20} color="#FF5F6D" /></TouchableOpacity>
              </View>
            )}

            <View style={localStyles.postModalActions}>
              <TouchableOpacity onPress={pickImage} disabled={isPublishing}><MaterialCommunityIcons name="image-plus" size={32} color="#FF5F6D" /></TouchableOpacity>
              <TouchableOpacity onPress={handlePost} disabled={!postText.trim() || isPublishing}>
                <LinearGradient colors={postText.trim() ? orangeGradient : disabledGradient} style={localStyles.publishBtn}>
                  {isPublishing ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Publicar</ThemedText>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* FAB */}
      {isCommunityScreen && (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={localStyles.fab}>
          <LinearGradient colors={orangeGradient} style={localStyles.fabGradient}>
            <MaterialCommunityIcons name="plus" size={30} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  filterBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  subCategoryScroll: { marginBottom: 15 },
  subFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  subChipText: { fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  postCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 25, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tagText: { fontSize: 10, color: '#FF5F6D', fontWeight: 'bold', textTransform: 'uppercase' },
  timeText: { fontSize: 9, opacity: 0.5 },
  bodyText: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  postImage: { width: '100%', height: 130, borderRadius: 20, marginBottom: 15 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  reaccionGroup: { flexDirection: 'row', gap: 8 },
  reaccionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  reaccionCount: { fontSize: 11, marginLeft: 5, fontWeight: '600' },
  shareIcon: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  
  // Estilos para comentarios inline (OCULTOS POR DEFECTO)
  inlineCommentsContainer: { marginTop: 5, marginBottom: 10, borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  inlineCommentBubble: { marginBottom: 8 },
  inlineCommentUser: { fontSize: 12, fontWeight: 'bold', color: '#FF5F6D' },
  inlineCommentText: { fontSize: 12, fontWeight: 'normal' },
  addCommentInlineBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 10 },

  commentPanel: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  panelTitle: { fontSize: 18, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 25, paddingHorizontal: 15, marginTop: 10, marginBottom: 30 },
  textInput: { flex: 1, minHeight: 45, maxHeight: 100, fontSize: 15 },
  sendBtn: { backgroundColor: '#FF5F6D', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  postModalBlur: { borderTopLeftRadius: 35, borderTopRightRadius: 35, overflow: 'hidden' },
  postModalContent: { padding: 25, paddingBottom: 40 },
  postModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  postModalTitle: { fontSize: 18, fontWeight: 'bold' },
  postInput: { minHeight: 100, fontSize: 16, textAlignVertical: 'top', marginBottom: 15 },
  modalTagChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  modalSubChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.05)' },
  smallPreviewWrapper: { width: 80, height: 80, borderRadius: 12, marginBottom: 15, position: 'relative' },
  smallPreviewImage: { width: '100%', height: '100%', borderRadius: 12 },
  smallRemoveBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  postModalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  publishBtn: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  fab: { position: 'absolute', bottom: 65, right: 25, width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});