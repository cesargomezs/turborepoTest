import React from 'react';
import { View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

// Añadimos { userLocation } para que reciba la búsqueda de la pantalla principal
export default function MapComponent({ userLocation }: any) {
  
  // 1. Si estamos en Web y hay una ubicación, mostramos un mapa real
  if (Platform.OS === 'web' && userLocation) {
    const lat = userLocation.latitude;
    const lng = userLocation.longitude;
    // URL de Google Maps para mostrar la zona buscada
    const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;

    return (
      <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', minHeight: 400 }}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
        />
      </View>
    );
  }

  // 2. Si no hay búsqueda o no es web, mostramos tu diseño original (pero mejorado)
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: 'rgba(150,150,150,0.1)', 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderRadius: 20, 
      minHeight: 200 
    }}>
      <MaterialCommunityIcons 
        name={userLocation ? "map-check" : "map-marker-radius-outline"} 
        size={48} 
        color="#FF5F6D" 
        style={{ opacity: 0.5 }} 
      />
      <ThemedText style={{ opacity: 0.6, marginTop: 10 }}>
        {userLocation ? "Ubicación cargada (Vista Web)" : "Mapa disponible en App móvil"}
      </ThemedText>
    </View>
  );
}