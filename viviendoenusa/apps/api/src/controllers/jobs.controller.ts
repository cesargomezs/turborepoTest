import { db } from "../../../../packages/db/src"; 
import { jobs, users, rating as ratingTable, reviews as reviewsTable } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm"; 
import { alias } from "drizzle-orm/pg-core"; 
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

const reviewerUsers = alias(users, "reviewerUsers");
const ANON_UUID = "bb50c6a4-d284-4cdd-8263-cf6b4a74de25";

// 🚀 BLINDAJE DINÁMICO: Ahora el JOIN de nombres se hace contra la tabla de REVIEWS, no Rating.
const reviewUserCol = ('userId' in reviewsTable ? (reviewsTable as any).userId : (reviewsTable as any).user_id) as any;

// 🔍 1. CONSULTA GENERAL
export const getJobs = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(jobs)
      .leftJoin(users, eq(jobs.userId, users.id)) 
      .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id)) 
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      // Usamos reviewUserCol para saber quién escribió realmente el texto
      .leftJoin(reviewerUsers, eq(reviewUserCol, reviewerUsers.id))
      .$dynamic(); 

    if (zip && zip.trim().length === 5) {
      const cleanZip = zip.trim();
      query = query.where(sql`${jobs.zip}::text = ${cleanZip}`); 
    }

    query = query.orderBy(desc(jobs.createdAt));
    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const itemsMap = new Map<string, any>();

    for (const row of rows) {
      const itemId = row.jobs.id;
      if (!itemsMap.has(itemId)) {
        const dbUser = row.users;
        itemsMap.set(itemId, {
          ...row.jobs,
          ownerName: dbUser?.name || 'Usuario Anónimo',
          reviews: [], 
          rating: 0 
        });
      }

      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        
        // 🚀 Leemos el ID desde la tabla de REVIEWS (que tiene el anónimo)
        const rUserId = row.reviews ? (row.reviews.userId || (row.reviews as any).user_id) : (row.rating.userId || (row.rating as any).user_id);
        
        let rName = 'Anónimo';
        if (rUserId !== ANON_UUID && row.reviewerUsers) {
            rName = row.reviewerUsers.name || 'Usuario';
        }

        itemsMap.get(itemId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText, 
           userName: rName, 
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalList = await Promise.all(Array.from(itemsMap.values()).map(async (item) => {
        if (item.reviews.length > 0) {
            const totalStars = item.reviews.reduce((sum: number, r: any) => sum + (Number(r.stars) || 0), 0);
            item.rating = totalStars / item.reviews.length;
            item.totalReviews = item.reviews.length;
        } else {
            item.rating = 0;
            item.totalReviews = 0;
        }
        
        const fileName = item.imageRute;
        let publicUrl = fileName; 

        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('jobs/', '');
            const rutaArchivo = `jobs/${cleanName}`;
            const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 
            if (!error && data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { ...item, imageRute: publicUrl }; 
    }));

    return finalList;
  } catch (error) {
    console.error("❌ Error en getJobs:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID
export const getJobById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(jobs)
      .leftJoin(users, eq(jobs.userId, users.id))
      .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(reviewerUsers, eq(reviewUserCol, reviewerUsers.id))
      .where(eq(jobs.id, id));

    if (!rows || rows.length === 0) return null;

    const dbJob = rows[0].jobs;
    const dbUser = rows[0].users;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

    const jobFinal: any = {
        ...dbJob,
        ownerName: nombreUsuario,
        reviews: [],
        rating: 0,
        totalReviews: 0
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        
        const rUserId = row.reviews ? (row.reviews.userId || (row.reviews as any).user_id) : (row.rating.userId || (row.rating as any).user_id);
        
        let rName = 'Anónimo';
        if (rUserId !== ANON_UUID && row.reviewerUsers) {
            rName = row.reviewerUsers.name || 'Usuario';
        }

        jobFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          userName: rName, 
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    if (jobFinal.reviews.length > 0) {
      const totalStars = jobFinal.reviews.reduce((sum: number, r: any) => sum + r.stars, 0);
      jobFinal.rating = totalStars / jobFinal.reviews.length;
      jobFinal.totalReviews = jobFinal.reviews.length;
    }

    let publicUrl = jobFinal.imageRute;
    if (publicUrl && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('jobs/', '');
        const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`jobs/${cleanName}`, 3600);
        if (!error && data?.signedUrl) publicUrl = data.signedUrl;
    }

    jobFinal.imageRute = publicUrl;
    return jobFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el empleo por ID: ${error.message}`);
  }
};

// 📥 3. CREAR EMPLEO
export const createJob = async (data: any) => {
  try {
    let cleanImage = data.imageRute || '';
    if (cleanImage.startsWith('jobs/')) cleanImage = cleanImage.replace('jobs/', '');

    let validUserId = null;
    if (data.userId && typeof data.userId === 'string' && data.userId.length > 20) {
        validUserId = data.userId;
    } else {
        const fallbackUser = await db.select().from(users).limit(1);
        if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
    }

    const payload: any = {
      nameJobs: data.nameJobs || 'Sin título',
      title: data.title || '',
      company: data.company || '',
      category: data.category || '',
      categoryId: data.categoryId ? Number(data.categoryId) : 0,
      stateCountry: data.stateCountry || '',
      city: data.city || '',
      zip: data.zip ? String(data.zip).trim() : null,
      estate: 'CA',
      contactMethod: data.contactMethod === true || data.contactMethod === 'true', 
      phoneCode: data.phoneCode || '+1',
      phone: data.phone || '',
      shifts: data.shifts || '',
      salaryMin: data.salaryMin ? String(data.salaryMin) : '',
      salaryMax: data.salaryMax ? String(data.salaryMax) : '',
      descriptionJob: data.descriptionJob || '',
      isOpen: data.isOpen !== undefined ? data.isOpen : true,
      addressJob: data.addressJob || '',
      imageRute: cleanImage,
      lat: data.lat ? Number(data.lat) : null,
      lng: data.lng ? Number(data.lng) : null,
      userId: 'baeb641a-3fa4-4fef-9846-d75947d1bca9', // Temporal para pruebas
      approved: data.approved !== undefined ? data.approved : false,
      userNameId: data.userNameId || '',
      rating: 0, 
    };
    
    const newJob = await db.insert(jobs).values(payload).returning();
    return newJob[0];
  } catch (error: any) { 
    console.error("❌ Error en createJob:", error);
    throw new Error(`Error al crear el empleo: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR EMPLEO
export const updateJob = async (id: string, data: any) => {
  try {
    if (data.imageRute && data.imageRute.startsWith('jobs/')) {
        data.imageRute = data.imageRute.replace('jobs/', '');
    }
    const updated = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el empleo: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR EMPLEO
export const deleteJob = async (id: string) => {
  try {
    const deleted = await db.delete(jobs).where(eq(jobs.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el empleo: ${error.message}`);
  }
};

// 📥 6. CREAR RESEÑA PARA EMPLEO (INSERCIÓN DOBLE)
export const createJobReview = async (data: any) => {
    try {
      // 🚀 1. Asignamos siempre el ID Real para la validación
      let sessionUserId = data.userId && typeof data.userId === 'string' && data.userId.trim() !== '' ? data.userId : ANON_UUID;
  
      // 🛑 REVISIÓN ESTRICTA: Bloqueamos en base al ID de sesión real
      if (sessionUserId !== ANON_UUID) {
          const userColumn = ('userId' in ratingTable ? (ratingTable as any).userId : (ratingTable as any).user_id) as any;
          const refColumn = ('referenceId' in ratingTable ? (ratingTable as any).referenceId : (ratingTable as any).reference_id) as any;

          const existingReview = await db.select()
              .from(ratingTable)
              .where(
                  and(
                      eq(userColumn, sessionUserId as any),
                      eq(refColumn, data.reference_id as any) 
                  )
              )
              .limit(1);
          
          if (existingReview.length > 0) {
              throw new Error("ALREADY_REVIEWED");
          }
      }

      // --- PASO A: GUARDAR LAS ESTRELLAS EN 'rating' CON EL ID REAL ---
      const ratingPayload: any = {
        rating: String(data.stars || 5), 
      };
  
      if ('userId' in ratingTable) ratingPayload.userId = sessionUserId;
      else ratingPayload.user_id = sessionUserId;

      if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'jobs';
      else ratingPayload.type_entry = 'jobs';
  
      if ('referenceId' in ratingTable) ratingPayload.referenceId = data.reference_id;
      else ratingPayload.reference_id = data.reference_id;
  
      const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
      const generatedRatingId = newRating[0].id;
  
      // --- PASO B: GUARDAR EL TEXTO EN 'reviews' CON EL ID ANÓNIMO (Si aplica) ---
      let savedComment = '';
      let textReviewUserId = data.isAnonymous ? ANON_UUID : sessionUserId;
      
      if (data.comment && data.comment.trim() !== '') {
        const reviewPayload: any = {};
        
        if ('userId' in reviewsTable) reviewPayload.userId = textReviewUserId;
        else reviewPayload.user_id = textReviewUserId;
  
        if ('review' in reviewsTable) reviewPayload.review = data.comment;
        else if ('text' in reviewsTable) reviewPayload.text = data.comment;
        else reviewPayload.comment = data.comment;
        
        if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
        else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
        else reviewPayload.rating_id = generatedRatingId;
  
        if ('typeDetailId' in reviewsTable) {
            reviewPayload.typeDetailId = '2825b8a4-fc1d-429e-8d93-f8ea239b2e89';
        } else {
            reviewPayload.type_detail_id = '2825b8a4-fc1d-429e-8d93-f8ea239b2e89';
        }

        const newReview = await db.insert(reviewsTable).values(reviewPayload).returning();
        savedComment = newReview[0].comment || '';
      }
  
      return {
        id: generatedRatingId,
        stars: Number(newRating[0].rating),
        comment: savedComment,
        userName: textReviewUserId === ANON_UUID ? 'Anónimo' : (data.userName || 'Usuario') 
      };
  
    } catch (error: any) { 
      if (error.message === "ALREADY_REVIEWED") {
          throw error; 
      }
      console.error("❌ Error CRÍTICO en createJobReview:", error);
      throw new Error(`Error al crear la reseña de empleo: ${error.message}`);
    }
};