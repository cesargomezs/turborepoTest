import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState, useEffect } from 'react'; 
import { 
  View, Image, Platform, TouchableOpacity, Modal, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';

// --- IMPORTACIONES DE ENRUTAMIENTO Y REDUX ---
import { useRouter ,useLocalSearchParams } from 'expo-router'; 
import { useMockDispatch, useMockSelector } from '../../redux/slices'; 
import { setLanguage } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation'; 

// 📡 URL BASE PARA LAS NOTIFICACIONES
const API_NOTIFICATIONS_URL = 'http://192.168.252.243:3000/notifications';

export default function Header({ title }: { title?: string }) {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  
  const router = useRouter(); 
  const dispatch = useMockDispatch();
  
  const { t } = useTranslation();
  const selectedLanguage = useMockSelector((state: any) => state.language.code);
  
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // 🚀 ESTADO PARA LAS NOTIFICACIONES
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

  // 🚀 OBTENER NOTIFICACIONES DESDE EL BACKEND
  const fetchNotifications = async () => {
    try {
      const res = await fetch(API_NOTIFICATIONS_URL);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000); 

    return () => clearInterval(interval);
  }, []);

  const hasUnread = notifications.some(n => !n.read);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job': return { name: 'briefcase', color: '#4CAF50' }; 
      case 'store': return { name: 'store', color: '#FFB300' }; 
      case 'alert': return { name: 'alert-circle', color: '#FF5F6D' }; 
      case 'event': return { name: 'calendar', color: '#9C27B0' }; 
      case 'lawyer': return { name: 'scale-balance', color: '#FF5F6D' }; 
      case 'support': return { name: 'heart-pulse', color: '#FF5F6D' }; 
      default: return { name: 'bell', color: Colors[theme].text };
    }
  };

  // 🚀 FUNCIÓN DE NAVEGACIÓN Y BORRADO
  const handleNotificationPress = async (notif: any) => {
    setNotifModalVisible(false);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));

    try {
      await fetch(`${API_NOTIFICATIONS_URL}/${notif.id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error("Error al borrar notificación:", error);
    }

    setTimeout(() => {
      // 🚀 DICCIONARIO DE RUTAS (Más limpio y seguro que usar muchos if/else)
      const routes: Record<string, { path: string, param: string }> = {
        'job': { path: '/jobs', param: 'openJobId' },
        'store': { path: '/tabservices/stores', param: 'id' },
        'community': { path: '/tabservices/community', param: 'openEventId' },
        'event': { path: '/tabservices/events', param: 'openEventId' },
        'lawyer': { path: '/tabservices/lawyers', param: 'id' },
        'support': { path: '/tabservices/support', param: 'id' },
      };

      const target = routes[notif.type];
      
      if (target) {
        router.navigate({ 
            pathname: target.path as any, 
            params: { [target.param]: notif.referenceId } 
        }); 
      }
    }, 300); 
  };

  return (
    <View style={{ width: '100%', backgroundColor: 'transparent' }}>
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={Platform.OS === 'ios' ? 85 : 100}
        style={{ paddingTop: insets.top }}
        className="border-b border-white/10"
      >
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.avatarContainer, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
              <Image
                source={require('../../assets/images/cesar.webp')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View style={{ marginLeft: 12 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>
                {t.welcome}
              </ThemedText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            onPress={() => {
                fetchNotifications();
                setNotifModalVisible(true);
            }}
            activeOpacity={0.7}
            style={[styles.langButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', position: 'relative' }]}
          >
            <MaterialCommunityIcons
              size={22}
              color={Colors[theme].text}
              name={hasUnread ? "bell-ring" : "bell-outline"}
            />
            {hasUnread && <View style={styles.unreadBadge} />}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.7}
            style={[styles.langButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <MaterialCommunityIcons
              size={22}
              color={Colors[theme].text}
              name="translate"
            />
          </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <ThemedText className="text-center text-2xl" style={{ color: Colors[theme].tabIconDefault , fontWeight: 'bold' }}>
            {title}
          </ThemedText>
        </View>
      </BlurView>

      <Modal animationType="fade" transparent={true} visible={langModalVisible} onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangModalVisible(false)}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.modalContent, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
            <ThemedText style={styles.modalTitle}>{t.select_lang}</ThemedText>
            <View style={styles.optionsWrapper}>
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}
                    onPress={() => {
                      dispatch(setLanguage(lang.code));
                      setLangModalVisible(false);
                    }}
                  >
                    <ThemedText style={[styles.langText, isSelected && { color: Colors[theme].tint, fontWeight: 'bold' }]}>
                      {lang.label}
                    </ThemedText>
                    {isSelected && <MaterialCommunityIcons name="check" size={22} color={Colors[theme].tint} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </Pressable>
      </Modal>

      {/* --- MODAL DE NOTIFICACIONES --- */}
      <Modal animationType="slide" transparent={true} visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.notifModalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setNotifModalVisible(false)} />
          <View style={[
            styles.notifModalContent, 
            { 
              backgroundColor: Platform.OS === 'android' ? (isDark ? '#1E1E1E' : '#FFF') : 'transparent', 
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 25
            }
          ]}>
            {Platform.OS !== 'android' && <BlurView intensity={110} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 10, borderRadius: 2 }} />

            <View style={styles.notifHeader}>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={{ position: 'absolute', left: 0, zIndex: 10, padding: 5 }}>
                <MaterialCommunityIcons name="close" size={28} color={Colors[theme].text} />
              </TouchableOpacity>
              <ThemedText style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold' }}>Notificaciones</ThemedText>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {notifications.length > 0 ? (
                notifications.map((notif) => {
                  const iconConfig = getNotificationIcon(notif.type);
                  return (
                    <TouchableOpacity 
                      key={notif.id} 
                      activeOpacity={0.7}
                      onPress={() => handleNotificationPress(notif)}
                      style={[
                        styles.notifItem, 
                        { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          borderWidth: 1
                        },
                        !notif.read && { backgroundColor: isDark ? 'rgba(79, 195, 247, 0.15)' : 'rgba(79, 195, 247, 0.1)' }
                      ]}
                    >
                      <View style={[styles.notifIconWrapper, { backgroundColor: `${iconConfig.color}20` }]}>
                        <MaterialCommunityIcons name={iconConfig.name as any} size={22} color={iconConfig.color} />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: !notif.read ? 'bold' : '600' }}>
                          {notif.title}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13, color: isDark ? '#B0BEC5' : '#546E7A', marginTop: 4, lineHeight: 18 }}>
                          {notif.description}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11,  marginTop: 8, fontWeight: 'bold' }}>
                          {notif.time}
                        </ThemedText>
                      </View>

                      {!notif.read && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4FC3F7', alignSelf: 'center', marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                  <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors[theme].text} />
                  <ThemedText style={{ marginTop: 15, fontWeight: 'bold' }}>No tienes notificaciones nuevas</ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 5, 
  },
  avatarContainer: {
    width: 55, 
    height: 55, 
    borderRadius: 27.5, 
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  langButton: {
    width: 44, 
    height: 44, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5F6D',
  },
  titleContainer: {
    width: '100%', 
    alignItems: 'center', 
    paddingBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '75%',
    borderRadius: 28,
    overflow: 'hidden',
    paddingVertical: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    opacity: 0.8
  },
  optionsWrapper: {
    paddingHorizontal: 10,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 16,
    marginVertical: 2,
  },
  langText: {
    fontSize: 16,
  },
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
  },
  notifModalContent: {
    width: '100%',
    maxHeight: '85%', 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden', 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 20 }
    })
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
    paddingBottom: 15,
    position: 'relative'
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  notifIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  }
});