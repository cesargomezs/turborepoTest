import { db } from "../../../../packages/db/src"; 
import { jobs, users, rating as ratingTable, reviews as reviewsTable, payments, notifications, tariffs, typeDetail } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🚀 ID OFICIAL PARA USUARIO ANÓNIMO EN LA BD (Evita errores de Foreign Key)
const ANON_UUID = "bb50c6a4-d284-4cdd-8263-cf6b4a74de25";

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentJobPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.price })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Job%'`, 
        eq(tariffs.isActive, true),
        eq(tariffs.planType, currentYear) 
      )
    )
    .limit(1);

    if (activeTariff && activeTariff.length > 0 && activeTariff[0].price) {
      return activeTariff[0].price;
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN para Empleos, usando $50.00 por defecto");
  }
  return "50.00";
};

// 🔍 1. CONSULTA GENERAL (Feed de Empleos)
export const getJobs = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) || '' : '';

    let query = db
    .select()
    .from(jobs)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(payments, and(eq(payments.entityId, jobs.id), eq(payments.entityType, 'job')))
    .where(
      currentUserId 
        ? sql`${jobs.approved} = false OR ${jobs.timepostEnd} > NOW() OR ${jobs.userId} = ${currentUserId}`
        : sql`${jobs.approved} = false OR ${jobs.timepostEnd} > NOW()`
    )
    .orderBy(desc(jobs.createdAt))
    .$dynamic();

    if (zip && zip.length === 5) {
      query = query.where(sql`${jobs.zip}::text = ${zip}`); 
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const jobsMap = new Map<string, any>();

    for (const row of rows) {
      const jobId = row.jobs.id;

      if (!jobsMap.has(jobId)) {
        jobsMap.set(jobId, {
          ...row.jobs,
          referenceCode: row.payments?.referenceCode || null,
          paymentMethod: row.payments?.paymentMethod || null,
          reviews: [], 
          totalRating: 0,
          totalReviews: 0
        });
      }

      if (row.rating && row.rating.id) {
        // 🚀 FIX TS: Compatibilidad con diferentes nombres de columna en reviews
        const commentText = row.reviews ? (row.reviews as any).review || (row.reviews as any).text || (row.reviews as any).comment || '' : '';

        jobsMap.get(jobId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           userName: 'Anónimo', // 🚀 FIX TS: Forzamos el valor ya que no está en el esquema de reviews
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalResult = await Promise.all(Array.from(jobsMap.values()).map(async (job: any) => {
      job.totalReviews = job.reviews.length;

      if (job.totalReviews > 0) {
        const sum = job.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
        job.totalRating = Math.round((sum / job.totalReviews) * 10) / 10;
        job.rating = job.totalRating; 
      } else {
        job.totalRating = 0;
        job.rating = 0;
      }

      const safeDescription = job.descriptionJob || '';
      job.description = safeDescription;
      job.descriptionJob = safeDescription;

      return job;
    }));

    return finalResult;
  } catch (error: any) {
    console.error("❌ Error en getJobs:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID
export const getJobById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(jobs)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(payments, and(eq(payments.entityId, jobs.id), eq(payments.entityType, 'job')))
      .where(eq(jobs.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const jobFinal: any = {
      ...rows[0].jobs, 
      referenceCode: rows[0].payments?.referenceCode || null,
      paymentMethod: rows[0].payments?.paymentMethod || null,
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {
        // 🚀 FIX TS
        const commentText = row.reviews ? (row.reviews as any).review || (row.reviews as any).text || (row.reviews as any).comment || '' : '';

        jobFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          userName: 'Anónimo', // 🚀 FIX TS
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    jobFinal.totalReviews = jobFinal.reviews.length;
    if (jobFinal.totalReviews > 0) {
      const sum = jobFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      jobFinal.totalRating = Math.round((sum / jobFinal.totalReviews) * 10) / 10;
      jobFinal.rating = jobFinal.totalRating;
    }

    const safeDescription = jobFinal.descriptionJob || '';
    jobFinal.description = safeDescription;
    jobFinal.descriptionJob = safeDescription;

    return jobFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener la oferta de empleo por ID: ${error.message}`);
  }
};

// 📥 3. CREAR VACANTE DE EMPLEO
export const createJob = async (data: any) => {
  try {
    return await db.transaction(async (tx) => {
      
      const safeDesc = sanitizeText(data.descriptionJob || data.description) || '';

      const jobPayload: any = {
        nameJobs: sanitizeText(data.nameJobs || data.title) || 'Sin título',
        title: sanitizeText(data.title || data.nameJobs) || 'Sin título',
        company: sanitizeText(data.company) || '',
        category: sanitizeText(data.category) || 'Otros',
        stateCountry: sanitizeText(data.stateCountry || data.state) || 'California',
        city: sanitizeText(data.city) || '',
        zip: sanitizeText(data.zip) || '',
        contactMethod: data.contactMethod === true || data.contactMethod === 'whatsapp',
        phoneCode: sanitizeText(data.phoneCode) || '+1',
        phone: sanitizeText(data.phone) || '',
        shifts: sanitizeText(data.shifts) || '',
        salaryMin: sanitizeText(data.salaryMin) || '',
        salaryMax: sanitizeText(data.salaryMax) || '',
        descriptionJob: safeDesc,
        isOpen: data.isOpen !== undefined ? data.isOpen : true,
        userId: sanitizeText(data.userId) || ANON_UUID, 
        userNameId: sanitizeText(data.userNameId || data.userName) || 'Anónimo',
        approved: false 
      };
      
      const [newJob] = await tx.insert(jobs).values(jobPayload).returning();

      if (data.referenceCode && data.paymentMethod) {
        const basePrice = await getCurrentJobPrice();

        await tx.insert(payments).values({
          entityType: 'job',
          entityId: newJob.id,
          userId: jobPayload.userId,
          referenceCode: sanitizeText(data.referenceCode) || '', 
          paymentMethod: sanitizeText(data.paymentMethod) || '', 
          amount: basePrice, 
          durationDays: 30, 
          status: "pending"
        });
      }

      return {
         ...newJob,
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod,
         description: safeDesc,
         descriptionJob: safeDesc
      };
    });
  } catch (error: any) { 
    console.error("❌ Error en createJob:", error);
    
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado. Por favor, ingresa un código válido y único.");
    }

    throw new Error(`Error al crear la oferta de empleo: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR VACANTE
export const updateJob = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      const allowedFields = ['nameJobs', 'title', 'company', 'category', 'stateCountry', 'city', 'zip', 'contactMethod', 'phoneCode', 'phone', 'shifts', 'salaryMin', 'salaryMax', 'descriptionJob', 'isOpen'];
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = data[key];
        }
      }

      if (data.descriptionJob !== undefined || data.description !== undefined) {
        const safeDesc = sanitizeText(data.descriptionJob !== undefined ? data.descriptionJob : data.description);
        updatePayload.descriptionJob = safeDesc;
      }

      const isApproved = String(data.approved).toLowerCase() === 'true';

      if (isApproved) {
        updatePayload.approved = true; 
        updatePayload.createdAt = new Date();
        
        let monthsToAdd = 1; 
        if (data.durationMonths) {
          const parsedMonths = Number(data.durationMonths);
          if (!isNaN(parsedMonths)) {
            monthsToAdd = parsedMonths;
          }
        }
        
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd);
        
        updatePayload.timepostEnd = expirationDate; 

        const basePriceString = await getCurrentJobPrice();
        const basePriceNum = Number(basePriceString) || 50; 
        const totalAmount = (monthsToAdd * basePriceNum).toFixed(2); 

        const daysToAdd = monthsToAdd * 30; 

        await tx.update(payments)
          .set({ 
             status: "approved", 
             approvedAt: new Date(), 
             durationDays: daysToAdd, 
             amount: totalAmount, 
             timepost_end: expirationDate 
          })
          .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'job')));
      }

      const updated = await tx
        .update(jobs)
        .set(updatePayload) 
        .where(eq(jobs.id, cleanId))
        .returning();
        
      const jobItem = updated[0];

      if (isApproved && jobItem) {
        const notifPayload: any = {
            title: "¡Nueva Oferta de Empleo! 💼",
            description: `${jobItem.company} busca: ${jobItem.title || jobItem.nameJobs}. ¡Aplica ya!`,
            type: "job", 
            visibleAt: new Date(), 
            userId: jobItem.userId || ANON_UUID, 
        };

        if ('referenceId' in notifications) notifPayload.referenceId = String(jobItem.id);
        else if ('reference_id' in notifications) notifPayload.reference_id = String(jobItem.id);

        await tx.insert(notifications).values(notifPayload);
      }

      return jobItem || null;
    });

  } catch (error: any) { 
    console.error("❌ Error en updateJob:", error);
    throw new Error(`Error al actualizar la oferta de empleo: ${error.message}`);
  }
};

// 🚀 5. INGRESO DE RATING Y RESEÑA
export const createJobReview = async (data: any) => {
  try {
    let validUserId = sanitizeText(data.userId) || null;
    
    // Si es anónimo o no mandó ID válido, le asignamos el ID oficial del anónimo.
    if (!validUserId || validUserId.length < 20 || data.isAnonymous === true) {
        validUserId = ANON_UUID; 
    }

    const targetReferenceId = sanitizeText(data.reference_id || data.referenceId);

    // ANTI-DUPLICADOS (Saltamos chequeo si es el usuario Anónimo)
    if (validUserId && validUserId !== ANON_UUID && targetReferenceId) {
        const existingRating = await db.select()
          .from(ratingTable)
          .where(
            and(
              eq(ratingTable.referenceId, targetReferenceId),
              eq(ratingTable.userId, validUserId)
            )
          )
          .limit(1);

        if (existingRating && existingRating.length > 0) {
            throw new Error("ALREADY_REVIEWED");
        }
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: validUserId,
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'jobs';
    else ratingPayload.type_entry = 'jobs';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = targetReferenceId;
    else ratingPayload.reference_id = targetReferenceId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    let savedComment = '';
    const incomingText = sanitizeText(data.comment || data.text || data.review);
    
    if (incomingText && incomingText !== '') {
      const reviewPayload: any = {
        userId: validUserId
      };

      if ('review' in reviewsTable) reviewPayload.review = incomingText;
      else if ('text' in reviewsTable) reviewPayload.text = incomingText;
      else reviewPayload.comment = incomingText;

      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;
      
      const typeCodeRecord = await db.select({ id: typeDetail.id })
        .from(typeDetail)
        .where(sql`${typeDetail.typeCode} ILIKE 'Job%'`)
        .limit(1);

      if (!typeCodeRecord || typeCodeRecord.length === 0) {
        throw new Error("Error en la Base de Datos: La categoría 'Jobs' no existe en la tabla typeDetail.");
      }

      const typeDetailIdResolved = typeCodeRecord[0].id;

      if ('typeDetailId' in reviewsTable) {
          reviewPayload.typeDetailId = typeDetailIdResolved;
      } else {
          reviewPayload.type_detail_id = typeDetailIdResolved;
      }

      // 🚀 FIX TS: Retiramos userName de la carga a BD ya que Drizzle no lo reconoce en el esquema actual de reviews.
      
      const reviewRows = await db.insert(reviewsTable).values(reviewPayload).returning();
      // 🚀 FIX TS para leer compatibilidad de columnas
      savedComment = (reviewRows[0] as any).comment || (reviewRows[0] as any).text || (reviewRows[0] as any).review || '';
    }

    // Devolvemos el nombre en la respuesta JSON para que el frontend lo pinte.
    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment,
      userName: data.isAnonymous === true ? 'Anónimo' : sanitizeText(data.userName) || 'Anónimo'
    };

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en createJobReview:", error.message);
    throw new Error(error.message || "Error al crear la calificación");
  }
};

// 🗑️ 6. ELIMINAR OFERTA DE EMPLEO
export const deleteJob = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(jobs).where(eq(jobs.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la oferta de empleo: ${error.message}`);
  }
};

// 🔄 7. RENOVAR OFERTA DE EMPLEO
export const renewJob = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    if (!refCode || !payMethod || !cleanId) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      const basePrice = await getCurrentJobPrice();

      await tx.insert(payments).values({
        entityType: 'job',
        entityId: cleanId,
        userId: sanitizeText(data.userId) || ANON_UUID, 
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: basePrice, 
        durationDays: 30, 
        status: "pending"
      });

      const updated = await tx
        .update(jobs)
        .set({ approved: false }) 
        .where(eq(jobs.id, cleanId))
        .returning();
        
      return {
         ...updated[0],
         referenceCode: refCode,
         paymentMethod: payMethod
      };
    });

  } catch (error: any) { 
    console.error("❌ Error en renewJob:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado en otra transacción.");
    }
    throw new Error(`Error al renovar la oferta de empleo: ${error.message}`);
  }
};