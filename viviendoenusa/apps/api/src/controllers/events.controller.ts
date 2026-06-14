import { db } from "../../../../packages/db/src"; 
// 🚀 1. Importamos la tabla de notificaciones
import { events, users, notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL
export const getEvents = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id)) 
      .$dynamic(); 

    if (zip && zip.trim().length === 5) {
      const cleanZip = zip.trim();
      query = query.where(sql`${events.zip}::text = ${cleanZip}`); 
    }

    query = query.orderBy(desc(events.id));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const finalEvents = await Promise.all(rows.map(async (row: any) => {
        const dbEvent = row.events;
        const dbUser = row.users;

        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbEvent.imageEven;
        let publicUrl = fileName; 

        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
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
            ownerName: nombreUsuario 
        }; 
    }));

    return finalEvents;
  } catch (error) {
    console.error("❌ Error en getEvents:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID
export const getEventById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id))
      .where(eq(events.id, id));

    if (!rows || rows.length === 0) return null;

    const dbEvent = rows[0].events;
    const dbUser = rows[0].users;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    let publicUrl = dbEvent.imageEven;

    if (publicUrl && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
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
        ownerName: nombreUsuario
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el evento por ID: ${error.message}`);
  }
};

// 📥 3. CREAR EVENTO
export const createEvent = async (data: any) => {
  try {
    let cleanImage = data.imageEven || '';
    if (cleanImage.startsWith('events/')) {
        cleanImage = cleanImage.replace('events/', '');
    }

    const payload: any = {
      title: data.title || 'Sin título',
      categoryIdx: data.categoryIdx || 0,
      dateEvent: data.dateEvent || new Date().toISOString(),
      timeStart: data.timeStart || '',
      timeEnd: data.timeEnd || '',
      descriptionEven: data.descriptionEven || '',
      imageEven: cleanImage,
      locationEven: data.locationEven || '',
      zip: data.zip ? String(data.zip).trim() : null,
      estate: 'CA',
      phone: data.phone || '',
      contactMethod: data.contactMethod || 'whatsapp',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      approved: data.approved !== undefined ? data.approved : false,
      userId: 'baeb641a-3fa4-4fef-9846-d75947d1bca9', 
    };

    const fallbackUser = await db.select().from(users).limit(1);
    payload.userId = data.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : null);

    const newEvent = await db.insert(events).values(payload).returning();
    return newEvent[0];
  } catch (error: any) { 
    console.error("❌ Error en createEvent:", error);
    throw new Error(`Error al crear el evento: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR EVENTO (¡Aquí ocurre la magia de las notificaciones!)
export const updateEvent = async (id: string, data: any) => {
  try {
    if (data.imageEven && data.imageEven.startsWith('events/')) {
        data.imageEven = data.imageEven.replace('events/', '');
    }
    
    // 1. Actualizamos el evento en la BD
    const updated = await db.update(events).set(data).where(eq(events.id, id)).returning();
    const event = updated[0];

    // 🚀 2. GENERAR NOTIFICACIONES PRE-PROGRAMADAS AL APROBAR
    if (data.approved === true && event && event.dateEvent) {
        const today = new Date();
        const eventDate = new Date(event.dateEvent);
        
        // Calcular diferencia en días (redondeando hacia arriba)
        const diffTime = eventDate.getTime() - today.getTime();
        const totalDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (totalDaysLeft >= 0) {
            const notifsToInsert = [];

            // Evaluamos cada día desde HOY hasta el día del EVENTO
            for (let i = 0; i <= totalDaysLeft; i++) {
                const daysRemaining = totalDaysLeft - i;
                
                // Fecha exacta en la que la App debe mostrar esta notificación
                const showDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
                
                let shouldCreate = false;
                let message = "";

                // 🧠 Reglas de Negocio para la Frecuencia
                if (daysRemaining === 0) {
                    shouldCreate = true;
                    message = `¡Es hoy! No te pierdas: ${event.title}`;
                } 
                else if (daysRemaining > 0 && daysRemaining <= 10) {
                    shouldCreate = true;
                    message = `¡Faltan solo ${daysRemaining} días para ${event.title}!`;
                } 
                else if (daysRemaining > 10) {
                    if (daysRemaining % 2 === 0) { // Solo días pares (cada 2 días)
                        shouldCreate = true;
                        message = `Faltan ${daysRemaining} días para el evento: ${event.title}`;
                    }
                }

                if (shouldCreate) {
                    notifsToInsert.push({
                        title: "Recordatorio de Evento 📅",
                        description: message,
                        type: "event", // Importante para el deep link en el Frontend
                        referenceId: String(event.id),
                        visibleAt: showDate, 
                        usersId: event.userId,
                    });
                }
            }

            // 3. Inserción masiva en la tabla de notificaciones
            if (notifsToInsert.length > 0) {
                await db.insert(notifications).values(notifsToInsert);
                console.log(`✅ ${notifsToInsert.length} notificaciones programadas para el evento: ${event.title}`);
            }
        }
    }

    return event || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el evento: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR EVENTO
export const deleteEvent = async (id: string) => {
  try {
    const deleted = await db.delete(events).where(eq(events.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el evento: ${error.message}`);
  }
};