import React from 'react';
import MapView, { Marker } from 'react-native-maps'; // O tu librería de mapas

export default function MapNative({ mapRef, userLocation, onZoom, onMarkerPress, dataSource, showMarkers }: any) {
  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={userLocation}
    >
      {showMarkers && dataSource.map((lawyer: any) => (
        <Marker
          key={lawyer.id}
          coordinate={{ latitude: lawyer.lat, longitude: lawyer.lng }}
          title={lawyer.name}
          onPress={() => onMarkerPress(lawyer)}
        />
      ))}
    </MapView>
  );
}