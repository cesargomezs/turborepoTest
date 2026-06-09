import { db } from "../../../../packages/db/src"; 
import { events, users } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// 🚀 1. Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL (Con filtro de Zip Code e integración de Supabase)
export const getEvents = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(events)
      .leftJoin(users, eq(events.userId, users.id)) 
      .$dynamic(); 

    // Filtro por Zip Code si se proporciona
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

        // Nombre de usuario seguro
        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbEvent.imageEven;
        let publicUrl = fileName; 

        // 🚀 Firma de imagen en Supabase (buscando en la carpeta 'events/')
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
            ownerName: nombreUsuario // Campo inyectado para el frontend
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
    // Limpiamos la ruta de la imagen antes de guardar
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
      //estate: data.estate || 'active',
      estate: 'CA',
      phone: data.phone || '',
      contactMethod: data.contactMethod || 'whatsapp',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      approved: data.approved !== undefined ? data.approved : false,
      userId: 'baeb641a-3fa4-4fef-9846-d75947d1bca9', // Se asignará después del fallback

    };
    console.log("📦 Payload preparado para crear evento:", JSON.stringify(payload, null, 2));
    // Asignar userId fallback si no viene
    const fallbackUser = await db.select().from(users).limit(1);
    payload.userId = data.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : null);

    const newEvent = await db.insert(events).values(payload).returning();
    return newEvent[0];
  } catch (error: any) { 
    console.error("❌ Error en createEvent:", error);
    throw new Error(`Error al crear el evento: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR EVENTO
export const updateEvent = async (id: string, data: any) => {
  try {
    if (data.imageEven && data.imageEven.startsWith('events/')) {
        data.imageEven = data.imageEven.replace('events/', '');
    }
    const updated = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated[0] || null;
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