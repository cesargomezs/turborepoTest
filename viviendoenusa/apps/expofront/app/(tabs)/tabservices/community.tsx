import React, { useState, useRef, useMemo } from 'react';
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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { contentCardStyles as styles } from "../../src/styles/contentcard";
import * as ImagePicker from 'expo-image-picker';
import Modal from 'react-native-modal';
import { Colors } from '../../../constants/Colors';

export default function CommunityScreen() {
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('Experience'); 
  const [activeFilter, setActiveFilter] = useState('All'); // Nuevo estado para el filtro
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);
  
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');
  const orangeGradient = ['#FF5F6D', '#FFC371'];

  // Lógica de filtrado
  const filteredPosts = useMemo(() => {
    if (activeFilter === 'All') return posts;
    return posts.filter(post => post.tag === activeFilter);
  }, [posts, activeFilter]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const openImageViewer = (uri: string) => {
    setImageToView(uri);
    setViewerVisible(true);
  };

  const handleVote = (postId: number, type: 'like' | 'dislike') => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isSelected = p.userVote === type;
        return {
          ...p,
          likes: type === 'like' ? (isSelected ? p.likes - 1 : p.likes + 1) : (p.userVote === 'like' ? p.likes - 1 : p.likes),
          dislikes: type === 'dislike' ? (isSelected ? p.dislikes - 1 : p.dislikes + 1) : (p.userVote === 'dislike' ? p.dislikes - 1 : p.dislikes),
          userVote: isSelected ? null : type
        };
      }
      return p;
    }));
  };

  const handlePost = () => {
    if (!postText.trim()) return;
    const newPost = {
      id: Date.now(),
      text: postText,
      image: selectedImage,
      tag: selectedTag,
      likes: 0,
      dislikes: 0,
      userVote: null
    };
    setPosts([newPost, ...posts]);
    setPostText('');
    setSelectedImage(null);
    setModalVisible(false);
    Keyboard.dismiss();
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={[styles.scrollContainer, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={styles.centerContainer}>
           <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
              <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              
              <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="account-group-outline" size={40} color={Colors[colorScheme].tabIconNotSelected} style={{opacity: 0.4}}/>
                </View>

                {/* BARRA DE FILTROS SUPERIOR */}
                <View style={localStyles.filterBar}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {['All', 'Experience', 'Question', 'Advice'].map(filter => (
                      <TouchableOpacity 
                        key={filter} 
                        onPress={() => setActiveFilter(filter)}
                        style={[
                          localStyles.filterChip, 
                          activeFilter === filter && { backgroundColor: '#FF5F6D' }
                        ]}
                      >
                        <ThemedText style={[
                          localStyles.filterChipText, 
                          activeFilter === filter && { color: '#fff' }
                        ]}>
                          {filter === 'All' ? 'Todos' : filter}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                  <View style={{ marginTop: 10 }}>
                    {filteredPosts.length === 0 && (
                      <ThemedText style={{ textAlign: 'center', opacity: 0.5, marginTop: 40, color: '#fff' }}>
                        No hay publicaciones en esta categoría.
                      </ThemedText>
                    )}
                    {filteredPosts.map(post => (
                      <View key={post.id} style={localStyles.postCard}>
                        <ThemedText style={localStyles.tagText}>#{post.tag}</ThemedText>
                        <ThemedText style={[localStyles.bodyText]}>{post.text}</ThemedText>
                        
                        {post.image && (
                          <TouchableOpacity activeOpacity={0.9} onPress={() => openImageViewer(post.image)}>
                            <Image source={{ uri: post.image }} style={localStyles.postImageLarge} resizeMode="cover" />
                          </TouchableOpacity>
                        )}
                        
                        <View style={localStyles.postFooter}>
                          <View style={localStyles.voteContainer}>
                            <TouchableOpacity style={[localStyles.voteBtn, post.userVote === 'like' && {backgroundColor: '#FF5F6D'}]} onPress={() => handleVote(post.id, 'like')}>
                              <MaterialCommunityIcons name="thumb-up" size={14} color={post.userVote === 'like' ? "#fff" : "#FF5F6D"} />
                              <ThemedText style={[localStyles.voteCount, post.userVote === 'like' && {color: '#fff'}]}>{post.likes}</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[localStyles.voteBtn, post.userVote === 'dislike' && {backgroundColor: '#666'}]} onPress={() => handleVote(post.id, 'dislike')}>
                              <MaterialCommunityIcons name="thumb-down" size={14} color="#fff" />
                              <ThemedText style={[localStyles.voteCount, {color: '#fff'}]}>{post.dislikes}</ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
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

          {/* MODAL PARA CREAR POST (Se mantiene igual) */}
          <Modal isVisible={isModalVisible} onBackdropPress={() => { setModalVisible(false); Keyboard.dismiss(); }} style={{ margin: 0, justifyContent: 'flex-end' }}>
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={localStyles.modalBlur}>
              <View style={localStyles.modalContent}>
                <View style={localStyles.modalHeader}>
                  <TouchableOpacity onPress={() => { setModalVisible(false); Keyboard.dismiss(); }}>
                    <ThemedText style={{ color: '#FF5F6D', fontWeight: 'bold' }}>Cerrar</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={localStyles.modalTitle}>Nueva Publicación</ThemedText>
                  <View style={{ width: 45 }} />
                </View>

                <View style={localStyles.categoryRow}>
                  {['Experience', 'Question', 'Advice'].map(tag => (
                    <TouchableOpacity 
                      key={tag} 
                      onPress={() => setSelectedTag(tag)} 
                      style={[localStyles.tagChip, selectedTag === tag && { backgroundColor: '#FF5F6D' }]}
                    >
                      <ThemedText style={[localStyles.tagChipText, selectedTag === tag && { color: '#fff' }]}>{tag}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  value={postText}
                  onChangeText={setPostText}
                  placeholder="¿Qué quieres compartir?"
                  placeholderTextColor="#999"
                  multiline
                  style={[localStyles.input, { color: isDark ? '#fff' : '#000' }]}
                />

                {selectedImage && (
                  <View style={localStyles.miniPreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={localStyles.miniPreviewImage} />
                    <TouchableOpacity style={localStyles.miniRemoveBtn} onPress={() => setSelectedImage(null)}>
                      <MaterialCommunityIcons name="close-circle" size={22} color="#FF5F6D" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={localStyles.modalActions}>
                  <TouchableOpacity onPress={pickImage} style={localStyles.cameraBtn}>
                    <MaterialCommunityIcons name="image-plus" size={26} color="#FF5F6D" />
                    <ThemedText style={{marginLeft: 8, color: '#FF5F6D', fontWeight: 'bold'}}>Foto</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handlePost} disabled={!postText.trim()}>
                    <LinearGradient colors={postText.trim() ? orangeGradient : ['#ddd', '#ccc']} style={localStyles.publishBtn}>
                      <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Publicar</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Modal>

          {/* VISOR DE IMAGEN (Se mantiene igual) */}
          <Modal isVisible={viewerVisible} onBackdropPress={() => setViewerVisible(false)} style={{ margin: 0 }}>
            <View style={localStyles.viewerContainer}>
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <TouchableOpacity style={localStyles.closeViewer} onPress={() => setViewerVisible(false)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              {imageToView && <Image source={{ uri: imageToView }} style={{ width: width, height: height * 0.8 }} resizeMode="contain" />}
            </View>
          </Modal>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  postCard: { backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 25, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  tagText: { fontSize: 10, color: '#FF5F6D', fontWeight: '900', marginBottom: 5, textTransform: 'uppercase' },
  bodyText: { fontSize: 14, fontWeight: '500', marginBottom: 12 },
  postImageLarge: { width: '100%', height: 220, borderRadius: 20, marginBottom: 15 },
  postFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  voteContainer: { flexDirection: 'row', gap: 10 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  voteCount: { marginLeft: 6, fontSize: 13, fontWeight: 'bold', color: '#fff' },
  
  // Estilos de la barra de filtros
  filterBar: { marginBottom: 15, paddingBottom: 5 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#eee' },

  fab: { position: 'absolute', bottom: 30, right: 25, width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBlur: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  modalContent: { padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  categoryRow: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  tagChipText: { fontSize: 12, fontWeight: '700', color: '#666' },
  input: { minHeight: 80, fontSize: 18, textAlignVertical: 'top', marginBottom: 10 },
  miniPreviewContainer: { width: 90, height: 90, marginBottom: 20, position: 'relative' },
  miniPreviewImage: { width: '100%', height: '100%', borderRadius: 15 },
  miniRemoveBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,95,109,0.1)', padding: 12, borderRadius: 15 },
  publishBtn: { borderRadius: 20, paddingHorizontal: 30, height: 50, justifyContent: 'center', alignItems: 'center' },
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeViewer: { position: 'absolute', top: 50, right: 25, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 25 }
});