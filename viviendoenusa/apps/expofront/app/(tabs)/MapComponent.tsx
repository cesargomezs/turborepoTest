import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MapComponent({ mapRef, userLocation, showMarkers, dataSource, mapKey, onMarkerPress, onZoom }: any) {
  return (
    <>
      <MapView 
        key={`map-${mapKey}`} 
        ref={mapRef} 
        style={{ flex: 1, borderRadius: 20 }} 
        showsUserLocation={true}
        initialRegion={userLocation || { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
      >
        {showMarkers && dataSource.map((l: any) => (
          <Marker 
            key={l.id} 
            coordinate={{ latitude: l.lat, longitude: l.lng }} 
            title={l.name}
            onPress={() => onMarkerPress(l)} 
          />
        ))}
      </MapView>
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => mapRef.current?.animateToRegion(userLocation, 1000)}>
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#0080B5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => onZoom('in')}>
          <MaterialCommunityIcons name="plus" size={18} color="#0080B5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => onZoom('out')}>
          <MaterialCommunityIcons name="minus" size={18} color="#0080B5" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  zoomControls: { position: 'absolute', bottom: 10, right: 10, gap: 8 },
  zoomBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 }
});