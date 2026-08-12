import * as FileSystem from 'expo-file-system/legacy'; // 🚀 ¡EL ARREGLO ESTÁ AQUÍ! 
import { Platform, Share } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

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
  const promoText = "\n\n🌐 ¿Quieres saber más de nosotros?\nIngresa a https://viviendoenusa.app";
  const defaultMsg = `🇺🇸 *Viviendo en USA*\n\n*${item.title}*\n${item.description}${item.phone ? `\n📞 Tel: ${item.phone}` : ''}${item.address ? `\n📍 Dir: ${item.address}${item.zip ? ` (${item.zip})` : ''}` : ''}`;
  
  const fullMessage = (item.customMessage || defaultMsg) + promoText;

  let finalImageUrl = item.image || '';
  
  if (finalImageUrl && !finalImageUrl.startsWith('http')) {
      const SUPABASE_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL 
        ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public`
        : 'https://pwznamxpdzwppmpiyizp.supabase.co/storage/v1/object/public'; 
      finalImageUrl = `${SUPABASE_BASE}/${finalImageUrl}`;
  }

  try {
    if (Platform.OS === 'web' || !finalImageUrl || finalImageUrl.length < 5) {
      await Share.share({ message: fullMessage, title: item.title });
      return;
    }

    // @ts-ignore
    const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const originalDest = `${directory}temp_original_${Date.now()}.webp`;
    
    // 🚀 AHORA ESTA LÍNEA SÍ VA A FUNCIONAR SIN EXPLOTAR EN EXPO 54
    const { uri: downloadedUri } = await FileSystem.downloadAsync(finalImageUrl, originalDest);

    let localUri = downloadedUri; 

    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            downloadedUri,
            [], 
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG } 
        );
        localUri = manipResult.uri; 
    } catch (manipError) {
        console.log("Aviso: No se pudo convertir a JPG, usando archivo original.");
    }

    await Share.share({
      message: fullMessage,
      url: localUri, 
      title: item.title,
    });

  } catch (error) {
    console.log("Error crítico al compartir:", error);
    Share.share({
      message: fullMessage,
      title: item.title
    });
  }
};