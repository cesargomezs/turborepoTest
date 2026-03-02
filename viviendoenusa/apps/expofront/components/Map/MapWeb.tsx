import React from 'react';
import { View } from 'react-native';

export default function MapWeb({ userLocation, dataSource }: any) {
  // Si no hay ubicación aún, mostramos un fondo gris limpio
  if (!userLocation) {
    return <View style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20 }} />;
  }

  const lat = userLocation.latitude;
  const lng = userLocation.longitude;
  
  // URL de Google Maps para Web
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`;

  return (
    <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
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