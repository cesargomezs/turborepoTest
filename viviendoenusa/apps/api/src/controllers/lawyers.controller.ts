import { db } from "../../../../packages/db/src"; 
import { lawyers, users, rating as ratingTable, reviews as reviewsTable, payments, notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS: Elimina etiquetas HTML o scripts maliciosos
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🔍 1. CONSULTA GENERAL (Mapeo de descripción blindado y ORDENAMIENTO agregado)
export const getLawyers = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) || '' : '';

    let query = db
    .select()
    .from(lawyers)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(payments, and(eq(payments.entityId, lawyers.id), eq(payments.entityType, 'lawyer')))
    .where(
      currentUserId 
        ? sql`${lawyers.approved} = false OR ${lawyers.timepostEnd} > NOW() OR ${lawyers.userId} = ${currentUserId}`
        : sql`${lawyers.approved} = false OR ${lawyers.timepostEnd} > NOW()`
    )
    // 🚀 ORDENAMIENTO: Ordenamos por la fecha de creación/renovación (los más recientes primero)
    .orderBy(desc(lawyers.createdAt))
    .$dynamic();

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

        lawyersMap.get(lawyerId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
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

      // 🚀 BLINDAJE: Nos aseguramos de que el objeto lleve tanto 'description' como 'descriptionLawy'
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

// 🔍 2. CONSULTA INDIVIDUAL POR ID (Mapeo de descripción blindado)
export const getLawyerByIdWithReviews = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(lawyers)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .where(eq(lawyers.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const lawyerFinal: any = {
      ...rows[0].lawyers, 
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

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

    lawyerFinal.totalReviews = lawyerFinal.reviews.length;
    if (lawyerFinal.totalReviews > 0) {
      const sum = lawyerFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      lawyerFinal.totalRating = Math.round((sum / lawyerFinal.totalReviews) * 10) / 10;
      lawyerFinal.rating = lawyerFinal.totalRating;
    }

    // 🚀 BLINDAJE: Forzamos la descripción en ambos formatos para la respuesta individual
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

    return lawyerFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el abogado por ID: ${error.message}`);
  }
};

// 📥 3. CREAR ABOGADO
export const createLawyer = async (data: any) => {
  try {
    let cleanImage = sanitizeText(data.imageUrl) || '';
    if (cleanImage.startsWith('lawyers/')) {
      cleanImage = cleanImage.replace('lawyers/', '');
    }

    return await db.transaction(async (tx) => {
      
      const safeDesc = sanitizeText(data.description || data.descriptionLawy) || '';

      const lawyerPayload: any = {
        nameLawy: sanitizeText(data.nameLawy || data.name) || 'Sin nombre',
        area: sanitizeText(data.area) || 'General',
        address: sanitizeText(data.address) || '',
        zip: sanitizeText(data.zip) || null,
        phone: sanitizeText(data.phone) || '',
        imageUrl: cleanImage,
        // 🚀 Guardamos en ambas propiedades para asegurar compatibilidad total con el esquema
        description: safeDesc,
        descriptionLawy: safeDesc,
        lat: data.lat ? Number(data.lat) : null,
        lng: data.lng ? Number(data.lng) : null,
        userId: sanitizeText(data.userId) || null,
        approved: false 
      };
      
      const [newLawyer] = await tx.insert(lawyers).values(lawyerPayload).returning();

      if (data.referenceCode && data.paymentMethod) {
        await tx.insert(payments).values({
          entityType: 'lawyer',
          entityId: newLawyer.id,
          userId: lawyerPayload.userId,
          referenceCode: sanitizeText(data.referenceCode) || '', 
          paymentMethod: sanitizeText(data.paymentMethod) || '', 
          amount: "50.00", 
          durationDays: 30, 
          status: "pending"
        });
      }

      return {
         ...newLawyer,
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod,
         description: safeDesc,
         descriptionLawy: safeDesc
      };
    });
  } catch (error: any) { 
    console.error("❌ Error en createLawyer:", error);
    
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado. Por favor, ingresa un código válido y único.");
    }

    throw new Error(`Error al crear el abogado: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR ABOGADO
export const updateLawyer = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      // Añadimos explícitamente ambos nombres de descripción a los permitidos
      const allowedFields = ['nameLawy', 'area', 'address', 'zip', 'phone', 'lat', 'lng', 'imageUrl', 'description', 'descriptionLawy'];
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = (key === 'lat' || key === 'lng') ? Number(data[key]) : sanitizeText(data[key]);
        }
      }

      // 🚀 Si viene una actualización de descripción, la inyectamos de forma segura en las dos variantes
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
        
        // 🚀 ACTUALIZACIÓN DE FECHA: Reiniciamos createdAt para que salte al top de la lista
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

        const daysToAdd = monthsToAdd * 30; 
        const totalAmount = (monthsToAdd * 50).toFixed(2); 

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

      // GENERAR NOTIFICACIÓN GLOBAL Y CLICKEABLE AL APROBAR
      if (isApproved && lawyer) {
        const notifPayload: any = {
            title: "¡Abogado Verificado! ⚖️",
            description: `El abogado ${lawyer.nameLawy} ahora es parte de la red de servicios. ¡Visita su perfil!`,
            type: "lawyer", 
            visibleAt: new Date(), 
            userId: lawyer.userId, // 🚀 FIX: Postgres exige que no sea null. Se lo asignamos al creador.
        };

        if ('referenceId' in notifications) notifPayload.referenceId = String(lawyer.id);
        else if ('reference_id' in notifications) notifPayload.reference_id = String(lawyer.id);

        await tx.insert(notifications).values(notifPayload);
      }

      return lawyer || null;
    });

  } catch (error: any) { 
    console.error("❌ Error en updateLawyer:", error);
    throw new Error(`Error al actualizar el abogado: ${error.message}`);
  }
};

// 🚀 5. INGRESO DE RATING Y RESEÑA
export const createRating = async (data: any) => {
  try {
    let validUserId = sanitizeText(data.userId) || null;
    if (!validUserId || validUserId.length < 20) {
        const fallbackUser = await db.select().from(users).limit(1);
        if (fallbackUser.length > 0) validUserId = fallbackUser[0].id;
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
      const reviewPayload: any = {
        userId: validUserId
      };

      if ('review' in reviewsTable) reviewPayload.review = incomingText;
      else if ('text' in reviewsTable) reviewPayload.text = incomingText;
      else reviewPayload.comment = incomingText;

      if ('relationshipId' in reviewsTable) reviewPayload.relationshipId = generatedRatingId;
      else if ('ratingId' in reviewsTable) reviewPayload.ratingId = generatedRatingId;
      else reviewPayload.rating_id = generatedRatingId;
      
      if ('typeDetailId' in reviewsTable) {
          reviewPayload.typeDetailId = '035118eb-612e-41a2-ac95-b4f339b4e388';
      } else {
          reviewPayload.type_detail_id = '035118eb-612e-41a2-ac95-b4f339b4e388';
      }

      const reviewRows = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = reviewRows[0].comment || '';
    }

    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment
    };

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en createRating de Abogados:", error.message);
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};

// 🗑️ 6. ELIMINAR ABOGADO 
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

// 🔄 7. RENOVAR ABOGADO
export const renewLawyer = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    if (!refCode || !payMethod || !cleanId) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        entityType: 'lawyer',
        entityId: cleanId,
        userId: sanitizeText(data.userId) || null,
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: "50.00", 
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