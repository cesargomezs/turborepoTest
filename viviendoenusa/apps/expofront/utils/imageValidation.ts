import { Platform } from "react-native";

export async function validarImagenEnServidor(uri: string): Promise<boolean> {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // En React Native, el objeto del archivo debe tener esta estructura
    // @ts-ignore
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    });

    const response = await fetch('http://192.168.1.107:3000/validate-nsfw', {
      method: 'POST',
      body: formData,
      headers: {
        // ELIMINADO: 'Content-Type': 'multipart/form-data'
        // Dejamos los headers vacíos o solo con 'Accept' para que fetch 
        // genere automáticamente el Content-Type con el Boundary correcto.
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Server status: ${response.status}`);
    }

    const data = await response.json();
    return data.isSafe; 
  } catch (error) {
    console.error("Error validando imagen en el servidor:", error);
    // Si falla la validación por red, tú decides si dejar pasar (true) o bloquear (false).
    return true; 
  }
}