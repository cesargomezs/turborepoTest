import { db } from "../../../../packages/db/src"; 
import { stores, users } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL (Con filtro de Zip Code e integración de Supabase)
export const getStores = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id)) 
      .$dynamic(); 

    // Filtro por Zip Code si se proporciona
    if (zip && zip.trim().length === 5) {
      const cleanZip = zip.trim();
      query = query.where(sql`${stores.zip}::text = ${cleanZip}`); 
    }

    // Ordenamos por los más recientes
    query = query.orderBy(desc(stores.createdAt));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const finalStores = await Promise.all(rows.map(async (row: any) => {
        const dbStore = row.stores;
        const dbUser = row.users;

        // Nombre de usuario seguro
        const nombreUsuario = dbUser?.name || dbUser?.firstName || dbUser?.first_name || dbUser?.full_name || 'Usuario Anónimo';
        
        const fileName = dbStore.imageStores;
        let publicUrl = fileName; 

        // 🚀 Firma de imagen en Supabase (buscando en la carpeta 'stores/')
        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('stores/', '');
            const rutaArchivo = `stores/${cleanName}`;

            const { data, error } = await supabase.storage
                .from(NOMBRE_BUCKET)
                .createSignedUrl(rutaArchivo, 3600); 

            if (!error && data?.signedUrl) {
                publicUrl = data.signedUrl;
            } else if (error) {
                console.warn(`⚠️ Error firmando imagen de tienda ${dbStore.id}:`, error.message);
            }
        }

        return { 
            ...dbStore,
            imageStores: publicUrl, 
            ownerName: nombreUsuario // Campo inyectado para el frontend
        }; 
    }));

    return finalStores;
  } catch (error) {
    console.error("❌ Error en getStores:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID
export const getStoreById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(stores)
      .leftJoin(users, eq(stores.userId, users.id))
      .where(eq(stores.id, id));

    if (!rows || rows.length === 0) return null;

    const dbStore = rows[0].stores;
    const dbUser = rows[0].users;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    let publicUrl = dbStore.imageStores;

    if (publicUrl && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('stores/', '');
        const { data, error } = await supabase.storage
            .from(NOMBRE_BUCKET).createSignedUrl(`stores/${cleanName}`, 3600);
            
        if (!error && data?.signedUrl) {
            publicUrl = data.signedUrl;
        }
    }

    return {
        ...dbStore,
        imageStores: publicUrl,
        ownerName: nombreUsuario
    };
  } catch (error: any) {
    throw new Error(`Error al obtener la tienda por ID: ${error.message}`);
  }
};

// 📥 3. CREAR TIENDA
export const createStore = async (data: any) => {
  try {
    // Limpiamos la ruta de la imagen antes de guardar
    let cleanImage = data.imageStores || '';
    if (cleanImage.startsWith('stores/')) {
        cleanImage = cleanImage.replace('stores/', '');
    }

    const payload: any = {
      nameStores: data.nameStores || 'Sin nombre',
      descriptionStores: data.descriptionStores || '',
      addressStores: data.addressStores || '',
      categoryId: data.categoryId || null, // Espera un UUID o null
      zip: data.zip ? String(data.zip).trim() : null,
      estate: 'CA',
      //estate: data.estate || 'active',
      imageStores: cleanImage,
      lat: data.lat ? Number(data.lat) : null,
      lng: data.lng ? Number(data.lng) : null,
      phone: data.phone || '',
      statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
      approved: data.approved !== undefined ? data.approved : false, // Por defecto requiere aprobación
    };

    // Asignar userId fallback si no viene
    const fallbackUser = await db.select().from(users).limit(1);
    payload.userId = data.userId || (fallbackUser.length > 0 ? fallbackUser[0].id : null);

    const newStore = await db.insert(stores).values(payload).returning();
    return newStore[0];
  } catch (error: any) { 
    console.error("❌ Error en createStore:", error);
    throw new Error(`Error al crear la tienda: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR TIENDA
export const updateStore = async (id: string, data: any) => {
  try {
    if (data.imageStores && data.imageStores.startsWith('stores/')) {
        data.imageStores = data.imageStores.replace('stores/', '');
    }
    const updated = await db.update(stores).set(data).where(eq(stores.id, id)).returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar la tienda: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR TIENDA
export const deleteStore = async (id: string) => {
  try {
    const deleted = await db.delete(stores).where(eq(stores.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la tienda: ${error.message}`);
  }
};