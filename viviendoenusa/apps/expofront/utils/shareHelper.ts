import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

export type ShareableContent = {
  title: string;
  description: string;
  phone?: string;
  address?: string;
  zip?: string;
  image?: string;
  customMessage?: string;
};

export const handleUniversalShare = async (item: ShareableContent) => {
  try {
    // 🇺🇸 Mensaje optimizado para una excelente experiencia de usuario
    const defaultMsg = `🇺🇸 *Viviendo en USA*\n\n*${item.title}*\n${item.description}${item.phone ? `\n📞 Tel: ${item.phone}` : ''}${item.address ? `\n📍 Dir: ${item.address}${item.zip ? ` (${item.zip})` : ''}` : ''}`;
    
    const fullMessage = item.customMessage || defaultMsg;

    // Si es web o no hay imagen válida, usamos el Share nativo de texto
    if (Platform.OS === 'web' || !item.image || item.image.length < 5) {
      await Share.share({
        message: `${fullMessage}\n\n${item.image || ''}`,
        title: item.title
      });
      return;
    }

    // Descarga temporal de la imagen física para dispositivos móviles
    const filename = item.image.split('/').pop() || 'compartido.jpg';
    
    // @ts-ignore - Forzamos a TypeScript a ignorar la advertencia, la propiedad sí existe en runtime
    const directory = FileSystem.documentDirectory;
    const downloadDest = `${directory}${filename}`;
    
    // Descargamos la imagen usando el FileSystem estándar
    const { uri } = await FileSystem.downloadAsync(item.image, downloadDest);

    // Estrategia dividida según plataforma
    if (Platform.OS === 'ios') {
      await Share.share({
        message: fullMessage,
        url: uri,
      });
    } else {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: item.title,
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
          message: fullMessage,
        } as any);
      } else {
        await Share.share({
          message: `${fullMessage}\n\n${item.image}`,
          title: item.title
        });
      }
    }
  } catch (error) {
    console.log("Error al compartir:", error);
    Share.share({
      message: `*${item.title}*\n${item.description}`,
      title: item.title
    });
  }
};