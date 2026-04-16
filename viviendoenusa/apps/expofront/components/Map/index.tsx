import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, MapViewProps } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MyMapProps {
  // Ajuste de tipo para permitir null (soluciona el error TS2322)
  mapRef: React.RefObject<MapView | null>; 
  userLocation: any;
  showMarkers: boolean;
  dataSource: any[];
  mapKey: number;
  onMarkerPress: (item: any) => void;
  onZoom: (type: 'in' | 'out') => void;
  showsUserLocation?: boolean;
  options?: any; // Para compatibilidad con Web si es necesario
}

export default function MapComponent({ 
  mapRef, 
  userLocation, 
  showMarkers, 
  dataSource, 
  mapKey, 
  onMarkerPress, 
  onZoom,
  showsUserLocation = false 
}: MyMapProps) {

  const mapProps: MapViewProps = {
    showsUserLocation: showsUserLocation,
    showsMyLocationButton: false, // Quita el botón nativo de Android
    showsCompass: false,          // Quita la brújula
    toolbarEnabled: false,        // Quita la barra de herramientas que tapa el zoom
    zoomEnabled: true,
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView 
        key={`map-${mapKey}`}
        ref={mapRef} 
        style={StyleSheet.absoluteFill} 
        {...mapProps}
        initialRegion={userLocation || { 
          latitude: 34.0522, 
          longitude: -118.2437, 
          latitudeDelta: 0.1, 
          longitudeDelta: 0.1 
        }}
      >
        {showMarkers && dataSource.map((l: any) => (
          <Marker 
            key={`marker-${l.id}`} 
            coordinate={{ latitude: l.lat, longitude: l.lng }} 
            onPress={() => onMarkerPress(l)}
            pinColor="#FF5F6D"
          />
        ))}
      </MapView>

      {/* Controles flotantes personalizados */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => userLocation && mapRef.current?.animateToRegion(userLocation, 1000)}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0080B5" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btn} onPress={() => onZoom('in')}>
          <MaterialCommunityIcons name="plus" size={20} color="#0080B5" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btn} onPress={() => onZoom('out')}>
          <MaterialCommunityIcons name="minus" size={20} color="#0080B5" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute', 
    bottom: 15, 
    right: 15, 
    gap: 10 
  },
  btn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center'
  }
});