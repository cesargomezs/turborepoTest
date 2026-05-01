import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';

export const ReviewsModal = ({ visible, target, isDark, onClose, onAddReview, ReviewForm, DC, S }: any) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={S.reviewModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[S.reviewModalBox, { borderColor: DC.border }]}>
            <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={{ padding: 25, flex: 1 }}>
              {showForm ? (
                <ReviewForm 
                  isDark={isDark} 
                  onCancel={() => setShowForm(false)} 
                  onPublish={(r: number, c: string) => { onAddReview(target.id, r, c); setShowForm(false); }} 
                />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                    <ThemedText style={{ fontSize: 20, fontWeight: '900' }}>Reseñas ({target?.reviews.length || 0})</ThemedText>
                    <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={DC.text} /></TouchableOpacity>
                  </View>
                  <ScrollView>
                    {target?.reviews.map((r: any) => (
                      <View key={r.id} style={{ marginBottom: 15, padding: 10, borderRadius: 10, backgroundColor: DC.inputBg }}>
                        <ThemedText style={{ fontWeight: '800' }}>{r.stars} estrellas</ThemedText>
                        <ThemedText style={{ fontSize: 13 }}>{r.comment}</ThemedText>
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity onPress={() => setShowForm(true)} style={{ marginTop: 15, padding: 15, borderRadius: 15, backgroundColor: '#FF5F6D', alignItems: 'center' }}>
                    <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Escribir reseña</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};