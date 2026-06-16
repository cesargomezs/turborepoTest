import { db } from "../../../../packages/db/src"; 
import { donations, users } from "../../../../packages/db/src/schema"; 
// 🚀 1. Agregamos 'and' a las importaciones de Drizzle
import { eq, desc, sql, and } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// El bucket correcto
const NOMBRE_BUCKET = 'images'; 

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS: Elimina etiquetas HTML o scripts maliciosos
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🛡️ BARRERA DE SANITIZACIÓN PARA OBJETOS: Limpia todos los textos de un payload
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

// 🔍 1. CONSULTA GENERAL
export const getDonations = async (zip?: string) => {
  try {
    // 🛡️ Sanitizamos el código postal antes de procesarlo
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;

    if (!cleanZipParam || cleanZipParam.length !== 5) return []; 

    const cleanZip = cleanZipParam;

    let query = db
            .select()
            .from(donations)
            .leftJoin(users, eq(donations.userId, users.id))
            .$dynamic();

    // 🚀 2. FORMA CORRECTA DE COMBINAR CONDICIONES EN DRIZZLE
    query = query.where(
      and(
        sql`${donations.zip}::text = ${cleanZip}`,
        eq(donations.statusId, '31a06434-8ed8-45d2-b95f-65bd314bc021')
      )
    ); 

    query = query.orderBy(desc(donations.id));

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
            status: dbDonation.estate || 'active',
            ownerName: nombreUsuario
        }; 
    }));

    return finalDonations;
  } catch (error) {
    console.error("❌ Error en getDonations:", error);
    return [];
  }
};

// 📥 2. CREAR DONACIÓN
export const createDonation = async (data: any) => {
  try {
    // 🛡️ Limpiamos toda la data entrante para evitar XSS en el título y descripción
    const cleanData = sanitizePayload(data);

    const dbPayload: any = {
      title: cleanData.title || 'Sin título', 
      categoryIdx: Number(cleanData.categoryIdx || 1),
      phone: cleanData.phone || '',
      zip: String(cleanData.zip || '').trim(),
      contactMethod: cleanData.contactMethod || 'whatsapp',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      estate: 'active', 
      descriptionDon: cleanData.description || '',
      locationDon: cleanData.location || 'Rancho Cucamonga',
      imageUrl: cleanData.image ? cleanData.image.replace('donations/', '') : '',
    };

    const fallbackUser = await db.select().from(users).limit(1);
    dbPayload.userId = cleanData.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : null);

    const newDonation = await db.insert(donations).values(dbPayload).returning();
    return newDonation[0];
  } catch (error: any) { 
    console.error("❌ Error en createDonation:", error);
    throw new Error(`Error al crear la donación: ${error.message}`);
  }
};

// 🔄 3. ACTUALIZAR ESTADO 
export const updateDonationStatus = async (id: string, status: string) => {
  try {
    // 🛡️ Sanitizamos el ID y el nuevo estado
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