import { db } from "../../../../packages/db/src"; 
import { donations, users, notifications, userDevices } from "../../../../packages/db/src/schema"; // 🚀 Agregado notifications y userDevices
import { eq, desc, sql, and, inArray } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; // 🚀 IMPORTACIÓN DE LA LIBRERÍA DE GEOLOCALIZACIÓN

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE Y CONSTANTES
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const radiusMiles = process.env.RADIUMILE || 20; // 🚀 Radio estandarizado a 20 millas
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS (Sin internet, súper rápida)
// =====================================================================
const getCoordsFromZip = (zip: string) => {
  if (!zip) return { lat: 34.0934, lng: -117.5847 };
  
  // 🚀 bypass de TypeScript con as any
  const locationInfo = zipcodes.lookup(zip as any);
  
  if (locationInfo) {
    return { 
      lat: locationInfo.latitude, 
      lng: locationInfo.longitude 
    };
  }
  
  return { lat: 34.0934, lng: -117.5847 };
};

// =====================================================================
// 🛡️ FUNCIONES DE SEGURIDAD (SANITIZACIÓN)
// =====================================================================
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

const sanitizePayload = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const sanitizedData: any = {};
  for (const key in data) {
    if (typeof data[key] === 'string') {
      sanitizedData[key] = sanitizeText(data[key]);
    } else {
      sanitizedData[key] = data[key];
    }
  }
  return sanitizedData;
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (FILTRADO POR USUARIOS CERCANOS)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO DONACIONES] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: "donation", referenceId: payload.referenceId },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO DONACIONES] Enviando ${messages.length} notificaciones en la zona...`);

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }
    console.log(`✅ [PUSH MASIVO DONACIONES] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO DONACIONES] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 🔍 1. OBTENER DONACIONES (CON FILTRO DE DISTANCIA ULTRARRÁPIDO)
// =====================================================================
export const getDonations = async (zip?: string) => {
  try {
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;

    if (zip && (!cleanZipParam || cleanZipParam.length !== 5)) return []; 

    let baseConditions = eq(donations.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021');
    let finalConditions: any = baseConditions;

    // 🚀 Lógica de Geofencing Súper Rápida
    if (cleanZipParam) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(donations.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(donations.zip, cleanZipParam));
      }
    }

    let query = db
      .select({
        donations: donations,
        users: users,
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .where(finalConditions)
      .orderBy(desc(donations.id)); 

    const rows = await query;
    
    if (!rows || rows.length === 0) return [];

    const finalDonations = await Promise.all(rows.map(async (row: any) => {
        const dbDonation = row.donations;
        const dbUser = row.users;

        const fileName = dbDonation.imageUrl || dbDonation.image;
        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        let publicUrl = fileName; 

        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('donations/', '');
            
            const { data, error } = await supabase.storage
                .from(NOMBRE_BUCKET)
                .createSignedUrl(`donations/${cleanName}`, 3600); 
            
            if (data?.signedUrl) {
                publicUrl = data.signedUrl;
            } else if (error) {
                console.warn(`⚠️ Error de Supabase al firmar imagen donación ${dbDonation.id}:`, error.message);
            }
        }

        return { 
            ...dbDonation, 
            image: publicUrl, 
            imageUrl: publicUrl,
            status: dbDonation.status_id || 'active',
            ownerName: nombreUsuario
        }; 
    }));

    return finalDonations;
  } catch (error) {
    console.error("❌ Error en getDonations:", error);
    return [];
  }
};

// =====================================================================
// 📥 2. CREAR DONACIÓN (INCLUYENDO COORDENADAS Y PUSH MASIVO)
// =====================================================================
export const createDonation = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);

    // 🚀 VALIDACIÓN ESTRICTA DEL USER_ID (Eliminada la falla de seguridad)
    const validUserId = sanitizeText(cleanData.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para registrar una donación.");
    }

    // 🚀 Obtenemos las coordenadas a partir del ZIP de forma local y sincrónica
    const { lat, lng } = getCoordsFromZip(cleanData.zip || '');

    const dbPayload: any = {
      title: cleanData.title || 'Sin título', 
      categoryIdx: Number(cleanData.categoryIdx || 1),
      phone: cleanData.phone || '',
      zip: String(cleanData.zip || '').trim(),
      lat: lat, 
      lng: lng, 
      contactMethod: cleanData.contactMethod || 'whatsapp',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      estate: cleanData.estate, 
      descriptionDon: cleanData.description || '',
      locationDon: cleanData.location || 'Rancho Cucamonga',
      imageUrl: cleanData.image ? cleanData.image.replace('donations/', '') : '',
      userId: validUserId // 🚀 SE USA EL ID VALIDADO
    };

    let pushNotificationData: any = null;

    const createdDonationResult = await db.transaction(async (tx) => {
      const newDonation = await tx.insert(donations).values(dbPayload).returning();
      const donationRecord = newDonation[0];

      // 🚀 NOTIFICACIONES MASIVAS (GEOFENCING 20 MILLAS)
      console.log("✅ [DEBUG PUSH DONACIONES] Donación creada. Calculando usuarios en zona...");

      const titleText = "¡Nueva Donación en tu área! 🎁";
      const rawText = cleanData.description || 'Alguien está regalando algo cerca de ti. ¡Revisa la app!';
      const bodyText = rawText.length > 40 ? rawText.substring(0, 40) + '...' : rawText;
      
      let usersToNotify: { id: string }[] = [];

      if (cleanData.zip) {
        const nearbyZips = zipcodes.radius(cleanData.zip as any, Number(radiusMiles)); 

        if (nearbyZips && nearbyZips.length > 0) {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(inArray(users.zip, nearbyZips as string[]), sql`${users.id} != ${validUserId}`)); 
        } else {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(eq(users.zip, String(cleanData.zip)), sql`${users.id} != ${validUserId}`));
        }
      }

      if (usersToNotify.length > 0) {
        const notificationsToInsert = usersToNotify.map(u => {
          const payload: any = {
            title: titleText,
            description: bodyText,
            type: "donation", 
            visibleAt: new Date(), 
            userId: u.id,
            isRead: false
          };
          if ('referenceId' in notifications) payload.referenceId = String(donationRecord.id);
          else if ('reference_id' in notifications) payload.reference_id = String(donationRecord.id);
          return payload;
        });

        await tx.insert(notifications).values(notificationsToInsert);

        pushNotificationData = {
          title: titleText,
          body: bodyText,
          referenceId: String(donationRecord.id),
          userIds: usersToNotify.map(u => u.id) 
        };
      }

      return donationRecord;
    });

    // 🚀 ENVÍO PUSH FUERA DE LA TRANSACCIÓN
    if (pushNotificationData) {
      sendMassPushNotification(pushNotificationData).catch(err => {
         console.error("❌ [DEBUG PUSH] Falló el Push Notification de donaciones:", err);
      });
    }

    return createdDonationResult;

  } catch (error: any) { 
    console.error("❌ Error en createDonation:", error);
    throw new Error(`Error al crear la donación: ${error.message}`);
  }
};

// =====================================================================
// 🔄 3. ACTUALIZAR ESTADO DE LA DONACIÓN
// =====================================================================
export const updateDonationStatus = async (id: string, status: string) => {
  try {
    const cleanId = sanitizeText(id);
    const cleanStatus = sanitizeText(status) || 'active';

    if (!cleanId) throw new Error("ID inválido");

    const updated = await db
      .update(donations)
      .set({ estate: cleanStatus }) 
      .where(eq(donations.id, cleanId)) 
      .returning();
      
    return updated[0] || null;
  } catch (error: any) { 
    console.error(`❌ Error al actualizar estado de ${id}:`, error);
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }
};