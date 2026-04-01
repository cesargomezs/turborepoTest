import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, StyleSheet, useWindowDimensions,
  TextInput, Image, Alert, Share, ActivityIndicator,
  Platform, Modal as RNModal, KeyboardAvoidingView, Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '../../../hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import * as BadWordsLib from 'bad-words';
import { badWordsList } from '../../../utils/babwords.json';

import { contentCardStyles as stylesOriginal } from "app/src/styles/contentcard";

const DONATIONS_MOCK = [
  { id: 1, title: 'Coche de bebé (Stroller)', category: 'Otros', status: 'active', description: 'Marca Graco, excelente estado.', image: 'https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=800', location: 'Rancho Cucamonga', phone: '9090000000', ownerName: 'Admin' },
  { id: 2, title: 'Mesa de comedor', category: 'Muebles', status: 'active', description: 'Madera clara, firme.', image: 'https://images.unsplash.com/photo-1577145946459-39a587ed504e?w=800', location: 'Ontario', phone: '9091112222', ownerName: 'Maria Silva' },
];

export default function DonationsScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const userMetadata = useMockSelector((state) => state.mockAuth.userMetadata);
  const currentUserName = userMetadata?.name || "Cesar Gomez"; 
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const stylesUnified = useUnifiedCardStyles();
  
  // CONFIGURACIÓN DE COLORES CON TRANSPARENCIAS REFORZADAS
  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.82)', 
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    accenticon: isDark ? '#607D8B' : '#1A1A1A',
    success: '#4CAF50'
  };

  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];
  const disabledGradient: readonly [string, string, ...string[]] = isDark ? ['#333', '#444'] : ['#E0E0E0', '#D0D0D0'];

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const CATEGORIES = [
    { id: 'Todos', icon: 'apps' },
    { id: 'Ropa', icon: 'tshirt-crew' },
    { id: 'Muebles', icon: 'sofa' },
    { id: 'Alimentos', icon: 'food-apple' },
    { id: 'Otros', icon: 'dots-horizontal-circle' },
  ];

  const filter = useMemo(() => {
    try {
      const Lib = BadWordsLib as any;
      const Constructor = Lib.default || Lib.Filter || (typeof Lib === 'function' ? Lib : null);
      if (Constructor) {
        const instance = new Constructor();
        const badWords = Array.isArray(badWordsList) ? badWordsList : [];
        if (instance.addWords) instance.addWords(...badWords);
        return instance;
      }
      return null;
    } catch (e) { return null; }
  }, []);

  const [donations, setDonations] = useState(DONATIONS_MOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [viewStatus, setViewStatus] = useState<'active' | 'delivered'>('active');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [imageToView, setImageToView] = useState<string | null>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Otros');
  const [formImage, setFormImage] = useState<string | null>(null);

  const triggerAlert = (title: string, message: string) => {
    if (isWeb) { window.alert(`${title}\n${message}`); } 
    else { Alert.alert(title, message); }
  };

  const handlePublish = async () => {
    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();

    if (!trimmedTitle || !formImage || isPublishing) {
      triggerAlert("Error", "Falta el título o la foto.");
      return;
    }

    if (filter && (filter.isProfane(trimmedTitle.toLowerCase()) || filter.isProfane(trimmedDesc.toLowerCase()))) {
        triggerAlert(t.communitytab.textInappropriateTittle, t.communitytab.textInappropriateDescription);
        return; 
    }

    setIsPublishing(true);
    try {
      const esSegura = await validarImagenEnServidor(formImage);
      if (!esSegura) {
        setIsPublishing(false);
        triggerAlert(t.communitytab.imageInappropriateTittle, t.communitytab.imageInappropriateDescription);
        return;
      }

      const newEntry = {
        id: Date.now(),
        title: trimmedTitle,
        category: formCategory,
        status: 'active' as const,
        description: trimmedDesc,
        image: formImage,
        location: userMetadata?.city || 'Rancho Cucamonga',
        phone: userMetadata?.phone || '9090000000',
        ownerName: currentUserName
      };

      setDonations(prev => [newEntry, ...prev]);
      setFormTitle('');
      setFormDescription('');
      setFormImage(null);
      setModalVisible(false);
    } catch (err) {
      triggerAlert("Error", t.communitytab.errorServer);
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredDonations = useMemo(() => {
    return donations.filter(item => 
      item.status === viewStatus && 
      (selectedCategory === 'Todos' || item.category === selectedCategory) && 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [donations, viewStatus, selectedCategory, searchQuery]);

  const DonationCard = ({ item }: { item: any }) => {
    const isOwner = item.ownerName === currentUserName;
    const isDelivered = item.status === 'delivered';

    return (
      <View style={[stylesUnified.postCard, { 
        marginBottom: 20, padding: 0, overflow: 'hidden', 
        width: isLargeWeb ? '48.5%' : '100%', 
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        borderWidth: 1, borderColor: Colors.border, borderRadius: 28
      }]}>
        <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
          <LinearGradient colors={orangeGradient} style={{ width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
            <ThemedText style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>{item.ownerName.charAt(0)}</ThemedText>
          </LinearGradient>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <ThemedText style={{ fontSize: 14, fontWeight: '800', color: Colors.text }}>{isOwner ? 'Mío' : item.ownerName}</ThemedText>
          </View>
          <View style={{ backgroundColor: 'rgba(255,95,109,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
            <ThemedText style={{ fontSize: 10, color: Colors.accent, fontWeight: '900' }}>{item.category.toUpperCase()}</ThemedText>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => { setImageToView(item.image); setViewerVisible(true); }}>
          <Image source={{ uri: item.image }} style={{ width: '100%', aspectRatio: 16 / 10, opacity: isDelivered ? 0.6 : 1 }} resizeMode="cover" />
          {isDelivered && (
            <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="check-circle" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>ENTREGADO</ThemedText>
            </View>
          )}
          <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 }}>
             {!isOwner && !isDelivered && (
                <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${item.phone}`)} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center', elevation: 4 }}>
                  <MaterialCommunityIcons name="whatsapp" size={24} color="#FFF" />
                </TouchableOpacity>
             )}
             <TouchableOpacity onPress={() => Share.share({ message: item.title })} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 4 }}>
                <MaterialCommunityIcons name="share-variant" size={20} color={Colors.text} />
             </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <ThemedText style={{ fontSize: 17, fontWeight: '800', color: Colors.text }}>{item.title}</ThemedText>
              <ThemedText style={{ fontSize: 13, color: Colors.subtext, marginTop: 4, lineHeight: 18 }} numberOfLines={2}>{item.description}</ThemedText>
            </View>
            {isOwner && (
              <TouchableOpacity 
                onPress={() => setDonations(prev => prev.map(d => d.id === item.id ? {...d, status: d.status === 'active' ? 'delivered' : 'active'} : d))}
                style={{ 
                  flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, 
                  borderRadius: 12, borderWidth: 1.5, borderColor: isDelivered ? Colors.success : Colors.accent, 
                  backgroundColor: isDelivered ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 95, 109, 0.05)' 
                }}
              >
                <MaterialCommunityIcons name={isDelivered ? "refresh" : "archive-check"} size={18} color={isDelivered ? Colors.success : Colors.accent} style={{ marginRight: 4 }} />
                <ThemedText style={{ fontSize: 10, fontWeight: '900', color: isDelivered ? Colors.success : Colors.accent }}>
                  {isDelivered ? "REACTIVAR" : "ENTREGADO"}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 0.6 }}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.subtext} />
            <ThemedText style={{ fontSize: 11, color: Colors.subtext, marginLeft: 4 }}>{item.location}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={[stylesOriginal.cardWrapper, { 
            width: cardWidth, height: cardHeight, borderRadius: 32, 
            overflow: 'hidden', backgroundColor: isAndroid ? Colors.cardBg : 'transparent', 
            borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border 
          }]}>
            {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 20 }]}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} /></TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', backgroundColor: Colors.inputBg, borderRadius: 16, padding: 4 }}>
                        <TouchableOpacity onPress={() => setViewStatus('active')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: viewStatus === 'active' ? Colors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '900', color: viewStatus === 'active' ? '#FFF' : Colors.subtext }}>DISPONIBLES</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewStatus('delivered')} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: viewStatus === 'delivered' ? Colors.accent : 'transparent' }}>
                            <ThemedText style={{ fontSize: 11, fontWeight: '900', color: viewStatus === 'delivered' ? '#FFF' : Colors.subtext }}>ENTREGADOS</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
                <MaterialCommunityIcons name="hand-heart" size={40} color={Colors.accenticon} style={{opacity: 0.15}}/>
              </View>

              <View style={{ flex: 1, flexDirection: 'row' }}>
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: Colors.text }]}>CATEGORÍAS</ThemedText>
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat.id;
                      return (
                        <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, marginBottom: 8, backgroundColor: isActive ? 'transparent' : Colors.inputBg, borderWidth: isActive ? 0 : 1, borderColor: Colors.border, overflow: 'hidden' }}>
                          {isActive && <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={StyleSheet.absoluteFill} />}
                          <MaterialCommunityIcons name={cat.icon as any} size={18} color={isActive ? '#fff' : Colors.text} style={{ marginRight: 10, zIndex: 1 }} />
                          <ThemedText style={{ fontSize: 14, fontWeight: '800', color: isActive ? '#fff' : Colors.text, zIndex: 1 }}>{cat.id}</ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>
                  <TextInput style={{ backgroundColor: Colors.inputBg, borderRadius: 18, padding: 16, color: Colors.text, marginBottom: 15, fontWeight: '600', borderWidth: 1, borderColor: Colors.border }} placeholder="¿Qué buscas hoy?" placeholderTextColor={isDark ? '#78909C' : '#90A4AE'} value={searchQuery} onChangeText={setSearchQuery} />
                  {!isLargeWeb && (
                    <View style={{ marginBottom: 20 }}> 
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                        {CATEGORIES.map((cat) => {
                          const isActive = selectedCategory === cat.id;
                          return (
                            <TouchableOpacity key={cat.id} onPress={() => setSelectedCategory(cat.id)} style={{ marginRight: 10, borderRadius: 14, overflow: 'hidden', height: 42, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                              {isActive ? (
                                <LinearGradient colors={orangeGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }}><MaterialCommunityIcons name={cat.icon as any} size={18} color="#FFF" style={{ marginRight: 8 }} /><ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{cat.id}</ThemedText></LinearGradient>
                              ) : (
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, backgroundColor: Colors.inputBg }}><MaterialCommunityIcons name={cat.icon as any} size={18} color={Colors.text} style={{ marginRight: 8 }} /><ThemedText style={{ color: Colors.text, fontWeight: '600', fontSize: 13 }}>{cat.id}</ThemedText></View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {filteredDonations.length > 0 ? filteredDonations.map(item => <DonationCard key={item.id} item={item} />) : (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 50, opacity: 0.5 }}><MaterialCommunityIcons name="package-variant" size={48} color={Colors.text} /><ThemedText style={{ marginTop: 10, color: Colors.text }}>No se encontraron regalos.</ThemedText></View>
                      )}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setModalVisible(true)} style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85 }]}>
        <LinearGradient colors={orangeGradient} style={{ flex: 1, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 }}><MaterialCommunityIcons name="plus" size={32} color="#fff" /></LinearGradient>
      </TouchableOpacity>

      {/* MODAL CON TRANSPARENCIA REAL (GLASSMORPHISM) */}
      <RNModal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && setModalVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 600 : '100%', marginBottom: isLargeWeb ? 40 : 0 }}>
            <View style={{ 
                backgroundColor: isAndroid ? Colors.cardBg : 'transparent', // En iOS usamos BlurView directo
                borderTopLeftRadius: 40, borderTopRightRadius: 40, 
                borderRadius: isLargeWeb ? 40 : undefined, 
                overflow: 'hidden', height: height * 0.85, padding: 24, 
                borderTopWidth: 1, borderTopColor: Colors.border 
            }}>
              {!isAndroid && <BlurView intensity={120} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              
              <View style={{ width: 45, height: 5, backgroundColor: 'rgba(128,128,128,0.2)', alignSelf: 'center', borderRadius: 5, marginBottom: 15 }} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><MaterialCommunityIcons name="close" size={26} color={Colors.subtext} /></TouchableOpacity>
                <ThemedText style={{ fontSize: 18, fontWeight: '900', color: Colors.text }}>Regalar algo</ThemedText>
                <View style={{ width: 26 }} />
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={async () => { let r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if(!r.canceled) setFormImage(r.assets[0].uri); }} 
                  style={{ 
                    width: '100%', height: isWeb ? 200 : 130, 
                    backgroundColor: 'rgba(128,128,128,0.06)', 
                    borderRadius: 24, justifyContent: 'center', alignItems: 'center', 
                    marginBottom: 20, borderWidth: 1.5, borderColor: Colors.border, 
                    overflow: 'hidden', borderStyle: 'dashed' 
                  }}>
                  {formImage ? <Image source={{ uri: formImage }} style={{ width: '100%', height: '100%' }} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="image-plus" size={32} color={Colors.accent} /><ThemedText style={{ color: Colors.accent, fontSize: 11, fontWeight: '800', marginTop: 5 }}>Seleccionar fotografía</ThemedText></View>}
                </TouchableOpacity>

                <ThemedText style={{ fontSize: 12, fontWeight: '900', color: Colors.accent, marginBottom: 12, letterSpacing: 0.5 }}>CATEGORÍA</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 5 }}>
                  {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <TouchableOpacity key={cat.id} onPress={() => setFormCategory(cat.id)} 
                        style={{ 
                          paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, 
                          borderWidth: 1.5, borderColor: isSelected ? Colors.accent : Colors.border, 
                          backgroundColor: isSelected ? Colors.accent : 'rgba(128,128,128,0.08)', 
                          flexDirection: 'row', alignItems: 'center' 
                        }}>
                        <MaterialCommunityIcons name={cat.icon as any} size={16} color={isSelected ? '#fff' : Colors.text} style={{ marginRight: 6 }} />
                        <ThemedText style={{ fontSize: 11, fontWeight: '800', color: isSelected ? '#fff' : Colors.text }}>{cat.id.toUpperCase()}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={{ marginTop: 25 }}>
                  <TextInput value={formTitle} onChangeText={setFormTitle} placeholder="Título del regalo..." placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                    style={{ 
                      backgroundColor: 'rgba(128,128,128,0.05)', 
                      borderRadius: 18, padding: 18, marginBottom: 15, 
                      color: Colors.text, fontWeight: '700', fontSize: 16, 
                      borderWidth: 1, borderColor: Colors.border 
                    }} />
                  <TextInput value={formDescription} onChangeText={setFormDescription} placeholder="Describe brevemente el estado..." placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} 
                    multiline numberOfLines={4} 
                    style={{ 
                      backgroundColor: 'rgba(128,128,128,0.05)', 
                      borderRadius: 18, padding: 18, height: 110, marginBottom: 30, 
                      color: Colors.text, textAlignVertical: 'top', fontSize: 15, 
                      borderWidth: 1, borderColor: Colors.border 
                    }} />
                </View>

                <View style={{ alignItems: 'center', paddingBottom: 40 }}>
                  <TouchableOpacity onPress={handlePublish} disabled={isPublishing} style={{ borderRadius: 30, overflow: 'hidden', width: isLargeWeb ? '50%' : '70%', elevation: 4 }}>
                    <LinearGradient colors={formTitle.trim() && formImage ? orangeGradient : disabledGradient} start={{x:0,y:0}} end={{x:1,y:0}} style={{ height: 54, justifyContent: 'center', alignItems: 'center' }}>
                      {isPublishing ? <ActivityIndicator color="#fff" /> : <View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name="check-all" size={20} color="#fff" style={{ marginRight: 8 }} /><ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>PUBLICAR</ThemedText></View>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>
    </View>
  );
}