import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

export default function MapComponent() {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center', borderRadius: 20, minHeight: 200 }}>
      <MaterialCommunityIcons name="map-marker-radius-outline" size={48} color="#FF5F6D" style={{ opacity: 0.5 }} />
      <ThemedText style={{ opacity: 0.6, marginTop: 10 }}>Mapa disponible en App móvil</ThemedText>
    </View>
  );
}