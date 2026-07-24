import React, { useState, useEffect } from 'react';
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
  Alert,
  Modal, 
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'; 

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { default as ThemedTextInput } from '../../components/ThemedTextInput';
import { toggleAuth, setUserMetadata, useMockDispatch, useMockSelector } from '../../redux/slices';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppTheme } from '../src/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const { login } = useAuth();
  const { width, height } = useWindowDimensions();
  const { isDark } = useAppTheme();
  const colorScheme = isDark ? 'dark' : 'light';
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false); 
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // 🚀 NUEVOS ESTADOS PARA RECUPERACIÓN DE CONTRASEÑA
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const [isGoogleFlow, setIsGoogleFlow] = useState(false); 
  
  const [form, setForm] = useState({ 
    email: '', password: '', firstName: '', lastName: '', phone: '', zipCode: '', birthDate: new Date() 
  });

  const loggedIn = useMockSelector((state: any) => state.mockAuth.loggedIn);
  const dispatch = useMockDispatch();
  const { t } = useTranslation();

  const isWeb = Platform.OS === 'web';
  const isLargeWeb = isWeb && width > 1000; 
  const isAndroid = Platform.OS === 'android';
  const isIOS = Platform.OS === 'ios';

  const orangeGradient: readonly [string, string, ...string[]] = ['#FF5F6D', '#FFC371'];

  const cardWidth = isLargeWeb ? '96%' : (width > 768 ? 500 : width * 0.92);
  const dynamicCardHeight = loggedIn ? (isLargeWeb ? height * 0.70 : (isAndroid ? height * 0.67 : height * 0.69)) : (isRegistering ? height * 0.85 : undefined);
  const dynamicMinHeight = (!loggedIn && !isRegistering) ? height * 0.65 : undefined;
  const verticalOffset = !loggedIn ? 0 : (isWeb ? -90 : (isIOS ? -85 : -100));
  
  const DynamicColors = {
    text: isDark ? '#FFFFFF' : '#1A1A1A',
    subtext: isDark ? '#B0BEC5' : '#607D8B',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    accent: '#FF5F6D',
    modalBg: isDark ? '#121212' : '#FFFFFF', 
  };

  const isSubmitDisabled = isRegistering && !acceptedTerms;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
  },{
    scheme: 'viviendoenusa'
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      verifyGoogleUser(id_token);
    }
  }, [response]);

  const verifyGoogleUser = async (idToken: string) => {
    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const claims = JSON.parse(jsonPayload);

      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND; 
      
      const res = await fetch(`${API_URL}/auth/login`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, isGoogle: true }) 
      });

      if (!res.ok) throw new Error("Error consultando el servidor");

      const dataRes = await res.json();

      if (dataRes.requiresProfileCompletion) {
        setIsGoogleFlow(true); 
        const randomPassword = Math.random().toString(36).slice(-12);
        
        setForm(prev => ({ 
          ...prev, 
          email: claims.email, 
          firstName: claims.given_name || '', 
          lastName: claims.family_name || '', 
          password: randomPassword 
        }));
        
        setAcceptedTerms(false);
        setShowCompletionModal(true);
      } else {
        // 🚀 SOLUCIÓN: Guardamos el token al entrar con Google
        await login(dataRes.user, dataRes.token);
        dispatch(setUserMetadata({ ...dataRes.user, token: dataRes.token }));
        dispatch(toggleAuth());
      }
    } catch (error) {
      console.log("Aviso al verificar usuario de Google:", error);
      isWeb ? window.alert("Ocurrió un error al verificar tu cuenta con el servidor.") : Alert.alert("Error", "Ocurrió un error al verificar tu cuenta con el servidor.");
    }
  };

  const submitProfileCompletion = async () => {
    Keyboard.dismiss();
    
    if (!form.phone || !form.zipCode) {
      isWeb ? window.alert("Por favor completa tu teléfono y Zip Code") : Alert.alert("Atención", "Por favor completa tu teléfono y Zip Code");
      return;
    }

    const today = new Date();
    const birthDate = form.birthDate;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) { age--; }

    if (age < 18) {
      isWeb ? window.alert("Debes tener al menos 18 años.") : Alert.alert("Acceso denegado", "Debes tener al menos 18 años.");
      return; 
    }

    try {
      const finalPayload = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password, 
        phone: form.phone,
        zip: form.zipCode,
        birth: form.birthDate.toISOString(), 
        isVerified: true, 
        authProvider: 'google'
      };
      
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND; 
      const endpoint = `${API_URL}/auth/register`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: finalPayload,
          newImageUri: null 
        })
      });

      const dataRes = await response.json();

      if (!response.ok) {
        if (dataRes.error && dataRes.error.includes("ya está registrado")) {
          setShowCompletionModal(false);
          dispatch(toggleAuth());
          return;
        }
        throw new Error(dataRes.error || `Error en el servidor: ${response.status}`);
      }

      setShowCompletionModal(false);
      
      // 🚀 SOLUCIÓN: Loguear e inyectar el token tras completar el registro de Google
      await login(dataRes.user, dataRes.token);
      dispatch(setUserMetadata({ ...dataRes.user, token: dataRes.token }));
      dispatch(toggleAuth());
      
    } catch (error: any) {
      console.log("Aviso guardando en BD:", error.message);
      const msg = error.message || "Ocurrió un error de conexión con el servidor.";
      isWeb ? window.alert(msg) : Alert.alert("Error", msg);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (isAndroid) setShowDatePicker(false);
    if (event.type === 'dismissed') { setShowDatePicker(false); return; }
    if (selectedDate) setForm({ ...form, birthDate: selectedDate });
  };

  const handleWebDateChange = (e: any) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const selectedDate = new Date(year, month - 1, day);
        setForm({ ...form, birthDate: selectedDate });
      }
    }
  };
  
  const getSafeDateString = () => {
    return !isNaN(form.birthDate.getTime()) ? form.birthDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  };

  const closeDatePickerIOS = () => setShowDatePicker(false);

  const handleAuthAction = async () => {
    Keyboard.dismiss();
    
    if (isRegistering && !acceptedTerms) {
      isWeb ? window.alert("Debes aceptar los términos y condiciones para continuar.") : Alert.alert("Atención", "Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      const endpoint = isRegistering ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;

      const payload = isRegistering 
        ? { 
            data: { 
              email: form.email, 
              password: form.password, 
              firstName: form.firstName, 
              lastName: form.lastName,
              phone: form.phone,
              zip: form.zipCode,
              birth: form.birthDate.toISOString(),
              isVerified: false 
            } 
          }
        : { email: form.email, password: form.password, isGoogle: false }; 

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dataRes = await response.json();
      
      if (!response.ok) {
        throw new Error(dataRes.error || "Error al autenticar");
      }
      
      // 🚀 SOLUCIÓN: Guardamos en Contexto Y en Redux
      await login(dataRes.user, dataRes.token);
      dispatch(setUserMetadata({ ...dataRes.user, token: dataRes.token }));
      dispatch(toggleAuth());

    } catch (error: any) {
      console.log("Aviso de acceso:", error.message);
      const msg = error.message || "Ocurrió un error al intentar acceder.";
      
      if (msg.includes("bloqueada por múltiples intentos")) {
        if (isWeb) {
          const resetConfirm = window.confirm(`${msg}\n\n¿Deseas recuperar tu contraseña ahora?`);
          if (resetConfirm) {
            setResetEmail(form.email); 
            setShowResetModal(true);
          }
        } else {
          Alert.alert(
            "Cuenta Bloqueada", 
            msg,
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Recuperar", onPress: () => { setResetEmail(form.email); setShowResetModal(true); } }
            ]
          );
        }
        return; 
      }
      
      if (isWeb) window.alert(`Error: ${msg}`);
      else Alert.alert("Error", msg);
    }
  };  

  const handlePasswordReset = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      isWeb ? window.alert("Por favor ingresa un correo electrónico válido.") : Alert.alert("Atención", "Por favor ingresa un correo electrónico válido.");
      return;
    }

    try {
      const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo enviar el correo de recuperación");
      }

      setShowResetModal(false);
      setResetEmail('');
      const successMsg = "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.";
      isWeb ? window.alert(successMsg) : Alert.alert("Correo enviado", successMsg);

    } catch (error: any) {
      const msg = error.message;
      isWeb ? window.alert(`Error: ${msg}`) : Alert.alert("Error", msg);
    }
  };

  const openTermsModalFromCompletion = () => {
    setShowCompletionModal(false);
    setTimeout(() => setShowTermsModal(true), 200); 
  };

  const handleCloseTermsModal = (accepted: boolean) => {
    if (accepted) setAcceptedTerms(true);
    setShowTermsModal(false);
    
    if (isGoogleFlow) {
      setTimeout(() => setShowCompletionModal(true), 200);
    }
  };

  const renderInputPair = (l1: string, v1: string, k1: string, p1: string, t1: any, l2: string, v2: string, k2: string, p2: string, t2: any) => {
    if (isLargeWeb) {
      return (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedTextInput label={l1} value={v1} onChangeText={(v: string) => setForm({...form, [k1]: v})} placeholder={p1} keyboardType={t1} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedTextInput label={l2} value={v2} onChangeText={(v: string) => setForm({...form, [k2]: v})} placeholder={p2} keyboardType={t2} />
          </View>
        </View>
      );
    }
    return (
      <>
        <ThemedTextInput label={l1} value={v1} onChangeText={(v: string) => setForm({...form, [k1]: v})} placeholder={p1} keyboardType={t1} />
        <ThemedTextInput label={l2} value={v2} onChangeText={(v: string) => setForm({...form, [k2]: v})} placeholder={p2} keyboardType={t2} />
      </>
    );
  };

  const renderResetPasswordModal = () => (
    <Modal visible={showResetModal} transparent={true} animationType="fade" onRequestClose={() => setShowResetModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: Math.min(width * 0.92, 400) }]}>
          <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Recuperar Contraseña</ThemedText>
            <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 5 }}>
              <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <ThemedText style={{ color: DynamicColors.subtext, marginBottom: 20, fontSize: 14 }}>
              Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos instrucciones para restablecer tu contraseña.
            </ThemedText>
            <ThemedText style={styles.labelDate}>Correo Electrónico</ThemedText>
            <TextInput 
              value={resetEmail} 
              onChangeText={setResetEmail} 
              placeholder="ejemplo@correo.com" 
              placeholderTextColor={DynamicColors.subtext}
              style={[
                styles.nativeInput, 
                { 
                  borderColor: DynamicColors.border, 
                  backgroundColor: DynamicColors.inputBg, 
                  color: DynamicColors.text,
                  marginBottom: 10
                },
                ...(isWeb ? [{ outlineStyle: 'none' as any }] : []) 
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
            <TouchableOpacity style={[styles.styledLoginButton, { width: '100%', height: 45 }]} onPress={handlePasswordReset}>
              <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnStyled}>
                <ThemedText style={styles.btnTextStyled}>Enviar Enlace</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTermsModal = () => (
    <Modal visible={showTermsModal} transparent={true} animationType="slide" onRequestClose={() => handleCloseTermsModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: cardWidth, maxHeight: height * 0.8 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Términos y Condiciones</ThemedText>
            <TouchableOpacity onPress={() => handleCloseTermsModal(false)} style={{ padding: 5 }}>
              <MaterialCommunityIcons name="close" size={24} color={DynamicColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={true}>
            <ThemedText style={{ color: DynamicColors.text, fontWeight: 'bold', marginBottom: 10 }}>Versión 2026.1</ThemedText>
            <ThemedText style={{ color: DynamicColors.text, marginBottom: 10, lineHeight: 22 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>1. NATURALEZA Y OBJETIVO:</ThemedText> ViviendoEnUSA.app es un puente tecnológico para conectar servicios, tiendas, profesionales y emprendimientos. La plataforma actúa como facilitador de conexión y no es prestadora directa de servicios legales, comerciales o de apoyo psicológico. La elección de con quién interactuar es responsabilidad exclusiva del usuario.
            </ThemedText>
            <ThemedText style={{ color: DynamicColors.text, marginBottom: 10, lineHeight: 22 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>2. PROTECCIÓN DE DATOS PERSONALES:</ThemedText> Recolectamos Nombre, Apellido, Teléfono, Correo electrónico y Código Postal exclusivamente para gestionar la cuenta y facilitar conexiones seguras. El teléfono no se expone públicamente. Declaramos explícitamente que los datos personales no se venden, intercambian ni alquilan a terceros.
            </ThemedText>
            <ThemedText style={{ color: DynamicColors.text, marginBottom: 10, lineHeight: 22 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>3. PROPIEDAD INTELECTUAL Y COPYRIGHT:</ThemedText> El usuario es responsable de la originalidad del contenido publicado y asume toda responsabilidad frente a reclamaciones por infracción de derechos de autor de terceros.
            </ThemedText>
            <ThemedText style={{ color: DynamicColors.text, marginBottom: 10, lineHeight: 22 }}>
              <ThemedText style={{ fontWeight: 'bold' }}>4. RESEÑAS Y TRANSPARENCIA:</ThemedText> Se permite una sola reseña por usuario por cada servicio. Todo comentario es responsabilidad personal de su autor.
            </ThemedText>
            <ThemedText style={{ color: DynamicColors.accent, marginBottom: 20, lineHeight: 22, fontWeight: 'bold' }}>
              5. CLÁUSULA MAESTRA DE EXONERACIÓN DE RESPONSABILIDAD: El usuario acepta que el Administrador de ViviendoEnUSA.app es un intermediario tecnológico y no asume responsabilidad civil, penal, comercial o económica por ninguna acción, omisión, contenido, producto o servicio derivado de la interacción dentro de esta plataforma. El Administrador queda eximido de toda responsabilidad por daños, perjuicios, o incumplimiento contractual. El usuario asume el riesgo total de su actividad y libera al Administrador de cualquier reclamación judicial o extrajudicial.
            </ThemedText>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
            <TouchableOpacity style={[styles.styledLoginButton, { width: '100%', height: 45 }]} onPress={() => handleCloseTermsModal(true)}>
              <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnStyled}>
                <ThemedText style={styles.btnTextStyled}>Aceptar y Cerrar</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCompletionModal = () => (
    <Modal visible={showCompletionModal} transparent={true} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: DynamicColors.modalBg, width: cardWidth }]}>
          <View style={[styles.modalHeader, { borderBottomColor: DynamicColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: DynamicColors.text }]}>Completa tu perfil</ThemedText>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <ThemedText style={{ color: DynamicColors.subtext, marginBottom: 20, fontSize: 14 }}>
              Para brindarte la mejor experiencia y conectar con la comunidad, necesitamos unos datos adicionales.
            </ThemedText>
            
            <View style={{ gap: 20, marginBottom: 10, width: '100%' }}>
              
              <View style={{ width: '100%' }}>
                <ThemedText style={styles.labelDate}>Teléfono</ThemedText>
                <TextInput 
                  value={form.phone} 
                  onChangeText={(v: string) => setForm({...form, phone: v})} 
                  placeholder="+1 234 567 8900" 
                  placeholderTextColor={DynamicColors.subtext}
                  style={[
                    styles.nativeInput, 
                    { 
                      borderColor: DynamicColors.border, 
                      backgroundColor: DynamicColors.inputBg, 
                      color: DynamicColors.text
                    },
                    ...(isWeb ? [{ outlineStyle: 'none' as any }] : []) 
                  ]}
                  keyboardType={isWeb ? "default" : "phone-pad"}
                  autoComplete="off"
                />
              </View>
              
              <View style={{ width: '100%' }}>
                <ThemedText style={styles.labelDate}>Zip Code</ThemedText>
                <TextInput 
                  value={form.zipCode} 
                  onChangeText={(v: string) => setForm({...form, zipCode: v})} 
                  placeholder="90210" 
                  placeholderTextColor={DynamicColors.subtext}
                  style={[
                    styles.nativeInput, 
                    { 
                      borderColor: DynamicColors.border, 
                      backgroundColor: DynamicColors.inputBg, 
                      color: DynamicColors.text 
                    },
                    ...(isWeb ? [{ outlineStyle: 'none' as any }] : []) 
                  ]}
                  keyboardType={isWeb ? "default" : "number-pad"} 
                  autoComplete="off"
                />
              </View>

              <View style={{ width: '100%' }}>
                <ThemedText style={styles.labelDate}>Fecha de Nacimiento</ThemedText>
                <View style={[styles.dateInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, padding: isWeb ? 0 : 12 }]}>
                  {isWeb ? (
                    <input 
                      type="date" 
                      onChange={handleWebDateChange} 
                      value={getSafeDateString()} 
                      style={{ 
                        width: '100%', 
                        padding: '12px',
                        border: 'none', 
                        background: 'transparent', 
                        color: DynamicColors.text, 
                        outline: 'none', 
                        fontSize: '16px',
                        cursor: 'pointer'
                      }} 
                    />
                  ) : (
                    <>
                      <ThemedText style={{ color: DynamicColors.text, fontWeight: '700' }}>{!isNaN(form.birthDate.getTime()) ? form.birthDate.toLocaleDateString() : ''}</ThemedText>
                      <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "calendar-edit"} size={20} color="#FF5F6D" />
                      <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)} style={StyleSheet.absoluteFill} />
                    </>
                  )}
                </View>
                {showDatePicker && !isWeb && (
                    <View style={isIOS ? styles.iosPickerContainer : null}>
                        {isIOS && (<TouchableOpacity onPress={closeDatePickerIOS} style={styles.iosPickerDoneButton}><ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>{t.hometab.ready}</ThemedText></TouchableOpacity>)}
                        <DateTimePicker value={form.birthDate} mode="date" display={isIOS ? "spinner" : "default"} onChange={onDateChange} textColor={DynamicColors.text} maximumDate={new Date()} />
                    </View>
                )}
              </View>

              <View style={styles.termsContainer}>
                <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={acceptedTerms ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={acceptedTerms ? DynamicColors.accent : DynamicColors.subtext} />
                </TouchableOpacity>
                <ThemedText style={[styles.termsText, { color: DynamicColors.subtext }]}>
                  He leído y acepto los{' '}
                  <ThemedText style={{ color: DynamicColors.accent, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={openTermsModalFromCompletion}>
                    Términos y Condiciones
                  </ThemedText>
                </ThemedText>
              </View>

            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: DynamicColors.border }]}>
            
            <TouchableOpacity 
              style={[styles.styledLoginButton, { width: '100%', height: 45 }, !acceptedTerms && { opacity: 0.4 }]} 
              onPress={submitProfileCompletion}
              disabled={!acceptedTerms} 
            >
              <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnStyled}>
                <ThemedText style={styles.btnTextStyled}>Guardar y Continuar</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMainContent = () => (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.centerContainer, { marginTop: verticalOffset }]}>
        <View style={[styles.mainCard, { width: cardWidth, height: dynamicCardHeight, minHeight: dynamicMinHeight, borderColor: DynamicColors.border, backgroundColor: isAndroid ? (isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)') : 'transparent' }]}>
          {!isAndroid && <BlurView intensity={isDark ? 95 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
          <View style={styles.cardContent}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              
              {isLargeWeb && (
                <View style={styles.webSidebar}>
                  <Image source={require('../../assets/images/backgroundusajpg.jpg')} style={styles.sidebarLogo} resizeMode="contain" />
                  <ThemedText style={[styles.sideMenuTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                  <ThemedText style={{ color: DynamicColors.subtext, fontSize: 13, fontWeight: '600' }}>{loggedIn ? t.welcome : "Portal de recursos"}</ThemedText>
                  {!loggedIn && (
                    <View style={styles.webSidebarBenefits}>
                      <View style={styles.benefitItem}><MaterialCommunityIcons name="storefront-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Impulsa y descubre emprendimientos locales.</ThemedText></View>
                      <View style={styles.benefitItem}><MaterialCommunityIcons name="briefcase-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Accede a oportunidades laborales destacadas.</ThemedText></View>
                      <View style={styles.benefitItem}><MaterialCommunityIcons name="account-group-outline" size={24} color={DynamicColors.accent} /><ThemedText style={[styles.benefitText, { color: DynamicColors.text }]}>Conecta con una red de profesionales hispanos.</ThemedText></View>
                    </View>
                  )}
                </View>
              )}

              <View style={{ flex: 1, paddingLeft: isLargeWeb ? 40 : 0 }}>
                {loggedIn ? (
                  <>
                    {/* 🚀 CORRECCIÓN: Icono Home alineado a la derecha en Web */}
                    <View style={[styles.topHeaderRow, isLargeWeb && { justifyContent: 'flex-end' }]}>
                      {!isLargeWeb && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ThemedText style={[styles.sectionTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                        </View>
                      )}
                      <MaterialCommunityIcons 
                        name="home" 
                        size={40} 
                        color={DynamicColors.text} 
                        style={[{ opacity: 0.2 }, isLargeWeb && { marginLeft: 'auto' }]} 
                      />
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
                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 25 }}>
                      {!isLargeWeb && (
                        <View style={styles.brandingContainer}>
                          <Image source={require('../../assets/images/backgroundusajpg.jpg')} style={[styles.customBrandingIcon, isRegistering && { width: 70, height: 70 }]} resizeMode="contain" />
                          <ThemedText style={[styles.brandingTitle, { color: DynamicColors.text }]}>Viviendo en USA</ThemedText>
                        </View>
                      )}

                      <View style={{ width: '100%' }}>
                        <ThemedText style={[styles.loginHeaderLeft, { color: DynamicColors.subtext }]}>{isRegistering ? (t.hometab?.register || "Crear Cuenta") : (t.hometab?.login || "Iniciar Sesión")}</ThemedText>
                      </View>

                      <View style={styles.inputGap}>
                        {isRegistering ? (
                          <>
                            {renderInputPair("Nombre", form.firstName, "firstName", "Tu nombre", "default", "Apellido", form.lastName, "lastName", "Tu apellido", "default")}
                            <ThemedTextInput label="Correo electrónico" value={form.email} onChangeText={(v: string) => setForm({...form, email: v})} placeholder="ejemplo@correo.com" keyboardType="email-address" autoCapitalize="none" />
                            
                            {renderInputPair("Teléfono", form.phone, "phone", "+1 234 567 8900", isWeb ? "default" : "phone-pad", "Zip Code", form.zipCode, "zipCode", "90210", isWeb ? "default" : "number-pad")}
                            
                            <ThemedText style={styles.labelDate}>{t.hometab.dateBirthday}</ThemedText>
                            
                            <View style={[styles.dateInput, { borderColor: DynamicColors.border, backgroundColor: DynamicColors.inputBg, padding: isWeb ? 0 : 12 }]}>
                              {isWeb ? (
                                <input 
                                  type="date" 
                                  onChange={handleWebDateChange} 
                                  value={getSafeDateString()} 
                                  style={{ 
                                    width: '100%', 
                                    padding: '12px',
                                    border: 'none', 
                                    background: 'transparent', 
                                    color: DynamicColors.text, 
                                    outline: 'none', 
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                  }} 
                                />
                              ) : (
                                <>
                                  <ThemedText style={{ color: DynamicColors.text, fontWeight: '700' }}>{!isNaN(form.birthDate.getTime()) ? form.birthDate.toLocaleDateString() : ''}</ThemedText>
                                  <MaterialCommunityIcons name={showDatePicker ? "chevron-up" : "calendar-edit"} size={20} color="#FF5F6D" />
                                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowDatePicker(!showDatePicker); }} style={StyleSheet.absoluteFill} />
                                </>
                              )}
                            </View>
                            {showDatePicker && !isWeb && (
                                <View style={isIOS ? styles.iosPickerContainer : null}>
                                    {isIOS && (<TouchableOpacity onPress={closeDatePickerIOS} style={styles.iosPickerDoneButton}><ThemedText style={{color: '#FF5F6D', fontWeight: '800'}}>{t.hometab.ready}</ThemedText></TouchableOpacity>)}
                                    <DateTimePicker value={form.birthDate} mode="date" display={isIOS ? "spinner" : "default"} onChange={onDateChange} textColor={DynamicColors.text} maximumDate={new Date()} />
                                </View>
                            )}

                            <ThemedTextInput label="Contraseña" value={form.password} onChangeText={(v: string) => setForm({...form, password: v})} placeholder="********" secureTextEntry={true} />

                            <View style={styles.termsContainer}>
                              <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={{ padding: 4 }}>
                                <MaterialCommunityIcons name={acceptedTerms ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={acceptedTerms ? DynamicColors.accent : DynamicColors.subtext} />
                              </TouchableOpacity>
                              <ThemedText style={[styles.termsText, { color: DynamicColors.subtext }]}>
                                He leído y acepto los{' '}
                                <ThemedText style={{ color: DynamicColors.accent, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => setShowTermsModal(true)}>
                                  Términos y Condiciones
                                </ThemedText>
                              </ThemedText>
                            </View>
                          </>
                        ) : (
                          <>
                            <ThemedTextInput label="Correo electrónico" value={form.email} onChangeText={(v: string) => setForm({...form, email: v})} placeholder="ejemplo@correo.com" autoCapitalize="none" keyboardType="email-address" />
                            <ThemedTextInput label="Contraseña" value={form.password} onChangeText={(v: string) => setForm({...form, password: v})} placeholder="********" secureTextEntry={true} />
                            
                            <TouchableOpacity 
                              onPress={() => setShowResetModal(true)} 
                              style={{ alignSelf: 'flex-end', marginBottom: 10, padding: 5 }}
                            >
                              <ThemedText style={{ fontSize: 12, color: DynamicColors.subtext, fontWeight: '700' }}>
                                ¿Olvidaste tu contraseña?
                              </ThemedText>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      <View style={styles.actionsContainer}>
                        <TouchableOpacity activeOpacity={0.8} onPress={handleAuthAction} disabled={isSubmitDisabled} style={[styles.styledLoginButton, isSubmitDisabled && { opacity: 0.4 }]}>
                          <LinearGradient colors={orangeGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtnStyled}>
                            <View style={styles.buttonInnerContainer}>
                              <MaterialCommunityIcons name={isRegistering ? "account-plus" : "login-variant"} size={20} color="white" />
                              <ThemedText style={styles.btnTextStyled}>{isRegistering ? (t.hometab.registerhome || "Crear Cuenta") : t.hometab.acces}</ThemedText>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          disabled={!request || isSubmitDisabled} 
                          style={[styles.googleButton, { borderColor: DynamicColors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }, isSubmitDisabled && { opacity: 0.4 }]}
                          onPress={() => promptAsync()}
                        >
                          <MaterialCommunityIcons name="google" size={20} color={isDark ? '#fff' : '#4285F4'} />
                          <ThemedText style={[styles.googleText, { color: DynamicColors.text }]}>{t.hometab.googleacount}</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setIsRegistering(!isRegistering); setAcceptedTerms(false); }} style={styles.switchModeContainer}>
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
      {renderTermsModal()} 
      {renderCompletionModal()}
      {renderResetPasswordModal()} 
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
  webSidebarBenefits: { marginTop: 30, gap: 20 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitText: { fontSize: 13, flex: 1, lineHeight: 18 },
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
  loginHeaderLeft: { textAlign: 'left', marginBottom: 10, fontSize: 14, fontWeight: '800', letterSpacing: 1, opacity: 0.7 },
  inputGap: { width: '100%', gap: 12 },
  labelDate: { fontSize: 11, fontWeight: '900', color: '#FF5F6D', marginBottom: 4, textTransform: 'uppercase' },
  dateInput: { borderRadius: 15, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  iosPickerContainer: { backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 15, marginTop: 5, overflow: 'hidden' },
  iosPickerDoneButton: { alignItems: 'flex-end', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  termsText: { fontSize: 12, marginLeft: 4, flex: 1 },
  actionsContainer: { width: '100%', alignItems: 'center', marginTop: 20 },
  styledLoginButton: { width: '90%', height: 52, borderRadius: 26, overflow: 'hidden', elevation: 4, shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4 },
  gradientBtnStyled: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonInnerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnTextStyled: { fontSize: 16, fontWeight: '800', color: 'white', marginLeft: 10 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '90%', height: 52, borderRadius: 26, borderWidth: 1, marginTop: 12 },
  googleText: { marginLeft: 10, fontWeight: '700', fontSize: 14 },
  switchModeContainer: { marginTop: 20, paddingBottom: 10 },
  switchModeText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalContent: { padding: 20 },
  modalFooter: { padding: 15, borderTopWidth: 1, alignItems: 'center' },
  nativeInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    marginTop: 5,
  }
});