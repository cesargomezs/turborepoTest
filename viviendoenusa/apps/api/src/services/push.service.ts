import { db } from "../../../../packages/db/src"; // Ajusta la ruta a tu db
import { userDevices } from "../../../../packages/db/src/schema"; // Ya no importamos notifications aquí
import { eq } from "drizzle-orm";

export const sendPushNotificationToUser = async ({
  userId,
  title,
  body,
  data = {}
}: {
  userId: string;
  title: string;
  body: string;
  data?: any;
  type?: string;
  referenceId?: string;
}) => {
  try {
    console.log(`🔔 [PUSH SERVICE] Iniciando envío a Expo para el usuario: ${userId}`);

    // 1. Buscar directamente en la tabla user_devices (No se necesita JOIN, esto es directo y más rápido)
    const devices = await db.select()
      .from(userDevices)
      .where(eq(userDevices.userId, userId));

    if (!devices || devices.length === 0) {
      console.log(`🔕 [PUSH SERVICE] El usuario ${userId} no tiene tokens registrados en user_devices.`);
      return;
    }

    console.log(`📱 [PUSH SERVICE] Se encontraron ${devices.length} dispositivo(s). Enviando...`);

    // 2. Preparar los mensajes para Expo
    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    }));

    // 3. Disparar el envío a Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`🚀 [PUSH SERVICE] Respuesta de Expo:`, JSON.stringify(result));
  } catch (error) {
    console.error("❌ [PUSH SERVICE] Error enviando push:", error);
  }
};