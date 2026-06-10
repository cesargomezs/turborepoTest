import { db } from "../../../../packages/db/src"; 
// 🚀 1. Usamos ALIAS para la tabla 'rating' y agregamos la tabla 'reviews'
import { lawyers, users, rating as ratingTable, reviews as reviewsTable } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL: Obtiene TODOS los abogados con sus estrellas y reseñas
export const getLawyers = async (rawZip?: string | number) => {
  try {
    const zip = rawZip ? String(rawZip).trim() : '';
    console.log(`🚨 [BACKEND] getLawyers llamado. Preparando datos cerca del Zip: "${zip}"`);

    // 🚀 DOBLE JOIN: Abogados -> Rating (estrellas) -> Reviews (textos)
    let query = db
      .select()
      .from(lawyers)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .$dynamic(); 

    console.log(`✅ Devolviendo la lista completa para ordenamiento inteligente en el mapa.`);

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const lawyersMap = new Map<string, any>();

    for (const row of rows) {
      const lawyerId = row.lawyers.id;

      if (!lawyersMap.has(lawyerId)) {
        lawyersMap.set(lawyerId, {
          ...row.lawyers,
          reviews: [], // Array vacío inicial para las reseñas formateadas
          totalRating: 0,
          totalReviews: 0
        });
      }

      // Si hay un rating válido, buscamos su texto en la tabla review
      if (row.rating && row.rating.id) {
        // Buscamos el texto donde sea que esté guardado
        const commentText = row.reviews?.comment || '';

        lawyersMap.get(lawyerId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalResult = await Promise.all(Array.from(lawyersMap.values()).map(async (lawyer: any) => {
      
      // 🧮 Calcular promedio y contador de reseñas
      lawyer.totalReviews = lawyer.reviews.length;

      if (lawyer.totalReviews > 0) {
        const sum = lawyer.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
        lawyer.totalRating = Math.round((sum / lawyer.totalReviews) * 10) / 10;
        lawyer.rating = lawyer.totalRating; // Para compatibilidad con otros frontends
      } else {
        lawyer.totalRating = 0;
        lawyer.rating = 0;
      }

      // 🚀 LÓGICA SUPABASE: Transformar las imágenes a URLs seguras
      if (lawyer.imageUrl && lawyer.imageUrl.trim() !== '' && !lawyer.imageUrl.startsWith('http')) {
          const rutaArchivo = lawyer.imageUrl.startsWith('lawyers/') 
              ? lawyer.imageUrl : `lawyers/${lawyer.imageUrl}`;

          const { data, error } = await supabase
              .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 

          if (!error && data) {
              return { ...lawyer, image: data.signedUrl, imageUrl: data.signedUrl }; 
          }
      }
      return { ...lawyer, image: lawyer.imageUrl }; 
    }));

    return finalResult;
  } catch (error: any) {
    console.error("❌ Error en getLawyers con Ratings:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID (Con doble JOIN)
export const getLawyerByIdWithReviews = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(lawyers)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .where(eq(lawyers.id, id));
  
    if (!rows || rows.length === 0) return null;
  
    const lawyerFinal: any = {
      ...rows[0].lawyers, 
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

    // Recorremos las filas para armar el arreglo de reseñas
    for (const row of rows) {
      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        lawyerFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    // Calculamos los totales
    lawyerFinal.totalReviews = lawyerFinal.reviews.length;
    if (lawyerFinal.totalReviews > 0) {
      const sum = lawyerFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      lawyerFinal.totalRating = Math.round((sum / lawyerFinal.totalReviews) * 10) / 10;
      lawyerFinal.rating = lawyerFinal.totalRating;
    }

    // Firmar la imagen
    if (lawyerFinal.imageUrl && lawyerFinal.imageUrl.trim() !== '' && !lawyerFinal.imageUrl.startsWith('http')) {
        const rutaArchivo = lawyerFinal.imageUrl.startsWith('lawyers/') 
            ? lawyerFinal.imageUrl : `lawyers/${lawyerFinal.imageUrl}`;

        const { data, error } = await supabase
            .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
            
        if (!error && data) {
            lawyerFinal.image = data.signedUrl;
            lawyerFinal.imageUrl = data.signedUrl;
        }
    } else {
        lawyerFinal.image = lawyerFinal.imageUrl;
    }

    return lawyerFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el abogado por ID: ${error.message}`);
  }
};

// 📥 3. CREAR ABOGADO
export const createLawyer = async (data: any) => {
  try {
    if (data.imageUrl && data.imageUrl.startsWith('lawyers/')) {
      data.imageUrl = data.imageUrl.replace('lawyers/', '');
    }
    const newLawyer = await db.insert(lawyers).values(data).returning();
    return newLawyer[0];
  } catch (error: any) { 
    throw new Error(`Error al crear el abogado: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR ABOGADO
export const updateLawyer = async (id: string, data: any) => {
  try {
    if (data.imageUrl && data.imageUrl.startsWith('lawyers/')) {
      data.imageUrl = data.imageUrl.replace('lawyers/', '');
    }
    const updated = await db
      .update(lawyers)
      .set(data)
      .where(eq(lawyers.id, id))
      .returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el abogado: ${error.message}`);
  }
};

// 🚀 5. INGRESO DE RATING Y RESEÑA (Doble Insert)
export const createRating = async (data: any) => {
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
      rating: String(data.stars || data.rating || 5), 
      userId: validUserId,
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'lawyers';
    else ratingPayload.type_entry = 'lawyers';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = data.reference_id || data.referenceId;
    else ratingPayload.reference_id = data.reference_id || data.referenceId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    // --- PASO B: GUARDAR EL TEXTO EN 'reviews' ---
    let savedComment = '';
    const incomingText = data.comment || data.text || data.review;
    
    if (incomingText && incomingText.trim() !== '') {
      const reviewPayload: any = {
        userId: validUserId
      };

      // Asignamos el texto a la columna correcta
      if ('review' in reviewsTable) reviewPayload.review = incomingText;
      else if ('text' in reviewsTable) reviewPayload.text = incomingText;
      else reviewPayload.comment = incomingText;

      // 🚀 Usamos relationshipId para coincidir con el JOIN
      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;
      
      // UUID Estático para la vista detalle en el frontend
      if ('typeDetailId' in reviewsTable) {
          reviewPayload.typeDetailId = '035118eb-612e-41a2-ac95-b4f339b4e388';
      } else {
          reviewPayload.type_detail_id = '035118eb-612e-41a2-ac95-b4f339b4e388';
      }

      const newReview = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = newReview[0].comment || '';
    }

    // Formateamos la respuesta para que el Front la pueda inyectar de inmediato
    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment
    };

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en createRating de Abogados:", error);
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};

// 🗑️ 6. ELIMINAR ABOGADO (Solo por completitud, por si la necesitas luego)
export const deleteLawyer = async (id: string) => {
  try {
    const deleted = await db.delete(lawyers).where(eq(lawyers.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el abogado: ${error.message}`);
  }
};