import { db } from "../../../../packages/db/src"; 
import { jobs, users, rating as ratingTable, reviews as reviewsTable, notifications, tariffs, typeDetail, companies } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ANON_UUID = "bb50c6a4-d284-4cdd-8263-cf6b4a74de25";
const TEMP_USER_ID = "baeb641a-3fa4-4fef-9846-d75947d1bca9";

const sanitizeText = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🔍 1. CONSULTA GENERAL (Candado de Empresa Aprobada Integrado)
export const getJobs = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) : '';

    let query = db
    .select()
    .from(jobs)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(users, eq(ratingTable.userId, users.id))
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(
      // 🚀 MAGIA: Si el usuario es el dueño, la ve. Si no, DEBE estar abierta y la empresa APROBADA.
      currentUserId 
        ? sql`${jobs.userId} = ${currentUserId} OR (${jobs.isOpen} = true AND (${companies.status} = 'approved' OR ${jobs.companyId} IS NULL))`
        : sql`${jobs.isOpen} = true AND (${companies.status} = 'approved' OR ${jobs.companyId} IS NULL)`
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
          company: row.companies?.name || row.jobs.company,
          isCompanyVerified: row.companies?.isVerified || false,
          companyPlan: row.companies?.premiumPlan || 'free',
          reviews: [], 
          totalRating: 0,
          totalReviews: 0
        });
      }

      if (row.rating && row.rating.id) {
        const commentText = row.reviews ? (row.reviews as any).review || (row.reviews as any).text || (row.reviews as any).comment || '' : '';
        const reviewUserId = row.reviews ? (row.reviews as any).userId : null;
        const reviewerName = reviewUserId === ANON_UUID ? 'Anónimo' : (row.users?.name || 'Anónimo');

        jobsMap.get(jobId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           userName: reviewerName, 
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

export const getJobById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(jobs)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(users, eq(ratingTable.userId, users.id))
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(eq(jobs.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const jobFinal: any = {
      ...rows[0].jobs, 
      company: rows[0].companies?.name || rows[0].jobs.company,
      isCompanyVerified: rows[0].companies?.isVerified || false,
      companyPlan: rows[0].companies?.premiumPlan || 'free',
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {
        const commentText = row.reviews ? (row.reviews as any).review || (row.reviews as any).text || (row.reviews as any).comment || '' : '';
        const reviewUserId = row.reviews ? (row.reviews as any).userId : null;
        const reviewerName = reviewUserId === ANON_UUID ? 'Anónimo' : (row.users?.name || 'Anónimo');

        jobFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          userName: reviewerName,
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

export const createJob = async (data: any) => {
  try {
    return await db.transaction(async (tx) => {
      
      const safeDesc = sanitizeText(data.descriptionJob || data.description);
      const companyId = sanitizeText(data.companyId);

      if (!companyId) throw new Error("Debes seleccionar una empresa registrada para publicar un empleo.");

      const jobPayload: any = {
        nameJobs: sanitizeText(data.nameJobs || data.title) || 'Sin título',
        title: sanitizeText(data.title || data.nameJobs) || 'Sin título',
        company: sanitizeText(data.company),
        companyId: companyId, 
        category: sanitizeText(data.category) || 'Otros',
        stateCountry: sanitizeText(data.stateCountry || data.state) || 'California',
        city: sanitizeText(data.city),
        zip: sanitizeText(data.zip),
        contactMethod: data.contactMethod === true || data.contactMethod === 'whatsapp',
        phoneCode: sanitizeText(data.phoneCode) || '+1',
        phone: sanitizeText(data.phone),
        shifts: sanitizeText(data.shifts),
        salaryMin: sanitizeText(data.salaryMin),
        salaryMax: sanitizeText(data.salaryMax),
        descriptionJob: safeDesc,
        isOpen: data.isOpen !== undefined ? data.isOpen : true,
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        userNameId: sanitizeText(data.userNameId || data.userName) || 'Anónimo',
        approved: true, 
      };

      const [newJob] = await tx.insert(jobs).values(jobPayload).returning();

      await tx.insert(notifications).values({
        title: "¡Nueva Oferta de Empleo! 💼",
        description: `${jobPayload.company} busca: ${jobPayload.title}. ¡Aplica ya!`,
        type: "job", 
        visibleAt: new Date(), 
        userId: jobPayload.userId || TEMP_USER_ID, 
        referenceId: String(newJob.id)
      });

      return {
         ...newJob,
         description: safeDesc,
         descriptionJob: safeDesc
      };
    });
  } catch (error: any) { 
    throw new Error(`Error al crear la oferta de empleo: ${error.message}`);
  }
};

export const updateJob = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      const allowedFields = ['nameJobs', 'title', 'company', 'companyId', 'category', 'stateCountry', 'city', 'zip', 'contactMethod', 'phoneCode', 'phone', 'shifts', 'salaryMin', 'salaryMax', 'descriptionJob', 'isOpen'];
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

      const updated = await tx
        .update(jobs)
        .set(updatePayload) 
        .where(eq(jobs.id, cleanId))
        .returning();
        
      return updated[0] || null;
    });

  } catch (error: any) { 
    throw new Error(`Error al actualizar la oferta de empleo: ${error.message}`);
  }
};

export const createJobReview = async (data: any) => {
  try {
    const realUserId = sanitizeText(data.userId) || TEMP_USER_ID; 
    const targetJobId = sanitizeText(data.reference_id || data.referenceId);

    if (!targetJobId) throw new Error("No se envió el ID de la vacante.");

    const targetJob = await db.select({ companyId: jobs.companyId }).from(jobs).where(eq(jobs.id, targetJobId)).limit(1);
    
    if (!targetJob || targetJob.length === 0 || !targetJob[0].companyId) {
        throw new Error("No se pudo asociar la vacante a una compañía válida.");
    }
    const resolvedCompanyId = targetJob[0].companyId;

    const existingRating = await db.select({ id: ratingTable.id })
      .from(ratingTable)
      .innerJoin(jobs, eq(ratingTable.referenceId, jobs.id))
      .where(
        and(
          eq(ratingTable.userId, realUserId),
          eq(jobs.companyId, resolvedCompanyId)
        )
      )
      .limit(1);

    if (existingRating && existingRating.length > 0) {
        throw new Error("ALREADY_REVIEWED");
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: realUserId, 
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'jobs';
    else ratingPayload.type_entry = 'jobs';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = targetJobId;
    else ratingPayload.reference_id = targetJobId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    let savedComment = '';
    const incomingText = sanitizeText(data.comment || data.text || data.review);
    
    const reviewUserId = data.isAnonymous === true ? ANON_UUID : realUserId;
    let assignedUserName = 'Anónimo'; 

    if (incomingText && incomingText !== '') {
      const reviewPayload: any = { userId: reviewUserId };

      if ('review' in reviewsTable) reviewPayload.review = incomingText;
      else if ('text' in reviewsTable) reviewPayload.text = incomingText;
      else reviewPayload.comment = incomingText;

      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;
      
      const typeCodeRecord = await db.select({ id: typeDetail.id }).from(typeDetail).where(sql`${typeDetail.typeCode} ILIKE 'Job%'`).limit(1);
      if (!typeCodeRecord || typeCodeRecord.length === 0) throw new Error("Error en la BD: La categoría 'Jobs' no existe.");

      const typeDetailIdResolved = typeCodeRecord[0].id;
      if ('typeDetailId' in reviewsTable) reviewPayload.typeDetailId = typeDetailIdResolved;
      else reviewPayload.type_detail_id = typeDetailIdResolved;

      const reviewRows = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = (reviewRows[0] as any).comment || (reviewRows[0] as any).text || (reviewRows[0] as any).review || '';
    }

    if (data.isAnonymous !== true) {
      const userObj = await db.select({ name: users.name }).from(users).where(eq(users.id, realUserId)).limit(1);
      if (userObj.length > 0 && userObj[0].name) assignedUserName = userObj[0].name;
      else assignedUserName = sanitizeText(data.userName) || 'Cesar Gomez';
    }

    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment,
      userName: assignedUserName 
    };

  } catch (error: any) {
    throw new Error(error.message || "Error al crear la calificación");
  }
};

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