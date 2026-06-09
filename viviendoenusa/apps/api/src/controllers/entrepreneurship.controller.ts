import { db } from "../../../../packages/db/src"; 
// 🚀 1. Agregamos 'rating' a la importación del esquema
import { entrepreneurship, users, rating, reviews } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL (Con filtro, Supabase y RESEÑAS)
export const getEntrepreneurships = async (zip?: string) => {
    try {
      let query = db
        .select()
        .from(entrepreneurship)
        .leftJoin(users, eq(entrepreneurship.userId, users.id))
        // 🚀 Hacemos JOIN con la tabla rating para traer las reseñas
        .leftJoin(rating, eq(rating.referenceId, entrepreneurship.id)) 
        .$dynamic(); 
  
      // Filtro por Zip Code si se proporciona
      if (zip && zip.trim().length === 5) {
        const cleanZip = zip.trim();
        query = query.where(sql`${entrepreneurship.zip}::text = ${cleanZip}`); 
      }
  
      query = query.orderBy(desc(entrepreneurship.createdAt));
  
      const rows = await query;
      if (!rows || rows.length === 0) return [];
  
      // 🚀 AGRUPAMOS LAS RESEÑAS POR EMPRENDIMIENTO
      const itemsMap = new Map<string, any>();
  
      for (const row of rows) {
        const itemId = row.entrepreneurship.id;
  
        if (!itemsMap.has(itemId)) {
          const dbUser = row.users;
          itemsMap.set(itemId, {
            ...row.entrepreneurship,
            ownerName: dbUser?.name || 'Usuario Anónimo',
            reviews: [], // Array vacío inicial
            rating: 0 // Promedio inicial
          });
        }
  
        // Si hay una reseña válida en la fila, la agregamos y TRADUCIMOS los campos
        if (row.rating && row.rating.id) {
          itemsMap.get(itemId).reviews.push({
             ...row.rating,
             // 🚀 TRADUCCIÓN: De DB a Frontend
             stars: Number(row.rating.rating) || 0, // BD usa 'rating', Front usa 'stars'
             comment: row.rating.review || '',      // BD usa 'review', Front usa 'comment'
             displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
  
      const finalList = await Promise.all(Array.from(itemsMap.values()).map(async (item) => {
          
          // 🧮 Calcular promedio de estrellas (Ahora sí encontrará 'stars')
          if (item.reviews.length > 0) {
              const totalStars = item.reviews.reduce((sum: number, r: any) => sum + (Number(r.stars) || 0), 0);
              item.rating = totalStars / item.reviews.length;
          }
  
          const fileName = item.imageEntrepren;
          let publicUrl = fileName; 
  
          if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
              const cleanName = fileName.replace('entrepreneurship/', '');
              const rutaArchivo = `entrepreneurship/${cleanName}`;
  
              const { data, error } = await supabase.storage
                  .from(NOMBRE_BUCKET)
                  .createSignedUrl(rutaArchivo, 3600); 
  
              if (!error && data?.signedUrl) {
                  publicUrl = data.signedUrl;
              } else if (error) {
                  console.warn(`⚠️ Error firmando imagen:`, error.message);
              }
          }
  
          return { 
              ...item,
              imageEntrepren: publicUrl
          }; 
      }));
  
      return finalList;
    } catch (error) {
      console.error("❌ Error en getEntrepreneurships:", error);
      return [];
    }
  };

// 🔍 2. CONSULTA INDIVIDUAL POR ID
export const getEntrepreneurshipById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(entrepreneurship)
      .leftJoin(users, eq(entrepreneurship.userId, users.id))
      .where(eq(entrepreneurship.id, id));

    if (!rows || rows.length === 0) return null;

    const dbItem = rows[0].entrepreneurship;
    const dbUser = rows[0].users;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    let publicUrl = dbItem.imageEntrepren;

    if (publicUrl && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('entrepreneurship/', '');
        const { data, error } = await supabase.storage
            .from(NOMBRE_BUCKET).createSignedUrl(`entrepreneurship/${cleanName}`, 3600);
            
        if (!error && data?.signedUrl) {
            publicUrl = data.signedUrl;
        }
    }

    return {
        ...dbItem,
        imageEntrepren: publicUrl,
        ownerName: nombreUsuario
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el emprendimiento por ID: ${error.message}`);
  }
};

// 📥 3. CREAR EMPRENDIMIENTO
export const createEntrepreneurship = async (data: any) => {
  try {
    let cleanImage = data.imageEntrepren || '';
    if (cleanImage.startsWith('entrepreneurship/')) {
        cleanImage = cleanImage.replace('entrepreneurship/', '');
    }

    // 🚀 BLINDAJE DE UUID PARA EVITAR CRASHEO
    let validUserId = null;
    if (data.userId && typeof data.userId === 'string' && data.userId.length > 20) {
        validUserId = data.userId;
    } else {
        const fallbackUser = await db.select().from(users).limit(1);
        if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
    }

    const payload: any = {
      nameEntrepren: data.nameEntrepren || 'Sin nombre',
      categoryId: String(data.categoryId || '0'), 
      descriptionEntrepren: data.descriptionEntrepren || '',
      phone: data.phone || '',
      verified: data.verified !== undefined ? data.verified : false,
      promo: data.promo || '',
      imageEntrepren: cleanImage,
      saved: data.saved !== undefined ? data.saved : false,
      contactMethod: data.contactMethod || 'whatsapp',
      zip: data.zip ? String(data.zip).trim() : null,
      estate: data.estate || 'active',
      userId: validUserId // <-- Usar validUserId seguro para que no explote
    };

    console.log("📤 Payload para crear emprendimiento:", payload);

    const newItem = await db.insert(entrepreneurship).values(payload).returning();
    return newItem[0];
  } catch (error: any) { 
    console.error("❌ Error en createEntrepreneurship:", error);
    throw new Error(`Error al crear el emprendimiento: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR EMPRENDIMIENTO 
export const updateEntrepreneurship = async (id: string, data: any) => {
  try {
    if (data.imageEntrepren && data.imageEntrepren.startsWith('entrepreneurship/')) {
        data.imageEntrepren = data.imageEntrepren.replace('entrepreneurship/', '');
    }
    const updated = await db.update(entrepreneurship).set(data).where(eq(entrepreneurship.id, id)).returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el emprendimiento: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR EMPRENDIMIENTO
export const deleteEntrepreneurship = async (id: string) => {
  try {
    const deleted = await db.delete(entrepreneurship).where(eq(entrepreneurship.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el emprendimiento: ${error.message}`);
  }
};

// 📥 6. CREAR RESEÑA 
export const createEntrepreneurshipReview = async (data: any) => {
    try {
      // 1. BLINDAJE DEL USER_ID 
      let validUserId = null;
      if (data.userId && typeof data.userId === 'string' && data.userId.length > 20) {
          validUserId = data.userId;
      } else {
          const fallbackUser = await db.select().from(users).limit(1);
          if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
      }
  
      // 🚀 2. TRADUCCIÓN EXACTA AL ESQUEMA DE TU BD
      const payload: any = {
        // Tu BD espera 'rating' (y le pasamos data.stars del front)
        rating: String(data.stars || 5), // Lo pasamos como string por si Drizzle espera numeric(3,2)
        
        // Tu BD espera 'review' (y le pasamos data.comment del front)
        review: data.comment || '',
        
        // Tu BD espera 'type_entry' para saber de dónde viene
        typeEntry: 'entrepreneurship', // Formato Drizzle
        type_entry: 'entrepreneurship', // Formato SQL directo (por seguridad)
        
        userId: validUserId,
        
        // El ID de referencia
        referenceId: data.reference_id, 
        reference_id: data.reference_id 
      };
  
      console.log("📤 Intentando guardar reseña con payload:", payload);
  
      const newReview = await db.insert(rating).values(payload).returning();
      
      // Devolvemos al frontend con los nombres que él espera (stars y comment)
      return {
        ...newReview[0],
        stars: Number(newReview[0].rating),
        comment: newReview[0].review
      };
  
    } catch (error: any) { 
      console.error("❌ Error CRÍTICO en createEntrepreneurshipReview:", error);
      throw new Error(`Error al crear la reseña: ${error.message}`);
    }
  };