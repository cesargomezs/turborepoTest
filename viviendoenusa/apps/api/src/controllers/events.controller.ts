import { db } from "../../../../packages/db/src"; 
import { events, users, notifications, payments, tariffs, typeDetail, userDevices } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, inArray } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; // 🚀 IMPORTACIÓN DE LA LIBRERÍA DE GEOLOCALIZACIÓN

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

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS
const sanitizeText = (str: any): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🛡️ BARRERA DE SANITIZACIÓN PARA OBJETOS
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

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentEventPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Event%'`, 
        eq(tariffs.isActive, true),
        eq(tariffs.planType, currentYear) 
      )
    )
    .limit(1);

    if (activeTariff && activeTariff.length > 0 && activeTariff[0].price) {
      return activeTariff[0].price;
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN, usando $50.00 por defecto");
  }
  return "50.00";
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
      console.log("🔕 [PUSH MASIVO EVENTOS] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: "event", referenceId: payload.referenceId },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO EVENTOS] Enviando ${messages.length} notificaciones en la zona...`);

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
    console.log(`✅ [PUSH MASIVO EVENTOS] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO EVENTOS] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (Optimizada con Geofencing Local)
// =====================================================================
export const getEvents = async (zip?: string) => {
  try {
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;
    
    // Condición base de visibilidad
    let baseConditions = eq(events.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021');
    let finalConditions: any = baseConditions;

    // 🚀 Lógica de Geofencing Súper Rápida
    if (cleanZipParam && cleanZipParam.length === 5) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(events.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(events.zip, cleanZipParam));
      }
    }

    let query = db
      .select({
        events: events,
        users: users,
        payments: payments,
      })
      .from(events)
      .leftJoin(users, eq(events.userId, users.id)) 
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
      .where(finalConditions)
      .orderBy(desc(events.timepostEnd));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    return await Promise.all(rows.map(async (row: any) => {
        const dbEvent = row.events;
        const dbUser = row.users;
        const dbPayment = row.payments;

        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbEvent.imageEven;
        let publicUrl = fileName; 

        if (fileName && typeof fileName === 'string' && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`events/${fileName.replace('events/', '')}`, 3600); 
            if (data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { 
            ...dbEvent,
            imageEven: publicUrl, 
            ownerName: nombreUsuario,
            referenceCode: dbPayment?.referenceCode,
            paymentMethod: dbPayment?.paymentMethod || '',
        }; 
    }));
  } catch (error) {
    console.error("❌ Error en getEvents:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID CON PAGOS
// =====================================================================
export const getEventById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id))
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
      .where(eq(events.id, cleanId));

    if (!rows || rows.length === 0) return null;

    const dbEvent = rows[0].events;
    const dbUser = rows[0].users;
    const dbPayment = rows[0].payments;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    let publicUrl = dbEvent.imageEven;

    if (publicUrl && typeof publicUrl === 'string' && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('events/', '');
        const { data, error } = await supabase.storage
            .from(NOMBRE_BUCKET).createSignedUrl(`events/${cleanName}`, 3600);
            
        if (!error && data?.signedUrl) {
            publicUrl = data.signedUrl;
        }
    }

    return {
        ...dbEvent,
        imageEven: publicUrl,
        ownerName: nombreUsuario,
        referenceCode: dbPayment?.referenceCode,
        paymentMethod: dbPayment?.paymentMethod || '',
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el evento por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR EVENTO
// =====================================================================
export const createEvent = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);
    
    // 🚀 VALIDACIÓN ESTRICTA DEL USER_ID (Eliminada la falla del Fallback User)
    const validUserId = sanitizeText(cleanData.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para registrar un evento.");
    }

    // 🚀 Coordenadas sincrónicas locales
    const { lat, lng } = getCoordsFromZip(cleanData.zip || '');

    let cleanImage = cleanData.imageEven || '';
    if (typeof cleanImage === 'string' && cleanImage.startsWith('events/')) {
        cleanImage = cleanImage.replace('events/', '');
    }

    return await db.transaction(async (tx) => {

      const safeDesc = sanitizeText(data.description || data.descriptionLawy) || '';
      const planSeleccionado = data.premiumPlan || data.premium_plan || 'basic'; 

        const payload: any = {
          title: cleanData.title || 'Sin título',
          categoryIdx: cleanData.categoryIdx || 0,
          dateEvent: cleanData.dateEvent || new Date().toISOString(),
          timeStart: cleanData.timeStart || '',
          timeEnd: cleanData.timeEnd || '',
          descriptionEven: cleanData.descriptionEven || '',
          imageEven: cleanImage,
          locationEven: cleanData.locationEven || '',
          lat: lat,
          lng: lng,
          zip: cleanData.zip ? String(cleanData.zip).trim() : '',
          estate: cleanData.estate || '',
          phone: cleanData.phone || '',
          contactMethod: cleanData.contactMethod || 'whatsapp',
          statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
          premiumPlan: planSeleccionado,
          userId: validUserId, // 🚀 SE USA EL ID VALIDADO Y SEGURO
          approved: false, 
        };

        const [newEvent] = await tx.insert(events).values(payload).returning();

        if (cleanData.referenceCode && cleanData.paymentMethod) {
            
            const today = new Date();
            const eventDate = new Date(payload.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            await tx.insert(payments).values({
              entityType: 'event', 
              entityId: newEvent.id,
              userId: validUserId, 
              referenceCode: String(cleanData.referenceCode).trim(), 
              paymentMethod: String(cleanData.paymentMethod).trim(), 
              amount: data.tariffPlan || await getCurrentEventPrice(),
              durationDays: daysLeft, 
              timepost_end: eventDate,
              status: "pending"
            });
        }

        return {
           ...newEvent,
           referenceCode: cleanData.referenceCode,
           paymentMethod: cleanData.paymentMethod
        };
    });
  } catch (error: any) { 
    console.error("❌ Error en createEvent:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado.");
    }
    throw new Error(`Error al crear el evento: ${error.message}`);
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR EVENTO Y PROGRAMAR NOTIFICACIONES
// =====================================================================
export const updateEvent = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const cleanPayload = sanitizePayload(data);
    let pushNotificationData: any = null;

    if (cleanPayload.imageEven && typeof cleanPayload.imageEven === 'string' && cleanPayload.imageEven.startsWith('events/')) {
        cleanPayload.imageEven = cleanPayload.imageEven.replace('events/', '');
    }
    
    // 🚀 Obtenemos el registro actual para validar si ya había sido aprobado
    const [existingEvent] = await db.select().from(events).where(eq(events.id, cleanId));
    if (!existingEvent) throw new Error("Evento no encontrado");
    
    const wasApprovedBefore = existingEvent.approved === true;

    const eventResult = await db.transaction(async (tx) => {
        if (cleanPayload.approved === true) {
            cleanPayload.createdAt = new Date();
        }

        const updated = await tx.update(events).set(cleanPayload).where(eq(events.id, cleanId)).returning();
        const event = updated[0];

        if (!event) throw new Error("No se pudo encontrar el evento actualizado");

        if (cleanPayload.approved === true) {
            const expirationDate = event.dateEvent ? new Date(event.dateEvent) : new Date();

            await tx.update(payments)
                .set({ 
                    status: 'approved', 
                    approvedAt: new Date(), 
                    timepost_end: expirationDate 
                })
                .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'event')));
        }

        // 🚀 LÓGICA DE NOTIFICACIONES (Solo si se aprueba ahora mismo)
        if (cleanPayload.approved === true && !wasApprovedBefore && event && event.dateEvent) {
            const today = new Date();
            const eventDate = new Date(event.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // 1. Recordatorios programados para el DUEÑO del evento (Si existe un ID válido)
            if (totalDaysLeft >= 0 && event.userId) {
                const notifsToInsert = [];
                for (let i = 0; i <= totalDaysLeft; i++) {
                    const daysRemaining = totalDaysLeft - i;
                    const showDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
                    let shouldCreate = false;
                    let message = "";

                    if (daysRemaining === 0) {
                        shouldCreate = true;
                        message = `¡Es hoy! No te pierdas: ${event.title}`;
                    } else if (daysRemaining > 0 && daysRemaining <= 10) {
                        shouldCreate = true;
                        message = `¡Faltan solo ${daysRemaining} días para ${event.title}!`;
                    } else if (daysRemaining > 10) {
                        if (daysRemaining % 2 === 0) { 
                            shouldCreate = true;
                            message = `Faltan ${daysRemaining} días para el evento: ${event.title}`;
                        }
                    }

                    if (shouldCreate) {
                        const notifObj: any = {
                            title: "Recordatorio de Evento 📅",
                            description: message,
                            type: "event", 
                            visibleAt: showDate, 
                            userId: event.userId as string, 
                        };

                        if ('referenceId' in notifications) notifObj.referenceId = String(event.id);
                        else if ('reference_id' in notifications) notifObj.reference_id = String(event.id);

                        notifsToInsert.push(notifObj);
                    }
                }

                if (notifsToInsert.length > 0) {
                    await tx.insert(notifications).values(notifsToInsert);
                }
            }

            // 2. 🚀 NUEVA LÓGICA MASIVA: Notificar a todos en un radio de 20 millas
            console.log("✅ [DEBUG PUSH EVENTOS] Evento aprobado. Buscando usuarios cercanos...");
            
            const titleText = "¡Nuevo Evento en tu área! 🎉";
            const bodyText = `Se ha publicado: ${event.title}. ¡Revisa los detalles!`;
            let usersToNotify: { id: string }[] = [];

            if (event.zip) {
                const nearbyZips = zipcodes.radius(event.zip as any, Number(radiusMiles)); 

                if (nearbyZips && nearbyZips.length > 0) {
                    usersToNotify = await tx.select({ id: users.id })
                                            .from(users)
                                            .where(inArray(users.zip, nearbyZips as string[]));
                } else {
                    usersToNotify = await tx.select({ id: users.id })
                                            .from(users)
                                            .where(eq(users.zip, String(event.zip)));
                }
            }

            if (usersToNotify.length > 0) {
                const massNotifs = usersToNotify.map(u => {
                    const payload: any = {
                        title: titleText,
                        description: bodyText,
                        type: "event", 
                        visibleAt: new Date(), 
                        userId: u.id,
                        isRead: false
                    };
                    if ('referenceId' in notifications) payload.referenceId = String(event.id);
                    else if ('reference_id' in notifications) payload.reference_id = String(event.id);
                    return payload;
                });

                await tx.insert(notifications).values(massNotifs);

                pushNotificationData = {
                    title: titleText,
                    body: bodyText,
                    referenceId: String(event.id),
                    userIds: usersToNotify.map(u => u.id) 
                };
            }
        }

        return event || null;
    });

    // 🚀 ENVÍO PUSH FUERA DE LA TRANSACCIÓN
    if (pushNotificationData) {
        sendMassPushNotification(pushNotificationData).catch(err => {
           console.error("❌ [DEBUG PUSH] Falló el Push Notification:", err);
        });
    }

    return eventResult;

  } catch (error: any) { 
    throw new Error(`Error al actualizar el evento: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 5. ELIMINAR EVENTO
// =====================================================================
export const deleteEvent = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(events).where(eq(events.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el evento: ${error.message}`);
  }
};