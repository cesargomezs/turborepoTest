import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { 
  View, 
  Image, 
  Platform, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  Pressable 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { ThemedText } from '../ThemedText';

export default function Header({ title }: { title?: string }) {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  
  const [modalVisible, setModalVisible] = useState(false);
  // Estado para rastrear el idioma seleccionado
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  const languages = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ];

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
                Hola, Cesar
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
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

        <View style={styles.titleContainer}>
          <ThemedText className="text-center text-2xl" style={{ color: Colors[theme].tabIconDefault }}>
            {title}
          </ThemedText>
        </View>
      </BlurView>

      {/* MODAL DE SELECCIÓN DE IDIOMA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <BlurView 
            intensity={isDark ? 40 : 60} 
            tint={isDark ? 'dark' : 'light'} 
            style={[
              styles.modalContent,
              { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
            ]}
          >
            <ThemedText style={styles.modalTitle}>Idioma</ThemedText>
            
            <View style={styles.optionsWrapper}>
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOption,
                      isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }
                    ]}
                    onPress={() => {
                      setSelectedLanguage(lang.code);
                      setModalVisible(false);
                    }}
                  >
                    <ThemedText style={[
                      styles.langText, 
                      isSelected && { color: Colors[theme].tint, fontWeight: 'bold' }
                    ]}>
                      {lang.label}
                    </ThemedText>
                    
                    {isSelected && (
                      <MaterialCommunityIcons 
                        name="check" 
                        size={22} 
                        color={Colors[theme].tint} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </Pressable>
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
  titleContainer: {
    width: '100%', 
    alignItems: 'center', 
    paddingBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fondo oscurecido sutil
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
  }
});