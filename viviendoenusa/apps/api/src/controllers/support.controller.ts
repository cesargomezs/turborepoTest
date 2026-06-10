import { db } from "../../../../packages/db/src"; 
// 🚀 1. Importamos la nueva tabla 'support' y las tablas de opiniones con alias de seguridad
import { support, users, rating as ratingTable, reviews as reviewsTable } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL (Con doble JOIN para Ratings y Reviews)
export const getSupports = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(support)
      .leftJoin(users, eq(support.userId, users.id)) 
      // 🚀 PRIMER JOIN: Traemos las estrellas
      .leftJoin(ratingTable, eq(ratingTable.referenceId, support.id)) 
      // 🚀 SEGUNDO JOIN: Traemos el texto de la reseña enlazado al rating
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .$dynamic(); 

    if (zip && zip.trim().length === 5) {
      const cleanZip = zip.trim();
      query = query.where(sql`${support.zip}::text = ${cleanZip}`); 
    }

    query = query.orderBy(desc(support.createdAt));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    // 🚀 AGRUPAMOS LAS RESEÑAS POR ELEMENTO DE SOPORTE
    const itemsMap = new Map<string, any>();

    for (const row of rows) {
      const itemId = row.support.id;

      if (!itemsMap.has(itemId)) {
        const dbUser = row.users;
        itemsMap.set(itemId, {
          ...row.support,
          ownerName: dbUser?.name || 'Usuario Anónimo',
          reviews: [], 
          rating: 0 // Inicializado en 0 neto para el Front-End
        });
      }

      // Si hay un rating válido, agregamos la reseña mapeando el texto de forma segura
      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';

        itemsMap.get(itemId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText, 
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalSupports = await Promise.all(Array.from(itemsMap.values()).map(async (item) => {
        // 🧮 Calcular promedio de estrellas real en el Backend (Programación defensiva)
        if (item.reviews.length > 0) {
            const totalStars = item.reviews.reduce((sum: number, r: any) => sum + (Number(r.stars) || 0), 0);
            item.rating = totalStars / item.reviews.length;
            item.totalReviews = item.reviews.length; // Contador de reseñas real enviado al Front
        } else {
            item.rating = 0;
            item.totalReviews = 0;
        }

        const fileName = item.imageSupp;
        let publicUrl = fileName; 

        // 🚀 Firma de imagen en Supabase (Carpeta 'support/')
        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('support/', '');
            const rutaArchivo = `support/${cleanName}`;

            const { data, error } = await supabase.storage
                .from(NOMBRE_BUCKET)
                .createSignedUrl(rutaArchivo, 3600); 

            if (!error && data?.signedUrl) {
                publicUrl = data.signedUrl;
            } else if (error) {
                console.warn(`⚠️ Error firmando imagen de soporte ${item.id}:`, error.message);
            }
        }

        return { 
            ...item,
            imageSupp: publicUrl
        }; 
    }));

    return finalSupports;
  } catch (error) {
    console.error("❌ Error en getSupports:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID (Con soporte para detalles completos y opiniones)
export const getSupportById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(support)
      .leftJoin(users, eq(support.userId, users.id))
      .leftJoin(ratingTable, eq(ratingTable.referenceId, support.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .where(eq(support.id, id));

    if (!rows || rows.length === 0) return null;

    const dbSupport = rows[0].support;
    const dbUser = rows[0].users;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    const supportFinal: any = {
        ...dbSupport,
        ownerName: nombreUsuario,
        reviews: [],
        rating: 0,
        totalReviews: 0
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        supportFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    if (supportFinal.reviews.length > 0) {
      const totalStars = supportFinal.reviews.reduce((sum: number, r: any) => sum + r.stars, 0);
      supportFinal.rating = totalStars / supportFinal.reviews.length;
      supportFinal.totalReviews = supportFinal.reviews.length;
    }

    let publicUrl = supportFinal.imageSupp;

    if (publicUrl && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('support/', '');
        const { data, error } = await supabase.storage
            .from(NOMBRE_BUCKET).createSignedUrl(`support/${cleanName}`, 3600);
            
        if (!error && data?.signedUrl) {
            publicUrl = data.signedUrl;
        }
    }

    supportFinal.imageSupp = publicUrl;
    return supportFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el soporte por ID: ${error.message}`);
  }
};

// 📥 3. CREAR REGISTRO DE SOPORTE
export const createSupport = async (data: any) => {
  try {
    let cleanImage = data.imageSupp || '';
    if (cleanImage.startsWith('support/')) {
        cleanImage = cleanImage.replace('support/', '');
    }

    // 🚀 BLINDAJE DE UUID PARA EL USER_ID
    let validUserId = null;
    if (data.userId && typeof data.userId === 'string' && data.userId.length > 20) {
        validUserId = data.userId;
    } else {
        const fallbackUser = await db.select().from(users).limit(1);
        if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
    }

    const payload: any = {
      nameSupp: data.nameSupp || 'Sin nombre',
      descriptionSupp: data.descriptionSupp || '',
      addressSupp: data.addressSupp || '',
      categoryId: data.categoryId ? Number(data.categoryId) : null, 
      zip: data.zip ? String(data.zip).trim() : null,
      estate: data.estate || 'CA',
      imageSupp: cleanImage,
      lat: data.lat ? Number(data.lat) : null,
      lng: data.lng ? Number(data.lng) : null,
      phone: data.phone || '',
      approved: data.approved !== undefined ? data.approved : false, 
      userId: validUserId,
      rating: 0, // Forzamos 0 neto inicial
    };

    console.log("📤 Payload listo para insertar en soporte:", payload);

    const newSupport = await db.insert(support).values(payload).returning();
    return newSupport[0];
  } catch (error: any) { 
    console.error("❌ Error en createSupport:", error);
    throw new Error(`Error al crear el registro de soporte: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR SOPORTE
export const updateSupport = async (id: string, data: any) => {
  try {
    if (data.imageSupp && data.imageSupp.startsWith('support/')) {
        data.imageSupp = data.imageSupp.replace('support/', '');
    }
    const updated = await db.update(support).set(data).where(eq(support.id, id)).returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el soporte: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR SOPORTE
export const deleteSupport = async (id: string) => {
  try {
    const deleted = await db.delete(support).where(eq(support.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el soporte: ${error.message}`);
  }
};

// 📥 6. CREAR RESEÑA (INSERCIÓN DOBLE)
export const createSupportReview = async (data: any) => {
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

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'support';
    else ratingPayload.type_entry = 'support';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = data.reference_id || data.referenceId;
    else ratingPayload.reference_id = data.reference_id || data.referenceId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    // --- PASO B: GUARDAR EL TEXTO EN 'reviews' ---
    let savedComment = '';
    
    if (data.comment && data.comment.trim() !== '') {
      const reviewPayload: any = {
        userId: validUserId
      };

      if ('review' in reviewsTable) reviewPayload.review = data.comment;
      else if ('text' in reviewsTable) reviewPayload.text = data.comment;
      else reviewPayload.comment = data.comment;

      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;

      // Asignamos un UUID estático específico para identificar este módulo en la tabla intermedia
      if ('typeDetailId' in reviewsTable) {
          reviewPayload.typeDetailId = '64fef850-9510-4591-87e9-f354dd54a533';
      } else {
          reviewPayload.type_detail_id = '64fef850-9510-4591-87e9-f354dd54a533';
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
    console.error("❌ Error CRÍTICO en createSupportReview (Doble Insert):", error);
    throw new Error(`Error al crear la reseña del módulo de soporte: ${error.message}`);
  }
};