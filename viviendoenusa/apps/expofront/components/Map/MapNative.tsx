import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View, StyleSheet } from 'react-native';

export default function MapNative({ mapRef, userLocation, showMarkers, dataSource, mapKey, onMarkerPress }: any) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView 
        key={mapKey}
        ref={mapRef} 
        style={StyleSheet.absoluteFill} 
        initialRegion={userLocation}
      >
        {showMarkers && dataSource.map((l: any) => (
          <Marker key={l.id} coordinate={{ latitude: l.lat, longitude: l.lng }} onPress={() => onMarkerPress(l)} />
        ))}
      </MapView>
    </View>
  );
}