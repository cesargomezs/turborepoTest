import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

// 1. Icono para los Abogados (Rojo tipo Google)
const lawyerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 2. Icono para TU Ubicación (Círculo azul pulsante o pin azul)
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { animate: true, duration: 1.5 });
  }, [center]);
  return null;
}

export default function MapComponent({ userLocation, dataSource, isDark }: any) {
  const isWeb = Platform.OS === 'web';

  if (!userLocation) {
    return (
      <View style={styles.placeholder}>
        <MaterialCommunityIcons name="map-search" size={50} color="#4285F4" style={{ opacity: 0.4 }} />
        <ThemedText style={styles.placeholderText}>Detectando ubicación...</ThemedText>
      </View>
    );
  }

  if (isWeb) {
    const center: [number, number] = [userLocation.latitude, userLocation.longitude];
    
    // CAPA ESTILO GOOGLE MAPS:
    // s,t,m,h = Satélite, Terreno, Mapa estándar, solo carreteras
    const googleMapsUrl = "http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

    return (
      <View style={styles.container}>
        <MapContainer 
          center={center} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
        >
          <RecenterMap center={center} />
          
          {/* Capa de Google Maps Estándar */}
          <TileLayer
            url={googleMapsUrl}
            attribution='&copy; Google Maps'
          />

          {/* MARCADOR DE TU UBICACIÓN (AZUL) */}
          <Marker position={center} icon={userIcon}>
            <Popup>
              <div style={{ fontWeight: 'bold', color: '#4285F4' }}>Tu ubicación actual</div>
            </Popup>
          </Marker>

          {/* MARCADORES DE ABOGADOS (ROJOS) */}
          {dataSource.map((lawyer: any) => (
            <Marker 
              key={lawyer.id} 
              position={[lawyer.lat, lawyer.lng]} 
              icon={lawyerIcon}
            >
              <Popup>
                <div style={popupStyles.card}>
                  <img src={lawyer.image} style={popupStyles.image} />
                  <div style={popupStyles.info}>
                    <strong style={popupStyles.name}>{lawyer.name}</strong>
                    <span style={popupStyles.area}>{lawyer.area}</span>
                    <div style={{fontSize: '10px', marginTop: '4px'}}>
                        {lawyer.rating} ⭐ • 📞 {lawyer.phone}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </View>
    );
  }

  return (
    <View style={styles.placeholder}>
       <MaterialCommunityIcons name="google-maps" size={40} color="#34A853" />
       <ThemedText>Preparando vista de mapa...</ThemedText>
    </View>
  );
}

const popupStyles = {
  card: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' },
  image: { width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #FF5F6D' },
  info: { display: 'flex', flexDirection: 'column' as 'column' },
  name: { fontSize: '12px', marginBottom: '2px' },
  area: { fontSize: '10px', color: '#FF5F6D', fontWeight: 'bold' as 'bold' }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    minHeight: 250
  },
  placeholderText: {
    opacity: 0.6,
    marginTop: 10,
    fontSize: 14
  }
});