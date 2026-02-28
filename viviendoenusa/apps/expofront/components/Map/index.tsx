import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MapComponent({ mapRef, userLocation, showMarkers, dataSource, mapKey, onMarkerPress, onZoom }: any) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView 
        key={`map-${mapKey}`}
        ref={mapRef} 
        style={StyleSheet.absoluteFill} 
        showsUserLocation={true}
        initialRegion={userLocation || { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
      >
        {showMarkers && dataSource.map((l: any) => (
          <Marker 
            key={l.id} 
            coordinate={{ latitude: l.lat, longitude: l.lng }} 
            onPress={() => onMarkerPress(l)} 
          />
        ))}
      </MapView>
      <View style={{ position: 'absolute', bottom: 15, right: 15, gap: 10 }}>
        <TouchableOpacity style={{ backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 5 }} onPress={() => userLocation && mapRef.current?.animateToRegion(userLocation, 1000)}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#0080B5" />
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 5 }} onPress={() => onZoom('in')}><MaterialCommunityIcons name="plus" size={20} color="#0080B5" /></TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 5 }} onPress={() => onZoom('out')}><MaterialCommunityIcons name="minus" size={20} color="#0080B5" /></TouchableOpacity>
      </View>
    </View>
  );
}