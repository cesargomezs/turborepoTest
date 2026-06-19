import { db } from "../../../../packages/db/src"; 
import { events, users, notifications, payments, tariffs, typeDetail } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

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

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD usando un JOIN con typeDetail
const getCurrentEventPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.price })
    .from(tariffs)
    // 🚀 FIX CRÍTICO: Forzamos el ::text para que Postgres no rechace el cruce UUID vs TEXT
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
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
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN, usando $120.00 por defecto");
  }
  return "50.00";
};

// 🔍 1. CONSULTA GENERAL CON PAGOS
export const getEvents = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id)) 
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'Event')))
      .$dynamic(); 

    const cleanZipParam = zip ? sanitizeText(String(zip)) : '';

    if (cleanZipParam && cleanZipParam.length === 5) {
      query = query.where(sql`${events.zip}::text = ${cleanZipParam}`); 
    }

    query = query.orderBy(desc(events.timepostEnd));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const finalEvents = await Promise.all(rows.map(async (row: any) => {
        const dbEvent = row.events;
        const dbUser = row.users;
        const dbPayment = row.payments;

        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbEvent.imageEven;
        let publicUrl = fileName; 

        if (fileName && typeof fileName === 'string' && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('events/', '');
            const rutaArchivo = `events/${cleanName}`;

            const { data, error } = await supabase.storage
                .from(NOMBRE_BUCKET)
                .createSignedUrl(rutaArchivo, 3600); 

            if (!error && data?.signedUrl) {
                publicUrl = data.signedUrl;
            } else if (error) {
                console.warn(`⚠️ Error firmando imagen de evento ${dbEvent.id}:`, error.message);
            }
        }

        return { 
            ...dbEvent,
            imageEven: publicUrl, 
            ownerName: nombreUsuario,
            referenceCode: dbPayment?.referenceCode || '',
            paymentMethod: dbPayment?.paymentMethod || '',
        }; 
    }));

    return finalEvents;
  } catch (error) {
    console.error("❌ Error en getEvents:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID CON PAGOS
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
        referenceCode: dbPayment?.referenceCode || '',
        paymentMethod: dbPayment?.paymentMethod || '',
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el evento por ID: ${error.message}`);
  }
};

// 📥 3. CREAR EVENTO
export const createEvent = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);

    let cleanImage = cleanData.imageEven || '';
    if (typeof cleanImage === 'string' && cleanImage.startsWith('events/')) {
        cleanImage = cleanImage.replace('events/', '');
    }

    return await db.transaction(async (tx) => {
        const payload: any = {
          title: cleanData.title || 'Sin título',
          categoryIdx: cleanData.categoryIdx || 0,
          dateEvent: cleanData.dateEvent || new Date().toISOString(),
          timeStart: cleanData.timeStart || '',
          timeEnd: cleanData.timeEnd || '',
          descriptionEven: cleanData.descriptionEven || '',
          imageEven: cleanImage,
          locationEven: cleanData.locationEven || '',
          zip: cleanData.zip ? String(cleanData.zip).trim() : '',
          estate: 'CA',
          phone: cleanData.phone || '',
          contactMethod: cleanData.contactMethod || 'whatsapp',
          statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
          approved: false, 
        };

        const fallbackUser = await db.select().from(users).limit(1);
        payload.userId = cleanData.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : '');

        const [newEvent] = await tx.insert(events).values(payload).returning();

        // 🚀 INSERCIÓN EN TABLA DE PAGOS (Dinámica)
        if (cleanData.referenceCode && cleanData.paymentMethod) {
            
            const today = new Date();
            const eventDate = new Date(payload.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            // 💰 Obtenemos el precio desde la tabla tariffs para la categoría Events
            const currentPrice = await getCurrentEventPrice();

            await tx.insert(payments).values({
              entityType: 'event', 
              entityId: newEvent.id,
              userId: payload.userId as string, 
              referenceCode: String(cleanData.referenceCode).trim(), 
              paymentMethod: String(cleanData.paymentMethod).trim(), 
              amount: currentPrice, // 🚀 Guardado del precio consultado
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

// 🔄 4. ACTUALIZAR EVENTO Y PROGRAMAR NOTIFICACIONES
export const updateEvent = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const cleanPayload = sanitizePayload(data);

    if (cleanPayload.imageEven && typeof cleanPayload.imageEven === 'string' && cleanPayload.imageEven.startsWith('events/')) {
        cleanPayload.imageEven = cleanPayload.imageEven.replace('events/', '');
    }
    
    return await db.transaction(async (tx) => {
        // 🚀 ACTUALIZACIÓN DE FECHA: Reiniciamos createdAt al aprobar para saltar al top
        if (cleanPayload.approved === true) {
            cleanPayload.createdAt = new Date();
        }

        const updated = await tx.update(events).set(cleanPayload).where(eq(events.id, cleanId)).returning();
        const event = updated[0];

        if (!event) throw new Error("No se pudo encontrar el evento actualizado");

        // ACTUALIZACIÓN DE PAGO AL APROBAR
        if (cleanPayload.approved === true) {
            const expirationDate = event.dateEvent ? new Date(event.dateEvent) : new Date();

            // 💰 Nos aseguramos que el pago refleje la tarifa correcta al momento de la aprobación
            const currentPrice = await getCurrentEventPrice();

            await tx.update(payments)
                .set({ 
                    status: 'approved', 
                    approvedAt: new Date(), 
                    amount: currentPrice, // 🚀 Por seguridad re-grabamos el monto oficial
                    timepost_end: expirationDate 
                })
                .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'event')));
        }

        // 🚀 GENERAR NOTIFICACIONES
        if (cleanPayload.approved === true && event && event.dateEvent) {
            const today = new Date();
            const eventDate = new Date(event.dateEvent);
            
            const diffTime = eventDate.getTime() - today.getTime();
            const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (totalDaysLeft >= 0) {
                let safeUserId = event.userId;
                if (!safeUserId) {
                    const fallbackUser = await db.select().from(users).limit(1);
                    safeUserId = fallbackUser.length > 0 ? fallbackUser[0].id : '';
                }

                const notifsToInsert = [];
                let hasTodayNotification = false;

                // Ciclo normal de recordatorios programados
                for (let i = 0; i <= totalDaysLeft; i++) {
                    const daysRemaining = totalDaysLeft - i;
                    const showDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
                    
                    let shouldCreate = false;
                    let message = "";

                    if (daysRemaining === 0) {
                        shouldCreate = true;
                        message = `¡Es hoy! No te pierdas: ${event.title}`;
                        // Si el evento es hoy, marcamos que ya generamos la notificación de "hoy"
                        if (i === 0) hasTodayNotification = true; 
                    } 
                    else if (daysRemaining > 0 && daysRemaining <= 10) {
                        shouldCreate = true;
                        message = `¡Faltan solo ${daysRemaining} días para ${event.title}!`;
                    } 
                    else if (daysRemaining > 10) {
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
                            userId: safeUserId as string, 
                        };

                        if ('referenceId' in notifications) notifObj.referenceId = String(event.id);
                        else if ('reference_id' in notifications) notifObj.reference_id = String(event.id);

                        notifsToInsert.push(notifObj);
                    }
                }

                // 🚀 REGLA DE SATISFACCIÓN DEL CLIENTE:
                // Si el evento NO es hoy, forzamos la creación de una notificación "Instantánea" 
                // para que el cliente vea que su pago funcionó de inmediato.
                if (!hasTodayNotification) {
                    const instantNotif: any = {
                        title: "¡Nuevo Evento Anunciado! 🎉",
                        description: `Se ha publicado: ${event.title}. ¡Revisa los detalles!`,
                        type: "event", 
                        visibleAt: today, // 🚀 Se publica AHORA MISMO
                        userId: safeUserId as string, 
                    };

                    if ('referenceId' in notifications) instantNotif.referenceId = String(event.id);
                    else if ('reference_id' in notifications) instantNotif.reference_id = String(event.id);

                    notifsToInsert.push(instantNotif);
                }

                if (notifsToInsert.length > 0) {
                    await tx.insert(notifications).values(notifsToInsert);
                    console.log(`✅ ${notifsToInsert.length} notificaciones programadas para: ${event.title}`);
                }
            }
        }

        return event || null;
    });
  } catch (error: any) { 
    throw new Error(`Error al actualizar el evento: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR EVENTO
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