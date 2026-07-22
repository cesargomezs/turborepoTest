import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 
  const [isSuccess, setIsSuccess] = useState(false); // ⬅️ NUEVO: Controla si mostramos el formulario o el éxito
  
  const { token } = useLocalSearchParams(); 
  const router = useRouter();

  // Función universal para intentar volver a la app o ir al index web
  const handleReturnToApp = async () => {
    try {
      // Intenta despertar la aplicación en iOS/Android
      //await Linking.openURL('viviendoenusa://');
      await Linking.openURL('exp://192.168.1.107:8081');
    } catch (error) {
      // Si falla (ej. escritorio), navega al inicio
      router.replace('/');
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!password || password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(process.env.EXPO_PUBLIC_URL_BACKEND+'/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("¡Tu contraseña ha sido actualizada con éxito!");
        setIsSuccess(true); // Cambiamos la vista a "Éxito"
      } else {
        setErrorMsg(data.error || "Error al actualizar la contraseña.");
      }
    } catch (err) {
      setErrorMsg("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.background} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        
        {isSuccess ? (
          /* ---------------- VISTA DE ÉXITO ---------------- */
          <View style={styles.successContainer}>
            <Text style={styles.title}>¡Todo listo!</Text>
            <Text style={styles.successText}>{successMsg}</Text>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleReturnToApp}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Abrir la aplicación</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ---------------- VISTA DE FORMULARIO ---------------- */
          <>
            <Text style={styles.title}>Nueva Contraseña</Text>
            <Text style={styles.subtitle}>
              Ingresa la nueva contraseña que utilizarás para acceder a tu cuenta.
            </Text>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>NUEVA CONTRASEÑA</Text>
              <TextInput 
                style={styles.input}
                placeholder="********" 
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Guardar Contraseña</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleReturnToApp}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Volver a la aplicación</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: { 
    flex: 1, 
    backgroundColor: '#333333', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20, 
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF5F6D', 
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: { 
    backgroundColor: '#F8F9FA',
    borderWidth: 1, 
    borderColor: '#E9ECEF', 
    paddingHorizontal: 15, 
    paddingVertical: 14,
    borderRadius: 12, 
    fontSize: 16,
    color: '#333333',
  },
  button: { 
    backgroundColor: '#FF5F6D', 
    paddingVertical: 15, 
    paddingHorizontal: 30, // Asegura que el botón se vea bien cuando está solo
    width: '100%',
    borderRadius: 25, 
    alignItems: 'center',
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 30, // Más espacio para separarlo del botón final
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  }
});