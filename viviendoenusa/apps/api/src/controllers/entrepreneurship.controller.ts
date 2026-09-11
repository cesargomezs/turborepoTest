import { db } from "../../../../packages/db/src"; 
import { entrepreneurship, users, rating as ratingTable, reviews as reviewsTable, notifications, userDevices, typeDetail } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, inArray, or } from "drizzle-orm"; 
import { alias } from "drizzle-orm/pg-core"; 
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

const reviewers = alias(users, 'reviewers');

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS (Sin internet, súper rápida)
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

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS MEJORADA PARA UUIDs
const sanitizeText = (str: any) => {
  if (!str) return null;
  if (typeof str !== 'string') str = String(str);
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA EMPRENDIMIENTOS
// =====================================================================
const sendTelegramAlert = async (userId: string, zip: string, namePreview: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) return;

  // 🚀 Buscamos el correo y nombre del usuario en la base de datos
  let userEmail = "No disponible";
  let userName = "Usuario";
  try {
    const [userRecord] = await db.select({
      email: users.email,
      name: users.name,
      lastName: users.lastName
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (userRecord) {
      userEmail = userRecord.email || "No disponible";
      userName = `${userRecord.name || ''} ${userRecord.lastName || ''}`.trim() || "Usuario";
    }
  } catch (e) {
    console.warn("⚠️ No se pudo obtener el correo para la alerta de Telegram de emprendimientos", e);
  }

  const shortName = namePreview.length > 40 ? namePreview.substring(0, 40) + '...' : namePreview;
  const message = `💡 *NUEVO EMPRENDIMIENTO REGISTRADO*\n\n*Usuario:* ${userName}\n*Correo:* ${userEmail}\n*ZIP:* ${zip}\n*Negocio:* "${shortName}"\n\n⚠️ Ingresa al panel para verificar y aprobar.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
    });
  } catch (err) {
    console.error("❌ Error enviando alerta a Telegram:", err);
  }
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (EMPRENDIMIENTOS + BADGE DINÁMICO)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO EMPRENDIMIENTOS] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = [];

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
        badge: unreadCount, 
        data: { type: "entrepreneurship", referenceId: payload.referenceId },
      });
    }

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO EMPRENDIMIENTOS] Enviando ${messages.length} notificaciones en la zona...`);

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
    console.log(`✅ [PUSH MASIVO EMPRENDIMIENTOS] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO EMPRENDIMIENTOS] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (DEVUELVE TODOS LOS PENDIENTES SIN RESTRICCIONES)
// =====================================================================
export const getEntrepreneurships = async (rawZip?: string | number, userId?: string) => {
  try {
    const cleanZipParam = rawZip ? sanitizeText(String(rawZip)) || '' : '';
    const cleanUserId = userId ? sanitizeText(String(userId)) : null;

    // 🚀 OBTENER TODOS LOS REGISTROS (Aprobados y No Aprobados / Pendientes)
    let baseConditions = cleanUserId 
      ? sql`(${entrepreneurship.approved} = false OR ${entrepreneurship.approved} = true OR ${entrepreneurship.userId} = ${cleanUserId})`
      : sql`(${entrepreneurship.approved} = false OR ${entrepreneurship.approved} = true)`;

    let finalConditions: any = baseConditions;

    if (cleanZipParam && cleanZipParam.length === 5) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(entrepreneurship.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(entrepreneurship.zip, cleanZipParam));
      }
    }

    let query = db
      .select({
        entrepreneurship: entrepreneurship,
        users: users,
        rating: ratingTable,
        reviews: reviewsTable,
        reviewers: reviewers,
      })
      .from(entrepreneurship)
      .leftJoin(users, eq(entrepreneurship.userId, users.id))
      .leftJoin(ratingTable, eq(ratingTable.referenceId, entrepreneurship.id)) 
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .leftJoin(reviewers, eq(ratingTable.userId, reviewers.id))
      .where(finalConditions)
      .$dynamic(); 
    
    if (userId) {
      query = query.orderBy(
        sql`CASE 
              WHEN ${entrepreneurship.userId} = ${userId} THEN 0 
              WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 1 
              ELSE 2 
            END`,
        desc(entrepreneurship.createdAt)
      );
    } else {
      query = query.orderBy(
        sql`CASE 
              WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 0 
              ELSE 1 
            END`,
        desc(entrepreneurship.createdAt)
      );
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const itemsMap = new Map<string, any>();

    for (const row of rows) {
      const itemId = row.entrepreneurship.id;

      if (!itemsMap.has(itemId)) {
        const dbItem = row.entrepreneurship as any;
        const isAppr = dbItem.approved === true || String(dbItem.approved).toLowerCase() === 'true';

        itemsMap.set(itemId, {
          ...row.entrepreneurship,
          approved: isAppr,
          status: isAppr ? 'approved' : 'pending',
          reviews: [],
          rating: 0,
          totalReviews: 0,
          likes: 0,
          dislikes: 0,
          userVote: null
        });
      }

      if (row.rating && row.rating.id) {
        const reviewerUser = row.reviewers;
        let signedImageUrl = null;
        if (reviewerUser?.imageUrl) {
          const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('users/' + reviewerUser.imageUrl, 3600);
          if (data?.signedUrl) signedImageUrl = data.signedUrl;
        }
        
        const commentText = row.reviews?.comment || '';
        const name = reviewerUser ? `${reviewerUser.name || ''} ${reviewerUser.lastName?.substring(0, 1) || ''}`.trim() : 'Anónimo';

        itemsMap.get(itemId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText, 
           name: name,
           image: signedImageUrl,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const likesRes = await db.execute(sql`
      SELECT relationship_id, SUM(likes) as t_likes, SUM(dislikes) as t_dislikes 
      FROM public.countlikes 
      GROUP BY relationship_id
    `) as any;
    
    const likesData = Array.isArray(likesRes) ? likesRes : (likesRes?.rows || []);

    let userVotesData: any[] = [];
    if (userId) {
       const uVotesRes = await db.execute(sql`
          SELECT relationship_id, likes, dislikes 
          FROM public.countlikes 
          WHERE user_id = ${userId}
       `) as any;
       userVotesData = Array.isArray(uVotesRes) ? uVotesRes : (uVotesRes?.rows || []);
    }

    const finalListPromises = Array.from(itemsMap.values()).map(async item => {
        item.totalReviews = item.reviews.length;
        item.rating = item.totalReviews > 0 
          ? Math.round((item.reviews.reduce((sum: number, r: any) => sum + r.stars, 0) / item.totalReviews) * 10) / 10 
          : 0;

        const itemLikes = likesData.find((ld: any) => ld.relationship_id === item.id);
        if (itemLikes) {
            item.likes = Number(itemLikes.t_likes) || 0;
            item.dislikes = Number(itemLikes.t_dislikes) || 0;
        }

        const uVote = userVotesData.find(uv => uv.relationship_id === item.id);
        if (uVote) {
           if (Number(uVote.likes) === 1) item.userVote = 'like';
           else if (Number(uVote.dislikes) === 1) item.userVote = 'dislike';
        }

        const fileName = item.imageEntrepren;
        let publicUrl = fileName; 

        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('entrepreneurship/', '');
            const rutaArchivo = `entrepreneurship/${cleanName}`;
            const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 
            if (!error && data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { ...item, imageEntrepren: publicUrl }; 
    });

    return await Promise.all(finalListPromises);
  } catch (error) {
    console.error("❌ Error en getEntrepreneurships:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID 
// =====================================================================
export const getEntrepreneurshipById = async (id: string, userId?: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(entrepreneurship)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, entrepreneurship.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(reviewers, eq(ratingTable.userId, reviewers.id))
      .where(eq(entrepreneurship.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const dbItem = rows[0].entrepreneurship;
    const isAppr = dbItem.approved === true || String(dbItem.approved).toLowerCase() === 'true';

    const itemFinal: any = {
      ...dbItem, 
      approved: isAppr,
      status: isAppr ? 'approved' : 'pending',
      reviews: [],
      totalRating: 0,
      totalReviews: 0,
      likes: 0,
      dislikes: 0,
      userVote: null
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {
        const reviewerUser = row.reviewers;
        let signedImageUrl = null;
        if (reviewerUser?.imageUrl) {
            const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('users/' + reviewerUser.imageUrl, 3600);
            if (data?.signedUrl) signedImageUrl = data.signedUrl;
        }

        const commentText = row.reviews?.comment || '';
        const namePart = reviewerUser?.name || reviewerUser?.lastName || 'Anónimo';
        const lastNamePart = reviewerUser?.lastName ? reviewerUser.lastName.substring(0, 1) : '';

        itemFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          name: `${namePart} ${lastNamePart}`.trim(),
          image: signedImageUrl,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    itemFinal.totalReviews = itemFinal.reviews.length;
    if (itemFinal.totalReviews > 0) {
      const sum = itemFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      itemFinal.rating = Math.round((sum / itemFinal.totalReviews) * 10) / 10;
    }

    if (dbItem.imageEntrepren && dbItem.imageEntrepren.trim() !== '' && !dbItem.imageEntrepren.startsWith('http')) {
      const cleanName = dbItem.imageEntrepren.replace('entrepreneurship/', '');
      const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`entrepreneurship/${cleanName}`, 3600);
      if (data?.signedUrl) itemFinal.imageEntrepren = data.signedUrl;
    }

    const likesRes = await db.execute(sql`SELECT SUM(likes) as t_likes, SUM(dislikes) as t_dislikes FROM public.countlikes WHERE relationship_id = ${cleanId}`) as any;
    const likesArray = Array.isArray(likesRes) ? likesRes : (likesRes?.rows || []);
    const likesRow = likesArray[0];
    
    itemFinal.likes = likesRow ? Number(likesRow.t_likes || 0) : 0;
    itemFinal.dislikes = likesRow ? Number(likesRow.t_dislikes || 0) : 0;

    if (userId) {
        const uVoteRes = await db.execute(sql`SELECT likes, dislikes FROM public.countlikes WHERE relationship_id = ${cleanId} AND user_id = ${userId}`) as any;
        const uVoteArray = Array.isArray(uVoteRes) ? uVoteRes : (uVoteRes?.rows || []);
        const uVoteRow = uVoteArray[0];
        
        if (uVoteRow) {
            if (Number(uVoteRow.likes) === 1) itemFinal.userVote = 'like';
            else if (Number(uVoteRow.dislikes) === 1) itemFinal.userVote = 'dislike';
        }
    }
    
    return itemFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el emprendimiento por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR EMPRENDIMIENTO (NACE PENDIENTE + ALERTA TELEGRAM)
// =====================================================================
export const createEntrepreneurship = async (data: any) => {
  try {
    let cleanImage = data.imageEntrepren || '';
    if (cleanImage.startsWith('entrepreneurship/')) {
        cleanImage = cleanImage.replace('entrepreneurship/', '');
    }

    const validUserId = sanitizeText(data.userId);
    if (!validUserId) {
        throw new Error("El ID del usuario es obligatorio para registrar un emprendimiento.");
    }

    const { lat, lng } = getCoordsFromZip(data.zip || '');

    const payload: any = {
      nameEntrepren: data.nameEntrepren || 'Sin nombre',
      categoryId: String(data.categoryId || '0'), 
      descriptionEntrepren: data.descriptionEntrepren || '',
      phone: data.phone || '',
      verified: false,
      promo: data.promo || '',
      imageEntrepren: cleanImage,
      saved: false,
      contactMethod: data.contactMethod || 'whatsapp',
      addressentr: data.addressEntrepren || '',
      zip: data.zip ? String(data.zip).trim() : null,
      lat: lat,
      lng: lng,
      estate: data.estate,
      approved: false, 
      userId: validUserId 
    };

    const createdItemResult = await db.transaction(async (tx) => {
      const newItem = await tx.insert(entrepreneurship).values(payload).returning();
      return newItem[0];
    });

    sendTelegramAlert(
      validUserId, 
      data.zip || 'N/A', 
      data.nameEntrepren || 'Sin nombre'
    ).catch(e => console.log("Telegram alert failed", e));

    return {
      ...createdItemResult,
      approved: false,
      status: 'pending',
      message: "¡Emprendimiento recibido! Nuestro equipo lo revisará y estará visible en las próximas 24 horas."
    };

  } catch (error: any) { 
    console.error("❌ Error en createEntrepreneurship:", error);
    throw new Error(`Error al crear el emprendimiento: ${error.message}`);
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR EMPRENDIMIENTO (Y DISPARAR PUSH AL APROBAR)
// =====================================================================
export const updateEntrepreneurship = async (idParam: any, dataParam: any) => {
  try {
    let rawId = idParam;
    let data = dataParam;

    if (idParam && typeof idParam === 'object') {
      if (idParam.params && idParam.params.id) {
        rawId = idParam.params.id; 
      } else if (idParam.id) {
        rawId = idParam.id; 
      }
    }

    const cleanId = sanitizeText(rawId);
    if (!cleanId) throw new Error("ID inválido");

    if (!data && idParam && idParam.body) {
      data = idParam.body;
    }

    if (data && data.imageEntrepren && typeof data.imageEntrepren === 'string' && data.imageEntrepren.startsWith('entrepreneurship/')) {
        data.imageEntrepren = data.imageEntrepren.replace('entrepreneurship/', '');
    }

    let pushNotificationData: any = null;

    const [existing] = await db.select().from(entrepreneurship).where(eq(entrepreneurship.id, cleanId));

    if (data && (data.approved === true || String(data.approved).toLowerCase() === 'true')) {
      data.approved = true;
    }

    const updated = await db.update(entrepreneurship).set(data).where(eq(entrepreneurship.id, cleanId)).returning();
    const record = updated[0] || null;

    const isApprovedNow = data && (data.approved === true || String(data.approved).toLowerCase() === 'true');
    const wasApprovedBefore = existing && (existing.approved === true || String(existing.approved).toLowerCase() === 'true');

    if (isApprovedNow && !wasApprovedBefore && record) {
      console.log("✅ [DEBUG PUSH] Emprendimiento aprobado. Calculando usuarios locales...");

      const titleText = "¡Nuevo Emprendimiento local! 🚀";
      const bodyText = `Apoya el talento de tu zona: ${record.nameEntrepren} está cerca de ti.`;
      
      let usersToNotify: { id: string }[] = [];

      if (record.zip) {
        const nearbyZips = zipcodes.radius(record.zip as any, Number(radiusMiles)); 

        if (nearbyZips && nearbyZips.length > 0) {
          usersToNotify = await db.select({ id: users.id })
                                  .from(users)
                                  .where(and(inArray(users.zip, nearbyZips as string[]), sql`${users.id} != ${record.userId}`)); 
        } else {
          usersToNotify = await db.select({ id: users.id })
                                  .from(users)
                                  .where(and(eq(users.zip, String(record.zip)), sql`${users.id} != ${record.userId}`));
        }
      }

      if (usersToNotify.length > 0) {
        const notificationsToInsert = usersToNotify.map(u => {
          const notifPayload: any = {
            title: titleText,
            description: bodyText,
            type: "entrepreneurship", 
            visibleAt: new Date(), 
            userId: u.id,
            isRead: false
          };
          if ('referenceId' in notifications) notifPayload.referenceId = String(record.id);
          else if ('reference_id' in notifications) notifPayload.reference_id = String(record.id);
          return notifPayload;
        });

        await db.insert(notifications).values(notificationsToInsert);

        pushNotificationData = {
          title: titleText,
          body: bodyText,
          referenceId: String(record.id),
          userIds: usersToNotify.map(u => u.id) 
        };
      }
    }

    if (pushNotificationData) {
      sendMassPushNotification(pushNotificationData).catch(err => {
         console.error("❌ [DEBUG PUSH] Falló el Push Notification:", err);
      });
    }

    return record;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el emprendimiento: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 5. ELIMINAR EMPRENDIMIENTO
// =====================================================================
export const deleteEntrepreneurship = async (id: string) => {
  try {
    const deleted = await db.delete(entrepreneurship).where(eq(entrepreneurship.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el emprendimiento: ${error.message}`);
  }
};

// =====================================================================
// 📥 6. CREAR RESEÑA 
// =====================================================================
export const createEntrepreneurshipReview = async (data: any) => {
  try {
    const validUserId = data.userId;
    if (!validUserId) {
        throw new Error("Se requiere iniciar sesión para dejar una reseña.");
    } 

    const existingReview = await db
      .select()
      .from(ratingTable)
      .where(
        and(
          eq(ratingTable.referenceId, data.reference_id),
          eq(ratingTable.userId, validUserId)
        )
      )
      .limit(1);

    if (existingReview.length > 0) {
      throw new Error("Ya has escrito una reseña para este negocio.");
    }

    const ratingPayload: any = {
      rating: String(data.stars || 5),
      userId: validUserId,
      referenceId: data.reference_id, 
      typeEntry: 'entrepreneurship'
    };

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    let savedComment = '';
    if (data.comment && data.comment.trim() !== '') {
      const reviewPayload: any = {
        userId: validUserId,
        comment: data.comment,
        relationshipId: generatedRatingId,
        typeDetailId: '035118eb-612e-41a2-ac95-b4f339b4e388' 
      };

      const newReview = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = newReview[0].comment || '';
    }

    const [userRecord] = await db.select({
      name: users.name,
      lastName: users.lastName,
      imageUrl: users.imageUrl
    }).from(users).where(eq(users.id, validUserId));

    let signedImageUrl = null;
    if (userRecord && userRecord.imageUrl) {
      const rutaArchivo = userRecord.imageUrl.startsWith('users/') 
        ? userRecord.imageUrl 
        : `users/${userRecord.imageUrl}`;
      const { data: storageData } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
      if (storageData) signedImageUrl = storageData.signedUrl;
    }

    const formattedName = userRecord 
      ? `${userRecord.name} ${userRecord.lastName ? userRecord.lastName.substring(0, 1) : ''}`
      : 'Usuario';

    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment,
      name: formattedName,
      image: signedImageUrl,
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

  } catch (error: any) { 
    console.error("❌ Error en createEntrepreneurshipReview:", error);
    throw error; 
  }
};

// =====================================================================
// 🚀 7. FUNCIÓN PARA VOTAR (ME GUSTA / NO ME GUSTA)
// =====================================================================
export const voteEntrepreneurship = async (data: any) => {
  try {
    const { relationship_id, userId, action } = data;
    if (!relationship_id || !userId || !action) throw new Error("Faltan datos obligatorios para votar.");

    const isLike = action === 'like' ? 1 : 0;
    const isDislike = action === 'dislike' ? 1 : 0;

    const existingVoteRes = await db.execute(
      sql`SELECT id, likes, dislikes FROM public.countlikes WHERE relationship_id = ${relationship_id} AND user_id = ${userId} LIMIT 1`
    ) as any;
    
    const existingRows = Array.isArray(existingVoteRes) ? existingVoteRes : (existingVoteRes?.rows || []);

    if (existingRows.length > 0) {
      const voteId = existingRows[0].id;
      const currentLikes = Number(existingRows[0].likes);
      const currentDislikes = Number(existingRows[0].dislikes);

      if ((action === 'like' && currentLikes === 1) || (action === 'dislike' && currentDislikes === 1)) {
        await db.execute(sql`UPDATE public.countlikes SET likes = 0, dislikes = 0 WHERE id = ${voteId}`);
      } else {
        await db.execute(sql`UPDATE public.countlikes SET likes = ${isLike}, dislikes = ${isDislike} WHERE id = ${voteId}`);
      }
    } else {
      await db.execute(
        sql`INSERT INTO public.countlikes (relationship_id, user_id, likes, dislikes, created_at) VALUES (${relationship_id}, ${userId}, ${isLike}, ${isDislike}, NOW())`
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ Error en voteEntrepreneurship:", error);
    throw new Error(`Error al procesar el voto: ${error.message}`);
  }
};

// =====================================================================
// 🔍 8. CONSULTA POR LOTE (BATCH) PARA GUARDADOS
// =====================================================================
export const getEntrepreneurshipsByIds = async (ids: string[], userId?: string) => {
  try {
    if (!ids || ids.length === 0) return [];

    let query = db
      .select()
      .from(entrepreneurship)
      .leftJoin(users, eq(entrepreneurship.userId, users.id))
      .leftJoin(ratingTable, eq(ratingTable.referenceId, entrepreneurship.id)) 
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .leftJoin(reviewers, eq(ratingTable.userId, reviewers.id))
      .where(sql`${entrepreneurship.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(entrepreneurship.createdAt));

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const itemsMap = new Map<string, any>();

    for (const row of rows) {
      const itemId = row.entrepreneurship.id;
      if (!itemsMap.has(itemId)) {
        const isAppr = row.entrepreneurship.approved === true || String(row.entrepreneurship.approved).toLowerCase() === 'true';
        itemsMap.set(itemId, { 
          ...row.entrepreneurship, 
          approved: isAppr,
          status: isAppr ? 'approved' : 'pending',
          reviews: [], 
          rating: 0, 
          totalReviews: 0, 
          likes: 0, 
          dislikes: 0, 
          userVote: null 
        });
      }

      if (row.rating && row.rating.id) {
        const reviewerUser = row.reviewers;
        let signedImageUrl = null;
        if (reviewerUser?.imageUrl) {
          const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl('users/' + reviewerUser.imageUrl, 3600);
          if (data?.signedUrl) signedImageUrl = data.signedUrl;
        }
        const commentText = row.reviews?.comment || '';
        const name = reviewerUser ? `${reviewerUser.name || ''} ${reviewerUser.lastName?.substring(0, 1) || ''}`.trim() : 'Anónimo';

        itemsMap.get(itemId).reviews.push({
           ...row.rating, stars: Number(row.rating.rating) || 0, comment: commentText, name: name, image: signedImageUrl,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const likesRes = await db.execute(sql`SELECT relationship_id, SUM(likes) as t_likes, SUM(dislikes) as t_dislikes FROM public.countlikes GROUP BY relationship_id`) as any;
    const likesData = Array.isArray(likesRes) ? likesRes : (likesRes?.rows || []);

    let userVotesData: any[] = [];
    if (userId) {
       const uVotesRes = await db.execute(sql`SELECT relationship_id, likes, dislikes FROM public.countlikes WHERE user_id = ${userId}`) as any;
       userVotesData = Array.isArray(uVotesRes) ? uVotesRes : (uVotesRes?.rows || []);
    }

    const finalListPromises = Array.from(itemsMap.values()).map(async item => {
        item.totalReviews = item.reviews.length;
        item.rating = item.totalReviews > 0 ? Math.round((item.reviews.reduce((sum: number, r: any) => sum + r.stars, 0) / item.totalReviews) * 10) / 10 : 0;

        const itemLikes = likesData.find((ld: any) => ld.relationship_id === item.id);
        if (itemLikes) { item.likes = Number(itemLikes.t_likes) || 0; item.dislikes = Number(itemLikes.t_dislikes) || 0; }

        const uVote = userVotesData.find(uv => uv.relationship_id === item.id);
        if (uVote) {
           if (Number(uVote.likes) === 1) item.userVote = 'like';
           else if (Number(uVote.dislikes) === 1) item.userVote = 'dislike';
        }

        const fileName = item.imageEntrepren;
        let publicUrl = fileName; 
        if (fileName && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('entrepreneurship/', '');
            const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`entrepreneurship/${cleanName}`, 3600); 
            if (!error && data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { ...item, imageEntrepren: publicUrl }; 
    });

    return await Promise.all(finalListPromises);
  } catch (error) {
    console.error("❌ Error en getEntrepreneurshipsByIds:", error);
    return [];
  }
};