import { db } from "../../../../packages/db/src"; 
import { lawyers, users, rating as ratingTable, reviews as reviewsTable, payments } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL
export const getLawyers = async (rawZip?: string | number) => {
  try {
    const zip = rawZip ? String(rawZip).trim() : '';

    // TRIPLE JOIN: Abogados -> Rating -> Reviews -> Payments
    let query = db
    .select()
    .from(lawyers)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, lawyers.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(payments, and(eq(payments.entityId, lawyers.id), eq(payments.entityType, 'lawyer')))
    .where(
      sql`${lawyers.approved} = false OR lawyers."timepostEnd" > NOW()` 
    )
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
    console.error("❌ Error en getLawyers con Ratings y Pagos:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL POR ID 
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
    let cleanImage = data.imageUrl || '';
    if (cleanImage.startsWith('lawyers/')) {
      cleanImage = cleanImage.replace('lawyers/', '');
    }

    return await db.transaction(async (tx) => {
      
      const lawyerPayload: any = {
        nameLawy: data.nameLawy || data.name || 'Sin nombre',
        area: data.area || 'General',
        address: data.address || '',
        zip: data.zip ? String(data.zip).trim() : null,
        phone: data.phone || '',
        imageUrl: cleanImage,
        description: data.description || data.descriptionLawy || '', 
        lat: data.lat ? Number(data.lat) : null,
        lng: data.lng ? Number(data.lng) : null,
        userId: data.userId || null,
        approved: false, 
        timepostEnd: null 
      };
      
      const [newLawyer] = await tx.insert(lawyers).values(lawyerPayload).returning();

      if (data.referenceCode && data.paymentMethod) {
        await tx.insert(payments).values({
          entityType: 'lawyer',
          entityId: newLawyer.id,
          userId: data.userId || null,
          referenceCode: String(data.referenceCode).trim(), 
          paymentMethod: String(data.paymentMethod).trim(), 
          amount: "50.00", 
          durationDays: 30, 
          status: "pending"
        });
      }

      return {
         ...newLawyer,
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod
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
    if (data.imageUrl && data.imageUrl.startsWith('lawyers/')) {
      data.imageUrl = data.imageUrl.replace('lawyers/', '');
    }
    
    return await db.transaction(async (tx) => {
      
      const isApproved = String(data.approved).toLowerCase() === 'true';
      const updatePayload = { ...data };
      
      if (isApproved) {
        updatePayload.approved = true; 
        
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
        delete updatePayload.durationMonths;

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
          .where(and(eq(payments.entityId, id), eq(payments.entityType, 'lawyer')));
      }

      const updated = await tx
        .update(lawyers)
        .set(updatePayload) 
        .where(eq(lawyers.id, id))
        .returning();
        
      return updated[0] || null;
    });

  } catch (error: any) { 
    console.error("❌ Error en updateLawyer:", error);
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

    let savedComment = '';
    const incomingText = data.comment || data.text || data.review;
    
    if (incomingText && incomingText.trim() !== '') {
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

      const newReview = await db.insert(reviewsTable).values(reviewPayload).returning();
      savedComment = newReview[0].comment || '';
    }

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

// 🗑️ 6. ELIMINAR ABOGADO 
export const deleteLawyer = async (id: string) => {
  try {
    const deleted = await db.delete(lawyers).where(eq(lawyers.id, id)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el abogado: ${error.message}`);
  }
};

// 🔄 7. RENOVAR ABOGADO (Genera un nuevo pago y manda a revisión)
export const renewLawyer = async (id: string, data: any) => {
  try {
    if (!data.referenceCode || !data.paymentMethod) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      // 1. Insertamos un NUEVO registro de pago para este mes
      await tx.insert(payments).values({
        entityType: 'lawyer',
        entityId: id,
        userId: data.userId || null,
        referenceCode: String(data.referenceCode).trim(), 
        paymentMethod: String(data.paymentMethod).trim(), 
        amount: "50.00", 
        durationDays: 30, 
        status: "pending"
      });

      // 2. Regresamos el estado del abogado a "pendiente" para que lo apruebes
      const updated = await tx
        .update(lawyers)
        .set({ approved: false }) 
        .where(eq(lawyers.id, id))
        .returning();
        
      return {
         ...updated[0],
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod
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