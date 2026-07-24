import React, { useState, useRef, useEffect, memo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions, Animated, Easing,
  TextInput, ActivityIndicator, Image, Linking as RNLinking, Alert,
  Modal, KeyboardAvoidingView, ColorValue, Share
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; 
import { useRouter, useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMockSelector } from '@/redux/slices';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';

import { getContentCardStyles } from 'app/src/styles/contentcommunity';
import MapComponent from '@/components/Map';

import badWordsData from '../../../utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { useAppTheme } from 'app/src/context/ThemeContext';
import { handleUniversalShare } from '@/utils/shareHelper';

const API_BASE_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/lawyers';
const API_TARIFFS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/tariffs'; 
const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 
const COUNTRIES = [{ code: '+1', flag: '🇺🇸', name: 'USA' }];

const AREA_ICONS: Record<string, { lib: any, name: string }> = {
  'General': { lib: MaterialCommunityIcons, name: 'gavel' },
  'Inmigración': { lib: MaterialCommunityIcons, name: 'passport' },
  'Familia': { lib: MaterialCommunityIcons, name: 'account-child-circle' },
  'Accidentes': { lib: FontAwesome5, name: 'car-crash' },
  'Laboral': { lib: MaterialCommunityIcons, name: 'briefcase' },
  'Criminal': { lib: MaterialCommunityIcons, name: 'handcuffs' },
  'Pro Bono': { lib: MaterialCommunityIcons, name: 'hand-heart' },
  'Civil': { lib: MaterialCommunityIcons, name: 'scale-balance' },
  'Bienes Raíces': { lib: MaterialCommunityIcons, name: 'home-city' },
  'Default': { lib: MaterialCommunityIcons, name: 'scale-balance' }
};

const planStyles: any = {
  coupon: { selected: '#EA8D2D', unselected: (isDark: boolean) => isDark ? 'rgba(234, 141, 45, 0.15)' : 'rgba(234, 141, 45, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  basic: { selected: '#FF5F6D', unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  premium: { selected: '#F5A623', unselected: (isDark: boolean) => isDark ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  unlimited: { selected: '#10B981', unselected: (isDark: boolean) => isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' }
};

const validateComment = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return !BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

const openDirections = (item: any) => {
  const label = encodeURIComponent(item.name || item.nameLawy || 'Ubicacion');
  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${item.lat},${item.lng}`,
    android: `geo:0,0?q=${item.lat},${item.lng}(${label})`,
    web: `https://maps.google.com/?q=${item.lat},${item.lng}`
  });
  if (url) RNLinking.openURL(url);
};

const ActionBtn = ({ icon, text, color, bgColor, onPress, flex, width, disabled = false }: any) => (
  <TouchableOpacity disabled={disabled} onPress={onPress} style={[{ height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, opacity: disabled ? 0.6 : 1 }, flex ? { flex } : {}, width ? { width } : {}]}>
     <MaterialCommunityIcons name={icon} size={16} color={color} />
     <ThemedText style={{ marginLeft: 6, fontSize: 13, fontWeight: '800', color: color }} numberOfLines={1}>{text}</ThemedText>
  </TouchableOpacity>
);

const RenewLawyerModal = memo(({ visible, onClose, onSuccess, lawyerToRenew, currentUserId, currentTariffs, t, isDark, Colors, orangeGradient, isLargeWeb, isAndroid, isIOS, insets, userToken }: any) => {
  const [renewRefCode, setRenewRefCode] = useState('');
  const [renewPayMethod, setRenewPayMethod] = useState('Zelle');
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (visible) {
      setRenewRefCode('');
      setRenewPayMethod('Zelle');
    }
  }, [visible]);

  const handleRenewSubmit = async () => {
    if (!renewRefCode.trim()) return Alert.alert((t.lawyerstab as any)?.noticeTitle || "Aviso", (t.lawyerstab as any)?.enterRefCode || "Ingresa el código de confirmación de pago.");
    
    setIsRenewing(true);
    try {
      const payload = { referenceCode: renewRefCode, paymentMethod: renewPayMethod, userId: currentUserId };
      const res = await fetch(`${API_BASE_URL}/${lawyerToRenew.id}/renew`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        }, 
        body: JSON.stringify(payload)
      });
      if (res.status === 401) { router.replace('/'); return; }
      if (!res.ok) throw new Error();
      Alert.alert((t.lawyerstab as any)?.successTitle || 'Éxito' , (t.lawyerstab as any)?.renewSuccessMsg || 'Renovación enviada');
      onSuccess();
    } catch (e) {
      Alert.alert((t.lawyerstab as any)?.errorTitle || 'Error' , (t.lawyerstab as any)?.renewErrorMsg || 'Error al renovar');
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isRenewing && onClose()} />
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: isLargeWeb ? 400 : '90%', backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
            {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <ThemedText style={{ fontSize: 20, fontWeight: '900', color: Colors.text }}>{(t.lawyerstab as any)?.renewTitle || 'Renovar'}</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>

            <ThemedText style={{ fontSize: 14, color: Colors.text, marginBottom: 20 }}>
              Renueva la suscripción de <ThemedText style={{fontWeight: 'bold', color: Colors.accent}}>{lawyerToRenew?.name}</ThemedText> realizando el pago de ${currentTariffs} USD y enviando el comprobante aquí abajo.
            </ThemedText>
            
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              {['Zelle', 'Venmo'].map((method) => (
                <TouchableOpacity key={method} onPress={() => setRenewPayMethod(method)} style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: renewPayMethod === method ? Colors.accent : Colors.border, backgroundColor: renewPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}>
                  <ThemedText style={{ fontWeight: '900', color: renewPayMethod === method ? Colors.accent : Colors.subtext }}>{method}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput 
              style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
              placeholder={`# CONFIRMACION DE ${renewPayMethod}...`} placeholderTextColor={Colors.subtext}
              value={renewRefCode} onChangeText={(text) => setRenewRefCode(text.toUpperCase())} autoCapitalize="characters"
            />

            <TouchableOpacity onPress={handleRenewSubmit} disabled={isRenewing}>
              <LinearGradient colors={orangeGradient} style={{ padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {isRenewing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" style={{ marginRight: 8 }} />}
                <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{(t.lawyerstab as any)?.sendRenewBtn || 'Enviar'}</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const SuggestLawyerModal = memo(({ visible, onClose, onSuccess, currentUserId, currentTariff, companyTariffs, t, isDark, Colors, orangeGradient, isLargeWeb, isAndroid, isIOS, PRACTICE_AREAS, insets, userToken, router }: any) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');
  const [formPlan, setFormPlan] = useState('basic');
  const [formCoupon, setFormCoupon] = useState('');

  const isFormValid = !!(formName.trim() && formAddress.trim() && formZip.length === 5 && formPhone.trim() && formImage && formRefCode.trim());
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  useEffect(() => {
    if(visible) {
      setFormName(''); setFormDesc(''); setFormAddress(''); setFormZip(''); setFormPhone(''); 
      setCountryIdx(0); setFormImage(null); setFormCategoryIdx(1); setFormRefCode(''); setFormPayMethod('Zelle');
      setFormPlan('basic'); setFormCoupon('');
    }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishLawyer = async () => {
    if (!formName.trim() || !formAddress.trim() || formZip.length < 5 || !formRefCode.trim()) {
      return Alert.alert((t.lawyerstab as any)?.alertmessage || 'Completa todos los campos');
    }
    setIsPublishing(true);
    try {
      let finalImageName = '';
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsPublishing(false);
          return Alert.alert((t.communitytab as any)?.imageInappropriateTittle || 'Error', (t.communitytab as any)?.imageInappropriateDescription || 'Imagen inapropiada');
        }
        
        const formData = new FormData();
        const filename = formImage.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage, name: filename, type } as any);
        }

        const uploadResponse = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/lawyers', {
          method: 'POST', 
          body: formData, 
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}` 
          },
        });
        
        if (uploadResponse.status === 401) { setIsPublishing(false); router.replace('/'); return; }

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData.error || (t.lawyerstab as any)?.imageUploadError || "Error subiendo imagen");
        finalImageName = uploadData.identificadorArchivo;
      }

      let lat = 34.0934; let lng = -117.5847;
      try {
        const geo = await Location.geocodeAsync(formZip);
        if (geo.length > 0) { lat = geo[0].latitude; lng = geo[0].longitude; }
      } catch (e) { }

      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';
      const payload = {
        nameLawy: formName, description: formDesc, address: formAddress,
        area: PRACTICE_AREAS[formCategoryIdx] || PRACTICE_AREAS[1], zip: formZip, imageUrl: finalImageName,
        lat: lat, lng: lng, phone: fullPhone, userId: currentUserId,
        approved: false, referenceCode: formRefCode, paymentMethod: formPayMethod, durationDays: 30,
        premiumPlan: formPlan, couponCode: formCoupon.trim(), tariffPlan: (companyTariffs as any)[formPlan]
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        }, 
        body: JSON.stringify(payload)
      });
      if (response.status === 401) { setIsPublishing(false); router.replace('/'); return; }

      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || "Error guardando abogado");

      const newEntryLocal = {
        id: savedFromDB.id, name: savedFromDB.nameLawy, description: savedFromDB.description,
        address: savedFromDB.address, area: savedFromDB.area, image: formImage, lat, lng,
        rating: 0, reviews: [], totalReviews: 0, phone: savedFromDB.phone, status: 'pending',
        referenceCode: formRefCode, paymentMethod: formPayMethod, userId: currentUserId, timepostEnd: null,
        premiumPlan: formPlan, couponCode: formCoupon
      };
      
      Alert.alert((t.lawyerstab as any)?.sendnewsug || 'Enviado');
      onSuccess(newEntryLocal, formZip);
    } catch (err: any) {
      Alert.alert((t.lawyerstab as any)?.errorTitle || "Error", err.message || (t.communitytab as any)?.errorServer || "Error");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && onClose()} />
        
        <KeyboardAvoidingView behavior={isIOS ? "padding" : undefined} style={{ flex: 1, justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', flexShrink: 1, maxHeight: isLargeWeb ? 'auto' : '80%', borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden', paddingBottom: isIOS ? insets.bottom : 0 }}>
            {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
              <ThemedText style={{fontSize: 20, fontWeight:'bold' , color:Colors.text}}>{(t.lawyerstab as any)?.suggest || 'Unirse'}</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.subtext} /></TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
              <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: Colors.border }}>
                {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 8,color: Colors.subtext }}>{(t.genericbtn as any)?.photo || 'FOTO'}</ThemedText></View>}
              </TouchableOpacity>
              
              <ThemedText style={{ fontSize: 12, fontWeight: '900',color:Colors.text, marginBottom: 8, textTransform:'none' }}>{(t.lawyerstab as any)?.label || 'Categoría'}</ThemedText>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {PRACTICE_AREAS.map((cat: string, index: number) => {
                  if (index === 0) return null; 
                  const isActive = formCategoryIdx === index;
                  const iconInfo = AREA_ICONS[cat] || AREA_ICONS['Default']; 
                  return (
                    <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                      {isActive ? (
                        <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                          <iconInfo.lib name={iconInfo.name} size={14} color="#FFF" style={{ marginRight: 6 }} />
                          <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'none' }}>{cat}</ThemedText>
                        </LinearGradient>
                      ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                          <iconInfo.lib name={iconInfo.name} size={14} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                          <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'none' }}>{cat}</ThemedText>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput 
                style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                placeholder={(t.lawyerstab as any)?.placeHoldname || 'Nombre' } 
                placeholderTextColor={Colors.subtext} 
                value={formName} 
                onChangeText={setFormName} 
                autoCapitalize="words"
              />
              <TextInput 
                style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text,  ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                placeholder={(t.lawyerstab as any)?.placeHoldAddress || 'Dirección' } 
                placeholderTextColor={Colors.subtext} 
                value={formAddress} 
                onChangeText={setFormAddress} 
                autoCapitalize="words"
              />
              <TextInput 
                style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                placeholder={(t.lawyerstab as any)?.messagezip || 'ZIP'} 
                placeholderTextColor={Colors.subtext} 
                value={formZip} 
                onChangeText={setFormZip} 
                keyboardType="numeric" maxLength={5} 
              />
              <TextInput 
                style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, height: 90, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                placeholder={(t.lawyerstab as any)?.description || 'Descripción'} 
                placeholderTextColor={Colors.subtext} 
                value={formDesc} 
                onChangeText={setFormDesc} 
                multiline 
                autoCapitalize="sentences"
              />
              
              <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: Colors.text, marginBottom: 8, marginTop: 5 }}>SELECCIONA TU PLAN *</ThemedText>
              <View style={{ flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[
                    { id: 'coupon', name: t.categoryplan.coupon, price: companyTariffs.coupon, desc: t.categoryplan.coupondesc },
                    { id: 'basic', name: t.categoryplan.basic, price: companyTariffs.basic, desc: t.categoryplan.basicdesc },
                    { id: 'premium', name: t.categoryplan.premium, price: companyTariffs.premium, desc: t.categoryplan.premiumdesc },
                    { id: 'unlimited', name: t.categoryplan.unlimited, price: companyTariffs.unlimited, desc: t.categoryplan.unlimiteddesc }
                  ].map(plan => {
                      const pStyle = planStyles[plan.id as keyof typeof planStyles];
                      const isSelected = formPlan === plan.id;
                      
                      return (
                      <TouchableOpacity 
                          key={plan.id}
                          onPress={() => setFormPlan(plan.id)}
                          style={{ 
                              padding: 15, 
                              borderRadius: 14, 
                              borderWidth: 1, 
                              borderColor: isSelected ? pStyle.selected : Colors.border, 
                              backgroundColor: isSelected ? pStyle.unselected(isDark) : Colors.inputBg 
                          }}
                      >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={20} color={isSelected ? pStyle.selected : Colors.subtext} />
                                  <ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: isSelected ? pStyle.selected : Colors.text, marginLeft: 8 }}>{plan.name}</ThemedText>
                              </View>
                              <ThemedText style={{ fontWeight: '900', fontSize: 16, color: Colors.text }}>${plan.price}</ThemedText>
                          </View>
                          <ThemedText style={{ fontSize: 13, color: isSelected ? pStyle.text(isDark) : Colors.subtext, marginTop: 6, marginLeft: 28 }}>{plan.desc}</ThemedText>
                      </TouchableOpacity>
                  )})}
              </View>

              <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform:'none' }}>{(t.lawyerstab as any)?.phoneContacto || 'Teléfono'}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 15, overflow: 'hidden' }}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => setCountryIdx(prev => (prev + 1) % COUNTRIES.length)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: Colors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                >
                  <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx]?.flag || ''}</ThemedText>
                  <ThemedText style={{ fontWeight: '800', color: Colors.text, marginRight: 4 }}>{COUNTRIES[countryIdx]?.code || ''}</ThemedText>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.subtext} />
                </TouchableOpacity>
                <TextInput value={formPhone} onChangeText={setFormPhone}
                  placeholder="(909) 000-0000" keyboardType="phone-pad"
                  placeholderTextColor={Colors.subtext}
                  style={{ flex: 1, color: Colors.subtext, padding: 15, fontSize: 14, fontWeight: '800', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
              </View>

              <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: Colors.accent }}>{(t.lawyerstab as any)?.paymentVerification || "Verificación de Pago"}</ThemedText>
                
                <ThemedText style={{ fontSize: 15, marginBottom: 15, lineHeight: 18, color: Colors.text }}>
                  Para publicar tu perfil, realiza el pago de <ThemedText style={{fontWeight:'900', color: Colors.accent}}>${(companyTariffs as any)[formPlan] || '0.00'} USD</ThemedText> mediante Zelle o Venmo y escribe el código de confirmación aquí abajo.
                </ThemedText>
                
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  {['Zelle'].map((method) => (
                    <TouchableOpacity key={method} onPress={() => setFormPayMethod(method)} style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: formPayMethod === method ? Colors.accent : Colors.border, backgroundColor: formPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}>
                      <ThemedText style={{ fontWeight: '900', color: formPayMethod === method ? Colors.accent : Colors.subtext }}>{method}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput 
                  style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 20, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
                  placeholder={`# CONFIRMACION DE ${formPayMethod}...`} placeholderTextColor={Colors.subtext}
                  value={formRefCode} onChangeText={(text) => setFormRefCode(text.toUpperCase())} autoCapitalize="characters"
                />

                <TouchableOpacity onPress={handlePublishLawyer} disabled={!isFormValid || isPublishing}>
                  <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                    {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}
                    <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{(t.lawyerstab as any)?.sendbutton || 'Enviar'}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

export default function LawyersScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  const notificationId = params.id || params.lawyerId || params.referenceId || params.reference_id || params.openEventId;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null); 
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';
  
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken;
  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();
  const styles = getContentCardStyles(isDark);

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  const Colors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#364045',
    accent: '#FF5F6D',
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)',
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    iconInactive: isDark ? '#B0BEC5' : '#364045',  

    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
  };

  const rawCategories = (t.lawyerstab as any)?.practiceAreas;
  const PRACTICE_AREAS = Array.isArray(rawCategories) && rawCategories.length > 0
    ? rawCategories
    : ['Todas', 'General', 'Inmigración', 'Familia', 'Accidentes', 'Laboral', 'Criminal', 'Pro Bono', 'Civil', 'Bienes Raíces'];

  const [zipCode, setZipCode] = useState('');
  const [selectedArea, setSelectedArea] = useState(PRACTICE_AREAS[0]); 
  const [loading, setLoading] = useState(false);
  
  const [allLawyers, setAllLawyers] = useState<any[]>([]);
  const [localData, setLocalData] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]); 
  
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);

  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [selectedReviews, setSelectedReviews] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [lawyerToRenew, setLawyerToRenew] = useState<any>(null);

  const [pendingLawyers, setPendingLawyers] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [currentTariff, setCurrentTariff] = useState<string>("50.00");
  const [companyTariffs, setCompanyTariffs] = useState({coupon: '0.00', basic: '50.00', premium: '99.00', unlimited: '149.00' });

  const isZipValid = zipCode.length === 5;
  const currentUserId = userMetadata?.id || userMetadata?.userId || "baeb641a-3fa4-4fef-9846-d75947d1bca9";

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const lastProcessedNotifId = useRef<string | null>(null);
  const hasFetchedLocation = useRef(false);
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseRingAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0.5)).current;

  const applyLocalFilters = (lawyersList: any[], areaName: string, lat: number, lng: number) => {
    let filtered = (areaName === PRACTICE_AREAS[0]) ? [...lawyersList] : lawyersList.filter(l => l.area === areaName);
    
    filtered.sort((a, b) => {
      const aIsOwner = a.userId === currentUserId;
      const aIsExpired = a.timepostEnd ? new Date(a.timepostEnd) < new Date() : false;
      const aNeedsRenewal = aIsOwner && aIsExpired;

      const bIsOwner = b.userId === currentUserId;
      const bIsExpired = b.timepostEnd ? new Date(b.timepostEnd) < new Date() : false;
      const bNeedsRenewal = bIsOwner && bIsExpired;

      if (aNeedsRenewal && !bNeedsRenewal) return -1;
      if (!aNeedsRenewal && bNeedsRenewal) return 1;

      return getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng);
    });

    return filtered;
  };

  const ReviewForm = memo(({ onPublish, onCancel, isDark, t }: any) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const handlePrePublish = () => {
      if (!validateComment(comment)) {
        const errorMsg = (t.communitytab as any)?.textInappropriateDescription || "Contenido inapropiado.";
        Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Aviso", errorMsg);
        return;
      }
      onPublish(rating, comment);
    };
    return (
      <View style={{ flex: 1, paddingVertical: 10 }}>
        <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
          <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>{(t.lawyerstab as any)?.backBtn || 'Volver' }</ThemedText>
        </TouchableOpacity>
        <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20 , color:Colors.text}}>{(t.lawyerstab as any)?.experience || 'Tu Experiencia'}</ThemedText>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <TouchableOpacity key={s} onPress={() => setRating(s)}>
              <MaterialCommunityIcons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
          <TextInput 
            value={comment} onChangeText={setComment} 
            placeholder={(t.lawyerstab as any)?.writeOpinionPlaceholder || 'Escribe tu opinión...'} 
            placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'} 
            multiline autoCapitalize="sentences"
            style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} 
          />
        </View>
        <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}>
            <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{(t.lawyerstab as any)?.publishBtn || 'Publicar'}</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  });

  const fetchLawyersData = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}?zip=${searchZip.trim()}&userId=${currentUserId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      });
      if (res.status === 401) { router.replace('/'); return []; }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameLawy || 'Sin nombre',
          description: item.description || item.descriptionLawy || '',
          address: item.address || item.addressLawy || '',
          area: item.area || 'General',
          zip: item.zip,
          image: item.image || item.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
          lat: Number(item.lat) || 34.0934,
          lng: Number(item.lng) || -117.5847,
          phone: item.phone || '',
          rating: Number(item.totalRating) || Number(item.rating) || 0,
          reviews: Array.isArray(item.reviews) ? item.reviews : [],
          totalReviews: Number(item.totalReviews) || (Array.isArray(item.reviews) ? item.reviews.length : 0),
          status: item.approved ? 'approved' : 'pending',
          referenceCode: item.referenceCode,
          paymentMethod: item.paymentMethod,
          userId: item.userId || item.user_id,
          timepostEnd: item.timepostEnd || item.timepost_end,
          premiumPlan: item.premiumPlan, 
          couponCode: item.couponCode
        }));
        const approved = mappedData.filter(s => s.status === 'approved');
        setAllLawyers(approved);
        setLocalData(approved);
        
        if (!isAdminMode) {
          setPendingLawyers(mappedData.filter(s => s.status === 'pending'));
        }
        return approved;
      }
      return [];
    } catch (e) {
      console.error("Error obteniendo abogados:", e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (forcedArea?: string, forcedZip?: string) => {
    const targetZip = forcedZip || zipCode;
    if (targetZip.length !== 5) return;
    if (forcedArea !== undefined) setSelectedArea(forcedArea);
    setIsFilteredByMap(false);

    let lat = userLocation ? userLocation.latitude : 34.0934; 
    let lng = userLocation ? userLocation.longitude : -117.5847;

    try {
      const geo = await Location.geocodeAsync(targetZip);
      if (geo.length > 0) {
        lat = geo[0].latitude;
        lng = geo[0].longitude;
      }
    } catch (e) { }

    const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
    setUserLocation(newCoords);
    setShowMarkers(true); 
    
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);

    const lawyers = await fetchLawyersData(targetZip);
    setResults(applyLocalFilters(lawyers, forcedArea || selectedArea, lat, lng));
    setMapKey(k => k + 1);
  };

  const fetchAllPendingLawyers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}?userId=${currentUserId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      }); 
      if (res.status === 401) { router.replace('/'); return; }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id,
          name: item.nameLawy || 'Sin nombre',
          description: item.description || item.descriptionLawy || '',
          address: item.address || item.addressLawy || '',
          area: item.area || 'General',
          zip: item.zip,
          image: item.image || item.imageUrl || 'https://randomuser.me/api/portraits/lego/1.jpg',
          lat: Number(item.lat) || 34.0934,
          lng: Number(item.lng) || -117.5847,
          phone: item.phone || '',
          rating: Number(item.totalRating) || Number(item.rating) || 0,
          reviews: Array.isArray(item.reviews) ? item.reviews : [],
          totalReviews: Number(item.totalReviews) || (Array.isArray(item.reviews) ? item.reviews.length : 0),
          status: item.approved ? 'approved' : 'pending',
          referenceCode: item.referenceCode,
          paymentMethod: item.paymentMethod,
          userId: item.userId || item.user_id,
          timepostEnd: item.timepostEnd || item.timepost_end,
          premiumPlan: item.premiumPlan, 
          couponCode: item.couponCode 
        }));
        setPendingLawyers(mappedData.filter(s => s.status === 'pending'));
      }
    } catch (e) {
      console.error("Error obteniendo pendientes:", e);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (isManual = false) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      setUserLocation(coords);
      setMapKey(prev => prev + 1); 
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(coords, isManual ? 1000 : 1);
    } catch (e) { console.log(e); }
  };

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2;
      else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  const handleCloseDetailModal = () => {
    setSelectedDetail(null);
    lastProcessedNotifId.current = null;
    router.setParams({ id: '', lawyerId: '', referenceId: '', reference_id: '', openEventId: '' });
  };

  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) {
      setResults([]);
      setAllLawyers([]);
      setLocalData([]);
      if (!isAdminMode) setPendingLawyers([]);
      setShowMarkers(false);
      setIsFilteredByMap(false);
    } else if (text.length === 5) {
      handleSearch(selectedArea, text);
    }
  };

  const handleCategorySelect = (areaName: string) => {
    setSelectedArea(areaName);
    if (isZipValid && allLawyers.length === 0) {
      handleSearch(areaName); 
    }
  };

  const handleMarkerSelection = (lawyer: any) => {
    setResults([lawyer]);
    setIsFilteredByMap(true);
    const region = { latitude: lawyer.lat, longitude: lawyer.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 };
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800);
  };

  const handleShare = async (lawyer: any) => {
    await handleUniversalShare({
      title: t.lawyerstab.labelawyer+lawyer.name,
      description: lawyer.description,
      phone: lawyer.phone,
      address: lawyer.address,
      zip: lawyer.zip,
      image: lawyer.image,
    });
  };

  const approveLawyerField = async (lawyer: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${lawyer.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        },
        body: JSON.stringify({ approved: true, durationMonths })
      });
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error((t.lawyerstab as any)?.serverError || "Error en servidor");
      
      const updatedLawyerFromServer = await response.json();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + durationMonths);

      const approvedLawyer = { 
        ...lawyer, 
        ...updatedLawyerFromServer,
        status: 'approved',
        timepostEnd: updatedLawyerFromServer.timepostEnd || updatedLawyerFromServer.timepost_end || futureDate.toISOString()
      };
      
      if (lawyer.zip === zipCode) {
        const newAllLawyers = [approvedLawyer, ...allLawyers.filter(l => l.id !== lawyer.id)];
        setAllLawyers(newAllLawyers); 
        setMapKey(k => k + 1);
      }
      
      setPendingLawyers(pendingLawyers.filter(s => s.id !== lawyer.id));
      Alert.alert((t.lawyerstab as any)?.approvedTitle || "Aprobado", ((t.lawyerstab as any)?.approvedMsgPrefix || "Aprobado por ") + durationMonths + ((t.lawyerstab as any)?.approvedMsgSuffix || " meses" ));
    } catch (error) {
      Alert.alert((t.lawyerstab as any)?.errorTitle || "Error", (t.lawyerstab as any)?.approveError);
    }
  };

  const rejectLawyer = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (response.status === 401) { router.replace('/'); return; }
      if (!response.ok) throw new Error((t.lawyerstab as any)?.serverError);
      setPendingLawyers(pendingLawyers.filter(e => e.id !== id));
      Alert.alert((t.lawyerstab as any)?.rejectedTitle, (t.lawyerstab as any)?.rejectedMsg );
    } catch (error) {
      Alert.alert((t.lawyerstab as any)?.errorTitle, (t.genericbtn as any)?.rejectError);
    }
  };

  useEffect(() => {
    if (!hasFetchedLocation.current) {
      getCurrentLocation();
      hasFetchedLocation.current = true;
    }
  }, []);

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Lawyers`, {
          method: 'GET',
          headers: userToken ? { 'Authorization': `Bearer ${userToken}` } : undefined
        });
        if (res.status === 401) { router.replace('/'); return; }
        if (res.ok) {
          const tariffsData = await res.json();
          if (tariffsData && tariffsData.length > 0) {
            setCompanyTariffs({
              coupon: tariffsData[0].coupon || '0.00',
              basic: tariffsData[0].basic || '50.00',
              premium: tariffsData[0].premium || '99.00',
              unlimited: tariffsData[0].unlimited || '149.00'
            });
            if (tariffsData[0].price) setCurrentTariff(tariffsData[0].price);
          }
        }
      } catch (e) {
        console.warn("⚠️ No se pudo cargar la tarifa dinámica en el front");
      }
    };
    fetchTariff();
  }, []);

  useEffect(() => {
    if (!isFilteredByMap && allLawyers.length > 0) {
      const lat = userLocation ? userLocation.latitude : 34.0934;
      const lng = userLocation ? userLocation.longitude : -117.5847;
      const filtered = applyLocalFilters(allLawyers, selectedArea, lat, lng);
      setResults(filtered);
    }
  }, [allLawyers, selectedArea, userLocation, isFilteredByMap]);

  useEffect(() => {
    if (isAdminMode) {
      fetchAllPendingLawyers();
    } else {
      if (zipCode.length !== 5) {
        setPendingLawyers([]);
      } else {
        fetchLawyersData(zipCode);
      }
    }
  }, [isAdminMode]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1000) 
      ])
    ).start();

    Animated.loop(
        Animated.parallel([
            Animated.timing(pulseRingAnim, { toValue: 1.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseOpacityAnim, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ])
    ).start();
  }, [ringAnim, pulseRingAnim, pulseOpacityAnim]);

  useEffect(() => {
    if (notificationId) {
      const cleanNotifId = String(notificationId).trim();

      if (cleanNotifId && cleanNotifId !== lastProcessedNotifId.current) {
        lastProcessedNotifId.current = cleanNotifId;
        router.setParams({ id: '', lawyerId: '', referenceId: '', reference_id: '', openEventId: '' });

        const syncSearchAndDetail = async (item: any) => {
          setSelectedDetail(item);
          if (item.zip && String(item.zip).length === 5) {
            setZipCode(String(item.zip));
            await handleSearch(undefined, String(item.zip));
          }
        };

        const localMatch = allLawyers.find(l => String(l.id) === cleanNotifId) || pendingLawyers.find(l => String(l.id) === cleanNotifId);

        if (localMatch) {
          syncSearchAndDetail(localMatch);
        } else {
          const fetchSpecificLawyer = async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/${cleanNotifId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${userToken}` }
              });
              if (res.status === 401) { router.replace('/'); return; }
              if (res.ok) {
                const data = await res.json();
                
                const mappedSupport = {
                    ...data,
                    name: data.nameLawy || data.name || 'Sin nombre',
                    description: data.descriptionLawy || data.description || '',
                    address: data.addressLawy || data.address || '',
                    image: data.image || data.imageUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                    lat: Number(data.lat) || 34.0934,
                    lng: Number(data.lng) || -117.5847,
                    status: data.approved ? 'approved' : 'pending',
                    timepostEnd: data.timepostEnd || data.timepost_end
                };

                syncSearchAndDetail(mappedSupport);
              }
            } catch (e) {
              console.error("❌ Error Fetch notificación de Abogado:", e);
            }
          };
          fetchSpecificLawyer();
        }
      }
    }
  }, [notificationId, allLawyers, pendingLawyers]);

  const LawyerCard = ({ lawyer, isReviewMode = false, renderAdminControls }: { lawyer: any, isReviewMode?: boolean, renderAdminControls?: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, lawyer.lat, lawyer.lng) : null;
    const isPending = lawyer.status === 'pending';
    const isOwner = lawyer.userId === currentUserId;
    
    const isExpired = (lawyer.timepostEnd && new Date(lawyer.timepostEnd).getFullYear() > 1970) 
        ? new Date(lawyer.timepostEnd) < new Date() 
        : false;
    
    const fadeCard = isExpired && !isPending;
    const safeRating = Number(lawyer.rating) || 0;
    const displayRating = safeRating > 0 ? safeRating.toFixed(1) : ((t.lawyerstab as any)?.newLabel || "Nuevo");

    const reviewCount = lawyer.reviews?.length || lawyer.totalReviews || 0;
    let formattedCount = reviewCount.toString();
    if (reviewCount >= 1000) {
      formattedCount = (reviewCount / 1000).toFixed(1) + 'k';
    }

    const cardBgColor = isPending 
      ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.9)')
      : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)');

    return (
      <View style={{ borderRadius: 28, overflow: 'hidden' as 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: cardBgColor, borderColor: (isPending || isExpired) ? '#FFB74D' : Colors.border }}>
        
        {isPending && isOwner && (
          <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" />
            <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>
              En revisión. Será publicado pronto.
            </ThemedText>
          </View>
        )}

        {isOwner && isExpired && !isPending && (
          <View style={{ backgroundColor: 'rgba(255, 82, 82, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 82, 82, 0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#FF5252" />
              <ThemedText style={{ color: '#FF5252', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>{(t.lawyerstab as any)?.expiredWarning }</ThemedText>
            </View>
            <TouchableOpacity onPress={() => { setLawyerToRenew(lawyer); setRenewModalVisible(true); }} style={{ backgroundColor: '#FF5252', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 10 }}>
              <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 12 }}>{(t.lawyerstab as any)?.renewBtn || "Renovar"}</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
            <ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{lawyer.area?.toUpperCase()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
            <MaterialCommunityIcons name="star" size={14} color="#FFB300" />
            <ThemedText style={{ color: Colors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>
              {displayRating}
            </ThemedText>
          </View>
        </View>
        
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(lawyer)} style={{ width: '100%', height: 140, opacity: fadeCard ? 0.6 : 1 }}>
          {lawyer.image && lawyer.image.length > 5 ? (
            <Image source={{ uri: lawyer.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="image-off-outline" size={40} color={Colors.subtext} />
            </View>
          )}
          
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}>
            <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
              {(t.genericbtn as any)?.viewdetail || 'Ver detalle'}
            </ThemedText>
          </View>
        </TouchableOpacity>
        
        <View style={{ padding: 15, paddingBottom: isPending ? 15 : 15, opacity: fadeCard ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={{ fontWeight: '800', fontSize: 18, color: Colors.text }}>{lawyer.name}</ThemedText>
            {dist !== null && <ThemedText style={{ color: '#FF5F6D', fontSize: 13, fontWeight: '700' }}>{dist} mi</ThemedText>}
          </View>
          
          <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 6, color:Colors.text }} numberOfLines={isPending ? undefined : 2}>{lawyer.description}</ThemedText>
          
          <View style={{ gap: 8, marginTop: 15, opacity: isPending ? 0.5 : 1 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => !isPending && setSelectedReviews(lawyer)} disabled={isPending || isExpired} style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5' }}>
                 <MaterialCommunityIcons name="comment-text-outline" size={17} color={isDark ? '#FFF' : '#444'} />
                 <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>
                    {(t.genericbtn as any)?.reviews } {reviewCount > 0 ? `(${formattedCount})` : ''}
                 </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => !isPending && openDirections(lawyer)} disabled={isPending || isExpired} style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}>
                <MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} />
                <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>{(t.genericbtn as any)?.route }</ThemedText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => !isPending && RNLinking.openURL(`tel:${lawyer.phone}`)} disabled={isPending || isExpired} style={{ width: '100%', height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}>
              <MaterialCommunityIcons name="phone" size={17} color={isDark ? '#FFB74D' : '#EF6C00'} />
              <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>{(t.genericbtn as any)?.callbton }</ThemedText>
            </TouchableOpacity>
          </View>

          {renderAdminControls && renderAdminControls()}
        </View>
      </View>
    );
  };

  const PendingLawyerItem = ({ lawyer }: { lawyer: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    
    const adminControls = () => (
      <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 15 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' }}>
            {lawyer.premiumPlan && (
                <View style={{ backgroundColor: planStyles[lawyer.premiumPlan as keyof typeof planStyles]?.unselected(isDark) || Colors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: planStyles[lawyer.premiumPlan as keyof typeof planStyles]?.selected || Colors.border }}>
                    <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: planStyles[lawyer.premiumPlan as keyof typeof planStyles]?.selected || Colors.subtext }}> {(t.genericlabel?.lableplan || 'PLAN ') + lawyer.premiumPlan.toUpperCase()}</ThemedText>
                </View>
            )}
        </View>

        <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.5)' }}>
           <MaterialCommunityIcons name="bank-transfer" size={18} color="#FFB74D" />
           <ThemedText style={{ fontSize: 12, color: Colors.text, fontWeight: '600', marginLeft: 8 }}>
              Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{lawyer.referenceCode || 'N/A'}</ThemedText> ({lawyer.paymentMethod || 'Pago'})
           </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {[1, 3, 6, 12].map(m => (
            <TouchableOpacity key={m} onPress={() => setSelectedMonths(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedMonths === m ? '#4CAF50' : Colors.inputBg }}>
               <ThemedText style={{color: selectedMonths === m ? '#FFF' : Colors.text, fontWeight: 'bold', fontSize: 12}}>{m}M</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => rejectLawyer(lawyer.id)} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}> {(t.genericbtn as any)?.rejectbtn || "Rechazar"}</ThemedText></TouchableOpacity>
          <TouchableOpacity onPress={() => approveLawyerField(lawyer, selectedMonths)} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center' }}><ThemedText style={{color:'#FFF', fontWeight:'bold'}}> {(t.genericbtn as any)?.aprovedbtn || "Aprobar"}</ThemedText></TouchableOpacity>
        </View>
      </View>
    );
    return <LawyerCard lawyer={lawyer} renderAdminControls={adminControls} />;
  };

  return (
    <View style={stylesUnified.container}>

      <RenewLawyerModal 
        visible={renewModalVisible} 
        onClose={() => setRenewModalVisible(false)} 
        onSuccess={() => { setRenewModalVisible(false); handleSearch(); }} 
        lawyerToRenew={lawyerToRenew} currentUserId={currentUserId} currentTariff={currentTariff} 
        t={t} isDark={isDark} Colors={Colors} orangeGradient={orangeGradient} 
        isLargeWeb={isLargeWeb} isAndroid={isAndroid} isIOS={isIOS} 
        insets={insets} userToken={userToken}
      />

      <SuggestLawyerModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        onSuccess={(newEntryLocal: any, formZip: string) => {
          setModalVisible(false);
          setPendingLawyers([newEntryLocal, ...pendingLawyers]);
          if (!zipCode || zipCode.length < 5) {
            setZipCode(formZip);
            handleSearch(undefined, formZip);
          }
        }} 
        currentUserId={currentUserId} currentTariff={currentTariff}  companyTariffs={companyTariffs} t={t} isDark={isDark} Colors={Colors} 
        orangeGradient={orangeGradient} isLargeWeb={isLargeWeb} isAndroid={isAndroid} 
        isIOS={isIOS} PRACTICE_AREAS={PRACTICE_AREAS} 
        insets={insets} userToken={userToken} router={router}
      />

      <Modal visible={!!selectedDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseDetailModal} />
          
          <View style={{ width: '90%', height: '75%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240 }}>
               {selectedDetail?.image && selectedDetail?.image.length > 5 ? (
                 <Image source={{ uri: selectedDetail?.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
               ) : (
                 <View style={{ width: '100%', height: '100%', backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }}>
                   <MaterialCommunityIcons name="image-off-outline" size={40} color={Colors.subtext} />
                 </View>
               )}
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
               {!isWeb && (
                 <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}>
                   <MaterialCommunityIcons name="share-variant" size={22} color="#FFF" />
                 </TouchableOpacity>
               )}
               <TouchableOpacity onPress={handleCloseDetailModal} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}>
                 <MaterialCommunityIcons name="close" size={24} color="#FFF" />
               </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>
                          {selectedDetail?.area?.toUpperCase()}
                      </ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', marginLeft: 15, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="star" size={18} color="#FFB300" />
                    <ThemedText style={{ marginLeft: 5, fontWeight: '900', color: Colors.text, fontSize: 16 }}>
                      {selectedDetail?.rating > 0 ? selectedDetail.rating.toFixed(1) : ((t.lawyerstab as any)?.newLabel )}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: Colors.text }}>{selectedDetail?.name}</ThemedText>
                
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <ActionBtn
                      flex={1}
                      onPress={() => RNLinking.openURL(`tel:${selectedDetail.phone}`)}
                      icon="phone"
                      text={(t.lawyerstab as any)?.call || 'Llamar'}
                      color="#FF5F6D"
                      bgColor={isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 211, 211, 0.4)'}
                    />
                    {!isWeb && (
                      <ActionBtn
                        flex={1}
                        onPress={() => handleShare(selectedDetail)}
                        icon="share-variant"
                        text={(t.genericbtn as any)?.sharingbtn || 'Compartir'}
                        color={isDark ? '#4FC3F7' : '#1976D2'}
                        bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'}
                      />
                    )}
                </View>

                <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: Colors.text }}>{(t.lawyerstab as any)?.aboutTitle }</ThemedText>
                <ThemedText style={{ color: Colors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 20 }}>{selectedDetail?.description}</ThemedText>

                {selectedDetail?.status !== 'pending' && (
                  <TouchableOpacity 
                    onPress={() => { 
                      const hasReviewed = selectedDetail?.reviews?.some((r: any) => r.userId === currentUserId);
                      if (hasReviewed) {
                        return Alert.alert(
                          (t.lawyerstab as any)?.noticeTitle, 
                          (t.lawyerstab as any)?.alreadyReviewed 
                        );
                      }
                      setSelectedReviews(selectedDetail); 
                      setSelectedDetail(null); 
                      setShowReviewInput(true);
                    }} 
                    style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}
                  >
                    <LinearGradient colors={orangeGradient} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} />
                      <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{(t.lawyerstab as any)?.writingreview }</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedReviews} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedReviews(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.78, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 32, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 22, fontWeight: '900', color: Colors.text }}>{selectedReviews?.name}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: Colors.text }}>{(t.lawyerstab as any)?.commutnityopini }</ThemedText>
                </View>
                <TouchableOpacity onPress={() => { setSelectedReviews(null); setShowReviewInput(false); }}>
                  <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
                </TouchableOpacity>
              </View>
              {!showReviewInput ? (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity 
                    onPress={() => {
                      const hasReviewed = selectedReviews?.reviews?.some((r: any) => r.userId === currentUserId);
                      if (hasReviewed) {
                        return Alert.alert(
                          (t.lawyerstab as any)?.noticeTitle , 
                          (t.lawyerstab as any)?.alreadyReviewed 
                        );
                      }
                      setShowReviewInput(true);
                    }} 
                    style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}
                  >
                    <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                       <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} />
                       <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{(t.lawyerstab as any)?.writingreview }</ThemedText>
                    </LinearGradient>
                  </TouchableOpacity>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {selectedReviews?.reviews?.map((r: any) => (
                       <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                         <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                           {[1, 2, 3, 4, 5].map((s) => (
                             <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                           ))}
                           
                         </View>
                         <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/>
                          <ThemedText style={{ color: Colors.text, fontSize: 12 ,alignContent:'flex-end',fontStyle: 'italic'}}>{r.name}</ThemedText>
                         </View> 
                         <ThemedText style={{ color: Colors.text, fontSize: 14 }}>{r.comment}</ThemedText>
                       </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <ReviewForm 
                    isDark={isDark} 
                    t={t} 
                    onCancel={() => setShowReviewInput(false)} 
                    onPublish={async (ratingNum: number, commentStr: string) => { 
                        try {
                          const reviewPayload = {
                            referenceId: selectedReviews.id,
                            typeEntry: 'lawyer',
                            rating: ratingNum,
                            review: commentStr,
                            userId: currentUserId
                          };

                          const res = await fetch(`${API_BASE_URL}/rating`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${userToken}` 
                            },
                            body: JSON.stringify(reviewPayload)
                          });

                          if (res.status === 401) { router.replace('/'); return; }
                          if (!res.ok) throw new Error();
                          const fromDB = await res.json();

                          const newReviewFormatted = { 
                            id: fromDB.id || Date.now().toString(), 
                            stars: Number(ratingNum), 
                            comment: commentStr,
                            name: fromDB.name ,
                            userId: currentUserId 
                          };

                          const updatedReviews = [newReviewFormatted, ...(selectedReviews.reviews || [])];
                          const totalStars = updatedReviews.reduce((sum, r) => sum + r.stars, 0);
                          const newAverage = updatedReviews.length > 0 ? (totalStars / updatedReviews.length) : 0;

                          const updatedLawyerObj = {
                            ...selectedReviews,
                            reviews: updatedReviews,
                            name: selectedReviews.name,
                            rating: newAverage,
                            totalReviews: updatedReviews.length
                          };

                          setSelectedReviews(updatedLawyerObj);
                          setResults(prev => prev.map(s => s.id === selectedReviews.id ? updatedLawyerObj : s));
                          setAllLawyers(prev => prev.map(s => s.id === selectedReviews.id ? updatedLawyerObj : s));

                          Alert.alert((t.lawyerstab as any)?.thanksTitle, (t.lawyerstab as any)?.reviewSuccessMsg );
                        } catch (e) {
                          Alert.alert((t.lawyerstab as any)?.errorTitle, (t.lawyerstab as any)?.serverConnectionError);
                        } finally {
                          setShowReviewInput(false);
                        }
                    }} 
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: Colors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            
            <View style={stylesUnified.cardContent}>
              
              <View style={[stylesUnified.headerRow, { marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }]}>
                <TouchableOpacity onPress={() => router.push('/services')} style={{ paddingRight: 4 }}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={Colors.text} />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput 
                    style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: Colors.text, backgroundColor: Colors.inputBg, borderColor: Colors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} 
                    placeholder={(t.lawyerstab as any)?.messagezip || "Código postal..."} 
                    keyboardType="numeric" maxLength={5} value={zipCode} 
                    onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} 
                    placeholderTextColor={Colors.subtext} 
                  />
                  <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 42, height: 42, marginLeft: 8 }}>
                    <LinearGradient colors={isZipValid ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={isZipValid ? "#fff" : Colors.iconInactive} />}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setLocalData([]); setPendingLawyers([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}>
                      <MaterialCommunityIcons name="refresh" size={24} color={Colors.text} style={{opacity: 0.7}} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setIsAdminMode(!isAdminMode); }}>
                    <MaterialCommunityIcons name="scale-balance" size={40} color={isAdminMode ? '#FF5F6D' : Colors.text} style={{opacity: isAdminMode ? 1 : 0.2, marginLeft: 5}} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
                  
                  {isAdminMode && pendingLawyers.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>{(t.lawyerstab as any)?.verify || 'Pendientes de Revisión'} ({pendingLawyers.length})</ThemedText>
                      {pendingLawyers.map(lawyer => (
                        <PendingLawyerItem key={lawyer.id} lawyer={lawyer} />
                      ))}
                    </View>
                  )}

                  <View style={{ marginBottom: 15 }}>
                    {isWeb ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {PRACTICE_AREAS.map((area, index) => {
                           const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                           const isActive = selectedArea === area;
                           return (
                            <TouchableOpacity key={index} onPress={() => handleCategorySelect(area)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                              {isActive ? (
                                 <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                   <iconInfo.lib name={iconInfo.name} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                   <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{area}</ThemedText>
                                 </LinearGradient>
                               ) : (
                                 <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                                   <iconInfo.lib name={iconInfo.name} size={14} color={Colors.iconInactive} style={{ marginRight: 5 }} />
                                   <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 12 }}>{area}</ThemedText>
                                 </View>
                               )}
                            </TouchableOpacity>
                           );
                        })}
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2, paddingHorizontal: 2, flexDirection: 'row', gap: 8 }}>
                        {PRACTICE_AREAS.map((area, index) => {
                           const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                           const isActive = selectedArea === area;
                           return (
                            <TouchableOpacity key={index} onPress={() => handleCategorySelect(area)} style={{ flexShrink: 0, borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                              {isActive ? (
                                 <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                                   <iconInfo.lib name={iconInfo.name} size={14} color="#FFF" style={{ marginRight: 5 }} />
                                   <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{area}</ThemedText>
                                 </LinearGradient>
                               ) : (
                                 <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                                   <iconInfo.lib name={iconInfo.name} size={14} color={Colors.iconInactive} style={{ marginRight: 5 }} />
                                   <ThemedText style={{ color: Colors.iconInactive, fontWeight: '600', fontSize: 12 }}>{area}</ThemedText>
                                 </View>
                               )}
                            </TouchableOpacity>
                           );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' }}>
                    <MapComponent 
                      mapRef={mapRef} 
                      userLocation={userLocation} 
                      showMarkers={showMarkers} 
                      onZoom={handleZoom} 
                      dataSource={showMarkers ? results : []} 
                      mapKey={mapKey} 
                      onMarkerPress={handleMarkerSelection} 
                      showsUserLocation={true}
                    />
                    
                    {isWeb && (
                      <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 15, right: 15, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: Colors.border, zIndex: 99, elevation: 99 }}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.text} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ marginTop: 20 }}>
                    {results.length > 0 ? (
                      <>
                        <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' +(results.length > 1 ? (t.genericbtn as any)?.resultdomore || 'resultados' : (t.genericbtn as any)?.resultone || 'resultado')}</ThemedText>
                        {isFilteredByMap && (
                          <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.accenticon }}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accenticon} />
                            <ThemedText style={{ color: Colors.accenticon, fontWeight: '800', fontSize: 13 }}>{`  ${(t.genericbtn as any)?.viewallresults || 'Ver todos'}`}</ThemedText>
                          </TouchableOpacity>
                        )}
                        {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                      </>
                    ) : (
                      (!loading && zipCode.length === 5) ? (
                        <View style={{ flex: 1, alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                          <MaterialCommunityIcons name="scale-balance" size={48} color={Colors.text} />
                          <ThemedText style={{ marginTop: 10, color: Colors.text }}>{(t.lawyerstab as any)?.noLawyersFound || "No se encontraron abogados aquí."}</ThemedText>
                        </View>
                      ) : null
                    )}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: Colors.text }]}>{(t.lawyerstab as any)?.category || 'Área de Práctica'}</ThemedText>
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                      {PRACTICE_AREAS.map((area, index) => {
                        const iconInfo = AREA_ICONS[area] || AREA_ICONS['Default'];
                        const isActive = selectedArea === area;
                        return (
                          <TouchableOpacity key={index} onPress={() => handleCategorySelect(area)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                            {isActive ? (
                              <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <iconInfo.lib name={iconInfo.name} size={18} color="#FFF" style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{area}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: Colors.inputBg }}>
                                <iconInfo.lib name={iconInfo.name} size={18} color={Colors.text} style={{ marginRight: 10 }} />
                                <ThemedText style={{ color: Colors.text, fontWeight: '600', fontSize: 14 }}>{area}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                        {isAdminMode && pendingLawyers.length > 0 && (
                          <View style={{ marginBottom: 20 }}>
                            <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>{(t.lawyerstab as any)?.verify || 'Pendientes de Revisión'} ({pendingLawyers.length})</ThemedText>
                            {pendingLawyers.map(lawyer => (
                              <PendingLawyerItem key={lawyer.id} lawyer={lawyer} />
                            ))}
                          </View>
                        )}

                        {results.length > 0 ? (
                          <>
                            <ThemedText style={{ fontSize: 13, color: Colors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length} {(t.genericbtn as any)?.resultdomore || 'resultados'}</ThemedText>
                            {isFilteredByMap && (
                              <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.accenticon }}>
                                <MaterialCommunityIcons name="filter-remove-outline" size={16} color={Colors.accenticon} />
                                <ThemedText style={{ color: Colors.accenticon, fontWeight: '800', fontSize: 13 }}>{`  ${(t.genericbtn as any)?.viewallresults || 'Ver todos'}`}</ThemedText>
                              </TouchableOpacity>
                            )}
                            {results.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)}
                          </>
                        ) : (
                          (!loading && zipCode.length === 5) ? (
                            <View style={{ flex: 1, alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                              <MaterialCommunityIcons name="scale-balance" size={48} color={Colors.text} />
                              <ThemedText style={{ marginTop: 10, color: Colors.text }}>{(t.lawyerstab as any)?.noLawyersFound || "No se encontraron abogados aquí."}</ThemedText>
                            </View>
                          ) : null
                        )}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' }}>
                      <MapComponent 
                        mapRef={mapRef} 
                        userLocation={userLocation} 
                        showMarkers={showMarkers} 
                        dataSource={showMarkers ? results : []} 
                        mapKey={mapKey} 
                        onMarkerPress={handleMarkerSelection} 
                        onZoom={handleZoom}
                        showsUserLocation={true}
                      />
                      {isWeb && (
                        <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 30, borderWidth: 1, borderColor: Colors.border, zIndex: 99, elevation: 99 }}>
                          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.text} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={[stylesUnified.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]} onPress={() => setModalVisible(true)}>
        <LinearGradient colors={orangeGradient} style={{ width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <MaterialCommunityIcons name="scale-balance" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}