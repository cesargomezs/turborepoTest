import { db } from "../../../../packages/db/src"; 
import { lawyers, users, rating as ratingTable, reviews as reviewsTable, payments, notifications, tariffs, typeDetail, userDevices, promoCodes } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import React, { useState, useRef, useEffect, memo } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { imag } from "@tensorflow/tfjs";
import { logAuditEvent } from "../services/audit.service.js";
import zipcodes from 'zipcodes'; // 🚀 IMPORTACIÓN DE LA LIBRERÍA DE GEOLOCALIZACIÓN
import ws from "ws";


if (!(global as any).WebSocket) {
  (global as any).WebSocket = ws;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const radiusMiles = process.env.RADIUMILE || 20; // 🚀 Radio estandarizado a 20 millas
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})
const NOMBRE_BUCKET = 'images'; 
const API_TARIFFS_URL = process.env.EXPO_PUBLIC_URL_BACKEND+'/tariffs'; 

// =====================================================================
// 🚀 FUNCIÓN LOCAL PARA COORDENADAS (Sin internet, súper rápida)
// =====================================================================
const getCoordsFromZip = (zip: string) => {
  if (!zip) return { lat: 34.0934, lng: -117.5847 };
  
  // 🚀 bypass de TypeScript con as any
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
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentLawyerPrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Lawyer%'`, 
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

// ============================================================================
// 🚀 FUNCIÓN LOCAL PARA ENVÍO MASIVO (FILTRADO POR USUARIOS CERCANOS)
// ============================================================================
const sendMassPushNotification = async (payload: { title: string, body: string, referenceId: string, userIds: string[] }) => {
  try {
    if (!payload.userIds || payload.userIds.length === 0) return;

    const devices = await db.select()
      .from(userDevices)
      .where(inArray(userDevices.userId, payload.userIds)); 

    if (!devices || devices.length === 0) {
      console.log("🔕 [PUSH MASIVO] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: "lawyer", referenceId: payload.referenceId },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO] Se enviarán ${messages.length} notificaciones a celulares cercanos...`);

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
    console.log(`✅ [PUSH MASIVO] ¡Envío geolocalizado completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (Refactorizada con zipcodes)
// =====================================================================
export const getLawyers = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const cleanZipParam = rawZip ? sanitizeText(String(rawZip)) || '' : '';

    let baseConditions = currentUserId 
      ? sql`(${lawyers.approved} = false OR ${lawyers.timepostEnd} > NOW() OR ${lawyers.userId} = ${currentUserId})`
      : sql`(${lawyers.approved} = false OR ${lawyers.timepostEnd} > NOW())`;

    let finalConditions: any = baseConditions;

    // 🚀 LÓGICA DE GEOFENCING SÚPER RÁPIDA
    if (cleanZipParam && cleanZipParam.length === 5) {
      const nearbyZips = zipcodes.radius(cleanZipParam as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        finalConditions = and(baseConditions, inArray(lawyers.zip, nearbyZips as string[]));
      } else {
        finalConditions = and(baseConditions, eq(lawyers.zip, cleanZipParam));
      }
    }

    let query = db
      .select()
      .from(lawyers)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
      .leftJoin(users, eq(ratingTable.userId, users.id))
      .leftJoin(payments, and(eq(payments.entityId, lawyers.id), eq(payments.entityType, 'lawyer')))
      .where(finalConditions)
      .orderBy(desc(lawyers.timepostEnd)); 

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const lawyersMap = new Map<string, any>();

    for (const row of rows) {
      const lawyerId = row.lawyers.id;

      if (!lawyersMap.has(lawyerId)) {
        lawyersMap.set(lawyerId, {
          ...row.lawyers,
          referenceCode: row.payments?.referenceCode || null,
          paymentMethod: row.payments?.paymentMethod || null,
          reviews: [], 
          totalRating: 0,
          totalReviews: 0
        });
      }

      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);
        
        lawyersMap.get(lawyerId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           name: row.users?.name + ' ' + (row.users?.lastName ? row.users.lastName.substring(0, 1) : ''),
           image: data?.signedUrl,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalResult = await Promise.all(Array.from(lawyersMap.values()).map(async (lawyer: any) => {
      lawyer.totalReviews = lawyer.reviews.length;

      if (lawyer.totalReviews > 0) {
        const sum = lawyer.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
        lawyer.totalRating = Math.round((sum / lawyer.totalReviews) * 10) / 10;
        lawyer.rating = lawyer.totalRating; 
      } else {
        lawyer.totalRating = 0;
        lawyer.rating = 0;
      }

      const safeDescription = lawyer.description || lawyer.descriptionLawy || '';
      lawyer.description = safeDescription;
      lawyer.descriptionLawy = safeDescription;

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
    console.error("❌ Error en getLawyers:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID
// =====================================================================
export const getLawyerByIdWithReviews = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(lawyers)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(users, eq(ratingTable.userId, users.id))
      .leftJoin(payments, and(eq(payments.entityId, lawyers.id), eq(payments.entityType, 'lawyer')))
      .where(eq(lawyers.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const lawyerFinal: any = {
      ...rows[0].lawyers, 
      reviews: [],
      payments: rows[0].payments?.amount,
      totalRating: 0,
      totalReviews: 0           
    };

    for (const row of rows) {
      const { data, error } = await supabase
      .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        lawyerFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          name: row.users?.name + ' ' + (row.users?.lastName ? row.users.lastName.substring(0, 1) : ''),
          image: data?.signedUrl,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }

    lawyerFinal.totalReviews = lawyerFinal.reviews.length;
    if (lawyerFinal.totalReviews > 0) {
      const sum = lawyerFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      lawyerFinal.totalRating = Math.round((sum / lawyerFinal.totalReviews) * 10) / 10;
      lawyerFinal.rating = lawyerFinal.totalRating;
    }

    const safeDescription = lawyerFinal.description || lawyerFinal.descriptionLawy || '';
    lawyerFinal.description = safeDescription;
    lawyerFinal.descriptionLawy = safeDescription;

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
    
    lawyerFinal.amount = lawyerFinal.payment?.amount;

    return lawyerFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el abogado por ID: ${error.message}`);
  }
};

// =====================================================================
// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM
// =====================================================================
const sendTelegramAlert = async (lawyerName: string, refCode: string, method: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const message = `⚖️ *NUEVO ABOGADO REGISTRADO*\n\n*Nombre:* ${lawyerName}\n*Pago:* ${method}\n*Referencia:* ${refCode}\n\n⚠️ Ingresa al panel de administrador en la app para verificar y aprobar.`;

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
// 📥 3. CREAR ABOGADO (VALIDACIÓN DE CUPÓN BLINDADA)
// =====================================================================
export const createLawyer = async (req: Request, res: Response) => {
  const reqAny = req as any;
  const resAny = res as any;
  const data = reqAny.body || {};
  
  const headerEstate = reqAny.headers?.['estate'] || reqAny.headers?.['Estate'];

  try {
    // 🚀 VALIDACIÓN ESTRICTA DEL USER_ID
    const validUserId = sanitizeText(data.userId);
    if (!validUserId) {
      return resAny.status(400).json({ error: "El ID del usuario es obligatorio para registrar un abogado." });
    }

    let cleanImage = sanitizeText(data.imageUrl) || '';
    if (cleanImage.startsWith('lawyers/')) {
      cleanImage = cleanImage.replace('lawyers/', '');
    }

    const createdLawyerResult = await db.transaction(async (tx) => {
      const { lat, lng } = getCoordsFromZip(data.zip || '');
      
      const safeDesc = sanitizeText(data.description || data.descriptionLawy) || '';
      const planSeleccionado = data.premiumPlan || data.premium_plan || 'basic'; 
      const finalEstate = sanitizeText(headerEstate) || 'CA';
      
      const metodoPago = data.paymentMethod ? String(data.paymentMethod).toLowerCase().trim() : '';
      const codigoReferencia = data.referenceCode ? String(data.referenceCode).trim() : '';

      // 🚀 1. DETECTAR SI ES CUPÓN
      const isCoupon = planSeleccionado === 'coupon' || metodoPago === 'coupon' || planSeleccionado === 'cupon' || metodoPago === 'cupon';

      // 🚀 2. EXTRAER EL CÓDIGO REAL (Usamos directamente lo que mandó el front o limpiamos la referencia)
      let realPromoCode = data.couponCode ? String(data.couponCode).trim() : codigoReferencia.replace('COUPON-', '').trim();

      // 🚀 3. VALIDACIÓN ESTRICTA EN LA BASE DE DATOS
      if (isCoupon) {
        if (!realPromoCode) throw new Error("Por favor, ingresa el código del cupón.");
        
        // Búsqueda SQL insensible a mayúsculas/minúsculas para evitar errores tontos
        const [promo] = await tx.select().from(promoCodes).where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`);
        
        if (!promo) {
          throw new Error(`El cupón '${realPromoCode}' es inválido o no existe.`);
        }
        if (promo.isUsed) {
          throw new Error("Este cupón ya fue utilizado anteriormente.");
        }
      }

      // Si pasa la validación, armamos el perfil
      const lawyerPayload: any = {
        nameLawy: sanitizeText(data.nameLawy || data.name) || 'Sin nombre',
        area: sanitizeText(data.area) || 'General',
        address: sanitizeText(data.address) || '',
        zip: sanitizeText(data.zip) || null,
        phone: sanitizeText(data.phone) || '',
        imageUrl: cleanImage,
        description: safeDesc,
        descriptionLawy: safeDesc,
        lat: data.lat ? Number(data.lat) : lat, 
        lng: data.lng ? Number(data.lng) : lng, 
        premiumPlan: isCoupon ? 'coupon' : planSeleccionado,
        userId: validUserId, 
        approved: isCoupon ? true : false, // 👈 Si es cupón, nace aprobado
        estate: finalEstate 
      };

      const [newLawyer] = await tx.insert(lawyers).values(lawyerPayload).returning();

      // 🚀 4. GUARDAR EL PAGO (Evitando choque de Unique Constraint)
      if (codigoReferencia || realPromoCode) {
        const basePrice = await getCurrentLawyerPrice();
        
        // Si es cupón, le añadimos la fecha a la referencia en la tabla de pagos 
        // para que la BD no explote por "referencia duplicada"
        const safePaymentReference = isCoupon ? `CUPON-${realPromoCode}-${Date.now()}` : codigoReferencia;

        await tx.insert(payments).values({
          entityType: 'lawyer',
          entityId: newLawyer.id,
          userId: validUserId,
          referenceCode: safePaymentReference, 
          paymentMethod: isCoupon ? 'Coupon' : metodoPago, 
          amount: isCoupon ? "0.00" : (data.tariffPlan || basePrice), 
          durationDays: 30, 
          status: isCoupon ? "approved" : "pending", 
          approvedAt: isCoupon ? new Date() : null
        });
      }

      // 🚀 5. QUEMAR EL CUPÓN PARA QUE NO SE VUELVA A USAR
      if (isCoupon) {
          await tx.update(promoCodes)
          .set({
            isUsed: true, 
            usedByUserId: validUserId,
            usedForEntityId: newLawyer.id,
            entityType: 'lawyer',
            usedAt: new Date() 
          })
          .where(sql`LOWER(${promoCodes.code}) = LOWER(${realPromoCode})`); 
      }

      return {
         ...newLawyer,
         referenceCode: isCoupon ? realPromoCode : codigoReferencia,
         paymentMethod: isCoupon ? 'Coupon' : metodoPago,
         description: safeDesc,
         descriptionLawy: safeDesc
      };
    });

    if (createdLawyerResult && createdLawyerResult.paymentMethod !== 'Coupon') {
      sendTelegramAlert(
        createdLawyerResult.nameLawy, 
        createdLawyerResult.referenceCode || 'N/A', 
        createdLawyerResult.paymentMethod || 'N/A'
      ).catch(e => console.log("Notificación de Telegram falló en segundo plano", e));
    }

    return resAny.status(201).json(createdLawyerResult);

  } catch (error: any) { 
    console.error("❌ Error en createLawyer:", error);
    
    // Filtramos los errores de Constraint por si acaso
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       return resAny.status(409).json({ error: "El código de referencia de pago ya está en uso." });
    }

    // Le devolvemos el error exacto al usuario (ej: "El cupón no existe")
    return resAny.status(400).json({ error: error.message || "Error al crear el abogado." });
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR ABOGADO Y NOTIFICAR
// =====================================================================
export const updateLawyer = async (req: Request, res: Response) => {
  const reqAny = req as any;
  const resAny = res as any;
  const id = reqAny.params?.id;
  const data = reqAny.body || {};

  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) {
      return resAny.status(400).json({ error: "ID inválido" });
    }

    const [existingLawyer] = await db.select().from(lawyers).where(eq(lawyers.id, cleanId));
    if (!existingLawyer) {
      return resAny.status(404).json({ error: "Abogado no encontrado" });
    }

    let amount = 0;
    try {
      const resPayments = await fetch(`${process.env.EXPO_PUBLIC_URL_BACKEND || 'http://localhost:3000'}/lawyers/${cleanId}`);
      if (resPayments.ok) {
        const responsePayments = await resPayments.json();
        amount = Number(responsePayments?.payments) || 0;
      }
    } catch (err) {
      console.warn("No se pudo obtener el pago de la API interna, usando 0 por defecto");
    }

    let pushNotificationData: any = null;

    const updatedLawyerResult = await db.transaction(async (tx) => {
      
      const allowedFields = ['nameLawy', 'area', 'address', 'zip', 'phone', 'lat', 'lng', 'imageUrl', 'description', 'premiumPlan', 'descriptionLawy'];
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = (key === 'lat' || key === 'lng') ? Number(data[key]) : sanitizeText(data[key]);
        }
      }

      if (data.description !== undefined || data.descriptionLawy !== undefined) {
        const safeDesc = sanitizeText(data.description !== undefined ? data.description : data.descriptionLawy);
        updatePayload.description = safeDesc;
        updatePayload.descriptionLawy = safeDesc;
      }

      if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.startsWith('lawyers/')) {
        updatePayload.imageUrl = data.imageUrl.replace('lawyers/', '');
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

        const totalAmount = (monthsToAdd * amount).toFixed(2); 
        const daysToAdd = monthsToAdd * 30; 

        await tx.update(payments)
          .set({ 
             status: "approved", 
             approvedAt: new Date(), 
             durationDays: daysToAdd, 
             amount: totalAmount, 
             timepost_end: expirationDate 
          })
          .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'lawyer')));
      }

      const updated = await tx
        .update(lawyers)
        .set(updatePayload) 
        .where(eq(lawyers.id, cleanId))
        .returning();
        
      const lawyer = updated[0];

      const forwarded = reqAny.headers?.['x-forwarded-for'];
      const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const rawIp = ipString ? ipString.split(',')[0].trim() : reqAny.ip || reqAny.connection?.remoteAddress || '0.0.0.0';
      const ipAddress = sanitizeText(rawIp);

      logAuditEvent({
        userId: reqAny.user?.id || lawyer?.userId, 
        action: 'UPDATE_LAWYER', 
        entityType: 'lawyers', 
        entityId: cleanId, 
        ipAddress: ipAddress,
        metadata: { 
          descripcion: "Se actualizó la información o estatus del abogado", 
          previousState: existingLawyer,
          newState: lawyer
        }
      });

      // 🚀 NOTIFICACIONES MASIVAS (GEOFENCING 20 MILLAS) AL APROBAR
      const wasApprovedBefore = existingLawyer.approved === true;

      if (isApproved && !wasApprovedBefore && lawyer) {
        console.log("✅ [DEBUG PUSH] Abogado nuevo aprobado. Calculando usuarios locales...");

        const titleText = "¡Nuevo Abogado en tu área! ⚖️";
        const bodyText = `El abogado ${lawyer.nameLawy} ahora está disponible cerca de ti. ¡Visita su perfil!`;

        let usersToNotify: { id: string }[] = [];

        if (lawyer.zip) {
          const nearbyZips = zipcodes.radius(lawyer.zip as any, Number(radiusMiles)); 

          if (nearbyZips && nearbyZips.length > 0) {
            usersToNotify = await tx.select({ id: users.id })
                                    .from(users)
                                    .where(inArray(users.zip, nearbyZips as string[]));
          } else {
            usersToNotify = await tx.select({ id: users.id })
                                    .from(users)
                                    .where(eq(users.zip, String(lawyer.zip)));
          }
        }

        if (usersToNotify.length > 0) {
          const notificationsToInsert = usersToNotify.map(u => {
            const payload: any = {
              title: titleText,
              description: bodyText,
              type: "lawyer", 
              visibleAt: new Date(), 
              userId: u.id,
              isRead: false
            };
            if ('referenceId' in notifications) payload.referenceId = String(lawyer.id);
            else if ('reference_id' in notifications) payload.reference_id = String(lawyer.id);
            return payload;
          });

          await tx.insert(notifications).values(notificationsToInsert);

          pushNotificationData = {
            title: titleText,
            body: bodyText,
            referenceId: String(lawyer.id),
            userIds: usersToNotify.map(u => u.id) 
          };
        }
      }

      return lawyer || null;
    });

    if (pushNotificationData) {
      sendMassPushNotification(pushNotificationData).catch(err => {
         console.error("❌ [DEBUG PUSH] Falló el Push Notification:", err);
      });
    }

    return resAny.status(200).json(updatedLawyerResult);

  } catch (error: any) { 
    console.error("❌ Error en updateLawyer:", error);
    return (res as any).status(500).json({ error: `Error al actualizar el abogado: ${error.message}` });
  }
};

// =====================================================================
// 🚀 5. INGRESO DE RATING Y RESEÑA (CORREGIDO)
// =====================================================================
export const createRating = async (data: any) => {
  try {
    const validUserId = sanitizeText(data.userId);
    if (!validUserId || validUserId.length < 20) {
        throw new Error("No estás autorizado para publicar una reseña. Se requiere iniciar sesión.");
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
            throw new Error("El usuario ya ha publicado una reseña para este abogado.");
        }
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: validUserId,
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'lawyers';
    else ratingPayload.type_entry = 'lawyers';

    if ('referenceId' in ratingTable) ratingPayload.referenceId = targetReferenceId;
    else ratingPayload.reference_id = targetReferenceId;

    const newRating = await db.insert(ratingTable).values(ratingPayload).returning();
    const generatedRatingId = newRating[0].id;

    let savedComment = '';
    const incomingText = sanitizeText(data.comment || data.text || data.review);
    
    if (incomingText && incomingText !== '') {
      const reviewPayload: any = { userId: validUserId };

      if ('review' in reviewsTable) reviewPayload.review = incomingText;
      else if ('text' in reviewsTable) reviewPayload.text = incomingText;
      else reviewPayload.comment = incomingText;

      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;
      
      const typeCodeRecord = await db.select({ id: typeDetail.id })
        .from(typeDetail)
        .where(sql`${typeDetail.typeCode} = 'Lawyers' OR ${typeDetail.typeCode} = 'Lawyers'`)
        .limit(1);

      if (!typeCodeRecord || typeCodeRecord.length === 0) {
        throw new Error("Error en la Base de Datos: La categoría 'Lawyers' no existe en la tabla typeDetail.");
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
    console.error("❌ Error CRÍTICO en createRating de Abogados:", error.message);
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 6. ELIMINAR ABOGADO 
// =====================================================================
export const deleteLawyer = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(lawyers).where(eq(lawyers.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el abogado: ${error.message}`);
  }
};

// =====================================================================
// 🔄 7. RENOVAR ABOGADO
// =====================================================================
export const renewLawyer = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    // 🚀 VALIDACIÓN ESTRICTA
    const validUserId = sanitizeText(data.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para renovar.");
    }

    if (!refCode || !payMethod || !cleanId) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      const basePrice = await getCurrentLawyerPrice();

      await tx.insert(payments).values({
        entityType: 'lawyer',
        entityId: cleanId,
        userId: validUserId, // 🚀 SE USA EL ID VALIDADO
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: basePrice, 
        durationDays: 30, 
        status: "pending"
      });

      const updated = await tx
        .update(lawyers)
        .set({ approved: false }) 
        .where(eq(lawyers.id, cleanId))
        .returning();
        
      return {
         ...updated[0],
         referenceCode: refCode,
         paymentMethod: payMethod
      };
    });

  } catch (error: any) { 
    console.error("❌ Error en renewLawyer:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado en otra transacción.");
    }
    throw new Error(`Error al renovar el abogado: ${error.message}`);
  }
};