import { db } from "../../../../packages/db/src"; 
// 🚀 1. Usamos ALIAS para la tabla 'rating' y agregamos la tabla 'reviews' (plural)
import { entrepreneurship, users, rating as ratingTable, reviews as reviewsTable } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL (Con doble JOIN para Ratings y Reviews)
export const getEntrepreneurships = async (zip?: string) => {
    try {
      let query = db
        .select()
        .from(entrepreneurship)
        .leftJoin(users, eq(entrepreneurship.userId, users.id))
        // 🚀 PRIMER JOIN: Traemos las estrellas
        .leftJoin(ratingTable, eq(ratingTable.referenceId, entrepreneurship.id)) 
        // 🚀 SEGUNDO JOIN: Traemos el texto de la reseña enlazado al rating
        .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
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
  
        // Si hay un rating válido, lo agregamos y buscamos su review correspondiente
        if (row.rating && row.rating.id) {
          // 🛡️ Buscamos el texto donde sea que esté en la tabla reviews
          const commentText = row.reviews?.comment || '';

          itemsMap.get(itemId).reviews.push({
             ...row.rating,
             stars: Number(row.rating.rating) || 0,
             comment: commentText, 
             displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
  
      const finalList = await Promise.all(Array.from(itemsMap.values()).map(async (item) => {
          
          // 🧮 Calcular promedio de estrellas
          if (item.reviews.length > 0) {
              const totalStars = item.reviews.reduce((sum: number, r: any) => sum + (Number(r.stars) || 0), 0);
              item.rating = totalStars / item.reviews.length;
          } else {
              item.rating = 0; // Forzamos el 0 si no hay reseñas
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

// 📥 6. CREAR RESEÑA (INSERCIÓN DOBLE)
export const createEntrepreneurshipReview = async (data: any) => {
    try {
      let validUserId = null;
      if (data.userId && typeof data.userId === 'string' && data.userId.length > 20) {
          validUserId = data.userId;
      } else {
          const fallbackUser = await db.select().from(users).limit(1);
          if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
      }
  
      // --- PASO A: GUARDAR LAS ESTRELLAS EN 'rating' ---
      const ratingPayload: any = {
        rating: String(data.stars || 5), 
        userId: validUserId,
      };
      
      if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'entrepreneurship';
      else ratingPayload.type_entry = 'entrepreneurship';
  
      if ('referenceId' in ratingTable) ratingPayload.referenceId = data.reference_id;
      else ratingPayload.reference_id = data.reference_id;
  
      const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
      const generatedRatingId = newRating[0].id;
  
      // --- PASO B: GUARDAR EL TEXTO EN 'reviews' (Plural) ---
      let savedComment = '';
      
      if (data.comment && data.comment.trim() !== '') {
        const reviewPayload: any = {
          userId: validUserId
        };
  
        // 1. Asignamos el texto a la columna correcta
        if ('review' in reviewsTable) reviewPayload.review = data.comment;
        else if ('text' in reviewsTable) reviewPayload.text = data.comment;
        else reviewPayload.comment = data.comment;
  
        // 2. 🚀 Usamos relationshipId para coincidir con el JOIN
        if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
        else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
        else reviewPayload.rating_id = generatedRatingId;
        
        // 3. 🚀 Asignamos tu UUID fijo para Entrepreneurship directamente al payload
        if ('typeDetailId' in reviewsTable) {
            reviewPayload.typeDetailId = '035118eb-612e-41a2-ac95-b4f339b4e388';
        } else {
            reviewPayload.type_detail_id = '035118eb-612e-41a2-ac95-b4f339b4e388';
        }
  
        const newReview = await db.insert(reviewsTable).values(reviewPayload).returning();
        savedComment = newReview[0].comment || '';
      }
  
      return {
        id: generatedRatingId,
        stars: Number(newRating[0].rating),
        comment: savedComment
      };
  
    } catch (error: any) { 
      console.error("❌ Error CRÍTICO en createEntrepreneurshipReview (Doble Insert):", error);
      throw new Error(`Error al crear la reseña: ${error.message}`);
    }
  };