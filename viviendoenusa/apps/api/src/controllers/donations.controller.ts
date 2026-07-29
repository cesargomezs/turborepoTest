import { db } from "../../../../packages/db/src"; 
import { donations, users } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';
import NodeGeocoder from 'node-geocoder';

// =====================================================================
// 🌍 CONFIGURACIÓN DE GEOCODER
// =====================================================================
const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

// Función para convertir ZIP a coordenadas (Lat, Lng)
const getCoordsFromZip = async (zip: string) => {
  try {
    const res = await geocoder.geocode(`${zip}, USA`);
    if (res && res.length > 0) {
      return { lat: res[0].latitude, lng: res[0].longitude };
    }
  } catch (err) {
    console.error(`⚠️ Error al geocodificar el ZIP ${zip}:`, err);
  }
  
  console.warn("⚠️ Usando coordenadas por defecto (Distancia al ID 30 siempre será 0)");
  return { lat: 34.0934, lng: -117.5847 };
};

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

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

// =====================================================================
// 🔍 1. OBTENER DONACIONES (CON FILTRO DE DISTANCIA)
// =====================================================================
export const getDonations = async (zip?: string) => {
  try {
    // Sanitizamos el código postal
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;

    // Si enviaron un ZIP pero es inválido (no tiene 5 caracteres), devolvemos vacío
    if (zip && (!cleanZipParam || cleanZipParam.length !== 5)) return []; 

    // Obtenemos lat y lng del ZIP
    const { lat, lng } = await getCoordsFromZip(cleanZipParam || ''); 
    const radiusMiles = 4; // Rango de búsqueda: 10 millas

    // 🚀 Fórmula de Distancia Haversine (Segura para Drizzle ORM)
    const distanceFormula = sql`(
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat}::numeric)) * cos(radians(${donations.lat}::numeric)) * cos(radians(${donations.lng}::numeric) - radians(${lng}::numeric)) + 
          sin(radians(${lat}::numeric)) * sin(radians(${donations.lat}::numeric))
        ))
      )
    )`;

    let query = db
      .select({
        donations: donations,
        users: users,
        distance: distanceFormula.as('distance') // Agregamos la distancia calculada al resultado
      })
      .from(donations)
      .leftJoin(users, eq(donations.userId, users.id))
      .$dynamic();

    // 🚀 Aplicar el filtro condicionalmente
    if (cleanZipParam) {
      query = query.where(
        and(
          // 1. Que esté dentro del radio de 10 millas
          sql`${distanceFormula} <= ${radiusMiles}`,
          // 2. Que la donación esté ACTIVA
          eq(donations.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021')
        )
      );
      // Ordenamos para mostrar los más cercanos primero
      query = query.orderBy(distanceFormula);
    } else {
      // Si no hay código postal, simplemente traemos todas las activas, de la más nueva a la más vieja
      query = query.where(eq(donations.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021'));
      query = query.orderBy(desc(donations.id));
    }

    const rows = await query;
    
    if (!rows || rows.length === 0) return [];

    // Mapeo final de resultados y firmas de imágenes en Supabase
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
// 📥 2. CREAR DONACIÓN (INCLUYENDO COORDENADAS)
// =====================================================================
export const createDonation = async (data: any) => {
  try {
    // Limpiamos toda la data entrante para evitar XSS
    const cleanData = sanitizePayload(data);

    // 🚀 Obtenemos las coordenadas a partir del ZIP y las guardamos
    const { lat, lng } = await getCoordsFromZip(cleanData.zip || '');

    const dbPayload: any = {
      title: cleanData.title || 'Sin título', 
      categoryIdx: Number(cleanData.categoryIdx || 1),
      phone: cleanData.phone || '',
      zip: String(cleanData.zip || '').trim(),
      lat: lat, // 🚀 Coordenada de latitud guardada
      lng: lng, // 🚀 Coordenada de longitud guardada
      contactMethod: cleanData.contactMethod || 'whatsapp',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      estate: cleanData.estate , 
      descriptionDon: cleanData.description || '',
      locationDon: cleanData.location || 'Rancho Cucamonga',
      imageUrl: cleanData.image ? cleanData.image.replace('donations/', '') : '',
    };

    console.log("📦 Payload limpio para DB:", cleanData.estate);

    const fallbackUser = await db.select().from(users).limit(1);
    dbPayload.userId = cleanData.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : null);

    const newDonation = await db.insert(donations).values(dbPayload).returning();
    return newDonation[0];
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
    // Sanitizamos el ID y el nuevo estado
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