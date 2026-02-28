import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

export default function MapWeb() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
      <MaterialCommunityIcons name="map-marker-off" size={40} color="#ccc" />
      <ThemedText style={{ color: '#999' }}>Mapa no disponible en Web</ThemedText>
    </View>
  );
}