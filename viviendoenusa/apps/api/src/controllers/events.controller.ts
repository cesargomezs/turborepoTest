import { db } from "../../../../packages/db/src"; 
import { events, users, notifications, payments, tariffs, typeDetail, userDevices, promoCodes, rating as ratingTable, reviews as reviewsTable } from "../../../../packages/db/src/schema"; 
import { eq, desc, asc, sql, and, inArray, or } from "drizzle-orm"; 
import { alias } from "drizzle-orm/pg-core";
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; 

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

// 🛡️ FUNCIÓN DE SEGURIDAD PARA VALIDAR ENLACES DE GOOGLE REVIEWS
const isValidGoogleReviewUrl = (url: string) => {
  if (!url) return false;
  const regex = /^https:\/\/(g\.page\/r\/|search\.google\.com\/local\/writereview|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i;
  return regex.test(url);
};

// 🛡️ BARRERA DE SANITIZACIÓN PARA OBJETOS
const sanitizePayload = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const sanitizedData: any = {};
  for (const key in data) {
    if (typeof data[key] === 'string') {
      sanitizedData[key] = sanitizeText(data[key]);
    } else {
      sanitizedData[key] = data[key];
    }
  }
  return sanitizedData;
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentEventPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Event%'`, 
        eq(tariffs.isActive, true),
        eq(tariffs.planType, currentYear) 
      )
    )
    .limit(1);

    if (activeTariff && activeTariff.length > 0 && activeTariff[0].price) {
      return activeTariff[0].price;
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN, usando \$50.00 por defecto");
  }
  return "50.00";
};

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (EVENTOS + BADGE DINÁMICO)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO EVENTOS] Ningún usuario cercano tiene dispositivos registrados.");
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
        data: { type: "event", referenceId: payload.referenceId },
      });
    }

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

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
  } catch (error) {
    console.error("❌ [PUSH MASIVO EVENTOS] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 📲 ALERTA DE TELEGRAM PARA EVENTOS
// =====================================================================
const sendTelegramAlert = async (userId: string, zip: string, eventName: string, method: string, refCode: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const shortName = eventName.length > 40 ? eventName.substring(0, 40) + '...' : eventName;
  const message = `🎉 *NUEVO EVENTO REGISTRADO*\n\n*Usuario ID:* ${userId}\n*ZIP:* ${zip}\n*Evento:* "${shortName}"\n*Pago:* ${method}\n*Referencia:* ${refCode}\n\n⚠️ Ingresa al panel de administrador en la app para verificar y aprobar.`;

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
// 🔍 1. CONSULTA GENERAL (CON RESEÑAS AGREGADAS)
// =====================================================================
export const getEvents = async (zip?: string, userId?: string) => {
  try {
    const cleanZipParam = zip ? sanitizeText(String(zip)) : null;
    const cleanUserId = (userId && userId !== 'undefined' && userId !== 'null' && userId !== '' && !String(userId).startsWith('guest_')) 
      ? sanitizeText(String(userId)) 
      : null;

    let baseConditions = cleanUserId 
      ? sql`((${events.approved} = true AND ${events.dateEvent} >= CURRENT_DATE) OR ${events.userId} = ${cleanUserId})`
      : sql`(${events.approved} = true AND ${events.dateEvent} >= CURRENT_DATE) OR ${events.approved} = false`;

    let finalConditions: any = baseConditions;

    if (cleanZipParam && cleanZipParam.length === 5) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(events.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(events.zip, cleanZipParam));
      }
    }

    let query = db
    .select({
      events: events,
      users: users,
      payments: payments,
      rating: ratingTable,
      reviews: reviewsTable,
      reviewers: reviewers,
    })
    .from(events)
    .leftJoin(users, eq(events.userId, users.id)) 
    .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
    .leftJoin(ratingTable, eq(ratingTable.referenceId, events.id)) 
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(reviewers, eq(ratingTable.userId, reviewers.id))
    .where(finalConditions)
    .$dynamic();

    if (cleanUserId) {
      query = query.orderBy(
        sql`CASE WHEN ${events.userId} = ${cleanUserId} THEN 0 WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 1 ELSE 2 END`,
        desc(events.id)
      );
    } else {
      query = query.orderBy(
        sql`CASE WHEN ${users.typeDetail} IN ('SAdmin', 'admin') THEN 0 ELSE 1 END`,
        desc(events.id)
      );
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const itemsMap = new Map<string, any>();

    for (const row of rows) {
      const itemId = row.events.id;

      if (!itemsMap.has(itemId)) {
        const dbEvent = row.events as any;
        const dbUser = row.users;
        const dbPayment = row.payments;

        const isAppr = dbEvent.approved === true || String(dbEvent.approved).toLowerCase() === 'true';
        const nombreUsuario = dbUser?.name || 'Usuario Anónimo';

        itemsMap.set(itemId, {
          ...dbEvent,
          approved: isAppr,
          status: isAppr ? 'approved' : 'pending',
          ownerName: nombreUsuario,
          referenceCode: dbPayment?.referenceCode,
          paymentMethod: dbPayment?.paymentMethod || '',
          googleReviewLink: dbEvent.googleReviewLink || dbEvent.googleUrl || dbEvent.google_review_link,
          reviews: [],
          rating: 0,
          totalReviews: 0
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

    const finalListPromises = Array.from(itemsMap.values()).map(async item => {
        item.totalReviews = item.reviews.length;
        item.rating = item.totalReviews > 0 
          ? Math.round((item.reviews.reduce((sum: number, r: any) => sum + r.stars, 0) / item.totalReviews) * 10) / 10 
          : 0;

        const fileName = item.imageEven;
        let publicUrl = fileName; 

        if (fileName && typeof fileName === 'string' && fileName.trim() !== '' && !fileName.startsWith('http')) {
            const cleanName = fileName.replace('events/', '');
            const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`events/${cleanName}`, 3600); 
            if (!error && data?.signedUrl) publicUrl = data.signedUrl;
        }

        return { ...item, imageEven: publicUrl, imageUrl: publicUrl }; 
    });

    return await Promise.all(finalListPromises);
  } catch (error) {
    console.error("❌ Error en getEvents:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID (CON RESEÑAS AGREGADAS)
// =====================================================================
export const getEventById = async (id: string, userId?: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select({
        events: events,
        users: users,
        payments: payments,
        rating: ratingTable,
        reviews: reviewsTable,
        reviewers: reviewers,
      })
      .from(events)
      .leftJoin(users, eq(events.userId, users.id))
      .leftJoin(payments, and(eq(payments.entityId, events.id), eq(payments.entityType, 'event')))
      .leftJoin(ratingTable, eq(ratingTable.referenceId, events.id)) 
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .leftJoin(reviewers, eq(ratingTable.userId, reviewers.id))
      .where(eq(events.id, cleanId));

    if (!rows || rows.length === 0) return null;

    const dbEvent = rows[0].events;
    const dbUser = rows[0].users;
    const dbPayment = rows[0].payments;
    const nombreUsuario = dbUser?.name || 'Usuario Anónimo';
    const isAppr = dbEvent.approved === true || String(dbEvent.approved).toLowerCase() === 'true';

    const itemFinal: any = {
        ...dbEvent,
        approved: isAppr,
        status: isAppr ? 'approved' : 'pending',
        ownerName: nombreUsuario,
        referenceCode: dbPayment?.referenceCode,
        paymentMethod: dbPayment?.paymentMethod || '',
        googleReviewLink: dbEvent.googleReviewLink,
        reviews: [],
        rating: 0,
        totalReviews: 0
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

    let publicUrl = dbEvent.imageEven;
    if (publicUrl && typeof publicUrl === 'string' && publicUrl.trim() !== '' && !publicUrl.startsWith('http')) {
        const cleanName = publicUrl.replace('events/', '');
        const { data, error } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(`events/${cleanName}`, 3600);
        if (!error && data?.signedUrl) publicUrl = data.signedUrl;
    }

    itemFinal.imageEven = publicUrl;
    itemFinal.imageUrl = publicUrl;

    return itemFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el evento por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR EVENTO
// =====================================================================
export const createEvent = async (data: any) => {
  try {
    const cleanData = sanitizePayload(data);
    
    const validUserId = sanitizeText(cleanData.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para registrar un evento.");
    }

    let safeGoogleLink = null;
    if (cleanData.googleReviewLink) {
      const trimmedLink = cleanData.googleReviewLink.trim();
      if (!isValidGoogleReviewUrl(trimmedLink)) {
        throw new Error("El enlace proporcionado no es una URL válida de reseñas de Google.");
      }
      safeGoogleLink = trimmedLink;
    }

    const planSeleccionado = cleanData.premiumPlan || cleanData.premium_plan || 'basic'; 
    const metodoPago = cleanData.paymentMethod ? String(cleanData.paymentMethod).toLowerCase().trim() : '';
    const codigoReferencia = cleanData.referenceCode ? String(cleanData.referenceCode).trim() : '';

    const isCoupon = planSeleccionado === 'coupon' || metodoPago === 'coupon' || planSeleccionado === 'cupon' || metodoPago === 'cupon';
    let realPromoCode = cleanData.couponCode ? String(cleanData.couponCode).trim() : codigoReferencia.replace('COUPON-', '').trim();

    const { lat, lng } = getCoordsFromZip(cleanData.zip || '');

    let cleanImage = cleanData.imageEven || '';
    if (typeof cleanImage === 'string' && cleanImage.startsWith('events/')) {
        cleanImage = cleanImage.replace('events/', '');
    }

    let customMessage = "Enviado con éxito, pendiente de revisión de pago.";

    const createdEventResult = await db.transaction(async (tx) => {
        
        if (isCoupon) {
          if (!realPromoCode) throw new Error("Por favor, ingresa el código del cupón.");
          
          const [promo] = await tx.select().from(promoCodes).where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`);
          
          if (!promo) throw new Error(`El cupón '${realPromoCode}' es inválido o no existe.`);
          if (promo.isUsed) throw new Error("Este cupón ya fue utilizado anteriormente.");

          customMessage = "¡Cupón aplicado! Tu evento ha sido registrado y está en revisión.";
        }

        const payload: any = {
          title: cleanData.title || 'Sin título',
          categoryIdx: cleanData.categoryIdx || 0,
          dateEvent: cleanData.dateEvent || new Date().toISOString(),
          timeStart: cleanData.timeStart || '',
          timeEnd: cleanData.timeEnd || '',
          descriptionEven: cleanData.descriptionEven || '',
          imageEven: cleanImage,
          locationEven: cleanData.locationEven || '',
          lat: lat,
          lng: lng,
          zip: cleanData.zip ? String(cleanData.zip).trim() : '',
          estate: cleanData.estate || '',
          phone: cleanData.phone || '',
          contactMethod: cleanData.contactMethod || 'whatsapp',
          statusId: '31a06434-8ed8-45d2-b95f-65bd314bc021',
          premiumPlan: isCoupon ? 'coupon' : planSeleccionado, 
          userId: validUserId, 
          approved: false, 
          googleReviewLink: safeGoogleLink, 
        };

        const [newEvent] = await tx.insert(events).values(payload).returning();

        if (codigoReferencia || realPromoCode) {
            const today = new Date();
            const eventDate = new Date(payload.dateEvent);
            const diffTime = eventDate.getTime() - today.getTime();
            const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            const paymentPayload: any = {
              entityType: 'event', 
              entityId: newEvent.id,
              userId: validUserId, 
              referenceCode: realPromoCode || codigoReferencia, 
              paymentMethod: isCoupon ? 'Coupon' : metodoPago, 
              amount: String(isCoupon ? "0.00" : (cleanData.tariffPlan || await getCurrentEventPrice())), 
              durationDays: daysLeft, 
              status: isCoupon ? "approved" : "pending"
            };

            if (isCoupon) {
              paymentPayload.approvedAt = sql`NOW()`;
            }
            if (eventDate) {
              paymentPayload.timepostEnd = eventDate;
              paymentPayload.timepost_end = eventDate;
            }

            await tx.insert(payments).values(paymentPayload);
        }

        if (isCoupon) {
          await tx.update(promoCodes)
          .set({
            isUsed: true, 
            usedByUserId: validUserId, 
            usedForEntityId: newEvent.id, 
            entityType: 'event',
            usedAt: new Date() 
          })
          .where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`); 
        }

        return {
           ...newEvent,
           approved: false,
           status: 'pending',
           referenceCode: isCoupon ? realPromoCode : codigoReferencia,
           paymentMethod: isCoupon ? 'Coupon' : metodoPago,
           message: customMessage,
           googleReviewLink: safeGoogleLink
        };
    });

    if (createdEventResult) {
      sendTelegramAlert(
        validUserId,
        cleanData.zip || 'N/A',
        createdEventResult.title || 'Sin título',
        createdEventResult.paymentMethod || 'N/A',
        createdEventResult.referenceCode || 'N/A'
      ).catch(e => console.log("Notificación de Telegram falló en segundo plano", e));
    }

    return createdEventResult;

  } catch (error: any) { 
    console.error("❌ Error en createEvent:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("El código de referencia de pago ya está en uso.");
    }
    throw new Error(error.message || "Error al crear el evento.");
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR O RENOVAR EVENTO (INSERTA NUEVO PAGO Y ESTADO PENDING)
// =====================================================================
export const updateEvent = async (idParam: any, dataParam: any) => {
  let cleanId: string = "";
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

    const sanitized = sanitizeText(rawId);
    if (!sanitized) throw new Error("ID inválido");
    cleanId = sanitized;

    if (!data && idParam && idParam.body) {
      data = idParam.body;
    }

    const cleanPayload = sanitizePayload(data);

    const planSeleccionado = cleanPayload.premiumPlan || cleanPayload.premium_plan || 'basic'; 
    const metodoPago = cleanPayload.paymentMethod ? String(cleanPayload.paymentMethod).toLowerCase().trim() : '';
    const codigoReferencia = cleanPayload.referenceCode ? String(cleanPayload.referenceCode).trim() : '';

    // 🛡️ REGLA ESTRICTA DE RENOVACIÓN: Obliga a ingresar una nueva referencia o cupón al actualizar
    if (!codigoReferencia && !cleanPayload.couponCode) {
      throw new Error("Para actualizar o renovar el evento debes ingresar la nueva referencia de pago o cupón.");
    }

    const isCoupon = planSeleccionado === 'coupon' || metodoPago === 'coupon' || planSeleccionado === 'cupon' || metodoPago === 'cupon';
    let realPromoCode = cleanPayload.couponCode ? String(cleanPayload.couponCode).trim() : codigoReferencia.replace('COUPON-', '').trim();

    const [existingEvent] = await db.select().from(events).where(eq(events.id, cleanId));
    if (!existingEvent) throw new Error("Evento no encontrado");

    const eventResult = await db.transaction(async (tx) => {

        if (isCoupon) {
          if (!realPromoCode) throw new Error("Por favor, ingresa el código del cupón para renovar.");
          
          const [promo] = await tx.select().from(promoCodes).where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`);
          
          if (!promo) throw new Error(`El cupón '${realPromoCode}' es inválido o no existe.`);
          if (promo.isUsed) throw new Error("Este cupón ya fue utilizado anteriormente.");

          await tx.update(promoCodes)
          .set({
            isUsed: true, 
            usedByUserId: existingEvent.userId, 
            usedForEntityId: cleanId, 
            entityType: 'event',
            usedAt: new Date() 
          })
          .where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`); 
        }

        // 🚀 FORZAR ESTADO A PENDIENTE (APPROVED = FALSE)
        cleanPayload.approved = false;
        cleanPayload.statusId = '31a06434-8ed8-45d2-b95f-65bd314bc021';

        if (cleanPayload.imageEven && typeof cleanPayload.imageEven === 'string' && cleanPayload.imageEven.startsWith('events/')) {
            cleanPayload.imageEven = cleanPayload.imageEven.replace('events/', '');
        }

        const updated = await tx.update(events).set(cleanPayload).where(eq(events.id, cleanId)).returning();
        const event = updated[0];

        if (!event) throw new Error("No se pudo encontrar el evento actualizado");

        // 💰 INSERTAR UN NUEVO REGISTRO EN LA TABLA PAYMENTS PARA ESTA RENOVACIÓN
        const today = new Date();
        const eventDate = new Date(event.dateEvent);
        const diffTime = eventDate.getTime() - today.getTime();
        const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const paymentPayload: any = {
          entityType: 'event', 
          entityId: event.id,
          userId: event.userId, 
          referenceCode: realPromoCode || codigoReferencia, 
          paymentMethod: isCoupon ? 'Coupon' : metodoPago, 
          amount: String(isCoupon ? "0.00" : (cleanPayload.tariffPlan || await getCurrentEventPrice())), 
          durationDays: daysLeft, 
          status: isCoupon ? "approved" : "pending" // Queda en pending para que el admin valide el nuevo pago
        };

        if (isCoupon) {
          paymentPayload.approvedAt = sql`NOW()`;
        }
        if (eventDate) {
          paymentPayload.timepostEnd = eventDate;
          paymentPayload.timepost_end = eventDate;
        }

        await tx.insert(payments).values(paymentPayload);

        return event || null;
    });

    return eventResult;

  } catch (error: any) { 
    console.error(`❌ Error al actualizar/renovar evento ${cleanId}:`, error);
    throw new Error(`Error al actualizar el evento: ${error.message}`);
  }
};

// =====================================================================
// 📥 5. CREAR RESEÑA PARA EVENTO
// =====================================================================
export const createEventReview = async (data: any) => {
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
      throw new Error("Ya has escrito una reseña para este evento.");
    }

    const ratingPayload: any = {
      rating: String(data.stars || 5),
      userId: validUserId,
      referenceId: data.reference_id, 
      typeEntry: 'event'
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
    console.error("❌ Error en createEventReview:", error);
    throw error; 
  }
};

// =====================================================================
// 🚨 6. REPORTAR CONTENIDO DE EVENTO O RESEÑA
// =====================================================================
export const reportContent = async (data: any) => {
  try {
    const { itemId, itemType, userId, reason } = data;

    const validItemId = sanitizeText(itemId);
    const validType = sanitizeText(itemType) || 'event';
    const validUserId = sanitizeText(userId);
    const safeReason = sanitizeText(reason) || 'Infracción de Copyright o Spam';

    if (!validItemId) {
      throw new Error("El ID del elemento es obligatorio para reportar.");
    }

    let reporterName = "Usuario Anónimo";
    let reporterEmail = "No disponible";
    if (validUserId) {
      try {
        const uRecords = await db.select({
          name: users.name,
          lastName: users.lastName,
          email: users.email
        }).from(users).where(eq(users.id, validUserId)).limit(1);

        if (uRecords && uRecords.length > 0) {
          const uRecord = uRecords[0];
          reporterName = `${uRecord.name || ''} ${uRecord.lastName || ''}`.trim() || "Usuario";
          reporterEmail = uRecord.email || "No disponible";
        }
      } catch (e) {
        console.warn("⚠️ No se pudo obtener info del usuario que reporta", e);
      }
    }

    let reportedContent = `ID: ${validItemId}`;
    let associatedCompany = "No aplica";

    try {
      if (validType === 'review') {
        const reviewRows = await db.select({
          comment: reviewsTable.comment,
          eventName: events.title
        })
        .from(reviewsTable)
        .leftJoin(ratingTable, eq(reviewsTable.relationshipId, ratingTable.id))
        .leftJoin(events, eq(ratingTable.referenceId, events.id))
        .where(eq(reviewsTable.id, validItemId))
        .limit(1);

        if (reviewRows && reviewRows.length > 0) {
          reportedContent = reviewRows[0].comment || `Reseña ID: ${validItemId}`;
          associatedCompany = reviewRows[0].eventName || "Evento Desconocido";
        }
      } else {
        const itemRows = await db.select({ name: events.title }).from(events).where(eq(events.id, validItemId)).limit(1);
        if (itemRows && itemRows.length > 0 && itemRows[0].name) {
          reportedContent = itemRows[0].name;
          associatedCompany = itemRows[0].name;
        }
      }
    } catch (e) {
      console.warn("⚠️ No se pudo obtener el contenido del evento o reseña reportada", e);
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("⚠️ Credenciales de Telegram no configuradas para reportes.");
      return { success: false, message: "Reporte registrado en sistema local." };
    }

    const message = `🚨 *REPORTE DE CONTENIDO (${validType.toUpperCase()})*

📌 *Módulo:* EVENTOS
🏢 *Evento / Origen:* ${associatedCompany}
🏷️ *Contenido:* "${reportedContent}"
🆔 *ID Elemento:* \`\${validItemId}\`
👤 *Reportado por:* ${reporterName} (${reporterEmail})
⚠️ *Motivo:* ${safeReason}

Por favor verifica el contenido en el panel de administrador.`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      throw new Error("Fallo la comunicación con Telegram API.");
    }

    return { success: true, message: "Alerta enviada a moderación." };

  } catch (error: any) {
    console.error("❌ Error enviando reporte:", error);
    throw new Error(`Error al procesar el reporte: ${error.message}`);
  }
};