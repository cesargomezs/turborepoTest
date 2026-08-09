import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

// 1. Declaramos las variables globales para Leaflet
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, L: any;

// 2. Cargamos Leaflet de forma dinámica SOLO si estamos en el navegador
if (typeof window !== 'undefined') {
  const ReactLeaflet = require('react-leaflet');
  MapContainer = ReactLeaflet.MapContainer;
  TileLayer = ReactLeaflet.TileLayer;
  Marker = ReactLeaflet.Marker;
  Popup = ReactLeaflet.Popup;

  L = require('leaflet');
  require('leaflet/dist/leaflet.css');

  // 🚀 FIX OBLIGATORIO: Repara el error de íconos rotos en Leaflet Web
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
}

// 3. Componente Principal
export default function MapComponent() {
  
  // FASE DE SERVIDOR/LOCAL: Si window no existe, mostramos vista de carga
  if (typeof window === 'undefined') {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="map-marker-radius" size={40} color="#888" />
        <ThemedText style={styles.loadingText}>Cargando mapa...</ThemedText>
      </View>
    );
  }

  // FASE NAVEGADOR: Renderizamos el mapa con normalidad
  return (
    <View style={styles.container}>
      <MapContainer 
        center={[34.1083, -117.5931]} // Puedes cambiar estas coordenadas por las que necesites
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[34.1083, -117.5931]}>
          <Popup>
            <ThemedText>¡Aquí está tu ubicación!</ThemedText>
          </Popup>
        </Marker>
      </MapContainer>
    </View>
  );
}

// 4. Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 400, 
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
  }
});