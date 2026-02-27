import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
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

// ✅ IMPORTACIÓN DE VALIDACIÓN REMOTA (Backend)
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

// ✅ IMPORTACIÓN SEGURA PARA EVITAR 'UNDEFINED'
import * as BadWordsLib from 'bad-words';

import {badWordsList } from '../../../utils/babwords.json';

export default function CommunityScreen() {
  const { t } = useTranslation();
  const currentLanguageCode = useMockSelector((state) => state.language.code);

  // ✅ 1. CONFIGURACIÓN DEL FILTRO DE TEXTO
  const filter = useMemo(() => {
    try {
      const Lib = BadWordsLib as any;
      const Constructor = Lib.default || Lib.Filter || (typeof Lib === 'function' ? Lib : null);
      if (Constructor) {
        const instance = new Constructor();
        //const badWords = ['pendejo', 'mierda', 'puto', 'verga', 'fuck', 'shit', 'bitch']; 
        const badWords = Array.isArray(badWordsList) ? badWordsList : [];
        if (instance.addWords) instance.addWords(...badWords);
        return instance;
      }
      return null;
    } catch (e) { return null; }
  }, []);

  // ✅ 2. ESTADOS
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('Experience'); 
  const [activeFilter, setActiveFilter] = useState('All');
  const [isRecentFirst, setIsRecentFirst] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false); 
  
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  const [translatedPosts, setTranslatedPosts] = useState<Record<number, string>>({});
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
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

  // ✅ 3. LÓGICA DE PUBLICACIÓN (CON VALIDACIÓN DE SERVIDOR)
  const handlePost = async () => {
    const trimmedText = postText.trim();
    if (!trimmedText || isPublishing) return;

    // A) Validar groserías en texto
    if (filter) {
      const sanitized = trimmedText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (filter.isProfane(sanitized) || filter.isProfane(trimmedText)) {
        Alert.alert(
          t.communitytab.textInappropriateTittle,
          t.communitytab.textInappropriateDescription
        );
        return; 
      }
    }

    setIsPublishing(true);

    try {
      // B) Validar imagen en Servidor (IA remota)
      if (selectedImage) {
        const esSegura = await validarImagenEnServidor(selectedImage);
        if (!esSegura) {
          setIsPublishing(false);
          Alert.alert(
            t.communitytab.imageInappropriateTittle,
            t.communitytab.imageInappropriateDescription
          );
          return;
        }
      }

      // C) Crear el Post
      const technicalTag = tagMapping[selectedTag] || selectedTag;
      const newPost = {
        id: Date.now(),
        text: trimmedText,
        image: selectedImage,
        tag: technicalTag,
        likes: 0,
        dislikes: 0,
        userVote: null,
        displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setPosts(prev => [newPost, ...prev]);
      setPostText('');
      setSelectedImage(null);
      setModalVisible(false);
      Keyboard.dismiss();
      
      Alert.alert(
        t.communitytab.publishedPostLabel,
        t.communitytab.publishedPostDescription
      );

    } catch (err) {
      Alert.alert("Error", t.communitytab.errorServer);
    } finally {
      setIsPublishing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: 'images' as any,
      quality: 0.7 
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleTranslate = async (postId: number, text: string) => {
    if (translatedPosts[postId]) {
      const { [postId]: _, ...rest } = translatedPosts;
      setTranslatedPosts(rest);
      return;
    }
    setTranslatingId(postId);
    try {
      const targetLang = currentLanguageCode === 'es' ? 'en' : 'es';
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURI(text)}`);
      const data = await response.json();
      setTranslatedPosts(prev => ({ ...prev, [postId]: data[0].map((i: any) => i[0]).join('') }));
    } finally { setTranslatingId(null); }
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

  const filteredPosts = useMemo(() => {
    let res = posts.filter(p => activeFilter === 'All' || tagMapping[p.tag] === tagMapping[activeFilter]);
    return res.sort((a, b) => isRecentFirst ? b.id - a.id : a.id - b.id);
  }, [posts, activeFilter, isRecentFirst]);

  const getTranslatedTag = (tag: string) => {
    const base = tagMapping[tag] || tag;
    const idx = base === 'Experience' ? 0 : base === 'Question' ? 1 : 2;
    return t.communitytab.typepostAdd[idx] || tag;
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          
          <View style={styles.centerContainer}>
            <View style={[styles.cardWrapper, { width: cardWidth, height: loggedIn ? height * 0.69 : height * 0.65 }]}>
              <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              
              <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                  <TouchableOpacity onPress={() => router.push('/services')}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="account-group-outline" size={36} color={isDark ? '#fff' : '#000'} style={{opacity: 0.2}}/>
                </View>

                <View style={localStyles.filterBar}>
                  <TouchableOpacity onPress={() => setIsRecentFirst(!isRecentFirst)} style={[styles.chip, isRecentFirst && { borderColor: '#FF5F6D' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={isRecentFirst ? '#FF5F6D' : (isDark ? '#fff' : '#666')} />
                  </TouchableOpacity>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {t.communitytab.typepost.map(f => (
                      <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.chip, tagMapping[f] === tagMapping[activeFilter] && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                        <ThemedText style={[styles.chipText, tagMapping[f] === tagMapping[activeFilter] && { color: '#fff' }]}>{f}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                  {filteredPosts.map(post => (
                    <View key={post.id} style={localStyles.postCard}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                        <ThemedText style={localStyles.tagText}>#{getTranslatedTag(post.tag)}</ThemedText>
                        <ThemedText style={{fontSize: 9, opacity: 0.5}}>{post.displayTime}</ThemedText>
                      </View>
                      
                      <ThemedText style={[localStyles.bodyText, {color: isDark ? '#fff' : '#333'}]}>{translatedPosts[post.id] || post.text}</ThemedText>

                      <TouchableOpacity onPress={() => handleTranslate(post.id, post.text)} style={{ marginBottom: 12 }}>
                        {translatingId === post.id ? <ActivityIndicator size="small" color="#FF5F6D" /> : (
                          <ThemedText style={{ fontSize: 11, color: '#FF5F6D', fontWeight: 'bold' }}>
                            {translatedPosts[post.id] ? (currentLanguageCode === 'es' ? "Ver Original" : "Show Original") : (currentLanguageCode === 'es' ? "Traducir" : "Translate")}
                          </ThemedText>
                        )}
                      </TouchableOpacity>

                      {post.image && (
                        <TouchableOpacity onPress={() => { setImageToView(post.image); setViewerVisible(true); }}>
                          <Image source={{ uri: post.image }} style={localStyles.postImage} />
                        </TouchableOpacity>
                      )}
                      
                      <View style={localStyles.postFooter}>
                        <TouchableOpacity onPress={() => Share.share({ message: post.text })} style={localStyles.footerAction}>
                          <MaterialCommunityIcons name="share-variant" size={18} color={isDark ? "#fff" : "#666"} />
                        </TouchableOpacity>
                        <View style={{flexDirection: 'row', gap: 10}}>
                          <TouchableOpacity onPress={() => handleVote(post.id, 'like')} style={[localStyles.voteBtn, post.userVote === 'like' && {backgroundColor: '#1976D2'}]}>
                            <MaterialCommunityIcons name="thumb-up" size={14} color="#fff" />
                            <ThemedText style={{color: '#fff', fontSize: 12, marginLeft: 5}}>{post.likes}</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleVote(post.id, 'dislike')} style={[localStyles.voteBtn, post.userVote === 'dislike' && {backgroundColor: '#FF5F6D'}]}>
                            <MaterialCommunityIcons name="thumb-down" size={14} color="#fff" />
                            <ThemedText style={{color: '#fff', fontSize: 12, marginLeft: 5}}>{post.dislikes}</ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {isCommunityScreen && (
            <TouchableOpacity onPress={() => setModalVisible(true)} style={localStyles.fab}>
              <LinearGradient colors={orangeGradient} style={localStyles.fabGradient}>
                <MaterialCommunityIcons name="plus" size={30} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <Modal isVisible={isModalVisible} onBackdropPress={() => !isPublishing && setModalVisible(false)} avoidKeyboard style={{ margin: 0, justifyContent: 'flex-end' }}>
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={localStyles.modalBlur}>
              <View style={localStyles.modalContent}>
                <View style={localStyles.modalHeader}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isPublishing}>
                    <ThemedText style={{ color: '#FF5F6D' }}>{t.communitytab.closepost}</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={localStyles.modalTitle}>{t.communitytab.messagenewpost}</ThemedText>
                  <View style={{ width: 45 }} />
                </View>

                <View style={localStyles.categoryRow}>
                  {t.communitytab.typepostAdd.map(tag => (
                    <TouchableOpacity key={tag} disabled={isPublishing} onPress={() => setSelectedTag(tag)} style={[localStyles.tagChip, tagMapping[tag] === tagMapping[selectedTag] && { backgroundColor: '#FF5F6D' }]}>
                      <ThemedText style={[localStyles.tagChipText, tagMapping[tag] === tagMapping[selectedTag] && { color: '#fff' }]}>{tag}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput 
                  value={postText} onChangeText={setPostText} 
                  placeholder={t.communitytab.questionnewpost} placeholderTextColor="#999" 
                  multiline style={[localStyles.input, { color: isDark ? '#fff' : '#000' }]}
                  editable={!isPublishing}
                />
                
                {selectedImage && (
                  <View style={localStyles.previewContainer}>
                    <Image source={{ uri: selectedImage }} style={localStyles.previewImage} />
                    {!isPublishing && (
                      <TouchableOpacity onPress={() => setSelectedImage(null)} style={localStyles.removePreview}>
                        <MaterialCommunityIcons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={localStyles.modalActions}>
                  <TouchableOpacity onPress={pickImage} disabled={isPublishing}>
                    <MaterialCommunityIcons name="image-plus" size={32} color={isPublishing ? "#ccc" : "#FF5F6D"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePost} disabled={!postText.trim() || isPublishing}>
                    <LinearGradient colors={postText.trim() && !isPublishing ? orangeGradient : disabledGradient} style={localStyles.publishBtn}>
                      {isPublishing ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                          <ThemedText style={{ color: '#fff' }}>{currentLanguageCode === 'es' ? "Analizando..." : "Analyzing..."}</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{t.communitytab.botonpost}</ThemedText>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Modal>

          <Modal isVisible={viewerVisible} onBackdropPress={() => setViewerVisible(false)} style={{ margin: 0 }}>
            <View style={localStyles.viewerContainer}>
              <TouchableOpacity style={localStyles.closeViewer} onPress={() => setViewerVisible(false)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              {imageToView && <Image source={{ uri: imageToView }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
            </View>
          </Modal>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  filterBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  postCard: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 25, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  tagText: { fontSize: 10, color: '#FF5F6D', fontWeight: 'bold', textTransform: 'uppercase' },
  bodyText: { fontSize: 15, marginBottom: 12, lineHeight: 22 },
  postImage: { width: '100%', height: 160, borderRadius: 20, marginBottom: 15 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerAction: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  fab: { position: 'absolute', bottom: 30, right: 25, width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBlur: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  modalContent: { padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tagChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  tagChipText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  input: { minHeight: 120, fontSize: 18, textAlignVertical: 'top', marginBottom: 20 },
  previewContainer: { position: 'relative', width: 100, height: 100, marginBottom: 20 },
  previewImage: { width: '100%', height: '100%', borderRadius: 15 },
  removePreview: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FF5F6D', borderRadius: 12, padding: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  publishBtn: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25, minWidth: 140, alignItems: 'center' },
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  closeViewer: { position: 'absolute', top: 50, right: 25, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 30, zIndex: 10 }
});