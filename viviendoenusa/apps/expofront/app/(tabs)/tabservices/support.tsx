import React, { useState, useRef, useEffect, memo } from 'react';
import { TouchableOpacity, View, ScrollView, Platform, StyleSheet, useWindowDimensions, Animated, Easing, TextInput, ActivityIndicator, Image, Linking as RNLinking, Alert, Modal, KeyboardAvoidingView, ColorValue, Share, Linking } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
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
import MapComponent from '@/components/Map';
import badWordsData from '../../../utils/babwords.json';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 
import { useAppTheme } from 'app/src/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { handleUniversalShare } from '../../../utils/shareHelper';

const BANNED_WORDS = Array.isArray(badWordsData.badWordsList) ? badWordsData.badWordsList : []; 

const COUNTRIES = [{ code: '+1', flag: '🇺🇸', name: 'USA' }];

const API_STORES_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/support';
const API_TARIFFS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/tariffs';

const planStyles: any = {
  coupon: { selected: '#EA8D2D', unselected: (isDark: boolean) => isDark ? 'rgba(234, 141, 45, 0.15)' : 'rgba(234, 141, 45, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  basic: { selected: '#FF5F6D', unselected: (isDark: boolean) => isDark ? 'rgba(255, 95, 109, 0.15)' : 'rgba(255, 95, 109, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  premium: { selected: '#F5A623', unselected: (isDark: boolean) => isDark ? 'rgba(245, 166, 35, 0.15)' : 'rgba(245, 166, 35, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' },
  unlimited: { selected: '#10B981', unselected: (isDark: boolean) => isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)', text: (isDark: boolean) => isDark ? '#FFF' : '#333' }
};

// 🚀 NUEVA LÓGICA DE VALIDACIÓN CON REGEX
const containsBadWords = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();

  return BANNED_WORDS.some(word => {
    if (!word) return false;
    const lowerWord = word.toLowerCase();
    
    // 1. Atrapa la palabra exacta, plurales (s, es) y prefijos comunes como 're'
    const exactRegex = new RegExp(`\\b(re)?${lowerWord}(s|es)?\\b`, 'i');
    if (exactRegex.test(lowerText)) return true;

    // 2. Atrapa letras repetidas al final para evadir filtros
    const lastChar = lowerWord.slice(-1);
    const escapedLastChar = lastChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const repeatedRegex = new RegExp(`\\b(re)?${lowerWord}${escapedLastChar}+\\b`, 'i');
    if (repeatedRegex.test(lowerText)) return true;
    
    return false;
  });
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 3958.8, dLat = (lat2 - lat1) * (Math.PI / 180), dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return parseFloat((R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1));
};

const openDirections = (item: any) => {
  const label = encodeURIComponent(item.name || item.nameSupp || 'Ubicacion');
  const url = Platform.select({ ios: `maps:0,0?q=${label}@${item.lat},${item.lng}`, android: `geo:0,0?q=${item.lat},${item.lng}(${label})`, web: `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}` });
  if (url) RNLinking.openURL(url);
};

const ReviewForm = ({ onPublish, onCancel, isDark, t }: any) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel} style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" /><ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>Volver</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20 }}>Tu Experiencia</ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 25 }}>
        {[1, 2, 3, 4, 5].map(s => ( <TouchableOpacity key={s} onPress={() => setRating(s)}><MaterialCommunityIcons name={s <= rating ? "star" : "star-outline"} size={40} color={s <= rating ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)")} /></TouchableOpacity> ))}
      </View>
      <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderRadius: 20, padding: 15, height: 150, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput value={comment} onChangeText={setComment} placeholder="Escribe tu opinión..." placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} multiline style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 16, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
      </View>
      <TouchableOpacity onPress={() => { 
          // 🚀 NUEVA VALIDACIÓN ANTI-GROSERÍAS EN LA RESEÑA
          if(containsBadWords(comment)) { 
            const errorMsg = t.genericlabel.labelinapro || "Contenido inapropiado detectado.";
            Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Error", errorMsg); 
            return; 
          } 
          onPublish(rating, comment); 
        }} disabled={!comment.trim()} style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']} style={{ padding: 18, alignItems: 'center' }}><ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Publicar</ThemedText></LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// 🚀 MODAL EXTRAÍDO PARA EVITAR REFRESCO DE LA PANTALLA PRINCIPAL AL ESCRIBIR
const SupportFormModal = memo(({
  visible, onClose, onSuccess, currentUserId, userToken, userMetadata, companyTariffs,
  t, isDark, Colors, orangeGradient, disabledGradient, isLargeWeb, isAndroid, isIOS,
  CATEGORIES_LIST, ICONS_ARRAY, COUNTRIES, height 
}: any) => {
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAddress, setFormAddress] = useState(''); 
  const [formCategoryIdx, setFormCategoryIdx] = useState(1); 
  const [formZip, setFormZip] = useState('');
  const [formPhone, setFormPhone] = useState(''); 
  const [countryIdx, setCountryIdx] = useState(0); 
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formPlan, setFormPlan] = useState('basic');
  const [formCoupon, setFormCoupon] = useState('');
  const [formRefCode, setFormRefCode] = useState('');
  const [formPayMethod, setFormPayMethod] = useState('Zelle');
  const [isPublishing, setIsPublishing] = useState(false);

  const isFormValid = !!(formName.trim() && formAddress.trim() && formZip.length === 5 && formPhone.trim() && formImage && formRefCode.trim());

  const textlabel = t.genericlabel.labelmessagepay || "";
  const parts = textlabel.split("{amount}");
  const before = parts[0] || "";
  const after = parts[1] || ""; 

  useEffect(() => {
    if (visible) {
      setFormName(''); setFormDesc(''); setFormAddress(''); setFormZip(''); setFormPhone(''); 
      setFormImage(null); setFormCategoryIdx(1); setFormPlan('basic'); setFormCoupon(''); 
      setFormRefCode(''); setFormPayMethod('Zelle'); 
    }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handlePublishStore = async () => {
    if (!formName.trim() || !formAddress.trim() || formZip.length < 5) { 
      return Platform.OS === 'web' ? window.alert(t.genericlabel.labelfields) : Alert.alert("Atención", t.genericlabel.labelfields); 
    }

    // 🚀 NUEVA VALIDACIÓN ANTI-GROSERÍAS EN EL MODAL DE CREACIÓN
    const contentToValidate = `${formName} ${formDesc} ${formAddress}`;
    if (containsBadWords(contentToValidate)) {
      const errorMsg = t.genericlabel.labelinapro || "Contenido inapropiado detectado.";
      return Platform.OS === 'web' ? window.alert(errorMsg) : Alert.alert("Atención", errorMsg);
    }

    setIsPublishing(true);
    try {
      let finalImageName = '';
      if (formImage) {
        if (!(await validarImagenEnServidor(formImage))) { 
          setIsPublishing(false); 
          if (Platform.OS === 'web') { window.alert(`Error\n${t.genericlabel.labelerrorimageinapro}`); } 
          else { Alert.alert("Error", t.genericlabel.labelerrorimageinapro); } 
          return; 
        }

        const formData = new FormData(); 
        const filename = formImage.split('/').pop() || 'imagen.jpg'; 
        const type = `image/${filename.split('.').pop() || 'jpeg'}`;
        
        if (Platform.OS === 'web') {
          const responseBlob = await fetch(formImage);
          const blob = await responseBlob.blob();
          formData.append('imagen', blob as any, filename);
        } else {
          formData.append('imagen', { uri: formImage, name: filename, type } as any);
        }

        const uploadRes = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/api/subir-imagen-optimizada/support', { 
          method: 'POST', 
          body: formData, 
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}` 
          } 
        });

        if (uploadRes.status === 401) { setIsPublishing(false); return; }
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || t.genericlabel.labelerrorimage);
        finalImageName = uploadData.identificadorArchivo;
      }

      let lat = 34.0934, lng = -117.5847;
      try { const geo = await Location.geocodeAsync(formZip); if (geo.length > 0) { lat = geo[0].latitude; lng = geo[0].longitude; } } catch (e) { }
      
      const fullPhone = formPhone.trim() ? `${COUNTRIES[countryIdx].code}${formPhone.trim()}` : '';
      
      const payload = { 
        nameSupp: formName.trim(),
        descriptionSupp: formDesc.trim(), 
        addressSupp: formAddress.trim(), 
        categoryId: formCategoryIdx, 
        zip: formZip.trim(), 
        imageSupp: finalImageName, 
        lat, 
        lng, 
        phone: fullPhone, 
        userId: userMetadata?.id || userMetadata?.userId || null, 
        estate: userMetadata?.estate || 'California', 
        approved: false, 
        premiumPlan: formPlan, 
        couponCode: formCoupon ? formCoupon.trim() : '', 
        referenceCode: formRefCode, 
        paymentMethod: formPayMethod 
      };
      
      const response = await fetch(API_STORES_URL, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        }, 
        body: JSON.stringify(payload) 
      });

      if (response.status === 401) { setIsPublishing(false); return; }
      
      const savedFromDB = await response.json();
      if (!response.ok) throw new Error(savedFromDB.error || t.genericlabel.labelerrorsave);

      const newEntryLocal = { 
        id: savedFromDB.id, 
        name: savedFromDB.nameSupp, 
        description: savedFromDB.descriptionSupp, 
        address: savedFromDB.addressSupp, 
        categoryId: savedFromDB.categoryId, 
        image: formImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800', 
        lat, 
        lng, 
        rating: 0, 
        reviews: [], 
        totalReviews: 0, 
        phone: savedFromDB.phone, 
        status: 'pending', 
        userId: currentUserId, 
        timepostEnd: null 
      };

      onSuccess(newEntryLocal, formZip);
      Platform.OS === 'web' ? window.alert(t.supporttab.labelcheck) : Alert.alert(t.genericlabel.labelsendreq, t.supporttab.labelcheck);
    } catch (err: any) { 
      Alert.alert("Error", err.message || t.genericlabel.labelerrorsend); 
    } finally { 
      setIsPublishing(false); 
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: isLargeWeb ? 'center' : 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isPublishing && onClose()} />
        <KeyboardAvoidingView behavior={isIOS ? "padding" : "height"} style={{ width: isLargeWeb ? 550 : '100%' }}>
          
          <View style={{ backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: Colors.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' }}>
            {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, marginTop: isLargeWeb ? 25 : 0 }}>
              <ThemedText style={{fontSize: 20, fontWeight:'bold',color: Colors.text}}>{t.genericlabel.labeljoinred}</ThemedText>
              <TouchableOpacity onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            
            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>
              <TouchableOpacity onPress={pickImage} style={{ height: 150, borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderColor: Colors.border }}>
                {formImage ? <Image source={{ uri: formImage }} style={StyleSheet.absoluteFill} /> : <View style={{ alignItems: 'center' }}><MaterialCommunityIcons name="camera-plus" size={32} /><ThemedText style={{ fontWeight: '800', fontSize: 11, marginTop: 8 ,color:Colors.subtext}}>{t.genericbtn.photo}</ThemedText></View>}
              </TouchableOpacity>
              
              <ThemedText style={{ fontSize: 13, fontWeight: '900', marginBottom: 8,textTransform:'none',color:Colors.text}}>{t.genericlabel.labelcatergory}</ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 6, marginBottom: 14 }}>
                {CATEGORIES_LIST.map((cat: string, index: number) => {
                  if (index === 0) return null; const isActive = formCategoryIdx === index; const iconName = ICONS_ARRAY[index] || 'heart'; 
                  return (
                    <TouchableOpacity key={index} onPress={() => setFormCategoryIdx(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: Colors.border }}>
                      {isActive ? ( <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                        <MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                        <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800',textTransform:'none' }}>{cat}</ThemedText>
                        </LinearGradient> 
                        ) : (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: Colors.categoryUnselected }}>
                          <MaterialCommunityIcons name={iconName as any} size={14} color={Colors.iconInactive} style={{ marginRight: 6 }} />
                          <ThemedText style={{ color: Colors.iconInactive, fontSize: 11, fontWeight: '600',textTransform:'none' }}>{cat}</ThemedText>
                        </View> )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.genericlabel.labelnameprof} placeholderTextColor={Colors.subtext} value={formName} onChangeText={(text) => setFormName(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" />
              <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.genericlabel.labelcityaddres} placeholderTextColor={Colors.subtext} value={formAddress} onChangeText={(text) => setFormAddress(text.replace(/(^\S|\s\S)/g, m => m.toUpperCase()))} autoCapitalize="words" />
              <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.genericlabel.labelzipcde} placeholderTextColor={Colors.subtext} value={formZip} onChangeText={setFormZip} keyboardType="numeric" maxLength={5} />
              <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, height: 90, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.genericlabel.lablelespecia} placeholderTextColor={Colors.subtext} value={formDesc} onChangeText={(text) => setFormDesc(text ? text.charAt(0).toUpperCase() + text.slice(1) : '')} multiline autoCapitalize="sentences" />

              <ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: Colors.text, marginBottom: 8, marginTop: 5 }}>SELECCIONA TU PLAN *</ThemedText>
              <View style={{ flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[  
                      { id: 'coupon', name: t.categoryplan.coupon, price: companyTariffs.coupon, desc: t.categoryplan.coupondesc }, 
                      { id: 'basic', name: t.categoryplan.basic, price: companyTariffs.basic, desc: t.categoryplan.basicdesc }, 
                      { id: 'premium', name: t.categoryplan.premium, price: companyTariffs.premium, desc: t.categoryplan.premiumdesc }, 
                      { id: 'unlimited', name: t.categoryplan.unlimited, price: companyTariffs.unlimited, desc: t.categoryplan.unlimiteddesc }
                  ].map(plan => {
                      const pStyle = planStyles[plan.id as keyof typeof planStyles]; const isSelected = formPlan === plan.id;
                      return (
                      <TouchableOpacity key={plan.id} onPress={() => setFormPlan(plan.id)} style={{ padding: 15, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? pStyle.selected : Colors.border, backgroundColor: isSelected ? pStyle.unselected(isDark) : Colors.inputBg }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name={isSelected ? "radiobox-marked" : "radiobox-blank"} size={20} color={isSelected ? pStyle.selected : Colors.subtext} /><ThemedText style={{ fontWeight: 'bold', fontSize: 16, color: isSelected ? pStyle.selected : Colors.text, marginLeft: 8 }}>{plan.name}</ThemedText></View><ThemedText style={{ fontWeight: '900', fontSize: 16, color: Colors.text }}>${plan.price}</ThemedText></View>
                          <ThemedText style={{ fontSize: 13, color: isSelected ? pStyle.text(isDark) : Colors.subtext, marginTop: 6, marginLeft: 28 }}>{plan.desc}</ThemedText>
                      </TouchableOpacity>
                  )})}
              </View>
              
              <ThemedText style={{ fontSize: 12, fontWeight: '900', marginBottom: 8, textTransform:'none' }}>{t.genericlabel.labelphonecont}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 15, overflow: 'hidden' }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setCountryIdx(prev => (prev === 0 ? 0 : 0))} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: Colors.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}><ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText><ThemedText style={{ fontWeight: '800', color: Colors.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText></TouchableOpacity>
                <TextInput value={formPhone} onChangeText={setFormPhone} placeholder="(909) 000-0000" placeholderTextColor={Colors.subtext} keyboardType="phone-pad" style={{ flex: 1, color: Colors.text, padding: 15, fontSize: 14, fontWeight: '600', ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} />
              </View>

              <View style={{ marginTop: 5, paddingTop: 15, borderTopWidth: 1, borderTopColor: Colors.border }}>
                <ThemedText style={{ fontSize: 17, fontWeight: '900', marginBottom: 10, color: Colors.accent }}>{t.genericlabel.labelcheckpay}</ThemedText>
                <ThemedText style={{ fontSize: 15, marginBottom: 15, lineHeight: 18, color: Colors.text }}>{before}<ThemedText style={{ fontWeight: '900', color: Colors.accent }}>${(companyTariffs as any)[formPlan]} USD</ThemedText>{after}   </ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  {['Zelle'].map((method) => ( <TouchableOpacity key={method} onPress={() => setFormPayMethod(method)} style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', borderColor: formPayMethod === method ? Colors.accent : Colors.border, backgroundColor: formPayMethod === method ? (isDark ? 'rgba(255, 95, 109, 0.1)' : 'rgba(255, 95, 109, 0.05)') : Colors.inputBg }}><ThemedText style={{ fontWeight: '900', color: formPayMethod === method ? Colors.accent : Colors.subtext }}>{method}</ThemedText></TouchableOpacity> ))}
                </View>
                <TextInput style={{ padding: 15, borderRadius: 18, borderWidth: 1, fontWeight: '900', textTransform: 'uppercase', marginBottom: 15, backgroundColor: Colors.inputBg, borderColor: Colors.border, color: Colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }} placeholder={t.genericlabel.labelconfirmpay + `${formPayMethod}...`} placeholderTextColor={Colors.subtext} value={formRefCode} onChangeText={(text) => setFormRefCode(text.toUpperCase())} autoCapitalize="characters" />
              </View>
              <TouchableOpacity onPress={handlePublishStore} disabled={!isFormValid || isPublishing} style={{ marginTop: 20, alignSelf: 'center' }}>
                <LinearGradient colors={isFormValid ? orangeGradient : disabledGradient} style={{ paddingHorizontal: 30, paddingVertical: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  {isPublishing ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" style={{ marginRight: 10 }} />}<ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{t.genericbtn.sendrequest}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

export default function SupportScreen() {
  const { login } = useAuth();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const paramsGlobal = useLocalSearchParams();
  const rawNotifId = paramsGlobal.id || paramsGlobal.supportId || paramsGlobal.referenceId;
  const notificationId = Array.isArray(rawNotifId) ? rawNotifId[0] : rawNotifId;
  const mapRef = useRef<MapView>(null); 
  const { isDark, toggleTheme } = useAppTheme();
  const localTheme = isDark ? 'dark' : 'light';

  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const userMetadata = useMockSelector((state: any) => state.mockAuth.userMetadata) as any;
  const userToken = userMetadata?.token || userMetadata?.accessToken;
  const { t } = useTranslation();

  // 🚀 1. NUEVO: Extraemos el rol y creamos la validación
  // (Si tu base de datos usa otra palabra como 'rol' o 'tipo_usuario', cámbialo aquí)
  const userRole = userMetadata?.role || userMetadata?.rol || 'User'; 
  const isAdmin = userRole === 'SAdmin' || userRole === 'admin';
  
  const ICONS_ARRAY = t.supporttab.categoryListIcon;
  const CATEGORIES_LIST = t.supporttab.categoryList;
  const stylesUnified = useUnifiedCardStyles();

  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const isLargeWeb = isWeb && width > 1000;
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'] as const;
  const disabledGradient: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A', 
    subtext: isDark ? '#B0BEC5' : '#364045',
    accent: '#FF5F6D', 
    accenticon: isDark ? '#4FC3F7' : '#0080B5',
    border: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)', 
    inputBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
    iconInactive: isDark ? '#B0BEC5' : '#364045',  
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  };
  
  const [zipCode, setZipCode] = useState('');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]); 
  const [userLocation, setUserLocation] = useState<any>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isFilteredByMap, setIsFilteredByMap] = useState(false); 
  const [mapKey, setMapKey] = useState(0);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  
  const [companyTariffs, setCompanyTariffs] = useState({coupon: '0.00', basic: '50.00', premium: '99.00', unlimited: '149.00' });
  const [pendingStores, setPendingStores] = useState<any[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const currentUserId = userMetadata?.id || userMetadata?.userId || "baeb641a-3fa4-4fef-9846-d75947d1bca9";
  const isZipValid = zipCode.length === 5;
  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseRingAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacityAnim = useRef(new Animated.Value(0.5)).current;

  const applyLocalFilters = (supportList: any[], categoryIdx: number, lat: number, lng: number) => {
    let filtered = (categoryIdx === 0) ? [...supportList] : supportList.filter(l => Number(l.categoryId) === categoryIdx);
    filtered = filtered.filter(item => {
      const isOwner = item.userId === currentUserId;
      const isExpired = (item.timepostEnd && new Date(item.timepostEnd).getFullYear() > 1970) ? new Date(item.timepostEnd) < new Date() : false;
      return isOwner || !isExpired; 
    });
    filtered.sort((a, b) => getDistance(lat, lng, a.lat, a.lng) - getDistance(lat, lng, b.lat, b.lng));
    return filtered;
  };

  useEffect(() => {
    const fetchTariff = async () => {
      try {
        const res = await fetch(`${API_TARIFFS_URL}?typeCode=Support`, {
          method: 'GET',
          headers: userToken ? { 'Authorization': `Bearer ${userToken}` } : undefined
        });
        
        if (res.status === 401) { router.replace('/'); return; }
        
        if (res.ok) {
          const tariffsData = await res.json();
          if (tariffsData && tariffsData.length > 0) {
            setCompanyTariffs({ coupon: tariffsData[0].priceCoupon || '0.00', basic: tariffsData[0].priceBasic || '50.00', premium: tariffsData[0].pricePremium || '99.00', unlimited: tariffsData[0].priceUnlimited || '149.00' });
          }
        }
      } catch (e) { console.warn("⚠️ No se pudo cargar la tarifa"); }
    };
    fetchTariff();
  }, []);

  useEffect(() => {
    Animated.loop(Animated.sequence([ Animated.timing(ringAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }), Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }), Animated.timing(ringAnim, { toValue: 1, duration: 100, easing: Easing.linear, useNativeDriver: true }), Animated.timing(ringAnim, { toValue: -1, duration: 100, easing: Easing.linear, useNativeDriver: true }), Animated.timing(ringAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }), Animated.delay(1000) ])).start();
    Animated.loop(Animated.parallel([ Animated.timing(pulseRingAnim, { toValue: 1.5, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }), Animated.timing(pulseOpacityAnim, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }) ])).start();
  }, [ringAnim, pulseRingAnim, pulseOpacityAnim]);

  const spin = ringAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });

  const getCurrentLocation = async (isManual = false) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      setUserLocation(coords); setMapKey(prev => prev + 1); 
      if (!isWeb && mapRef.current) mapRef.current.animateToRegion(coords, isManual ? 1000 : 1);
    } catch (e) { }
  };

  const hasFetchedLocation = useRef(false);
  useEffect(() => { if (!hasFetchedLocation.current) { getCurrentLocation(); hasFetchedLocation.current = true; } }, []);

  const handleZoom = (type: 'in' | 'out') => {
    if (isWeb || !mapRef.current) return;
    mapRef.current.getCamera().then((camera: any) => {
      if (isIOS) camera.altitude *= type === 'in' ? 0.5 : 2; else camera.zoom += type === 'in' ? 1 : -1;
      mapRef.current?.animateCamera(camera, { duration: 400 });
    });
  };

  useEffect(() => { if (isAdminMode) { fetchAllPendingSupports(); } else { if (zipCode.length !== 5) { setPendingStores([]); } else { fetchSupportData(zipCode); } } }, [isAdminMode]);

  const fetchAllPendingSupports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_STORES_URL}?userId=${currentUserId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      });
      
      if (res.status === 401) { router.replace('/'); return; }

      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id, name: item.nameSupp || 'Sin nombre', description: item.descriptionSupp || '', address: item.addressSupp || '', categoryId: item.categoryId || 0, zip: item.zip, image: item.imageSupp || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
          lat: Number(item.lat) || 34.0934, lng: Number(item.lng) || -117.5847, phone: item.phone || '', rating: Number(item.rating) || 0, reviews: Array.isArray(item.reviews) ? item.reviews : [], totalReviews: Number(item.totalReviews) || 0,
          status: item.approved ? 'approved' : 'pending', ownerName: item.ownerName, premiumPlan: item.premiumPlan, couponCode: item.couponCode, referenceCode: item.referenceCode, paymentMethod: item.paymentMethod, userId: item.userId || item.user_id, timepostEnd: item.timepostEnd || item.timepost_end
        }));
        setPendingStores(mappedData.filter(s => s.status === 'pending'));
      }
    } catch (e) { } finally { setLoading(false); }
  };

  const fetchSupportData = async (searchZip: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_STORES_URL}?zip=${searchZip.trim()}&userId=${currentUserId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      });
      
      if (res.status === 401) { router.replace('/'); return []; }

      const data = await res.json();
      if (Array.isArray(data)) {
        const mappedData = data.map(item => ({
          id: item.id, name: item.nameSupp || 'Sin nombre', description: item.descriptionSupp || '', address: item.addressSupp || '', categoryId: item.categoryId || 0, zip: item.zip, image: item.imageSupp || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
          lat: Number(item.lat) || 34.0934, lng: Number(item.lng) || -117.5847, phone: item.phone || '', rating: Number(item.rating) || 0, reviews: Array.isArray(item.reviews) ? item.reviews : [], totalReviews: Number(item.totalReviews) || 0,
          status: item.approved ? 'approved' : 'pending', ownerName: item.ownerName, userId: item.userId || item.user_id, timepostEnd: item.timepostEnd || item.timepost_end
        }));
        const approved = mappedData.filter(s => s.status === 'approved');
        setAllStores(approved);
        if (!isAdminMode) setPendingStores(mappedData.filter(s => s.status === 'pending'));
        return approved;
      }
      return [];
    } catch (e) { return []; } finally { setLoading(false); }
  };

  const handleSearch = async (forcedCategoryIdx?: number, forcedZip?: string) => {
    const targetZip = forcedZip || zipCode;
    if (targetZip.length !== 5) return;
    const categoryToSearch = forcedCategoryIdx !== undefined ? forcedCategoryIdx : selectedCategoryIdx;
    setIsFilteredByMap(false);
    let lat = userLocation ? userLocation.latitude : 34.0934, lng = userLocation ? userLocation.longitude : -117.5847;
    try { const geo = await Location.geocodeAsync(targetZip); if (geo.length > 0) { lat = geo[0].latitude; lng = geo[0].longitude; } } catch (e) { }
    const newCoords = { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
    setUserLocation(newCoords); setShowMarkers(true); 
    if (!isWeb && mapRef.current) mapRef.current.animateToRegion(newCoords, 1000);
    const approvedSupport = await fetchSupportData(targetZip);
    setResults(applyLocalFilters(approvedSupport, categoryToSearch, lat, lng)); setMapKey(k => k + 1);
  };

  const lastProcessedNotifId = useRef<string | null>(null);
  useEffect(() => {
    if (!notificationId) { lastProcessedNotifId.current = null; return; }
    const cleanNotifId = String(notificationId).trim();
    if (cleanNotifId && cleanNotifId !== lastProcessedNotifId.current) {
      lastProcessedNotifId.current = cleanNotifId; router.setParams({ id: '', supportId: '', referenceId: '' });
      const syncSearchAndDetail = async (item: any) => { setSelectedDetail(item); if (item.zip && String(item.zip).length === 5) { setZipCode(String(item.zip)); await handleSearch(0, String(item.zip)); } };
      const localMatch = allStores.find(s => String(s.id) === cleanNotifId) || pendingStores.find(s => String(s.id) === cleanNotifId);
      if (localMatch) { syncSearchAndDetail(localMatch); } else {
        const fetchSpecificSupport = async () => {
          try {
            const res = await fetch(`${API_STORES_URL}/${cleanNotifId}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${userToken}` }
            });
            
            if (res.status === 401) { router.replace('/'); return; }
            
            if (res.ok) {
              const data = await res.json();
              const mappedSupport = { ...data, name: data.nameSupp || data.name || 'Sin nombre', description: data.descriptionSupp || data.description || '', address: data.addressSupp || data.address || '', image: data.imageSupp || data.image || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800', lat: Number(data.lat) || 34.0934, lng: Number(data.lng) || -117.5847 };
              syncSearchAndDetail(mappedSupport);
            }
          } catch (e) { }
        };
        fetchSpecificSupport();
      }
    }
  }, [notificationId, allStores, pendingStores]);

  const handleZipChange = (text: string) => {
    setZipCode(text);
    if (text.length < 5) { setResults([]); setAllStores([]); if (!isAdminMode) { setPendingStores([]); } setShowMarkers(false); setIsFilteredByMap(false); } 
    else if (text.length === 5) { handleSearch(selectedCategoryIdx, text); }
  };

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIdx(index);
    if (isZipValid && allStores.length > 0) { const lat = userLocation ? userLocation.latitude : 34.0934; const lng = userLocation ? userLocation.longitude : -117.5847; setResults(applyLocalFilters(allStores, index, lat, lng)); } 
    else if (isZipValid) { handleSearch(index); }
  };

  const handleMarkerSelection = (store: any) => { setResults([store]); setIsFilteredByMap(true); const region = { latitude: store.lat, longitude: store.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }; if (!isWeb && mapRef.current) mapRef.current.animateToRegion(region, 800); };

  const handleShare = async (support: any) => {
    await handleUniversalShare({
      title: t.supporttab.label+support.name,
      description: support.description,
      phone: support.phone,
      address: support.address,
      zip: support.zip,
      image: support.image,
    });
  };

  const approveStore = async (store: any, durationMonths: number) => {
    try {
      const response = await fetch(`${API_STORES_URL}/${store.id}`, { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` 
        }, 
        body: JSON.stringify({ approved: true, durationMonths }) 
      });
      if (response.status === 401) { router.replace('/'); return; }
      
      if (!response.ok) throw new Error(t.genericlabel.labelerrorserver);
      const updatedStoreFromServer = await response.json(); const futureDate = new Date(); futureDate.setMonth(futureDate.getMonth() + durationMonths);
      const approvedStore = { ...store, ...updatedStoreFromServer, status: 'approved', timepostEnd: updatedStoreFromServer.timepostEnd || updatedStoreFromServer.timepost_end || futureDate.toISOString() };
      if (store.zip === zipCode) { const newAllStores = [approvedStore, ...allStores]; setAllStores(newAllStores); if (showMarkers || isZipValid) { const lat = userLocation ? userLocation.latitude : 34.0934; const lng = userLocation ? userLocation.longitude : -117.5847; setResults(applyLocalFilters(newAllStores, selectedCategoryIdx, lat, lng)); } setMapKey(k => k + 1); }
      setPendingStores(pendingStores.filter(s => s.id !== store.id)); Alert.alert(t.genericlabel.labelaprov, t.genericlabel.labelmessajeaprov +` ${durationMonths} `+t.genericlabel.labelmonth);
    } catch (error) { Alert.alert("Error", t.genericlabel.labelaproval); }
  };

  const rejectStore = async (id: number) => {
    try {
      const response = await fetch(`${API_STORES_URL}/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        } 
      });
      if (response.status === 401) { router.replace('/'); return; }
      
      if (!response.ok) throw new Error(t.genericlabel.labelerrorserver);
      setPendingStores(pendingStores.filter(e => e.id !== id)); Alert.alert(t.genericlabel.labelreject, t.genericlabel.labeldeletecontac);
    } catch (error) { Alert.alert("Error", t.genericlabel.labelnoreject); }
  };

  const handleCloseDetailModal = () => { setSelectedDetail(null); lastProcessedNotifId.current = null; router.setParams({ id: '', supportId: '', referenceId: '' }); };

  const SupportCard = ({ store, renderAdminControls }: { store: any, renderAdminControls?: any }) => {
    const dist = userLocation ? getDistance(userLocation.latitude, userLocation.longitude, store.lat, store.lng) : null;
    const categoryName = CATEGORIES_LIST[store.categoryId] || 'Otros';
    const isPending = store.status === 'pending';
    const isOwner = store.userId === currentUserId;
    const isExpired = (store.timepostEnd && new Date(store.timepostEnd).getFullYear() > 1970) ? new Date(store.timepostEnd) < new Date() : false;
    const fadeCard = isExpired && !isPending;
    const safeRating = Number(store.rating) || 0;
    const displayRating = safeRating > 0 ? safeRating.toFixed(1) : "Nuevo";
    const reviewCount = store.reviews?.length || store.totalReviews || 0;
    let formattedCount = reviewCount.toString(); if (reviewCount >= 1000) { formattedCount = (reviewCount / 1000).toFixed(1) + 'k'; }
    const cardBgColor = isPending ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.9)') : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)');

    return (
      <View style={{ borderRadius: 28, overflow: 'hidden' as 'hidden', borderWidth: 1, marginBottom: 20, backgroundColor: cardBgColor, borderColor: (isPending || isExpired) ? '#FFB74D' : DynamicColors.border }}>
        {isPending && isOwner && ( <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.1)', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 183, 77, 0.2)', flexDirection: 'row', alignItems: 'center' }}><MaterialCommunityIcons name="clock-outline" size={20} color="#FFB74D" /><ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginLeft: 8, fontSize: 13, flexShrink: 1 }}>{t.genericlabel.labelaprovaladmin}</ThemedText></View> )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
          <View style={{ backgroundColor: 'rgba(255, 95, 109, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}><ThemedText style={{ color: '#FF5F6D', fontSize: 11, fontWeight: '900' }}>{categoryName.toUpperCase()}</ThemedText></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}><MaterialCommunityIcons name="star" size={14} color="#FFB300" /><ThemedText style={{ color: DynamicColors.text, fontWeight: '900', fontSize: 13, marginLeft: 4 }}>{displayRating}</ThemedText></View>
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedDetail(store)} style={{ width: '100%', height: 140, opacity: fadeCard ? 0.6 : 1 }}>
          {store.image && store.image.length > 5 ? ( <Image source={{ uri: store.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> ) : ( <View style={{ width: '100%', height: '100%', backgroundColor: DynamicColors.inputBg, justifyContent: 'center', alignItems: 'center' }}><MaterialCommunityIcons name="image-off-outline" size={40} color={DynamicColors.subtext} /></View> )}
          <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 }}><MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} /><ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{t.genericlabel.labelviewdetail}</ThemedText></View>
        </TouchableOpacity>
        <View style={{ padding: 15, paddingBottom: isPending ? 15 : 15, opacity: fadeCard ? 0.6 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><ThemedText style={{ fontWeight: '800', fontSize: 18, color: DynamicColors.text }}>{store.name}</ThemedText>{dist !== null && <ThemedText style={{ color: '#FF5F6D', fontSize: 13, fontWeight: '700' }}>{dist + t.genericlabel.labelme} </ThemedText>}</View>
          {store.address && ( <ThemedText style={{ fontSize: 13, color: '#FF5F6D', fontWeight: 'bold', marginTop: 4 }}><MaterialCommunityIcons name="map-marker-outline" size={12}/> {store.address}</ThemedText> )}
          <ThemedText style={{ fontSize: 14, opacity: 0.9, marginTop: 6 , color:DynamicColors.text }} numberOfLines={isPending ? undefined : 2}>{store.description}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15, opacity: isPending ? 0.5 : 1 }}>
            <TouchableOpacity onPress={() => !isPending && setSelectedStore(store)} disabled={isPending || fadeCard} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5' }}><MaterialCommunityIcons name="comment-text-outline" size={18} color={isDark ? '#FFF' : '#444'} /><ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFF' : '#444' }}>{t.genericbtn?.reviews || "Reseñas"} {reviewCount > 0 ? `(${formattedCount})` : ''}</ThemedText></TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && openDirections(store)} disabled={isPending || fadeCard} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD' }}><MaterialCommunityIcons name="directions" size={18} color={isDark ? '#4FC3F7' : '#1976D2'} /><ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#4FC3F7' : '#1976D2' }}>{t.genericbtn.route}</ThemedText></TouchableOpacity>
            <TouchableOpacity onPress={() => !isPending && Linking.openURL(`tel:${store.phone}`)} disabled={isPending || fadeCard} style={{ flexGrow: 1, flexBasis: 100, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: isDark ? 'rgba(255, 183, 77, 0.15)' : '#FFF3E0' }}><MaterialCommunityIcons name="phone" size={18} color={isDark ? '#FFB74D' : '#EF6C00'} /><ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: isDark ? '#FFB74D' : '#EF6C00' }}>{t.genericbtn.call}</ThemedText></TouchableOpacity>
          </View>
          {renderAdminControls && renderAdminControls()}
        </View>
      </View>
    );
  };

  const PendingSupportItem = ({ store }: { store: any }) => {
    const [selectedMonths, setSelectedMonths] = useState(1);
    const adminControls = () => (
      <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: DynamicColors.border, paddingTop: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' }}>
            {store.premiumPlan && ( <View style={{ backgroundColor: planStyles[store.premiumPlan as keyof typeof planStyles]?.unselected(isDark) || DynamicColors.inputBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: planStyles[store.premiumPlan as keyof typeof planStyles]?.selected || DynamicColors.border }}><ThemedText style={{ fontSize: 11, fontWeight: 'bold', color: planStyles[store.premiumPlan as keyof typeof planStyles]?.selected || DynamicColors.subtext }}> {(t.genericlabel?.lableplan || 'PLAN ') + store.premiumPlan.toUpperCase()}</ThemedText></View> )}
        </View>
        {store.couponCode ? ( <View style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.5)' }}><MaterialCommunityIcons name="ticket-percent" size={18} color="#4CAF50" /><ThemedText style={{ fontSize: 12, color: DynamicColors.text, fontWeight: '600', marginLeft: 8 }}>Cupón: <ThemedText style={{color: '#4CAF50', fontWeight: '900'}}>{store.couponCode}</ThemedText></ThemedText></View> ) : null}
        <View style={{ backgroundColor: 'rgba(255, 183, 77, 0.15)', padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 183, 77, 0.5)' }}><MaterialCommunityIcons name="bank-transfer" size={18} color="#FFB74D" /><ThemedText style={{ fontSize: 12, color: DynamicColors.text, fontWeight: '600', marginLeft: 8 }}>Ref: <ThemedText style={{color: '#FFB74D', fontWeight: '900'}}>{store.referenceCode || 'N/A'}</ThemedText> ({store.paymentMethod || 'Pago'})</ThemedText></View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            {[1, 3, 6, 12].map(m => ( <TouchableOpacity key={m} onPress={() => setSelectedMonths(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: selectedMonths === m ? '#4CAF50' : DynamicColors.inputBg }}><ThemedText style={{color: selectedMonths === m ? '#FFF' : DynamicColors.text, fontWeight: 'bold', fontSize: 12}}>{m}M</ThemedText></TouchableOpacity> ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity onPress={() => rejectStore(store.id)} style={{ flex: 1, flexDirection: 'row', backgroundColor: '#FF5252', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
             <MaterialCommunityIcons name="refresh" size={18} color="#FFF" style={{marginRight: 6}}/>
             <ThemedText style={{color:'#FFF', fontWeight:'bold', fontSize: 14}}>{(t.genericbtn as any)?.rejectbtn || "Rechazar"}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => approveStore(store, selectedMonths)} style={{ flex: 1, flexDirection: 'row', backgroundColor: '#4CAF50', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
             <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" style={{marginRight: 6}}/>
             <ThemedText style={{color:'#FFF', fontWeight:'bold', fontSize: 14}}>Aprobar Plan</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
    return <SupportCard store={store} renderAdminControls={adminControls} />;
  };

  return (
    <View style={stylesUnified.container}>
      <SupportFormModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        onSuccess={(newEntryLocal: any, formZip: string) => {
          setPendingStores(prev => [newEntryLocal, ...prev]);
          setModalVisible(false);
          if (!zipCode || zipCode.length < 5) {
            setZipCode(formZip);
            handleSearch(0, formZip);
          }
        }}
        currentUserId={currentUserId}
        userToken={userToken}
        userMetadata={userMetadata}
        companyTariffs={companyTariffs}
        t={t}
        isDark={isDark}
        Colors={DynamicColors}
        orangeGradient={orangeGradient}
        disabledGradient={disabledGradient}
        isLargeWeb={isLargeWeb}
        isAndroid={isAndroid}
        isIOS={isIOS}
        CATEGORIES_LIST={CATEGORIES_LIST}
        ICONS_ARRAY={ICONS_ARRAY}
        COUNTRIES={COUNTRIES}
        height={height} 
      />

      <Modal visible={!!selectedDetail} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseDetailModal} />
          <View style={{ width: '90%', height: '75%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, backgroundColor: isAndroid ? (isDark ? '#1A1A1A' : '#FFF') : 'transparent', borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: '100%', height: 240 }}>
               <Image source={{ uri: selectedDetail?.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
               <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
                {!isWeb &&
               <TouchableOpacity onPress={() => handleShare(selectedDetail)} style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="share-variant" size={22} color="#FFF" /></TouchableOpacity>
                }
               <TouchableOpacity onPress={handleCloseDetailModal} style={{ position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}><MaterialCommunityIcons name="close" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ padding: 25 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <LinearGradient colors={orangeGradient} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>{selectedDetail ? CATEGORIES_LIST[selectedDetail.categoryId]?.toUpperCase() : ''}</ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', marginLeft: 15, alignItems: 'center' }}><MaterialCommunityIcons name="star" size={18} color="#FFB300" /><ThemedText style={{ marginLeft: 5, fontWeight: '900', color: DynamicColors.text, fontSize: 16 }}>{selectedDetail?.rating > 0 ? selectedDetail.rating.toFixed(1) : "Nuevo"}</ThemedText></View>
                </View>
                <ThemedText style={{ fontSize: 24, fontWeight: '900', marginVertical: 10, color: DynamicColors.text }}>{selectedDetail?.name}</ThemedText>
                {selectedDetail?.address && <ThemedText style={{ color: '#FF5F6D', fontWeight:'700', marginBottom:10 }}>{selectedDetail.address}</ThemedText>}
                <View style={{height:1, backgroundColor:DynamicColors.border, marginVertical:20}} />
                <ThemedText style={{ color: DynamicColors.text, lineHeight: 26, fontSize: 15, opacity: 0.9, marginBottom: 20 }}>{selectedDetail?.description}</ThemedText>
                {isAdminMode && selectedDetail?.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => { rejectStore(selectedDetail.id); handleCloseDetailModal(); }} style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}><MaterialCommunityIcons name="close-circle" size={18} color="#FFF" /><ThemedText style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>{t.genericbtn.rejectbtn}</ThemedText></TouchableOpacity>
                        <TouchableOpacity onPress={() => { approveStore(selectedDetail, 1); handleCloseDetailModal(); }} style={{ flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}><MaterialCommunityIcons name="check-circle" size={18} color="#FFF" /><ThemedText style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>{t.genericbtn.aprovedbtn}</ThemedText></TouchableOpacity>
                    </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedStore} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setSelectedStore(null); setShowReviewInput(false); }} />
            <View style={{ width: width > 600 ? 500 : '92%', height: height * 0.78, backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', borderRadius: 32, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border }}>
              {!isAndroid && <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                <View style={{ flex: 1 }}><ThemedText style={{ fontSize: 22, fontWeight: '900', color: DynamicColors.text }}>{selectedStore?.name}</ThemedText><ThemedText style={{ color: DynamicColors.subtext, fontWeight: '800' }}>{t.genericlabel.labelexperien}</ThemedText></View>
                <TouchableOpacity onPress={() => { setSelectedStore(null); setShowReviewInput(false); }}><MaterialCommunityIcons name="close" size={28} color={DynamicColors.text} /></TouchableOpacity>
              </View>
              {!showReviewInput ? (
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => { const hasReviewed = selectedStore?.reviews?.some((r: any) => r.userId === currentUserId); if (hasReviewed) { return Alert.alert("Aviso", "Ya dejaste una reseña"); } setShowReviewInput(true); }} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                    <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{marginRight: 10}} /><ThemedText style={{ color: '#FFF', fontWeight: '800' }}>{t.genericlabel.labelshareexper}</ThemedText></LinearGradient>
                  </TouchableOpacity>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {/* 🚀 AQUI SE ACTUALIZO EL RENDERIZADO DE LAS REVIEWS PARA MOSTRAR FOTO Y NOMBRE */}
                    {selectedStore?.reviews?.map((r: any) => (
                       <View key={r.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 16, marginBottom: 12 }}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                           <View style={{ flexDirection: 'row', gap: 2 }}>
                             {[1, 2, 3, 4, 5].map((s) => (
                               <MaterialCommunityIcons key={s} name="star" size={14} color={s <= r.stars ? "#FFB300" : (isDark ? "rgba(255,255,255,0.2)" : "#DDD")} />
                             ))}
                           </View>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                             {r.image ? (
                               <Image source={{ uri: r.image }} style={{ width: 24, height: 24, borderRadius: 12 }} resizeMode="cover"/>
                             ) : (
                               <MaterialCommunityIcons name="account-circle" size={24} color={DynamicColors.subtext} />
                             )}
                             <ThemedText style={{ color: DynamicColors.text, fontSize: 12, fontStyle: 'italic' }}>{r.name || r.userName || 'Anónimo'}</ThemedText>
                           </View>
                         </View>
                         <ThemedText style={{ color: DynamicColors.text, fontSize: 14, marginTop: 4 }}>{r.comment}</ThemedText>
                       </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <ReviewForm isDark={isDark} t={t} onCancel={() => setShowReviewInput(false)} onPublish={async (ratingNum: number, commentStr: string) => { 
                        try {
                          const res = await fetch(`${API_STORES_URL}/reviews`, { 
                            method: 'POST', 
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${userToken}` 
                            }, 
                            body: JSON.stringify({ reference_id: selectedStore.id, stars: ratingNum, comment: commentStr, userId: userMetadata?.id || "baeb641a-3fa4-4fef-9846-d75947d1bca9" }) 
                          });
                          if (res.status === 401) { router.replace('/'); return; }
                          
                          if (!res.ok) throw new Error();
                          const fromDB = await res.json();
                          // 🚀 SE AGREGO LA IMAGEN Y NOMBRE DEL USUARIO LOGUEADO AL PUBLICAR
                          const newReviewFormatted = { 
                            id: fromDB.id || Date.now().toString(), 
                            stars: Number(ratingNum), 
                            comment: commentStr,
                            name: fromDB.name || userMetadata?.name || 'Anónimo',
                            image: fromDB.image || userMetadata?.avatarUrl || null 
                          };
                          const updatedReviews = [newReviewFormatted, ...(selectedStore.reviews || [])];
                          const newAverage = updatedReviews.length > 0 ? (updatedReviews.reduce((sum, r) => sum + r.stars, 0) / updatedReviews.length) : 0;
                          const updatedStoreObj = { ...selectedStore, reviews: updatedReviews, rating: newAverage, totalReviews: updatedReviews.length };
                          setSelectedStore(updatedStoreObj); setResults(prev => prev.map(s => s.id === selectedStore.id ? updatedStoreObj : s)); setAllStores(prev => prev.map(s => s.id === selectedStore.id ? updatedStoreObj : s));
                          Alert.alert(t.genericlabel.labelreviewthanks, t.genericlabel.labelreviewexp);
                        } catch (e) { Alert.alert("Error", t.genericlabel.labelerrorconection); } finally { setShowReviewInput(false); }
                    }} 
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>
          <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent', borderWidth: isAndroid ? 1 : 0, borderColor: DynamicColors.border }}>
            {!isAndroid && <BlurView intensity={isDark ? 100 : 75} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={stylesUnified.cardContent}>
              <View style={[stylesUnified.headerRow, { marginBottom: 15, alignItems: 'center', flexDirection: 'row', gap: 12 }]}>
                <TouchableOpacity onPress={() => router.push('/services')}><MaterialCommunityIcons name="arrow-left" size={26} color={DynamicColors.text} /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, height: 42 }}>
                  <TextInput style={[{ flex: 1, height: '100%', borderRadius: 14, paddingHorizontal: 15, fontSize: 14, color: DynamicColors.text, backgroundColor: DynamicColors.inputBg, borderColor: DynamicColors.border, borderWidth: 1, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) }]} placeholder={t.genericlabel.labelcodepostal} keyboardType="numeric" maxLength={5} value={zipCode} onChangeText={handleZipChange} onSubmitEditing={() => handleSearch()} placeholderTextColor={DynamicColors.subtext} />
                  <TouchableOpacity onPress={() => handleSearch()} disabled={!isZipValid} style={{ width: 42, height: 42, marginLeft: 8 }}><LinearGradient colors={isZipValid ? orangeGradient : disabledGradient} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>{loading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="magnify" size={20} color={isZipValid ? "#fff" : DynamicColors.iconInactive} />}</LinearGradient></TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <TouchableOpacity onPress={() => { setResults([]); setAllStores([]); setPendingStores([]); setZipCode(''); setShowMarkers(false); setIsFilteredByMap(false); setMapKey(k => k + 1); }}><MaterialCommunityIcons name="refresh" size={24} color={DynamicColors.text} style={{opacity: 0.7}} /></TouchableOpacity>
                  <TouchableOpacity onLongPress={() => { setIsAdminMode(isAdmin); }}><MaterialCommunityIcons name="heart-pulse" size={40} color={isAdminMode ? '#FF5F6D' : DynamicColors.text} style={{opacity: isAdminMode ? 1 : 0.2}} /></TouchableOpacity>
                </View>
              </View>

              {!isLargeWeb ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 130 }}>
                  {isAdminMode && pendingStores.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>{t.genericbtn.verify} ({pendingStores.length})</ThemedText>
                      {pendingStores.map(store => <PendingSupportItem key={store.id} store={store} />)}
                    </View>
                  )}
                  <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL('tel:988')} style={{ marginBottom: 15 }}>
                    <LinearGradient colors={['#FF416C', '#FF4B2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ position: 'relative', width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                        <Animated.View style={{ position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', transform: [{ scale: pulseRingAnim }], opacity: pulseOpacityAnim }} />
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}><Animated.View style={{ transform: [{ rotate: spin }] }}><MaterialCommunityIcons name="phone-alert" size={26} color="#FFF" /></Animated.View></View>
                      </View>
                      <View style={{ flex: 1 }}><ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>{t.supporttab.phone}</ThemedText><ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{t.supporttab.labelphone}</ThemedText></View>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {/* 🚀 CATEGORÍAS ADAPTATIVAS: FlexWrap para Web, Scroll para Móvil */}
                  <View style={{ marginBottom: 15 }}>
                    {isWeb ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {CATEGORIES_LIST.map((area, index) => {
                           const iconName = ICONS_ARRAY[index] || 'heart'; const isActive = selectedCategoryIdx === index;
                           return (
                            <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                              {isActive ? ( <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}><MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 5 }} /><ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{area}</ThemedText></LinearGradient> ) : ( <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}><MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} /><ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{area}</ThemedText></View> )}
                            </TouchableOpacity>
                           );
                        })}
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2, paddingHorizontal: 2, flexDirection: 'row', gap: 8 }}>
                        {CATEGORIES_LIST.map((area, index) => {
                           const iconName = ICONS_ARRAY[index] || 'heart'; const isActive = selectedCategoryIdx === index;
                           return (
                            <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ flexShrink: 0, borderRadius: 12, overflow: 'hidden', height: 36, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                              {isActive ? ( <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}><MaterialCommunityIcons name={iconName as any} size={14} color="#FFF" style={{ marginRight: 5 }} /><ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{area}</ThemedText></LinearGradient> ) : ( <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: DynamicColors.categoryUnselected }}><MaterialCommunityIcons name={iconName as any} size={14} color={DynamicColors.iconInactive} style={{ marginRight: 5 }} /><ThemedText style={{ color: DynamicColors.iconInactive, fontWeight: '600', fontSize: 12 }}>{area}</ThemedText></View> )}
                            </TouchableOpacity>
                           );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  <View style={{ height: 220, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border, position: 'relative' }}>
                    <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} onZoom={handleZoom} dataSource={showMarkers ? results : []} mapKey={mapKey} onMarkerPress={handleMarkerSelection} showsUserLocation={true} />
                    {isWeb && ( <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 15, right: 15, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: DynamicColors.border, zIndex: 99, elevation: 99 }}><MaterialCommunityIcons name="crosshairs-gps" size={22} color={DynamicColors.text} /></TouchableOpacity> )}
                  </View>
                  <View style={{ marginTop: 20 }}>
                    {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 10 }}>{results.length + ' ' + (t.genericbtn.results || "resultados")}</ThemedText>}
                    {isFilteredByMap && ( <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255, 95, 109, 0.12)' : 'rgba(255, 95, 109, 0.08)', paddingVertical: 12, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accenticon }}><MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accenticon} /><ThemedText style={{ color: DynamicColors.accenticon, fontWeight: '800', fontSize: 13 }}>{`  ${(t.genericbtn as any)?.viewallresults || 'Ver todos'}`}</ThemedText></TouchableOpacity> )}
                    {results.map((store) => <SupportCard key={store.id} store={store} />)}
                  </View>
                </ScrollView>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row' }}>
                  <View style={stylesUnified.webSidebar}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => Linking.openURL('tel:988')} style={{ marginBottom: 20 }}>
                      <LinearGradient colors={['#FF416C', '#FF4B2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                           <Animated.View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF', transform: [{ scale: pulseRingAnim }], opacity: pulseOpacityAnim }} />
                           <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}><Animated.View style={{ transform: [{ rotate: spin }] }}><MaterialCommunityIcons name="phone-alert" size={20} color="#FFF" /></Animated.View></View>
                        </View>
                        <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>{t.supporttab.phone || "SOS 988"}</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DynamicColors.text }]}>{t.genericlabel.labelcategorys}</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES_LIST.map((area, index) => {
                        const iconName = ICONS_ARRAY[index] || 'heart'; const isActive = selectedCategoryIdx === index;
                        return (
                          <TouchableOpacity key={index} onPress={() => handleCategorySelect(index)} style={{ marginRight: 0, borderRadius: 16, overflow: 'hidden', height: 48, marginBottom: 10, borderWidth: isActive ? 0 : 1, borderColor: DynamicColors.border }}>
                            {isActive ? ( <LinearGradient colors={orangeGradient} start={{x:0, y:0}} end={{x:1, y:0}} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}><MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" style={{ marginRight: 10 }} /><ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{area}</ThemedText></LinearGradient> ) : ( <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DynamicColors.inputBg }}><MaterialCommunityIcons name={iconName as any} size={18} color={DynamicColors.text} style={{ marginRight: 10 }} /><ThemedText style={{ color: DynamicColors.text, fontWeight: '600', fontSize: 14 }}>{area}</ThemedText></View> )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', marginLeft: 25 }}>
                    <View style={{ flex: 1 }}>
                      {isAdminMode && pendingStores.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                          <ThemedText style={{ color: '#FFB74D', fontWeight: 'bold', marginBottom: 15 }}>{t.genericbtn.verify} ({pendingStores.length})</ThemedText>
                          {pendingStores.map(store => <PendingSupportItem key={store.id} store={store} />)}
                        </View>
                      )}
                      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                        {results.length > 0 && <ThemedText style={{ fontSize: 13, color: DynamicColors.subtext, fontWeight: '700', marginBottom: 12 }}>{results.length + ' ' + (t.genericbtn.results || "resultados")} </ThemedText>}
                        {isFilteredByMap && ( <TouchableOpacity onPress={() => { setIsFilteredByMap(false); setShowMarkers(false); handleSearch(); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(79, 195, 247, 0.12)' : 'rgba(0,128,181,0.08)', paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: DynamicColors.accent }}><MaterialCommunityIcons name="filter-remove-outline" size={16} color={DynamicColors.accent} /><ThemedText style={{ color: DynamicColors.accent, fontWeight: '800', fontSize: 13 }}>{t.genericbtn.viewall || "Ver todos"}</ThemedText></TouchableOpacity> )}
                        {results.map((store) => <SupportCard key={store.id} store={store} />)}
                      </ScrollView>
                    </View>
                    <View style={{ flex: 1.4, marginLeft: 25, height: '100%', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: DynamicColors.border, position: 'relative' }}>
                      <MapComponent mapRef={mapRef} userLocation={userLocation} showMarkers={showMarkers} dataSource={showMarkers ? results : []} mapKey={mapKey} onMarkerPress={handleMarkerSelection} onZoom={handleZoom} showsUserLocation={true} />
                      {isWeb && ( <TouchableOpacity onPress={() => getCurrentLocation(true)} style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 30, borderWidth: 1, borderColor: DynamicColors.border, zIndex: 99, elevation: 99 }}><MaterialCommunityIcons name="crosshairs-gps" size={24} color={DynamicColors.text} /></TouchableOpacity> )}
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
          <MaterialCommunityIcons name="handshake" size={32} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}