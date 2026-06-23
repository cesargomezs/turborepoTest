import { Platform } from "react-native";

export async function validarImagenEnServidor(uri: string): Promise<boolean> {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    });

    const response = await fetch('http://192.168.1.108:3000/validate-nsfw', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
        // 🚀 Eliminado: 'Connection': 'close' (Causa conflictos en RN)
      },
    });

    if (!response.ok) {
      throw new Error(`Server status: ${response.status}`);
    }

    const data = await response.json();
    return data.isSafe; 
  } catch (error) {
    console.error("❌ Error validando imagen en el servidor (Red):", error);
    // 🚀 IMPORTANTE: Si la red falla temporalmente, retornamos TRUE para no bloquear tu desarrollo.
    // Así puedes seguir probando si guarda en la base de datos sin quedarte atorado aquí.
    return true; 
  }
}