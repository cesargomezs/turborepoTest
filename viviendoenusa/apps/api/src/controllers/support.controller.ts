import { db } from "../../../../packages/db/src"; 
import { support, users, rating as ratingTable, reviews as reviewsTable, payments, notifications, tariffs, typeDetail, promoCodes } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, ConsoleLogWriter } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 
import NodeGeocoder from 'node-geocoder';

// =====================================================================
// 🌍 CONFIGURACIÓN DE GEOCODER
// =====================================================================
const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

const getCoordsFromZip = async (zip: string) => {
  try {
    const res = await geocoder.geocode(`${zip}, USA`);
    if (res && res.length > 0) {
      return { lat: res[0].latitude, lng: res[0].longitude };
    }
  } catch (err) {
    console.error(`⚠️ Error al geocodificar el ZIP ${zip}:`, err);
  }
  
  console.warn("⚠️ Usando coordenadas por defecto (Distancia al ID 30 siempre será 0)");
  return { lat: 34.0934, lng: -117.5847 };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🚀 USUARIO POR DEFECTO MIENTRAS SE IMPLEMENTA SESIÓN
const TEMP_USER_ID = 'baeb641a-3fa4-4fef-9846-d75947d1bca9';

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS: Elimina etiquetas HTML o scripts maliciosos
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD usando un JOIN con typeDetail (Se mantiene)
const getCurrentSupportPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Support%'`, 
        eq(tariffs.isActive, true),
        eq(tariffs.planType, currentYear) 
      )
    )
    .limit(1);

    if (activeTariff && activeTariff.length > 0 && activeTariff[0].price) {
      return activeTariff[0].price;
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifa dinámica con JOIN, usando $50.00 por defecto");
  }
  return "50.00";
};

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA APOYO
// =====================================================================
const sendTelegramAlert = async (supportName: string, refCode: string, method: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const message = `🤝 *NUEVO CONTACTO DE APOYO REGISTRADO*\n\n*Nombre:* ${supportName}\n*Pago:* ${method}\n*Referencia:* ${refCode}\n\n⚠️ Ingresa al panel de administrador en la app para verificar y aprobar.`;

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
// 🔍 1. CONSULTA GENERAL (AQUÍ SE AGREGÓ EL FILTRO DE DISTANCIA)
// =====================================================================
export const getSupports = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) || '' : '';

    // 🚀 OBTENEMOS LAS COORDENADAS DEL ZIP PARA LA BÚSQUEDA
    const { lat, lng } = await getCoordsFromZip(zip || ''); 
    const radiusMiles = 4; // Rango de búsqueda: 10 millas

    // 🚀 Fórmula de Distancia Haversine (Segura para Drizzle y Postgres)
    const distanceFormula = sql`(
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat}::numeric)) * cos(radians(${support.lat}::numeric)) * cos(radians(${support.lng}::numeric) - radians(${lng}::numeric)) + 
          sin(radians(${lat}::numeric)) * sin(radians(${support.lat}::numeric))
        ))
      )
    )`;

    // 🚀 Definimos explícitamente el select incluyendo la distancia
    let query = db
    .select({
      support: support,
      rating: ratingTable,
      reviews: reviewsTable,
      payments: payments,
      users: users,
      distance: distanceFormula.as('distance')
    })
    .from(support)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, support.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(payments, and(eq(payments.entityId, support.id), eq(payments.entityType, 'support')))
    .leftJoin(users, eq(ratingTable.userId, users.id))
    .$dynamic();

    // 🚀 Lógica de Visibilidad Original
    const visibilityCondition = currentUserId
      ? sql`(${support.approved} = false OR ${support.timepostEnd} > NOW() OR ${support.userId} = ${currentUserId})`
      : sql`(${support.approved} = false OR ${support.timepostEnd} > NOW())`;

    // 🚀 Aplicamos los filtros condicionalmente
    if (zip && zip.length === 5) {
      query = query.where(
        and(
          sql`${distanceFormula} <= ${radiusMiles}`,
          visibilityCondition 
        )
      );
      // Ordenamos para mostrar los más cercanos primero
      query = query.orderBy(distanceFormula);
    } else {
      // Si no buscaron ZIP, solo aplicamos la visibilidad
      query = query.where(visibilityCondition);
      query = query.orderBy(desc(support.createdAt));
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const supportsMap = new Map<string, any>();

    for (const row of rows) {
      const supportId = row.support.id;

      if (!supportsMap.has(supportId)) {
        supportsMap.set(supportId, {
          ...row.support,
          referenceCode: row.payments?.referenceCode || null,
          paymentMethod: row.payments?.paymentMethod || null,
          premiumPlan: row.support.premiumPlan || 'basic', 
          reviews: [], 
          totalRating: 0,
          totalReviews: 0
        });
      }

      if (row.rating && row.rating.id) {

        const commentText = row.reviews?.comment || '';

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

        supportsMap.get(supportId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           name: row.users?.name + ' ' + row.users?.lastName?.substring(0, 1),
           image: data?.signedUrl,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalResult = await Promise.all(Array.from(supportsMap.values()).map(async (supportItem: any) => {
      supportItem.totalReviews = supportItem.reviews.length;

      if (supportItem.totalReviews > 0) {
        const sum = supportItem.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
        supportItem.totalRating = Math.round((sum / supportItem.totalReviews) * 10) / 10;
        supportItem.rating = supportItem.totalRating; 
      } else {
        supportItem.totalRating = 0;
        supportItem.rating = 0;
      }

      const safeDescription = supportItem.description || supportItem.descriptionSupp || '';
      supportItem.description = safeDescription;
      supportItem.descriptionSupp = safeDescription;

      if (supportItem.imageSupp && supportItem.imageSupp.trim() !== '' && !supportItem.imageSupp.startsWith('http')) {
          const rutaArchivo = supportItem.imageSupp.startsWith('support/') 
              ? supportItem.imageSupp : `support/${supportItem.imageSupp}`;

          const { data, error } = await supabase
              .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 

          if (!error && data) {
              return { ...supportItem, image: data.signedUrl, imageSupp: data.signedUrl }; 
          }
      }
      return { ...supportItem, image: supportItem.imageSupp }; 
    }));

    return finalResult;
  } catch (error: any) {
    console.error("❌ Error en getSupports:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID
// =====================================================================
export const getSupportById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(support)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, support.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(users, eq(ratingTable.userId, users.id))
      .where(eq(support.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const supportFinal: any = {
      ...rows[0].support, 
      premiumPlan: rows[0].support.premiumPlan || 'basic', 
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

    for (const row of rows) {
      if (row.rating && row.rating.id) {

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

        const commentText = row.reviews?.comment || '';
        supportFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          name: row.users?.name + ' ' + row.users?.lastName?.substring(0, 1),
          image: data?.signedUrl,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    supportFinal.totalReviews = supportFinal.reviews.length;
    if (supportFinal.totalReviews > 0) {
      const sum = supportFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      supportFinal.totalRating = Math.round((sum / supportFinal.totalReviews) * 10) / 10;
      supportFinal.rating = supportFinal.totalRating;
    }

    const safeDescription = supportFinal.description || supportFinal.descriptionSupp || '';
    supportFinal.description = safeDescription;
    supportFinal.descriptionSupp = safeDescription;

    if (supportFinal.imageSupp && supportFinal.imageSupp.trim() !== '' && !supportFinal.imageSupp.startsWith('http')) {
        const rutaArchivo = supportFinal.imageSupp.startsWith('support/') 
            ? supportFinal.imageSupp : `support/${supportFinal.imageSupp}`;

        const { data, error } = await supabase
            .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
            
        if (!error && data) {
            supportFinal.image = data.signedUrl;
            supportFinal.imageSupp = data.signedUrl;
        }
    } else {
        supportFinal.image = supportFinal.imageSupp;
    }

    return supportFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el contacto de apoyo por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR CONTACTO DE APOYO (ACTUALIZADO CON TELEGRAM)
// =====================================================================
export const createSupport = async (data: any) => {
  try {
    let cleanImage = sanitizeText(data.imageSupp) || '';
    if (cleanImage.startsWith('support/')) {
      cleanImage = cleanImage.replace('support/', '');
    }

    const planSeleccionado = data.premiumPlan || data.premium_plan || 'basic'; 
    // 🚀 1. LÓGICA DEL CUPÓN: Validar antes de insertar
    if (planSeleccionado === 'cupon') {
      if (!data.referenceCode) throw new Error("Por favor, ingresa el código del cupón.");
      const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, data.referenceCode));
      
      if (!promo) throw new Error("El cupón ingresado no existe.");
      if (promo.isUsed) throw new Error("Este cupón ya fue utilizado.");
    }

    // 🚀 GUARDAMOS EL RESULTADO DE LA TRANSACCIÓN
    const createdSupportResult = await db.transaction(async (tx) => {
      
      const safeDesc = sanitizeText(data.description || data.descriptionSupp) || '';

      const supportPayload: any = {
        nameSupp: sanitizeText(data.nameSupp || data.name) || 'Sin nombre',
        categoryId: sanitizeText(data.categoryId) || '0',
        addressSupp: sanitizeText(data.addressSupp || data.address) || '',
        zip: sanitizeText(data.zip) || null,
        phone: sanitizeText(data.phone) || '',
        imageSupp: cleanImage,
        descriptionSupp: safeDesc,
        lat: data.lat ? Number(data.lat) : null, // 🚀 Se mantiene tal cual estaba
        lng: data.lng ? Number(data.lng) : null, // 🚀 Se mantiene tal cual estaba
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        premiumPlan: planSeleccionado, 
        couponCode: sanitizeText(data.couponCode) || '', 
        estate: data.estate,
        approved: false 
      };
      
      const [newSupport] = await tx.insert(support).values(supportPayload).returning();

      if (data.referenceCode && data.paymentMethod) {
        const basePrice = await getCurrentSupportPrice(); 

        await tx.insert(payments).values({
          entityType: 'support',
          entityId: newSupport.id,
          userId: supportPayload.userId,
          referenceCode: sanitizeText(data.referenceCode) || '', 
          paymentMethod: sanitizeText(data.paymentMethod) || '', 
          amount: basePrice, 
          durationDays: 30, 
          status: "pending"
        });
      }

      if (planSeleccionado === 'cupon') {
        await tx.update(promoCodes)
        .set({
          isUsed: true, // 👈 AQUÍ LE CAMBIAMOS EL ESTADO A USADO
          usedByUserId: data.userId, // Guardamos quién lo usó
          usedForEntityId: support.id, // Guardamos en qué empresa se usó
          entityType: 'support', // Guardamos el tipo de entidad
          usedAt: new Date() // Guardamos la fecha y hora exacta
        })
        .where(eq(promoCodes.code, data.referenceCode)); // Buscamos el cupón específico
      }

      return {
         ...newSupport,
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod,
         description: safeDesc,
         descriptionSupp: safeDesc
      };
    });

    // 🚀 NUEVO: DISPARAR ALERTA DE TELEGRAM SI SE CREÓ CON ÉXITO
    if (createdSupportResult) {
      sendTelegramAlert(
        createdSupportResult.nameSupp,
        createdSupportResult.referenceCode || 'N/A',
        createdSupportResult.paymentMethod || 'N/A'
      ).catch(e => console.log("Notificación de Telegram falló en segundo plano", e));
    }

    return createdSupportResult;

  } catch (error: any) { 
    console.error("❌ Error en createSupport:", error);
    
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado. Por favor, ingresa un código válido y único.");
    }

    throw new Error(`Error al crear el contacto de apoyo: ${error.message}`);
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR CONTACTO DE APOYO
// =====================================================================
export const updateSupport = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      const allowedFields = ['nameSupp', 'categoryId', 'addressSupp', 'zip', 'phone', 'lat', 'lng', 'imageSupp', 'descriptionSupp', 'premiumPlan', 'couponCode']; 
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = (key === 'lat' || key === 'lng') ? Number(data[key]) : sanitizeText(data[key]);
        }
      }

      if (data.description !== undefined || data.descriptionSupp !== undefined) {
        const safeDesc = sanitizeText(data.description !== undefined ? data.description : data.descriptionSupp);
        updatePayload.descriptionSupp = safeDesc;
      }

      if (data.imageSupp && typeof data.imageSupp === 'string' && data.imageSupp.startsWith('support/')) {
        updatePayload.imageSupp = data.imageSupp.replace('support/', '');
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

        const basePriceString = await getCurrentSupportPrice();
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
          .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'support')));
      }

      const updated = await tx
        .update(support)
        .set(updatePayload) 
        .where(eq(support.id, cleanId))
        .returning();
        
      const supportItem = updated[0];

      if (isApproved && supportItem) {
        const notifPayload: any = {
            title: "¡Nuevo Contacto de Apoyo Verificado! 🤝",
            description: `El contacto ${supportItem.nameSupp} ahora es parte de la red de apoyo. ¡Visita su perfil!`,
            type: "support", 
            visibleAt: new Date(), 
            userId: supportItem.userId || TEMP_USER_ID, 
        };

        if ('referenceId' in notifications) notifPayload.referenceId = String(supportItem.id);
        else if ('reference_id' in notifications) notifPayload.reference_id = String(supportItem.id);

        await tx.insert(notifications).values(notifPayload);
      }

      return supportItem || null;
    });

  } catch (error: any) { 
    console.error("❌ Error en updateSupport:", error);
    throw new Error(`Error al actualizar el contacto de apoyo: ${error.message}`);
  }
};

// =====================================================================
// 🚀 5. INGRESO DE RATING Y RESEÑA (CORREGIDO PARA DEVOLVER NOMBRE Y FOTO)
// =====================================================================
export const createSupportReview = async (data: any) => {
  try {
    let validUserId = sanitizeText(data.userId) || null;
    if (!validUserId || validUserId.length < 20) {
        validUserId = TEMP_USER_ID; 
    }

    const targetReferenceId = sanitizeText(data.reference_id || data.referenceId);

    if (validUserId && targetReferenceId) {
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
            throw new Error("El usuario ya ha publicado una reseña para este contacto de apoyo.");
        }
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: validUserId,
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'support';
    else ratingPayload.type_entry = 'support';

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
        .where(sql`${typeDetail.typeCode} ILIKE 'Support%'`)
        .limit(1);

      if (!typeCodeRecord || typeCodeRecord.length === 0) {
        throw new Error("Error en la Base de Datos: La categoría 'Support' no existe en la tabla typeDetail.");
      }

      const typeDetailIdResolved = typeCodeRecord[0].id;

      if ('typeDetailId' in reviewsTable) {
          reviewPayload.typeDetailId = typeDetailIdResolved;
      } else {
          reviewPayload.type_detail_id = typeDetailIdResolved;
      }

      const reviewRows = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = reviewRows[0].comment || '';
    }

    // 🚀 NUEVO: Consultamos el nombre y la foto del usuario en la BD para devolverlos
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
      // 🚀 Enviamos la información visual al frontend
      name: formattedName,
      image: signedImageUrl,
      displayTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en createSupportReview:", error.message);
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 6. ELIMINAR CONTACTO DE APOYO
// =====================================================================
export const deleteSupport = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(support).where(eq(support.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el contacto de apoyo: ${error.message}`);
  }
};

// =====================================================================
// 🔄 7. RENOVAR CONTACTO DE APOYO
// =====================================================================
export const renewSupport = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    if (!refCode || !payMethod || !cleanId) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      const basePrice = await getCurrentSupportPrice();

      await tx.insert(payments).values({
        entityType: 'support',
        entityId: cleanId,
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: basePrice, 
        durationDays: 30, 
        status: "pending"
      });

      const updated = await tx
        .update(support)
        .set({ approved: false }) 
        .where(eq(support.id, cleanId))
        .returning();
        
      return {
         ...updated[0],
         referenceCode: refCode,
         paymentMethod: payMethod
      };
    });

  } catch (error: any) { 
    console.error("❌ Error en renewSupport:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado en otra transacción.");
    }
    throw new Error(`Error al renovar el contacto de apoyo: ${error.message}`);
  }
};