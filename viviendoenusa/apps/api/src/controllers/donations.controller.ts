import { db } from "../../../../packages/db/src"; 
import { donations, users, notifications, userDevices } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, inArray, or } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; 

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE Y CONSTANTES
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const radiusMiles = process.env.RADIUMILE || 20; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS (Sin internet, súper rápida)
// =====================================================================
const getCoordsFromZip = (zip: string) => {
  if (!zip) return { lat: 34.0934, lng: -117.5847 };
  
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
// 🛡️ FUNCIONES DE SEGURIDAD (SANITIZACIÓN MEJORADA PARA UUIDs)
// =====================================================================
const sanitizeText = (str: any) => {
  if (!str) return null;
  if (typeof str !== 'string') str = String(str);
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

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA DONACIONES
// =====================================================================
const sendTelegramAlert = async (userId: string, zip: string, titlePreview: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) return;

  const shortTitle = titlePreview.length > 40 ? titlePreview.substring(0, 40) + '...' : titlePreview;
  const message = `🎁 *NUEVA DONACIÓN REGISTRADA*\n\n*Usuario ID:* ${userId}\n*ZIP:* ${zip}\n*Artículo:* "${shortTitle}"\n\n⚠️ Ingresa al panel para verificar y aprobar.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });
  } catch (err) {
    console.error("❌ Error enviando alerta a Telegram:", err);
  }
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (DONACIONES + BADGE DINÁMICO)
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

    const messages = [];

    for (const device of devices) {
      const [unreadResult] = await db.select({
        count: sql<number>`count(*)`
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, device.userId),
          eq(notifications.isRead, false)
        )
      );

      const unreadCount = Number(unreadResult?.count) || 1;

      messages.push({
        to: device.expoPushToken,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        badge: unreadCount, 
        data: { type: "donation", referenceId: payload.referenceId },
      });
    }

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
// 🔍 1. OBTENER DONACIONES (DEVUELVE TODOS LOS PENDIENTES SIN RESTRICCIONES)
// =====================================================================
export const getDonations = async (rawZip?: string | number, userId?: string) => {
  try {
    const cleanZipParam = rawZip ? sanitizeText(String(rawZip)) || '' : '';
    const cleanUserId = userId ? sanitizeText(String(userId)) : null;

    // 🚀 IGUAL QUE EN ABOGADOS Y COMUNIDAD: Enviamos todos los registros (aprobados y pendientes)
    let baseConditions = cleanUserId 
      ? sql`(${donations.approved} = false OR ${donations.approved} = true OR ${donations.userId} = ${cleanUserId})`
      : sql`(${donations.approved} = false OR ${donations.approved} = true)`;

    let finalConditions: any = baseConditions;

    if (cleanZipParam && cleanZipParam.length === 5) {
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
            }
        }

        const isAppr = dbDonation.approved === true || String(dbDonation.approved).toLowerCase() === 'true';

        return { 
            ...dbDonation, 
            image: publicUrl, 
            imageUrl: publicUrl,
            approved: isAppr,
            status: isAppr ? 'approved' : 'pending',
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
// 📥 2. CREAR DONACIÓN (NACE PENDIENTE + ALERTA TELEGRAM)
// =====================================================================
export const createDonation = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);

    const validUserId = sanitizeText(cleanData.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para registrar una donación.");
    }

    const { lat, lng } = getCoordsFromZip(cleanData.zip || '');

    const dbPayload: any = {
      title: cleanData.title || 'Sin título', 
      categoryIdx: Number(cleanData.categoryIdx || 1),
      phone: cleanData.phone || '',
      zip: String(cleanData.zip || '').trim(),
      lat: lat, 
      lng: lng, 
      contactMethod: cleanData.contactMethod || 'whatsapp',
      approved: false, 
      estate: cleanData.estate, 
      descriptionDon: cleanData.description || '',
      locationDon: cleanData.location || 'Rancho Cucamonga',
      imageUrl: cleanData.image ? cleanData.image.replace('donations/', '') : '',
      userId: validUserId 
    };

    const createdDonationResult = await db.transaction(async (tx) => {
      const newDonation = await tx.insert(donations).values(dbPayload).returning();
      return newDonation[0];
    });

    sendTelegramAlert(
      validUserId, 
      cleanData.zip || 'N/A', 
      cleanData.title || 'Sin título'
    ).catch(e => console.log("Telegram alert failed", e));

    return {
      ...createdDonationResult,
      approved: false,
      status: 'pending',
      message: "¡Donación recibida! Nuestro equipo la revisará y estará visible en las próximas 24 horas."
    };

  } catch (error: any) { 
    console.error("❌ Error en createDonation:", error);
    throw new Error(`Error al crear la donación: ${error.message}`);
  }
};

// =====================================================================
// 🔄 3. ACTUALIZAR ESTADO DE LA DONACIÓN (Y DISPARAR PUSH AL APROBAR)
// =====================================================================
export const updateDonationStatus = async (idParam: any, status?: string, approved?: boolean) => {
  let cleanId: string | null = null;
  try {
    let rawId = idParam;
    if (idParam && typeof idParam === 'object') {
      rawId = idParam.params?.id || idParam.id;
    }

    cleanId = sanitizeText(rawId);
    if (!cleanId) throw new Error("ID inválido");

    const [existing] = await db.select().from(donations).where(eq(donations.id, cleanId));
    if (!existing) throw new Error("Donación no encontrada");

    const updatePayload: any = {};

    if (approved !== undefined) {
      updatePayload.approved = Boolean(approved);
    }

    if (status) {
      const cleanStatus = sanitizeText(status);
      if (cleanStatus === 'delivered') {
        updatePayload.statusId = '6a226ffa-9edf-4886-931f-64299f8a6f7f';
      } else if (cleanStatus === 'active') {
        updatePayload.statusId = '31a06434-8ed8-45d2-b95f-65bd314bc021';
        updatePayload.approved = true;
      }
    }

    if (updatePayload.approved === true) {
      updatePayload.createdAt = new Date();
    }

    const updated = await db
      .update(donations)
      .set(updatePayload) 
      .where(eq(donations.id, cleanId)) 
      .returning();
      
    const donationRecord = updated[0] || null;

    const isApprovedNow = donationRecord && (donationRecord.approved === true || String(donationRecord.approved).toLowerCase() === 'true');
    const wasApprovedBefore = existing && (existing.approved === true || String(existing.approved).toLowerCase() === 'true');

    if (isApprovedNow && !wasApprovedBefore && donationRecord) {
      console.log("✅ [DEBUG PUSH DONACIONES] Donación aprobada por admin. Calculando usuarios en zona...");

      const titleText = "¡Nueva Donación en tu área! 🎁";
      const rawText = donationRecord.descriptionDon || 'Alguien está regalando algo cerca de ti. ¡Revisa la app!';
      const bodyText = rawText.length > 40 ? rawText.substring(0, 40) + '...' : rawText;
      
      let usersToNotify: { id: string }[] = [];

      if (donationRecord.zip) {
        const nearbyZips = zipcodes.radius(donationRecord.zip as any, Number(radiusMiles)); 

        if (nearbyZips && nearbyZips.length > 0) {
          usersToNotify = await db.select({ id: users.id })
                                  .from(users)
                                  .where(and(inArray(users.zip, nearbyZips as string[]), sql`${users.id} != ${donationRecord.userId}`)); 
        } else {
          usersToNotify = await db.select({ id: users.id })
                                  .from(users)
                                  .where(and(eq(users.zip, String(donationRecord.zip)), sql`${users.id} != ${donationRecord.userId}`));
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

        await db.insert(notifications).values(notificationsToInsert);

        const pushPayload = {
          title: titleText,
          body: bodyText,
          referenceId: String(donationRecord.id),
          userIds: usersToNotify.map(u => u.id) 
        };

        sendMassPushNotification(pushPayload).catch(err => {
           console.error("❌ [DEBUG PUSH] Falló el Push Notification de donaciones:", err);
        });
      }
    }

    return donationRecord;
  } catch (error: any) { 
    console.error(`❌ Error al actualizar estado de ${cleanId || idParam}:`, error);
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 4. ELIMINAR DONACIÓN
// =====================================================================
export const deleteDonation = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(donations).where(eq(donations.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la donación: ${error.message}`);
  }
};