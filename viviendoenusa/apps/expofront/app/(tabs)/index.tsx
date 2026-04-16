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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 

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
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    name: '',
    birthDate: new Date() 
  });

  const loggedIn = useMockSelector((state) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000; 
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : width * 0.92);
  
  const cardHeight = loggedIn 
    ? (isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : height * 0.69))
    : undefined;

  const verticalOffset = !loggedIn ? 0 : (isWeb ? -90 : (isIOS ? -85 : -100));
  
  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (isAndroid) setShowDatePicker(false);
    if (event.type === 'dismissed') {
        setShowDatePicker(false);
        return;
    }
    if (selectedDate) {
        setForm({ ...form, birthDate: selectedDate });
    }
  };

  const handleWebDateChange = (e: any) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);
      setForm({ ...form, birthDate: selectedDate });
    }
  };

  const closeDatePickerIOS = () => setShowDatePicker(false);

  const renderMainContent = () => (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
        <View style={[styles.mainCard, { 
          width: cardWidth, 
          height: cardHeight,
          minHeight: !loggedIn ? (isRegistering ? height * 0.85 : height * 0.65) : undefined,
          borderColor: DynamicColors.border, 
          backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent' 
        }]}>

          {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}

          <View style={styles.cardContent}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              
              {isLargeWeb && (
                <View style={styles.webSidebar}>
                  <Image source={require('../../assets/images/backgroundusajpg.jpg')} style={styles.sidebarLogo} resizeMode="contain" />
                  <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                  <ThemedText style={{ color: DynamicColors.subtext, fontSize: 13, fontWeight: '600' }}>
                    {loggedIn ? t.welcome : "Portal de recursos"}
                  </ThemedText>
                </View>
              )}

              <View style={{ flex: 1, paddingLeft: isLargeWeb ? 40 : 0 }}>
                {loggedIn ? (
                  <>
                    <View style={styles.topHeaderRow}>
                      {!isLargeWeb && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ThemedText style={[styles.sectionTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                        </View>
                      )}
                      <MaterialCommunityIcons name="home" size={40} color={DynamicColors.text} style={{ opacity: 0.2 }} />
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View style={styles.infoSection}>
                        <View style={styles.sectionHeader}>
                          <MaterialCommunityIcons name="bullseye-arrow" size={24} color={Colors[colorScheme].tint} />
                          <ThemedText type="subtitle" style={[styles.sectionTitle, {color: DynamicColors.text}]}>{t.vision}</ThemedText>
                        </View>
                        <ThemedText style={[styles.descriptionText, {color: DynamicColors.text}]}>{t.hometab?.visiondesc}</ThemedText>
                        <View style={[styles.separator, { backgroundColor: DynamicColors.border }]} />
                        <View style={styles.sectionHeader}>
                          <MaterialCommunityIcons name="rocket-launch" size={24} color={Colors[colorScheme].tint} />
                          <ThemedText type="subtitle" style={[styles.sectionTitle, {color: DynamicColors.text}]}>{t.mision}</ThemedText>
                        </View>
                        <ThemedText style={[styles.descriptionText, {color: DynamicColors.text}]}>{t.hometab?.missiondesc}</ThemedText>
                      </View>
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.loginFullContainer}>
                    <ScrollView 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
                    >
                      {!isLargeWeb && (
                        <View style={styles.brandingContainer}>
                          <Image 
                            source={require('../../assets/images/backgroundusajpg.jpg')} 
                            style={[styles.customBrandingIcon, isRegistering && { width: 70, height: 70 }]} 
                            resizeMode="contain" 
                          />
                          <ThemedText style={styles.brandingTitle}>Viviendo en USA</ThemedText>
                        </View>
                      )}

                      <View style={{ width: '100%' }}>
                        <ThemedText style={[styles.loginHeaderLeft, { color: DynamicColors.subtext }]}>
                          {isRegistering ? (t.hometab?.register || "Crear Cuenta") : (t.hometab?.login || "Iniciar Sesión")}
                        </ThemedText>
                      </View>

                      <View style={styles.inputGap}>
                        {isRegistering && (
                          <>
                            <ThemedTextInput label="Nombre completo:" value={form.name} onChangeText={(v: string) => setForm({...form, name: v})} placeholder="Tu nombre..." />
                            <ThemedTextInput label="Correo electrónico:" value={form.email} onChangeText={(v: string) => setForm({...form, email: v})} placeholder="ejemplo@correo.com" keyboardType="email-address" autoCapitalize="none" />
                            
                            <ThemedText style={styles.labelDate}>{t.hometab.dateBirthday}</ThemedText>
                            
                            {/* DISEÑO ORIGINAL RESTAURADO */}
                            <View style={[styles.dateInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, position: 'relative' }]}>
                              <ThemedText style={{ color: DynamicColors.text, fontWeight: '700' }}>
                                {form.birthDate.toLocaleDateString()}
                              </ThemedText>
                              <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "calendar-edit"} size={20} color="#FF5F6D" />
                              
                              {isWeb ? (
                                <input 
                                  type="date" 
                                  onChange={handleWebDateChange}
                                  value={form.birthDate.toISOString().split('T')[0]}
                                  style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    width: '100%', height: '100%',
                                    opacity: 0, cursor: 'pointer', zIndex: 10
                                  }}
                                />
                              ) : (
                                <TouchableOpacity 
                                  onPress={() => { Keyboard.dismiss(); setShowDatePicker(!showDatePicker); }} 
                                  style={StyleSheet.absoluteFill}
                                />
                              )}
                            </View>

                            {showDatePicker && !isWeb && (
                                <View style={isIOS ? styles.iosPickerContainer : null}>
                                    {isIOS && (
                                        <TouchableOpacity onPress={closeDatePickerIOS} style={styles.iosPickerDoneButton}>
                                            <ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>{t.hometab.ready}</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                    <DateTimePicker 
                                        value={form.birthDate} 
                                        mode="date" 
                                        display={isIOS ? "spinner" : "default"} 
                                        onChange={onDateChange} 
                                        textColor={DynamicColors.text} 
                                        maximumDate={new Date()}
                                    />
                                </View>
                            )}
                          </>
                        )}
                        <ThemedTextInput label={t.hometab.username} value={form.username} onChangeText={(v: string) => setForm({...form, username: v})} placeholder="Tu usuario..." autoCapitalize="none" />
                        <ThemedTextInput label={t.hometab.password} value={form.password} onChangeText={(v: string) => setForm({...form, password: v})} placeholder="********" secureTextEntry={true} />
                      </View>

                      <View style={styles.actionsContainer}>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => { Keyboard.dismiss(); dispatch(toggleAuth()); }} style={styles.styledLoginButton}>
                          <LinearGradient colors={orangeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnStyled}>
                            <View style={styles.buttonInnerContainer}>
                              <MaterialCommunityIcons name={isRegistering ? "account-plus" : "login-variant"} size={20} color="white" />
                              <ThemedText style={styles.btnTextStyled}>{isRegistering ? t.hometab.registerhome : t.hometab.acces}</ThemedText>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.googleButton, { borderColor: DynamicColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
                          onPress={() => console.log('Google login')}
                        >
                          <MaterialCommunityIcons name="google" size={20} color={isDark ? '#fff' : '#4285F4'} />
                          <ThemedText style={[styles.googleText, { color: DynamicColors.text }]}>{t.hometab.googleacount}</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={styles.switchModeContainer}>
                          <ThemedText style={[styles.switchModeText, { color: DynamicColors.subtext }]}>
                            {isRegistering ? t.hometab.haveaccount : t.hometab.nohaveaccount }
                            <ThemedText style={{ color: "#FF5F6D", fontWeight: '800' }}>{isRegistering ? (t.hometab?.login || " Inicia Sesión") : (t.hometab?.register || " Regístrate aquí")}</ThemedText>
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={styles.container}>
      {renderMainContent()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 },
  mainCard: { overflow: 'hidden', borderRadius: 28, borderWidth: Platform.OS === 'android' ? 1 : 0 },
  cardContent: { flex: 1, padding: 25 },
  
  webSidebar: { width: 220, borderRightWidth: 1, borderColor: 'rgba(128,128,128,0.1)', paddingRight: 20 },
  sidebarLogo: { width: 100, height: 100, marginBottom: 15 },
  sideMenuTitle: { fontSize: 20, fontWeight: '900', marginBottom: 5 },
  
  topHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  infoSection: { paddingVertical: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  descriptionText: { fontSize: 15, lineHeight: 24, opacity: 0.8, marginBottom: 15 },
  separator: { width: '100%', height: 1, marginVertical: 15 },
  
  loginFullContainer: { flex: 1, width: '100%' },
  brandingContainer: { alignItems: 'center', marginBottom: 15, marginTop: 5 },
  customBrandingIcon: { width: 90, height: 90 },
  brandingTitle: { fontSize: 22, fontWeight: '900', marginTop: 8, letterSpacing: -0.5, textAlign: 'center' },
  loginHeaderLeft: { textAlign: 'left', marginBottom: 10, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  
  inputGap: { width: '100%', gap: 12 },
  labelDate: { fontSize: 11, fontWeight: '900', color: '#FF5F6D', marginBottom: 4, textTransform: 'uppercase' },
  dateInput: { padding: 12, borderRadius: 15, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  iosPickerContainer: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginTop: 5, overflow: 'hidden' },
  iosPickerDoneButton: { alignItems: 'flex-end', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },

  actionsContainer: { width: '100%', alignItems: 'center', marginTop: 25 },
  styledLoginButton: { 
    width: '90%', 
    height: 52, 
    borderRadius: 26, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradientBtnStyled: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonInnerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnTextStyled: { fontSize: 16, fontWeight: '800', color: 'white', marginLeft: 10 },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    marginTop: 12,
  },
  googleText: { marginLeft: 10, fontWeight: '700', fontSize: 14 },
  
  switchModeContainer: { marginTop: 20, paddingBottom: 10 },
  switchModeText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});