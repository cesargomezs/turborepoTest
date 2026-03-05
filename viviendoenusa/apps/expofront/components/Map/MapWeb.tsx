import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

// Recibe userLocation para centrar y dataSource para saber qué buscar
export default function MapComponent({ userLocation, dataSource }: any) {
  
  const isWeb = Platform.OS === 'web';

  if (isWeb && userLocation) {
    const { latitude, longitude } = userLocation;
    
    // Si hay resultados en el scroll (dataSource), pedimos a Google que busque abogados ahí
    // Si no hay resultados, solo mostramos el punto del ZIP
    const hasResults = dataSource && dataSource.length > 0;
    const searchQuery = hasResults 
      ? `Lawyers near ${latitude},${longitude}` 
      : `${latitude},${longitude}`;

    // z=14 es un zoom ideal para ver calles y pines
    const mapUrl = `http://googleusercontent.com/maps.google.com/4{encodeURIComponent(searchQuery)}&z=14&output=embed`;

    return (
      <View style={webStyles.container}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
        />
      </View>
    );
  }

  // Estado cuando no hay búsqueda o es Mobile
  return (
    <View style={webStyles.placeholder}>
      <MaterialCommunityIcons 
        name={userLocation ? "map-search-outline" : "map-marker-radius-outline"} 
        size={50} 
        color="#FF5F6D" 
        style={{ opacity: 0.6 }} 
      />
      <ThemedText style={webStyles.placeholderText}>
        {userLocation 
          ? "Cargando mapa interactivo..." 
          : "Ingresa tu ZIP para ver abogados en el mapa"}
      </ThemedText>
    </View>
  );
}

const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#eee',
    // Sombra para que se vea bien sobre el BlurView
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0,0,0,0.1)' }
    })
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'rgba(150,150,150,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    borderStyle: 'dashed',
    minHeight: 300
  },
  placeholderText: {
    opacity: 0.5,
    marginTop: 15,
    textAlign: 'center',
    fontSize: 13
  }
});