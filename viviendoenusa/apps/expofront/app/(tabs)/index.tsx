import React, { useState } from 'react';
import {
  Image,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
  ViewStyle
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '../../hooks/useColorScheme';
import ThemedTextInput from '../../components/ThemedTextInput';
import { Colors } from '../../constants/Colors';
import { toggleAuth, useMockDispatch, useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const [form, setForm] = useState<{username?: string; password?: string}>({ username: '', password: '' });
  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const { t } = useTranslation();

  const cardWidth = width > 768 ? 500 : (loggedIn ? width * 0.92 : width * 0.85);
  const cardHeight = loggedIn ? height * 0.69 : height * 0.65;
  const marginTopValue = Platform.OS === 'ios' ? 5 : 5;

  // Renderizamos el contenido principal para poder usarlo con o sin Touchable
  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={[
        styles.scrollContainer,
        { justifyContent: loggedIn ? 'flex-start' : 'center'}
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.centerContainer}>
        <View style={[styles.cardWrapper, { width: cardWidth, height: cardHeight }]}>
          
          {/* El BlurView no debe bloquear eventos en Web */}
          <BlurView
            intensity={95}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none" 
          />

          <View style={styles.cardContent}>
          <MaterialCommunityIcons size={40} name="home" style={{ display: 'flex', textAlign: 'right', width: '100%' , opacity:0.4}} color={Colors[colorScheme].tabIconNotSelected} />
            {loggedIn ? (
              <ScrollView contentContainerStyle={[
                styles.scrollContainer,
                { justifyContent: loggedIn ? 'flex-start' : 'center'}
              ]}>
                <View style={styles.infoSection}>
                  <MaterialCommunityIcons name="bullseye-arrow" size={40} color={Colors[colorScheme].tint} />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>{t.hometab?.vision || "Visión"}</ThemedText>
                  <ThemedText style={styles.descriptionText}>{t.hometab?.visiondesc}</ThemedText>
                  <View style={styles.separator} />
                  <MaterialCommunityIcons name="rocket-launch" size={40} color={Colors[colorScheme].tint} />
                  <ThemedText type="subtitle" style={styles.sectionTitle}>{t.hometab?.mission || "Misión"}</ThemedText>
                  <ThemedText style={styles.descriptionText}>{t.hometab?.missiondesc}</ThemedText>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loginWrapper}>
                <ThemedText type="header" style={styles.loginHeader}>Viviendo en USA</ThemedText>
                <View style={styles.formContainer}>
                  <View style={styles.miniSeparator} />
                  <View style={styles.inputGap}>
                    <ThemedTextInput 
                      label="Usuario:"
                      value={form?.username ?? ''}
                      onChangeText={(text: string) => setForm(f => ({...f, username: text}))}
                      placeholder="Tu usuario..."
                      autoCapitalize="none"
                    />
                    <ThemedTextInput
                      label="Contraseña:"
                      value={form?.password ?? ''}
                      onChangeText={(text: string) => setForm(f => ({...f, password: text}))}
                      placeholder="********"
                      secureTextEntry={true}
                    />
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => { Keyboard.dismiss(); dispatch(toggleAuth()); }}
                    style={styles.loginButton}
                  >
                    <View style={styles.imageBtnContent}>
                      <Image source={require('../../assets/images/splash-icon.png')} style={styles.btnImage} resizeMode="contain" />
                      <ThemedText style={styles.btnText}>Ingresar</ThemedText>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.orRow}>
                    <View style={styles.line} />
                    <ThemedText style={styles.orText}>o</ThemedText>
                    <View style={styles.line} />
                  </View>

                  <TouchableOpacity activeOpacity={0.8} style={styles.googleBtn}>
                    <MaterialCommunityIcons name="google" size={20} color="#EA4335" style={{ marginRight: 10 }} />
                    <ThemedText style={styles.googleBtnText}>Continuar con Google</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* CAMBIO CLAVE: En Web, TouchableWithoutFeedback rompe el foco de los inputs.
          Solo lo activamos en Android/iOS.
      */}
      {Platform.OS === 'web' ? (
        renderMainContent()
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {renderMainContent()}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

// ... Estilos (mantener tus estilos actuales)
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingVertical: 20, marginTop: Platform.OS === 'ios' ? -19 : 10 },
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  cardWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  } as ViewStyle,
  cardContent: { flex: 1, padding: 25, zIndex: 10  },
  infoSection: { alignItems: 'flex-start', width: '100%' , marginTop: 20},
  sectionTitle: { marginTop: 5, marginBottom: 10 },
  descriptionText: { fontSize: 16, textAlign: 'left', lineHeight: 24, opacity: 0.9, marginBottom: 20 },
  separator: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 15 },
  miniSeparator: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
  loginWrapper: { flex: 1, justifyContent: 'center' },
  loginHeader: { textAlign: 'center', marginBottom: 20 },
  formContainer: { width: '100%' },
  inputGap: { gap: 15 },
  loginButton: { marginTop: 20, width: '100%', height: 80, justifyContent: 'center' },
  imageBtnContent: { alignItems: 'center', justifyContent: 'center' },
  btnImage: { width: 100, height: 100, position: 'absolute', opacity: 0.8 },
  btnText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  orText: { marginHorizontal: 15, opacity: 0.6 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 14 },
  googleBtnText: { fontWeight: '600', fontSize: 16 }
});