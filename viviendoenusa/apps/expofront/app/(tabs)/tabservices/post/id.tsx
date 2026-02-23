import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Componente de texto temático (ajustado para evitar errores de importación)
import { ThemedText } from '@/components/ThemedText';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id, text, tag } = useLocalSearchParams();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/community'); // Fallback si no hay historial
    }
  };

  const addComment = () => {
    if (commentText.trim()) {
      setComments([...comments, { id: Date.now(), text: commentText }]);
      setCommentText('');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient colors={['#0f0c29', '#302b63']} style={StyleSheet.absoluteFill} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* HEADER CUSTOM */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Comentarios</ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {/* TARJETA DEL POST */}
          <BlurView intensity={30} tint="dark" style={styles.postCard}>
            <ThemedText style={styles.tagText}>#{tag || 'Comunidad'}</ThemedText>
            <ThemedText style={styles.postBody}>{text || 'Cargando contenido...'}</ThemedText>
          </BlurView>

          <View style={styles.divider} />

          {/* LISTA DE COMENTARIOS */}
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.avatar} />
              <View style={styles.commentBubble}>
                <ThemedText style={styles.commentText}>{c.text}</ThemedText>
              </View>
            </View>
          ))}
          
          {comments.length === 0 && (
            <ThemedText style={styles.emptyText}>No hay comentarios aún.</ThemedText>
          )}
        </ScrollView>

        {/* INPUT FIJO */}
        <BlurView intensity={80} tint="dark" style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe algo..."
            placeholderTextColor="#aaa"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity onPress={addComment} style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={24} color="#FF5F6D" />
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0f0c29' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingTop: 50, 
    paddingHorizontal: 15,
    paddingBottom: 15 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  iconButton: { padding: 5 },
  scrollBody: { padding: 20, paddingBottom: 100 },
  postCard: { 
    padding: 20, 
    borderRadius: 20, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  tagText: { color: '#FF5F6D', fontWeight: 'bold', marginBottom: 10 },
  postBody: { color: '#fff', fontSize: 16, lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 25 },
  commentItem: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  avatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#FF5F6D' },
  commentBubble: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    padding: 12, 
    borderRadius: 15 
  },
  commentText: { color: '#eee', fontSize: 14 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  inputBar: { 
    flexDirection: 'row', 
    padding: 15, 
    paddingBottom: Platform.OS === 'ios' ? 35 : 15,
    alignItems: 'center' 
  },
  textInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    color: '#fff',
    marginRight: 10
  },
  sendButton: { padding: 5 }
});