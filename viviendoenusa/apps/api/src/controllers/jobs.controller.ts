import { db } from "../../../../packages/db/src"; 
import { jobs, users, rating as ratingTable, reviews as reviewsTable, notifications, tariffs, typeDetail, companies, userDevices } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 
import zipcodes from 'zipcodes'; 

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE Y CONSTANTES
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const radiusMiles = process.env.RADIUMILE || 20; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

const ANON_UUID = "bb50c6a4-d284-4cdd-8263-cf6b4a74de25";

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS
// =====================================================================
const getCoordsFromZip = (zip: string) => {
  if (!zip) return { lat: 34.0934, lng: -117.5847 };
  
  const locationInfo = zipcodes.lookup(zip as any);
  
  if (locationInfo) {
    return { 
      lat: locationInfo.latitude, 
      lng: locationInfo.longitude 
    };
  }
  
  return { lat: 34.0934, lng: -117.5847 };
};

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS
const sanitizeText = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (EMPLEOS + BADGE DINÁMICO)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO EMPLEOS] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = [];

    // 🚀 BUCLE DINÁMICO: Contamos las no leídas por cada usuario en empleos
    for (const device of devices) {
      const [unreadResult] = await db.select({
        count: sql<number>`count(*)`
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, device.userId),
          eq(notifications.isRead, false)
        )
      );

      const unreadCount = Number(unreadResult?.count) || 1;

      messages.push({
        to: device.expoPushToken,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        badge: unreadCount, // 🔴 Globito dinámico real para empleos
        data: { type: "job", referenceId: payload.referenceId },
      });
    }

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO EMPLEOS] Enviando ${messages.length} notificaciones en la zona...`);

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }
    console.log(`✅ [PUSH MASIVO EMPLEOS] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO EMPLEOS] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA EMPLEOS
// =====================================================================
const sendTelegramAlert = async (jobTitle: string, companyName: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const message = `💼 *NUEVA OFERTA DE EMPLEO REGISTRADA*\n\n*Empresa:* ${companyName}\n*Puesto:* ${jobTitle}\n\n⚠️ Ingresa al panel de administrador en la app para revisarlo.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("❌ Error enviando alerta a Telegram:", err);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (CON ORDENAMIENTO VIP)
// =====================================================================
export const getJobs = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) : '';

    let baseConditions = currentUserId 
      ? sql`(${jobs.userId} = ${currentUserId} OR (${jobs.isOpen} = true AND (${companies.status} = 'approved' OR ${jobs.companyId} IS NULL)))`
      : sql`(${jobs.isOpen} = true AND (${companies.status} = 'approved' OR ${jobs.companyId} IS NULL))`;

    let finalConditions: any = baseConditions;

    if (zip && zip.length === 5) {
      const nearbyZips = zipcodes.radius(zip as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(jobs.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(jobs.zip, zip));
      }
    }

    let query = db
    .select()
    .from(jobs)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, jobs.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(users, eq(ratingTable.userId, users.id))
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(finalConditions)
    .$dynamic();

    // 🚀 MODO PERRO: ORDENAMIENTO VIP (Yo -> Admins -> Resto) + Fecha Descendente
    if (currentUserId) {
      query = query.orderBy(
        sql`CASE 
              WHEN ${jobs.userId} = ${currentUserId} THEN 0 
              WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 1 
              ELSE 2 
            END`,
        desc(jobs.createdAt)
      );
    } else {
      query = query.orderBy(
        sql`CASE 
              WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 0 
              ELSE 1 
            END`,
        desc(jobs.createdAt)
      );
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
        const reviewerName = reviewUserId === ANON_UUID ? 'Anónimo' : (row.users?.name  + ' ' + (row.users?.lastName ? row.users.lastName.substring(0,1) : '') || 'Anónimo');

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

        jobsMap.get(jobId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           userName: reviewerName, 
           image: data?.signedUrl,
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

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID
// =====================================================================
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
        const reviewerName = reviewUserId === ANON_UUID ? 'Anónimo' : (row.users?.name + ' ' + (row.users?.lastName ? row.users.lastName.substring(0,1) : '') || 'Anónimo');

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

        jobFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          userName: reviewerName,
          image: data?.signedUrl,
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

// =====================================================================
// 📥 3. CREAR OFERTA DE EMPLEO
// =====================================================================
export const createJob = async (data: any) => {
  try {
    const validUserId = sanitizeText(data.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para publicar un empleo.");
    }

    let pushNotificationData: any = null;

    const newJobResult = await db.transaction(async (tx) => {
      const safeDesc = sanitizeText(data.descriptionJob || data.description);
      const companyId = sanitizeText(data.companyId);

      if (!companyId) throw new Error("Debes seleccionar una empresa registrada para publicar un empleo.");

      let resolvedZip = sanitizeText(data.zip);
      if (!resolvedZip || resolvedZip.trim() === '') {
        const [creator] = await tx.select({ zip: users.zip }).from(users).where(eq(users.id, validUserId));
        resolvedZip = creator?.zip || '';
        console.log(`⚠️ Zip vacío en la oferta. Usando el Zip del dueño de la empresa: ${resolvedZip}`);
      }

      const { lat, lng } = getCoordsFromZip(resolvedZip);

      const jobPayload: any = {
        nameJobs: sanitizeText(data.nameJobs || data.title) || 'Sin título',
        title: sanitizeText(data.title || data.nameJobs) || 'Sin título',
        company: sanitizeText(data.company),
        companyId: companyId, 
        category: sanitizeText(data.category) || 'Otros',
        stateCountry: sanitizeText(data.stateCountry || data.state) || 'California',
        city: sanitizeText(data.city),
        zip: resolvedZip, 
        contactMethod: data.contactMethod === true || data.contactMethod === 'whatsapp',
        phoneCode: sanitizeText(data.phoneCode) || '+1',
        phone: sanitizeText(data.phone),
        shifts: sanitizeText(data.shifts),
        salaryMin: sanitizeText(data.salaryMin),
        salaryMax: sanitizeText(data.salaryMax),
        descriptionJob: safeDesc,
        lat: data.lat ? Number(data.lat) : lat, 
        lng: data.lng ? Number(data.lng) : lng, 
        isOpen: data.isOpen !== undefined ? data.isOpen : true,
        userId: validUserId, 
        userNameId: sanitizeText(data.userNameId || data.userName) || 'Anónimo',
        approved: true, 
      };

      const [newJob] = await tx.insert(jobs).values(jobPayload).returning();

      console.log("✅ [DEBUG PUSH EMPLEOS] Oferta publicada. Calculando candidatos en zona...");

      const titleText = "¡Nueva Oferta de Empleo! 💼";
      const bodyText = `${jobPayload.company} busca: ${jobPayload.title}. ¡Aplica ya!`;
      
      let usersToNotify: { id: string }[] = [];

      if (jobPayload.zip) {
        const nearbyZips = zipcodes.radius(jobPayload.zip as any, Number(radiusMiles)); 

        if (nearbyZips && nearbyZips.length > 0) {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(
                                    inArray(users.zip, nearbyZips as string[]),
                                    sql`${users.id} != ${validUserId}` 
                                  ));
        } else {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(
                                    eq(users.zip, String(jobPayload.zip)),
                                    sql`${users.id} != ${validUserId}` 
                                  ));
        }
      }

      if (usersToNotify.length > 0) {
        const notificationsToInsert = usersToNotify.map(u => {
          const payload: any = {
            title: titleText,
            description: bodyText,
            type: "job", 
            visibleAt: new Date(), 
            userId: u.id,
            isRead: false
          };
          if ('referenceId' in notifications) payload.referenceId = String(newJob.id);
          else if ('reference_id' in notifications) payload.reference_id = String(newJob.id);
          return payload;
        });

        await tx.insert(notifications).values(notificationsToInsert);

        pushNotificationData = {
          title: titleText,
          body: bodyText,
          referenceId: String(newJob.id),
          userIds: usersToNotify.map(u => u.id) 
        };
      }

      return {
         ...newJob,
         description: safeDesc,
         descriptionJob: safeDesc
      };
    });

    if (pushNotificationData) {
      sendMassPushNotification(pushNotificationData).catch(err => {
         console.error("❌ [DEBUG PUSH] Falló el Push Notification de empleos:", err);
      });
    }

    if (newJobResult) {
      sendTelegramAlert(
        newJobResult.title || 'Sin título',
        newJobResult.company || 'Empresa Anónima'
      ).catch(e => console.log("Notificación de Telegram falló en segundo plano", e));
    }

    return newJobResult;

  } catch (error: any) { 
    throw new Error(`Error al crear la oferta de empleo: ${error.message}`);
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR OFERTA DE EMPLEO
// =====================================================================
export const updateJob = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      const allowedFields = ['nameJobs', 'title', 'company', 'companyId', 'category', 'stateCountry', 'city', 'zip', 'contactMethod', 'phoneCode', 'phone', 'shifts', 'salaryMin', 'salaryMax', 'descriptionJob', 'isOpen', 'lat', 'lng'];
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = (key === 'lat' || key === 'lng') ? Number(data[key]) : data[key];
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

// =====================================================================
// 🚀 5. INGRESO DE RATING Y RESEÑA
// =====================================================================
export const createJobReview = async (data: any) => {
  try {
    const realUserId = sanitizeText(data.userId);
    if (!realUserId && data.isAnonymous !== true) {
        throw new Error("No estás autorizado para publicar una reseña. Se requiere iniciar sesión.");
    }
    
    const trackingUserId = realUserId || ANON_UUID;
    const targetJobId = sanitizeText(data.reference_id || data.referenceId);

    if (!targetJobId) throw new Error("No se envió el ID de la vacante.");

    const targetJob = await db.select({ companyId: jobs.companyId }).from(jobs).where(eq(jobs.id, targetJobId)).limit(1);
    
    if (!targetJob || targetJob.length === 0 || !targetJob[0].companyId) {
        throw new Error("No se pudo asociar la vacante a una compañía válida.");
    }
    const resolvedCompanyId = targetJob[0].companyId;

    if (trackingUserId !== ANON_UUID) {
      const existingRating = await db.select({ id: ratingTable.id })
        .from(ratingTable)
        .innerJoin(jobs, eq(ratingTable.referenceId, jobs.id))
        .where(
          and(
            eq(ratingTable.userId, trackingUserId),
            eq(jobs.companyId, resolvedCompanyId)
          )
        )
        .limit(1);

      if (existingRating && existingRating.length > 0) {
          throw new Error("ALREADY_REVIEWED");
      }
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: trackingUserId, 
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'jobs';
    else ratingPayload.type_entry = 'jobs';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = targetJobId;
    else ratingPayload.reference_id = targetJobId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    let savedComment = '';
    const incomingText = sanitizeText(data.comment || data.text || data.review);
    
    const reviewUserId = data.isAnonymous === true ? ANON_UUID : trackingUserId;
    
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

    let assignedUserName = 'Anónimo';
    let signedImageUrl = null;

    if (data.isAnonymous !== true && trackingUserId !== ANON_UUID) {
      const [userRecord] = await db.select({
        name: users.name,
        lastName: users.lastName,
        imageUrl: users.imageUrl
      }).from(users).where(eq(users.id, trackingUserId));

      if (userRecord) {
        assignedUserName = `${userRecord.name} ${userRecord.lastName ? userRecord.lastName.substring(0, 1) : ''}`.trim() || 'Usuario';
        
        if (userRecord.imageUrl) {
          const rutaArchivo = userRecord.imageUrl.startsWith('users/') 
            ? userRecord.imageUrl 
            : `users/${userRecord.imageUrl}`;
          const { data: storageData } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
          if (storageData) signedImageUrl = storageData.signedUrl;
        }
      }
    }

    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment,
      userName: assignedUserName,
      image: signedImageUrl,
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

  } catch (error: any) {
    throw new Error(error.message || "Error al crear la calificación");
  }
};

// =====================================================================
// 🗑️ 6. ELIMINAR OFERTA DE EMPLEO
// =====================================================================
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