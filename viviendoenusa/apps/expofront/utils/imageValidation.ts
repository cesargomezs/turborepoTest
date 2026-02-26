export async function validarImagenEnServidor(uri: string): Promise<boolean> {
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;
  
      // @ts-ignore
      formData.append('image', { uri, name: filename, type });
  
      const response = await fetch('http://192.168.1.107:3000/validate-nsfw', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      const data = await response.json();
      return data.isSafe; // El backend debe responder { isSafe: true/false }
    } catch (error) {
      console.error("Error validando:", error);
      return true; // En caso de error de red, permitimos por defecto
    }
  }