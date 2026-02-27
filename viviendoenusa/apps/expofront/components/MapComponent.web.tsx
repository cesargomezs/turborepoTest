import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText'; // Ajusta la ruta

export default function MapComponent() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 20 }}>
      <MaterialCommunityIcons name="map-legend" size={40} color="#FF5F6D" />
      <ThemedText style={{ opacity: 0.5, fontSize: 12, marginTop: 10 }}>
        Vista de mapa optimizada para la App móvil
      </ThemedText>
    </View>
  );
}