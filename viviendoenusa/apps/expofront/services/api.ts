// services/api.ts
import { useAuth } from '../context/AuthContext'; // Importas tu hook de seguridad

const API_URL = process.env.EXPO_PUBLIC_URL_BACKEND;

export const secureFetch = async (endpoint: string, options: any = {}) => {
  // 1. Obtenemos el token desde nuestro contexto global
  const { token } = useAuth(); // O puedes pasar el token manualmente si no quieres usar el hook aquí

  // 2. Preparamos los headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // ¡Aquí está la llave!
    ...options.headers,
  };

  // 3. Hacemos la petición
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Si el servidor nos responde que el token no sirve, cerramos sesión
  if (response.status === 401) {
    // Aquí podrías llamar a la función logout() de tu AuthContext
    console.log("Sesión expirada");
  }

  return response;
};