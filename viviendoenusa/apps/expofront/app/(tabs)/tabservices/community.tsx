import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
// AJUSTE 1: Se agrega useSegments a las importaciones de expo-router
import { useRouter, useFocusEffect, useSegments } from 'expo-router'; 
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
//import styles from "../../src/styles/contentcard.module.css";
import { contentCardStyles as styles } from "../../src/styles/contentcard";


// --- CONFIGURACIÓN DE MAPAS ---
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn("Error cargando mapas:", e);
  }
}

const DATA_SOURCE = [
  { id: 1, name: 'Neil Panchal Law', area: 'General', rating: 5.0, lat: 34.0668, lng: -117.6115, phone: '+19517036499', image: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'BANDERAS LAW, PC', area: 'Inmigración', rating: 5.0, lat: 34.0668, lng: -117.5783, phone: '+19097070000', image: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Law Office of Cierra Esq', area: 'Familia', rating: 4.8, lat: 34.0696, lng: -117.5782, phone: '+18883644444', image: 'https://randomuser.me/api/portraits/women/22.jpg' },
  { id: 4, name: 'Centro Legal De Accidentes', area: 'Accidentes', rating: 4.9, lat: 34.0652, lng: -117.6509, phone: '+18559126909', image: 'https://randomuser.me/api/portraits/men/45.jpg' }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export default function LawyersScreen() {

  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('Experience');

  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const { t } = useTranslation();

  // AJUSTE 2: Se define la constante segments para habilitar isCommunityScreen
  const segments = useSegments();
  const isCommunityScreen = segments.includes('community');
 

  // 1. ÁREAS DE PRÁCTICA CON FALLBACK SEGURO
  const PRACTICE_AREAS: string[] = Array.isArray(t?.lawyerstab?.practiceAreas) 
    ? t.lawyerstab.practiceAreas 
    : t.lawyerstab.practiceAreas;

  const allFilterText = PRACTICE_AREAS[0];

  const [isFocused, setIsFocused] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState(allFilterText);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setSelectedArea(allFilterText);
  }, [allFilterText]);

  const isZipValid = zipCode.length === 5;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setUserLocation(coords);
      })();
      return () => setIsFocused(false);
    }, [])
  );

  const handleZoom = (type: 'in' | 'out') => {
    mapRef.current?.getCamera().then((camera: any) => {
      if (Platform.OS === 'ios') {
        camera.altitude *= type === 'in' ? 0.5 : 2;
      } else {
        camera.zoom += type === 'in' ? 1 : -1;
      }
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const handleMarkerPress = (lawyer: any) => {
    setResults([lawyer]);
    setIsFilteredByMap(true);
    mapRef.current?.animateToRegion({
      latitude: lawyer.lat,
      longitude: lawyer.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const handleSearch = async () => {
    if (!isZipValid) return;
    setLoading(true);
    setIsFilteredByMap(false);
    Keyboard.dismiss();
    try {
      const geo = await Location.geocodeAsync(zipCode);
      if (geo.length > 0) {
        const newCoords = {
          latitude: geo[0].latitude,
          longitude: geo[0].longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };
        setUserLocation(newCoords);
        setShowMarkers(true);
        mapRef.current?.animateToRegion(newCoords, 1000);

        let filtered = (selectedArea === 'Todas' || selectedArea === 'All' || selectedArea === allFilterText)
          ? [...DATA_SOURCE] 
          : DATA_SOURCE.filter(l => l.area === selectedArea);

        filtered.sort((a, b) => 
          getDistance(newCoords.latitude, newCoords.longitude, a.lat, a.lng) - 
          getDistance(newCoords.latitude, newCoords.longitude, b.lat, b.lng)
        );

        setResults(filtered);
      }
    } catch (e) { 
      Alert.alert("Error", "ZIP no encontrado."); 
    } finally { 
      setLoading(false); 
    }
  };

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { justifyContent: loggedIn ? 'flex-start' : 'center'}]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.push('/services')}>
                <MaterialCommunityIcons name="arrow-left" size={26} color={isDark ? '#fff' : '#000'} />
              </TouchableOpacity>
              <View style={styles.headerIcons}>
                <MaterialCommunityIcons name="account-group-outline" size={40} color={isDark ? '#fff' : '#000'} style={{opacity: 0.4}} />
              </View>
            </View>

            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
{/* --- COMMUNITY PRO SECTION --- */}

<View style={{ marginBottom: 20 }}>
  <ThemedText style={{
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center'
  }}>
    👥 Community Feed
  </ThemedText>

  <ThemedText style={{
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'center'
  }}>
    Share experiences, ask questions, and help others.
  </ThemedText>
</View>

{/* --- CREATE POST CARD --- */}

<View style={{
  backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
  borderRadius: 16,
  padding: 16,
  marginBottom: 20,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4
}}>

  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
    <MaterialCommunityIcons 
      name="account-circle" 
      size={36} 
      color={isDark ? '#aaa' : '#555'} 
    />
    <ThemedText style={{ marginLeft: 10, fontWeight: '600' }}>
      Share something with the community
    </ThemedText>
  </View>

  <TextInput
    value={postText}
    onChangeText={setPostText}
    placeholder="Write your experience or question..."
    placeholderTextColor={isDark ? '#888' : '#999'}
    multiline
    maxLength={300}
    style={{
      minHeight: 90,
      textAlignVertical: 'top',
      color: isDark ? '#fff' : '#000',
      marginBottom: 12
    }}
  />

  {/* TAG SELECTOR */}

  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
    {['Experience', 'Question', 'Advice'].map(tag => (
      <TouchableOpacity
        key={tag}
        onPress={() => setSelectedTag(tag)}
        style={{
          backgroundColor: selectedTag === tag ? '#10b981' : '#e5e5e5',
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 20,
          marginRight: 8
        }}
      >
        <ThemedText style={{
          fontSize: 12,
          color: selectedTag === tag ? '#fff' : '#333'
        }}>
          {tag}
        </ThemedText>
      </TouchableOpacity>
    ))}
  </View>

  <TouchableOpacity
    disabled={!postText.trim()}
    onPress={() => {
      const newPost = {
        id: Date.now(),
        text: postText,
        tag: selectedTag,
        likes: 0
      };
      setPosts([newPost, ...posts]);
      setPostText('');
    }}
    style={{
      backgroundColor: postText.trim() ? '#10b981' : '#ccc',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center'
    }}
  >
    <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
      Post
    </ThemedText>
  </TouchableOpacity>
</View>

{/* --- POSTS FEED --- */}

{posts.map(post => (
  <View
    key={post.id}
    style={{
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 3
    }}
  >
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>
        {post.tag}
      </ThemedText>
    </View>

    <ThemedText style={{ marginBottom: 12 }}>
      {post.text}
    </ThemedText>

    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => {
          setPosts(posts.map(p =>
            p.id === post.id ? { ...p, likes: p.likes + 1 } : p
          ));
        }}
        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}
      >
        <MaterialCommunityIcons name="thumb-up-outline" size={18} color="#10b981" />
        <ThemedText style={{ marginLeft: 6 }}>
          {post.likes}
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity>
        <MaterialCommunityIcons name="comment-outline" size={18} color="#555" />
      </TouchableOpacity>
    </View>
  </View>
))}

{/* --- END COMMUNITY PRO SECTION --- */}
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {Platform.OS === 'web' ? renderMainContent() : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

