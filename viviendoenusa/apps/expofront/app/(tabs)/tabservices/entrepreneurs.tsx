import React, { useState, useMemo } from 'react';
import {
  TouchableOpacity, View, ScrollView, Platform,
  StyleSheet, useWindowDimensions,
  TextInput, Linking, Alert, Share,
  Modal as RNModal, KeyboardAvoidingView, ActivityIndicator,
  ColorValue, Image,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useUnifiedCardStyles } from '@/hooks/useUnifiedCardStyles';
import { useMockSelector } from '@/redux/slices';
import { validarImagenEnServidor } from '@/utils/imageValidation'; 

import badWordsData from '../../../utils/babwords.json';

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────────
const BANNED_WORDS = Array.isArray((badWordsData as any).badWordsList)
  ? (badWordsData as any).badWordsList : [];
const validateComment = (text: string): boolean =>
  !BANNED_WORDS.some((w: string) => text.toLowerCase().includes(w.toLowerCase()));

// ─── TIPOS ────────────────────────────────────────────────────────────────────
type Review = {
  id: string;
  stars: number;
  comment: string;
  displayTime: string;
};

type Emprendimiento = {
  id: number;
  name: string;
  area: string;
  description: string;
  rating: number;
  phone: string;
  verified: boolean;
  promo: string | null;
  image: string;
  icon: string;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  saved: boolean;
  reviews: Review[];
  contactMethod: 'whatsapp' | 'phone'; // NUEVO TIPO
};

// ─── DATA SOURCE ──────────────────────────────────────────────────────────────
const CATEGORIES = ['Todas', 'Venta de garaje', 'Reparaciones', 'Comida', 'Salud', 'Tecnología'];

const CATEGORY_ICONS: Record<string, string> = {
  'Todas':             'apps',
  'Venta de garaje':   'sale',
  'Reparaciones':      'wrench-outline', 
  'Comida':            'silverware-fork-knife',
  'Salud':             'heart-pulse',
  'Tecnología':        'laptop',
};

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+1', flag: '🇺🇸', name: 'USA' }
];

const DATA_SOURCE: Emprendimiento[] = [
  {
    id: 1, name: 'Asesoría Legal Gómez', area: 'Servicios Legales',
    description: 'Expertos en trámites migratorios y civiles. Más de 10 años de experiencia ayudando a familias latinas a regularizar su situación migratoria, tramitar visas, permisos de trabajo y procesos de ciudadanía. Atención personalizada y precios accesibles.',
    rating: 5.0, phone: '+1909000000', verified: true,
    promo: '10% OFF en primera consulta',
    image: 'https://images.unsplash.com/photo-1589829545856-d44a2c354e3d?w=800',
    icon: 'briefcase-outline', likes: 12, dislikes: 1, userVote: null, saved: false,
    contactMethod: 'whatsapp',
    reviews: [
      { id: 'r1', stars: 5, comment: 'Excelente servicio, resolvieron mi caso muy rápido.', displayTime: '10:30 AM' },
      { id: 'r2', stars: 4, comment: 'Muy profesionales y atentos. Lo recomiendo.', displayTime: '09:15 AM' },
    ],
  },
  {
    id: 2, name: 'Tech Repair', area: 'Reparaciones',
    description: 'Reparación de equipos electrónicos y computación. Servicio a domicilio disponible en toda el área de Inland Empire. Reparamos laptops, celulares, tablets y consolas. Diagnóstico gratuito y garantía en todas las reparaciones.',
    rating: 4.8, phone: '+1909111111', verified: true, promo: null,
    image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800',
    icon: 'wrench-outline', likes: 8, dislikes: 0, userVote: null, saved: false, contactMethod: 'phone', reviews: [],
  },
  {
    id: 3, name: 'Comida Típica Mamá Rosa', area: 'Comida',
    description: 'Platillos caseros y auténticos de la cocina mexicana y latinoamericana. Pedidos a domicilio y catering para eventos especiales. Especialidad en tamales, pozole, birria y enchiladas. Ingredientes frescos todos los días.',
    rating: 4.9, phone: '+1909222222', verified: false,
    promo: 'Envío gratis en tu primer pedido',
    image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800',
    icon: 'silverware-fork-knife', likes: 24, dislikes: 2, userVote: null, saved: false, contactMethod: 'whatsapp',
    reviews: [
      { id: 'r3', stars: 5, comment: '¡La mejor birria que he probado fuera de México!', displayTime: '12:00 PM' },
    ],
  },
  {
    id: 4, name: 'Clínica Salud Latina', area: 'Salud',
    description: 'Consultas médicas generales, vacunas y chequeos preventivos. Atención completamente en español. Contamos con médicos bilingües, nutricionistas y servicio de laboratorio. Aceptamos Medi-Cal y planes de pago accesibles.',
    rating: 4.7, phone: '+1909333333', verified: true, promo: null,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    icon: 'heart-pulse', likes: 17, dislikes: 1, userVote: null, saved: false, contactMethod: 'phone', reviews: [],
  },
  {
    id: 5, name: 'WebSol Digital', area: 'Tecnología',
    description: 'Desarrollo de páginas web profesionales, tiendas online y marketing digital para tu negocio. Ayudamos a pequeñas empresas latinas a crecer en internet con presupuestos accesibles. Incluye dominio, hosting y soporte técnico.',
    rating: 4.6, phone: '+1909444444', verified: true,
    promo: '1 mes gratis de mantenimiento',
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    icon: 'laptop', likes: 6, dislikes: 0, userVote: null, saved: false, contactMethod: 'whatsapp', reviews: [],
  },
];

// ─── ReviewForm ───────────────────────────────────────────────────────────────
const ReviewForm = ({
  onPublish, onCancel, isDark,
}: {
  onPublish: (rating: number, comment: string) => void;
  onCancel: () => void;
  isDark: boolean;
}) => {
  const [rating,  setRating]  = useState(5);
  const [comment, setComment] = useState('');

  const handlePrePublish = () => {
    if (!validateComment(comment)) {
      const msg = 'Tu reseña contiene contenido inapropiado.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Contenido no permitido', msg);
      return;
    }
    onPublish(rating, comment);
  };

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <TouchableOpacity onPress={onCancel}
        style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#FF5F6D" />
        <ThemedText style={{ color: '#FF5F6D', fontWeight: '600' }}>Volver</ThemedText>
      </TouchableOpacity>
      <ThemedText style={{ fontSize: 20, fontWeight: '800', marginBottom: 20,
        color: isDark ? '#FFF' : '#1A1A1A' }}>
        Tu experiencia
      </ThemedText>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <TouchableOpacity key={s} onPress={() => setRating(s)}>
            <MaterialCommunityIcons
              name={s <= rating ? 'star' : 'star-outline'} size={40}
              color={s <= rating ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderRadius: 20, padding: 15, height: 150,
        borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
        <TextInput value={comment} onChangeText={setComment}
          placeholder="Escribe tu opinión..."
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
          multiline
          style={{ color: isDark ? '#FFF' : '#1A1A1A', flex: 1, textAlignVertical: 'top', fontSize: 15 }} />
      </View>
      <TouchableOpacity onPress={handlePrePublish} disabled={!comment.trim()}
        style={{ marginTop: 20, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient
          colors={comment.trim() ? ['#FF5F6D', '#FFC371'] : ['#555', '#777']}
          style={{ padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="send" size={18} color="#FFF" />
          <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Publicar reseña</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ─── COMPONENT PRINCIPAL ──────────────────────────────────────────────────────
export default function EntrepreneurshipScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const stylesUnified = useUnifiedCardStyles();
  const router = useRouter();
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);

  const isWeb      = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000;
  const isAndroid  = Platform.OS === 'android';
  const isIOS      = Platform.OS === 'ios';

  const DC = {
    text:               isDark ? '#FFFFFF'                  : '#1A1A1A',
    subtext:            isDark ? '#B0BEC5'                  : '#546E7A',
    accent:             isDark ? '#FF5F6D'                  : '#FF5F6D',
    border:             isDark ? 'rgba(255,255,255,0.22)'   : 'rgba(0,0,0,0.1)',
    inputBg:            isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    iconInactive:       isDark ? '#B0BEC5'                  : '#666666',
    categoryUnselected: isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    cardBg:             isDark ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.03)',
    divider:            isDark ? 'rgba(255,255,255,0.08)'   : 'rgba(0,0,0,0.07)',
    sectionBg:          isDark ? 'rgba(255,255,255,0.04)'   : 'rgba(0,0,0,0.02)',
  };

  const OG: readonly [ColorValue, ColorValue, ...ColorValue[]] = ['#FF5F6D', '#FFC371'];
  const DG: readonly [ColorValue, ColorValue, ...ColorValue[]] = isDark ? ['#333', '#444'] : ['#ddd', '#ccc'];

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedArea,    setSelectedArea]    = useState('Todas');
  const [searchText,      setSearchText]      = useState('');
  const [localData,       setLocalData]       = useState<Emprendimiento[]>(DATA_SOURCE);
  const [isFormVisible,   setFormVisible]     = useState(false);
  const [detailItem,      setDetailItem]      = useState<Emprendimiento | null>(null);
  const [reviewTarget,    setReviewTarget]    = useState<Emprendimiento | null>(null);
  const [showReviewInput, setShowReviewInput] = useState(false);

  // Formulario nuevo emprendimiento
  const [formName,     setFormName]     = useState('');
  const [formDesc,     setFormDesc]     = useState('');
  const [formPhone,    setFormPhone]    = useState('');
  const [formContactMethod, setFormContactMethod] = useState<'whatsapp' | 'phone'>('whatsapp');
  const [countryIdx,   setCountryIdx]   = useState(0); 
  const [formArea,     setFormArea]     = useState(CATEGORIES[1]);
  const [formPromo,    setFormPromo]    = useState('');
  const [formImage,    setFormImage]    = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerAlert = (title: string, msg: string) =>
    isWeb ? window.alert(`${title}\n${msg}`) : Alert.alert(title, msg);

  // ─── Image picker ─────────────────────────────────────────────────────────
  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { triggerAlert('Permisos', 'Necesitamos acceso a tu galería.'); return; }
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!r.canceled) setFormImage(r.assets[0].uri);
  };

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const handleFilterPress = (area: string) =>
    setSelectedArea(selectedArea === area && area !== 'Todas' ? 'Todas' : area);

  const results = useMemo(() => {
    let list = selectedArea === 'Todas' ? localData : localData.filter(l => l.area === selectedArea);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(l => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    return list;
  }, [localData, selectedArea, searchText]);

  // ─── Votos ────────────────────────────────────────────────────────────────
  const applyVote = (item: Emprendimiento, type: 'like' | 'dislike'): Emprendimiento => {
    const isSel = item.userVote === type;
    return {
      ...item,
      likes:    type === 'like'    ? (isSel ? item.likes - 1 : item.likes + 1)       : (item.userVote === 'like'    ? item.likes - 1    : item.likes),
      dislikes: type === 'dislike' ? (isSel ? item.dislikes - 1 : item.dislikes + 1) : (item.userVote === 'dislike' ? item.dislikes - 1 : item.dislikes),
      userVote: isSel ? null : type,
    };
  };

  const handleVote = (id: number, type: 'like' | 'dislike') => {
    setLocalData(prev => prev.map(it => it.id === id ? applyVote(it, type) : it));
    setDetailItem(prev => prev?.id === id ? applyVote(prev, type) : prev);
  };

  const applySave = (item: Emprendimiento): Emprendimiento => ({ ...item, saved: !item.saved });
  const handleSave = (id: number) => {
    setLocalData(prev => prev.map(it => it.id === id ? applySave(it) : it));
    setDetailItem(prev => prev?.id === id ? applySave(prev) : prev);
  };

  const handleShare = (item: Emprendimiento) =>
    Share.share({ message: `${item.name}\n${item.description}\nTel: ${item.phone}` });

  // ─── Reseñas ──────────────────────────────────────────────────────────────
  const handleAddReview = (targetId: number, stars: number, comment: string) => {
    const newReview: Review = {
      id: Date.now().toString(), stars, comment,
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setLocalData(prev => prev.map(it =>
      it.id === targetId ? { ...it, reviews: [newReview, ...it.reviews] } : it
    ));
    setReviewTarget(prev =>
      prev?.id === targetId ? { ...prev, reviews: [newReview, ...prev.reviews] } : prev
    );
    setShowReviewInput(false);
  };

  const openReviews = (item: Emprendimiento) => {
    setReviewTarget(item);
    setShowReviewInput(false);
  };

  // ─── Publicar emprendimiento ──────────────────────────────────────────────
  const handlePublish = async () => {
    if (!formName.trim() || !formDesc.trim() || !formPhone.trim() || !formImage) {
      triggerAlert('Campos incompletos', 'Completa nombre, descripción, teléfono e imagen.'); return;
    }
    setIsSubmitting(true);
    try {
      if (formImage) {
        const esSegura = await validarImagenEnServidor(formImage);
        if (!esSegura) {
          setIsSubmitting(false);
          triggerAlert("Imagen bloqueada", "La imagen no cumple nuestras normas.");
          return;
        }
      }

      setLocalData(prev => [{
        id: Date.now(), name: formName.trim(), area: formArea,
        description: formDesc.trim(), rating: 0, phone: `${COUNTRIES[countryIdx].code}${formPhone.trim()}`,
        verified: false, promo: formPromo.trim() || null, image: formImage,
        icon: CATEGORY_ICONS[formArea] || 'store-outline',
        likes: 0, dislikes: 0, userVote: null, saved: false, reviews: [],
        contactMethod: formContactMethod,
      }, ...prev]);
      
      setFormName(''); setFormDesc(''); setFormPhone('');
      setFormPromo(''); setFormImage(null); setFormArea(CATEGORIES[1]); setCountryIdx(0); setFormContactMethod('whatsapp');
      setIsSubmitting(false); setFormVisible(false);
      triggerAlert('¡Éxito!', 'Tu emprendimiento fue publicado.');

    } catch (err) {
      triggerAlert("Error", "Error conectando con el servidor. Revisa tu conexión.");
      setIsSubmitting(false);
    }
  };

  // ─── Dimensiones ──────────────────────────────────────────────────────────
  const cardWidth      = isLargeWeb ? '96%' : (width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85));
  const cardHeight     = isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : (loggedIn ? height * 0.69 : height * 0.65));
  const verticalOffset = isWeb ? -90 : (isIOS ? -85 : -100);

  // ─── Botón Individual Autoajustable (Reutilizable) ───────────────────────
  const ActionBtn = ({ icon, text, color, bgColor, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={{ flexGrow: 1, flexBasis: 100, height: 42, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: bgColor, marginBottom: 8, marginRight: 8 }}>
       <MaterialCommunityIcons name={icon} size={16} color={color} />
       <ThemedText style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: color }}>{text}</ThemedText>
    </TouchableOpacity>
  );

  // ─── Pill de filtro (Mobile) ──────────────────────────────────────────────
  const FilterPill = ({ label, iconName, isActive, onPress }: {
    label: string; iconName: string; isActive: boolean; onPress: () => void;
  }) => (
    <TouchableOpacity onPress={onPress}
      style={{ borderRadius: 14, overflow: 'hidden', height: 42,
        borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
      {isActive ? (
        <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          <MaterialCommunityIcons name={iconName as any} size={15} color="#FFF" style={{ marginRight: 6 }} />
          <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{label}</ThemedText>
        </LinearGradient>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, backgroundColor: DC.categoryUnselected }}>
          <MaterialCommunityIcons name={iconName as any} size={15} color={DC.iconInactive} style={{ marginRight: 6 }} />
          <ThemedText style={{ color: DC.iconInactive, fontWeight: '600', fontSize: 13 }}>{label}</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );

  // ─── Tarjeta de emprendimiento ────────────────────────────────────────────
  const EmprendimientoCard = ({ item }: { item: Emprendimiento }) => (
    <TouchableOpacity activeOpacity={0.93}
      onPress={() => setDetailItem(item)}
      style={[S.card, { backgroundColor: DC.cardBg, borderColor: DC.border }]}>

      {item.image && <Image source={{ uri: item.image }} style={S.cardImage} resizeMode="cover" />}
      <View style={S.verMasBadge}>
        <MaterialCommunityIcons name="arrow-expand" size={11} color="#FFF" style={{ marginRight: 4 }} />
        <ThemedText style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>Ver detalle</ThemedText>
      </View>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <LinearGradient colors={OG} style={S.cardIconWrap}>
            <MaterialCommunityIcons name={item.icon as any} size={18} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <ThemedText style={{ fontWeight: '900', fontSize: 15, color: DC.text, flexShrink: 1 }}>
                {item.name}
              </ThemedText>
              {item.verified && <MaterialCommunityIcons name="check-decagram" size={15} color="#4FC3F7" />}
            </View>
            <ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '600' }}>{item.area}</ThemedText>
          </View>
          {item.rating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3,
              backgroundColor: 'rgba(255,195,113,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
              <MaterialCommunityIcons name="star" size={12} color="#FFC371" />
              <ThemedText style={{ color: DC.text, fontWeight: '800', fontSize: 12 }}>
                {item.rating.toFixed(1)}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText numberOfLines={2}
          style={{ color: DC.subtext, marginBottom: 10, fontSize: 13, lineHeight: 18 }}>
          {item.description}
        </ThemedText>

        {item.promo && (
          <View style={[S.promoBadge, { marginBottom: 12 }]}>
            <MaterialCommunityIcons name="tag-outline" size={11} color="#FFF" style={{ marginRight: 4 }} />
            <ThemedText style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{item.promo}</ThemedText>
          </View>
        )}

        {/* ── BOTONES ENVOLVENTES (No se cortan en web ni móvil) ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: DC.divider }}>
           <ActionBtn onPress={(e: any) => { e.stopPropagation?.(); openReviews(item); }} icon="comment-text-outline" text={`Reseñas (${item.reviews.length})`} color={isDark ? '#FFF' : '#444'} bgColor={isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'} />
           
           {/* Botón de contacto DINÁMICO */}
           <ActionBtn 
             onPress={() => {
               if(item.contactMethod === 'whatsapp') { Linking.openURL(`https://wa.me/${item.phone.replace(/\D/g, '')}`); } 
               else { Linking.openURL(`tel:${item.phone}`); }
             }} 
             icon={item.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} 
             text={item.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"} 
             color={item.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} 
             bgColor={item.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)')} 
           />

           <ActionBtn onPress={() => handleVote(item.id, 'like')} icon="thumb-up" text={item.likes} color={item.userVote === 'like' ? '#fff' : '#1976D2'} bgColor={item.userVote === 'like' ? '#1976D2' : 'rgba(25,118,210,0.1)'} />
           <ActionBtn onPress={() => handleVote(item.id, 'dislike')} icon="thumb-down" text={item.dislikes} color={item.userVote === 'dislike' ? '#fff' : '#FA8072'} bgColor={item.userVote === 'dislike' ? '#FA8072' : 'rgba(250,128,114,0.1)'} />
           <ActionBtn onPress={() => handleSave(item.id)} icon={item.saved ? 'bookmark' : 'bookmark-outline'} text={item.saved ? 'Guardado' : 'Guardar'} color={item.saved ? (isDark ? '#111' : '#FFF') : DC.iconInactive} bgColor={item.saved ? (isDark ? '#FFF' : '#111') : 'rgba(128,128,128,0.1)'} />
           <ActionBtn onPress={() => handleShare(item)} icon="share-variant" text="Compartir" color={isDark ? '#4FC3F7' : '#1976D2'} bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} />
        </View>
      </View>
    </TouchableOpacity>
  );

  // ─── Buscador ──────────────────────────────────────────────
  const SearchBar = () => (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: DC.inputBg, borderRadius: 16, paddingHorizontal: 14, height: 48,
      borderWidth: 1, borderColor: DC.border, marginBottom: 15,
    }}>
      <MaterialCommunityIcons name="magnify" size={22} color={DC.iconInactive} style={{ marginRight: 10 }} />
      <TextInput value={searchText} onChangeText={setSearchText}
        placeholder="Buscar emprendimientos..."
        placeholderTextColor={DC.iconInactive}
        style={{ flex: 1, color: DC.text, fontSize: 15, fontWeight: '600', height: '100%' }} />
      {searchText.length > 0 && (
        <TouchableOpacity onPress={() => setSearchText('')} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="close-circle" size={20} color={DC.iconInactive} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={stylesUnified.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled">
        <View style={[stylesUnified.centerContainer, { marginTop: verticalOffset }]}>

          <View style={{
            width: cardWidth, height: cardHeight, overflow: 'hidden', borderRadius: 28,
            backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent',
            borderWidth: isAndroid ? 1 : 0, borderColor: DC.border,
          }}>
            {!isAndroid && (
              <BlurView intensity={isDark ? 100 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            )}

            <View style={stylesUnified.cardContent}>

              <View style={stylesUnified.headerRow}>
                <TouchableOpacity onPress={() => router.push('/services')}>
                  <MaterialCommunityIcons name="arrow-left" size={26} color={DC.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <MaterialCommunityIcons name="lightbulb-multiple-outline" size={40} color={DC.text} style={{ opacity: 0.2 }} />
              </View>

              <View style={{ flex: 1, flexDirection: isLargeWeb ? 'row' : 'column' }}>

                {/* ── SIDEBAR IZQUIERDO (solo isLargeWeb) ── */}
                {isLargeWeb && (
                  <View style={stylesUnified.webSidebar}>
                    <ThemedText style={[stylesUnified.sideMenuTitle, { color: DC.text }]}>Categorías</ThemedText>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map((area) => {
                        const isActive = selectedArea === area;
                        return (
                          <TouchableOpacity
                            key={area}
                            onPress={() => handleFilterPress(area)}
                            style={{
                              marginBottom: 8, borderRadius: 16, overflow: 'hidden', height: 48,
                              borderWidth: isActive ? 0 : 1, borderColor: DC.border,
                            }}>
                            {isActive ? (
                              <LinearGradient
                                colors={OG}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                                <MaterialCommunityIcons name={CATEGORY_ICONS[area] as any} size={18} color="#FFF" style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{area}</ThemedText>
                              </LinearGradient>
                            ) : (
                              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: DC.inputBg }}>
                                <MaterialCommunityIcons name={CATEGORY_ICONS[area] as any} size={18} color={DC.text} style={{ marginRight: 12 }} />
                                <ThemedText style={{ color: DC.text, fontWeight: '600', fontSize: 14 }}>{area}</ThemedText>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* ── CONTENIDO PRINCIPAL ── */}
                <View style={{ flex: 1, paddingLeft: isLargeWeb ? 25 : 0 }}>

                  <SearchBar />

                  {!isLargeWeb && (
                    <View style={{ marginBottom: 12 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        {CATEGORIES.map(area => (
                          <FilterPill key={area} label={area} iconName={CATEGORY_ICONS[area]}
                            isActive={selectedArea === area} onPress={() => handleFilterPress(area)} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '700', marginBottom: 10 }}>
                    {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                  </ThemedText>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
                    {results.length === 0 && (
                      <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                        <MaterialCommunityIcons name="store-off-outline" size={56} color={DC.subtext} />
                        <ThemedText style={{ color: DC.subtext, marginTop: 14, fontWeight: '700', fontSize: 14 }}>
                          No hay resultados
                        </ThemedText>
                      </View>
                    )}
                    {results.map(item => <EmprendimientoCard key={item.id} item={item} />)}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB - BOTÓN FLOTANTE UNIVERSAL */}
      <TouchableOpacity onPress={() => setFormVisible(true)}
        style={[S.fab, { bottom: isIOS ? insets.bottom + 75 : 85, zIndex: 99, elevation: 99 }]}>
        <LinearGradient colors={OG}
          style={{ flex: 1, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="lightbulb-multiple-outline" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ══════════════════════════════════════════════════════════
          MODAL DETALLE
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={!!detailItem} transparent animationType="slide"
        statusBarTranslucent onRequestClose={() => setDetailItem(null)}>
        {detailItem && (
          <View style={{ flex: 1 }}>
            <BlurView style={StyleSheet.absoluteFill} intensity={90} tint={isDark ? 'dark' : 'light'} />

            <View style={{ position: 'relative' }}>
              <Image source={{ uri: detailItem.image }} style={S.detailHeroImage} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
              <TouchableOpacity onPress={() => setDetailItem(null)}
                style={[S.detailCloseBtn, { top: insets.top + 12 }]}>
                <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
              </TouchableOpacity>
              {detailItem.rating > 0 && (
                <View style={S.detailRatingBadge}>
                  <MaterialCommunityIcons name="star" size={14} color="#FFC371" />
                  <ThemedText style={{ color: '#FFF', fontWeight: '900', fontSize: 14, marginLeft: 4 }}>
                    {detailItem.rating.toFixed(1)}
                  </ThemedText>
                </View>
              )}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={isIOS ? 'padding' : 'height'}>
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 40 }}>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                  <LinearGradient colors={OG}
                    style={[S.cardIconWrap, { width: 48, height: 48, borderRadius: 15, marginRight: 14 }]}>
                    <MaterialCommunityIcons name={detailItem.icon as any} size={24} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <ThemedText style={{ fontWeight: '900', fontSize: 20, color: DC.text }}>{detailItem.name}</ThemedText>
                      {detailItem.verified && <MaterialCommunityIcons name="check-decagram" size={20} color="#4FC3F7" />}
                    </View>
                    <ThemedText style={{ color: DC.subtext, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                      {detailItem.area}
                    </ThemedText>
                  </View>
                </View>

                {detailItem.promo && (
                  <View style={[S.promoBadge, { marginBottom: 16 }]}>
                    <MaterialCommunityIcons name="tag-outline" size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <ThemedText style={{ color: '#FFF', fontSize: 13, fontWeight: '800' }}>{detailItem.promo}</ThemedText>
                  </View>
                )}

                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <MaterialCommunityIcons name="text-box-outline" size={17} color={DC.accent} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>Sobre el negocio</ThemedText>
                  </View>
                  <ThemedText style={{ color: DC.subtext, fontSize: 14, lineHeight: 22 }}>
                    {detailItem.description}
                  </ThemedText>
                </View>

                {/* Botón único de contacto en Detalle (Dinámico) */}
                <View style={[S.contactRow, { marginBottom: 16, flexWrap: 'wrap' }]}>
                  <TouchableOpacity
                    onPress={() => {
                      if(detailItem.contactMethod === 'whatsapp') {
                         Linking.openURL(`https://wa.me/${detailItem.phone.replace(/\D/g, '')}`);
                      } else {
                         Linking.openURL(`tel:${detailItem.phone}`);
                      }
                    }}
                    style={[S.contactBtn, { 
                      backgroundColor: detailItem.contactMethod === 'whatsapp' ? (isDark ? 'rgba(37,211,102,0.15)' : 'rgba(46,110,69,0.12)') : (isDark ? 'rgba(255,95,109,0.15)' : 'rgba(125,31,20,0.1)'), 
                      flexGrow: 1, minWidth: 130 
                    }]}>
                    <MaterialCommunityIcons name={detailItem.contactMethod === 'whatsapp' ? "whatsapp" : "phone"} size={18} color={detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D"} />
                    <ThemedText style={[S.contactBtnText, { color: detailItem.contactMethod === 'whatsapp' ? "#25D366" : "#FF5F6D", fontSize: 14 }]}>
                      {detailItem.contactMethod === 'whatsapp' ? "WhatsApp" : "Llamar"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg, marginBottom: 20 }]}>
                  <ThemedText style={{ fontWeight: '800', fontSize: 13, color: DC.subtext, marginBottom: 12 }}>
                    ¿Te fue útil este negocio?
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <ActionBtn onPress={() => handleVote(detailItem.id, 'like')} icon="thumb-up" text={`Me gusta ${detailItem.likes}`} color={detailItem.userVote === 'like' ? '#fff' : '#1976D2'} bgColor={detailItem.userVote === 'like' ? '#1976D2' : 'rgba(25,118,210,0.1)'} />
                    <ActionBtn onPress={() => handleVote(detailItem.id, 'dislike')} icon="thumb-down" text={`No me gusta ${detailItem.dislikes}`} color={detailItem.userVote === 'dislike' ? '#fff' : '#FA8072'} bgColor={detailItem.userVote === 'dislike' ? '#FA8072' : 'rgba(250,128,114,0.1)'} />
                    <ActionBtn onPress={() => handleSave(detailItem.id)} icon={detailItem.saved ? 'bookmark' : 'bookmark-outline'} text={detailItem.saved ? 'Guardado' : 'Guardar'} color={detailItem.saved ? (isDark ? '#111' : '#FFF') : DC.iconInactive} bgColor={detailItem.saved ? (isDark ? '#FFF' : '#111') : 'rgba(128,128,128,0.1)'} />
                    <ActionBtn onPress={() => handleShare(detailItem)} icon="share-variant" text="Compartir" color={isDark ? '#4FC3F7' : '#1976D2'} bgColor={isDark ? 'rgba(79, 195, 247, 0.15)' : '#E3F2FD'} />
                  </View>
                </View>

                <View style={[S.detailSection, { borderColor: DC.border, backgroundColor: DC.sectionBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="comment-text-multiple-outline" size={17} color={DC.accent} style={{ marginRight: 8 }} />
                      <ThemedText style={{ fontWeight: '800', fontSize: 14, color: DC.text }}>Reseñas</ThemedText>
                      {detailItem.reviews.length > 0 && (
                        <View style={[S.reviewCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)' }]}>
                          <ThemedText style={{ color: DC.subtext, fontSize: 11, fontWeight: '800' }}>
                            {detailItem.reviews.length}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => openReviews(detailItem)}
                      style={{ borderRadius: 12, overflow: 'hidden' }}>
                      <LinearGradient colors={OG}
                        style={{ paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="pencil-outline" size={14} color="#FFF" />
                        <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Escribir</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {detailItem.reviews.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20, opacity: 0.5 }}>
                      <MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.subtext} />
                      <ThemedText style={{ color: DC.subtext, marginTop: 10, fontWeight: '600', fontSize: 13 }}>
                        Aún no hay reseñas. ¡Sé el primero!
                      </ThemedText>
                    </View>
                  ) : (
                    detailItem.reviews.map(r => (
                      <View key={r.id}
                        style={[S.reviewCard, { backgroundColor: DC.inputBg, borderColor: DC.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 3 }}>
                            {[1, 2, 3, 4, 5].map(s => (
                              <MaterialCommunityIcons key={s} name="star" size={14}
                                color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} />
                            ))}
                          </View>
                          <ThemedText style={{ color: DC.subtext, fontSize: 11 }}>{r.displayTime}</ThemedText>
                        </View>
                        <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>{r.comment}</ThemedText>
                      </View>
                    ))
                  )}
                </View>

              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        )}
      </RNModal>

      {/* ══════════════════════════════════════════════════════════
          MODAL RESEÑAS
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={!!reviewTarget} transparent animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { setReviewTarget(null); setShowReviewInput(false); }}>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1}
              onPress={() => { setReviewTarget(null); setShowReviewInput(false); }} />

            <View style={[S.reviewModalBox, {
              backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent',
              borderColor: DC.border,
            }]}>
              {!isAndroid && (
                <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}

              <View style={{ padding: 25, flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 20, fontWeight: '900', color: DC.text }}>
                      {reviewTarget?.name}
                    </ThemedText>
                    <ThemedText style={{ color: DC.subtext, fontWeight: '700' }}>
                      Opiniones de la comunidad
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={() => { setReviewTarget(null); setShowReviewInput(false); }}>
                    <MaterialCommunityIcons name="close" size={28} color={DC.text} />
                  </TouchableOpacity>
                </View>

                {!showReviewInput ? (
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity onPress={() => setShowReviewInput(true)}
                      style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                      <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="pencil-outline" size={20} color="#FFF" style={{ marginRight: 10 }} />
                        <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Escribir reseña</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      {(reviewTarget?.reviews ?? []).length > 0
                        ? (reviewTarget?.reviews ?? []).map(r => (
                            <View key={r.id}
                              style={[S.reviewCard, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                                borderColor: DC.border,
                              }]}>
                              <View style={{ flexDirection: 'row', gap: 3, marginBottom: 8 }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <MaterialCommunityIcons key={s} name="star" size={15}
                                    color={s <= r.stars ? '#FFB300' : (isDark ? 'rgba(255,255,255,0.2)' : '#DDD')} />
                                ))}
                                <ThemedText style={{ color: DC.subtext, fontSize: 11, marginLeft: 6, alignSelf: 'center' }}>
                                  {r.displayTime}
                                </ThemedText>
                              </View>
                              <ThemedText style={{ color: DC.text, fontSize: 14, lineHeight: 20 }}>
                                {r.comment}
                              </ThemedText>
                            </View>
                          ))
                        : (
                          <View style={{ alignItems: 'center', marginTop: 30, opacity: 0.5 }}>
                            <MaterialCommunityIcons name="comment-off-outline" size={40} color={DC.subtext} />
                            <ThemedText style={{ color: DC.subtext, marginTop: 10 }}>
                              Aún no hay reseñas. ¡Sé el primero!
                            </ThemedText>
                          </View>
                        )
                      }
                    </ScrollView>
                  </View>
                ) : (
                  <ReviewForm
                    isDark={isDark}
                    onCancel={() => setShowReviewInput(false)}
                    onPublish={(stars, comment) => handleAddReview(reviewTarget!.id, stars, comment)}
                  />
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      {/* ══════════════════════════════════════════════════════════
          MODAL FORMULARIO — Publicar nuevo emprendimiento
      ══════════════════════════════════════════════════════════ */}
      <RNModal visible={isFormVisible} transparent animationType="slide"
        statusBarTranslucent onRequestClose={() => setFormVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: isLargeWeb ? 'center' : 'stretch' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !isSubmitting && setFormVisible(false)} />
          <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ width: isLargeWeb ? 550 : '100%' }}>
            
            <View style={[S.modalBlur, { backgroundColor: isAndroid ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', height: isLargeWeb ? 'auto' : height * 0.88, maxHeight: height * 0.9, borderColor: DC.border, borderWidth: 1, borderRadius: isLargeWeb ? 40 : undefined, borderTopLeftRadius: 40, borderTopRightRadius: 40 }]}>
              {!isAndroid && <BlurView intensity={130} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
              {!isLargeWeb && <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginVertical: 15, borderRadius: 2 }} />}
              
              <View style={[S.modalHeader, { paddingHorizontal: 25, marginTop: isLargeWeb ? 25 : 0 }]}>
                <TouchableOpacity onPress={() => setFormVisible(false)} disabled={isSubmitting}>
                  <MaterialCommunityIcons name="close" size={24} color={DC.text} />
                </TouchableOpacity>
                <ThemedText style={[S.modalTitle, { color: DC.text }]}>Nuevo Emprendimiento</ThemedText>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 60 }}>

                <TouchableOpacity onPress={pickImage} style={[S.imagePicker, { borderColor: DC.border, backgroundColor: DC.inputBg }]}>
                  {formImage
                    ? <Image source={{ uri: formImage }} style={S.formImagePreview} />
                    : <View style={{ alignItems: 'center' }}>
                        <MaterialCommunityIcons name="camera-plus" size={32} style={{color: DC.iconInactive}} />
                        <ThemedText style={{  marginTop: 1, fontWeight: '800', fontSize: 11 ,textTransform:'capitalize' }}>FOTO DEL NEGOCIO</ThemedText>
                      </View>
                  }
                </TouchableOpacity>

                <ThemedText style={[S.label, { color: DC.accent }]}>CATEGORÍA</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                  {CATEGORIES.filter(c => c !== 'Todas').map(cat => {
                    const isActive = formArea === cat;
                    return (
                      <TouchableOpacity key={cat} onPress={() => setFormArea(cat)}
                        style={{ borderRadius: 12, overflow: 'hidden', height: 36,
                          borderWidth: isActive ? 0 : 1, borderColor: DC.border }}>
                        {isActive ? (
                          <LinearGradient colors={OG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
                            <MaterialCommunityIcons name={CATEGORY_ICONS[cat] as any} size={13} color="#FFF" style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '900' ,textTransform:'capitalize'}}>{cat}</ThemedText>
                          </LinearGradient>
                        ) : (
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 14, backgroundColor: DC.categoryUnselected }}>
                            <MaterialCommunityIcons name={CATEGORY_ICONS[cat] as any} size={13} color={DC.iconInactive} style={{ marginRight: 5 }} />
                            <ThemedText style={{ color: DC.iconInactive, fontSize: 12, fontWeight: '700'  ,textTransform:'capitalize'}}>{cat}</ThemedText>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TextInput value={formName} onChangeText={setFormName}
                  placeholder="Nombre del negocio"
                  placeholderTextColor={DC.subtext}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border }]} />

                <TextInput value={formDesc} onChangeText={setFormDesc}
                  placeholder="Descripción de tus servicios..."
                  placeholderTextColor={DC.subtext}
                  multiline numberOfLines={3}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg, borderColor: DC.border,
                    minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]} />

                <ThemedText style={[S.label, { color: DC.text }]}>Método de contacto principal</ThemedText>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                  <TouchableOpacity onPress={() => setFormContactMethod('whatsapp')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'whatsapp' ? '#25D366' : DC.border, backgroundColor: formContactMethod === 'whatsapp' ? 'rgba(37,211,102,0.1)' : DC.inputBg }}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color={formContactMethod === 'whatsapp' ? '#25D366' : DC.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'whatsapp' ? '#25D366' : DC.subtext }}>WhatsApp</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setFormContactMethod('phone')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: formContactMethod === 'phone' ? '#FF5F6D' : DC.border, backgroundColor: formContactMethod === 'phone' ? 'rgba(255,95,109,0.1)' : DC.inputBg }}>
                    <MaterialCommunityIcons name="phone" size={20} color={formContactMethod === 'phone' ? '#FF5F6D' : DC.subtext} style={{ marginRight: 8 }} />
                    <ThemedText style={{ fontSize: 12, fontWeight: '800', color: formContactMethod === 'phone' ? '#FF5F6D' : DC.subtext }}>Llamada</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: DC.inputBg, borderRadius: 15, borderWidth: 1, borderColor: DC.border, marginBottom: 14, overflow: 'hidden' }}>
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => setCountryIdx(prev => (prev === 0 ? 1 : 0))}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: DC.border, height: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
                  >
                    <ThemedText style={{ fontSize: 18, marginRight: 5 }}>{COUNTRIES[countryIdx].flag}</ThemedText>
                    <ThemedText style={{ fontWeight: '800', color: DC.text, marginRight: 4 }}>{COUNTRIES[countryIdx].code}</ThemedText>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={DC.subtext} />
                  </TouchableOpacity>
                  <TextInput value={formPhone} onChangeText={setFormPhone}
                    placeholder="(909) 000-0000"
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                    keyboardType="phone-pad"
                    style={{ flex: 1, color: DC.text, padding: 15, fontSize: 14, fontWeight: '600' }} />
                </View>

                <ThemedText style={[S.label, { color: DC.text }]}>Promoción (opcional)</ThemedText>
                <TextInput value={formPromo} onChangeText={setFormPromo}
                  placeholder="Ej: 10% OFF en primera consulta"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                  style={[S.input, { color: DC.text, backgroundColor: DC.inputBg,
                    borderColor: DC.border, marginBottom: 20 }]} />

                <TouchableOpacity onPress={handlePublish}
                  disabled={!formName.trim() || !formDesc.trim() || !formPhone.trim() || !formImage || isSubmitting}>
                  <LinearGradient
                    colors={(formName.trim() && formDesc.trim() && formPhone.trim() && formImage) ? OG : DG}
                    style={[S.publishBtn, {
                      opacity: (formName.trim() && formDesc.trim() && formPhone.trim() && formImage) ? 1 : 0.55,
                    }]}>
                    {isSubmitting
                      ? <ActivityIndicator color="#fff" />
                      : <>
                          <MaterialCommunityIcons name="store-plus-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                          <ThemedText style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
                            Publicar Emprendimiento
                          </ThemedText>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </RNModal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  card:         { borderRadius: 28, marginBottom: 20, borderWidth: 1, overflow: 'hidden' },
  cardImage:    { width: '100%', height: 140 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  promoBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF5F6D',
                  paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, alignSelf: 'flex-start' },
  verMasBadge:  { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.52)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 18 },

  footer:         { borderTopWidth: 1, paddingTop: 10, gap: 9 },
  reviewsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7,
                    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  
  contactRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  contactBtn:     { height: 38, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  contactBtnText: { fontSize: 12, fontWeight: '800' },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rxBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, gap: 4 },
  rxCount:      { fontSize: 11, fontWeight: '800' },

  detailHeroImage:   { width: '100%', height: 260 },
  detailCloseBtn:    { position: 'absolute', left: 16, backgroundColor: 'rgba(0,0,0,0.5)',
                       width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  detailRatingBadge: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', alignItems: 'center',
                       backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  detailSection:     { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  detailRxBtn:       { height: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  detailRxText:      { fontSize: 13, fontWeight: '800' },

  reviewCountBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reviewCard:       { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewModalBox:   { width: '92%', height: '78%', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },

  fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30,
         shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 6 },
         shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },

  modalBlur:        { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden',
                      borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalContent:     { padding: 22 },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  modalTitle:       { fontWeight: '900', fontSize: 17 },
  label:            { fontWeight: '800', fontSize: 13, marginBottom: 9, letterSpacing: 0.2 },
  input:            { borderRadius: 15, padding: 15, fontSize: 14, marginBottom: 14, borderWidth: 1, fontWeight: '600' },
  imagePicker:      { width: '100%', height: 148, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed',
                      justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 6 },
  formImagePreview: { width: '100%', height: '100%' },
  editImageIcon:    { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)',
                      width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
                      borderWidth: 2, borderColor: '#FFF' },
  publishBtn:       { height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'row', marginTop: 8 },
});