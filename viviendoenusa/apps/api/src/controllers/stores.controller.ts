import { db } from "../../../../packages/db/src"; 
import { stores, users, rating as ratingTable, reviews as reviewsTable, payments, notifications, tariffs, typeDetail } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
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

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE Y CONSTANTES
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🚀 USUARIO POR DEFECTO MIENTRAS SE IMPLEMENTA SESIÓN
const TEMP_USER_ID = 'baeb641a-3fa4-4fef-9846-d75947d1bca9';

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 💰 FUNCIÓN AUXILIAR: Trae el precio actual de la BD
const getCurrentStorePrice = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();

    const activeTariff = await db.select({ price: tariffs.priceBasic })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .where(
      and(
        sql`${typeDetail.typeCode} ILIKE 'Store%'`, 
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
// 🔍 1. CONSULTA GENERAL CON FILTRO DE RADIO Y VISIBILIDAD
// =====================================================================
export const getStores = async (rawZip?: string | number, currentUserId?: string) => {
  try {
    const zip = rawZip ? sanitizeText(String(rawZip)) || '' : '';

    // Obtenemos lat y lng del ZIP
    const { lat, lng } = await getCoordsFromZip(zip || ''); 
    const radiusMiles = 4; // Rango de búsqueda: 4 millas

     // 🚀 Fórmula de Distancia Haversine (Segura)
     const distanceFormula = sql`(
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat}::numeric)) * cos(radians(${stores.lat}::numeric)) * cos(radians(${stores.lng}::numeric) - radians(${lng}::numeric)) + 
          sin(radians(${lat}::numeric)) * sin(radians(${stores.lat}::numeric))
        ))
      )
    )`;

    // 🚀 Definimos explícitamente el select incluyendo la distancia
    let query = db
    .select({
      stores: stores,
      users: users,
      rating: ratingTable,
      reviews: reviewsTable,
      payments: payments,
      distance: distanceFormula.as('distance')
    })
    .from(stores)
    .leftJoin(ratingTable, eq(ratingTable.referenceId, stores.id))
    .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id)) 
    .leftJoin(users, eq(ratingTable.userId, users.id))
    .leftJoin(payments, and(eq(payments.entityId, stores.id), eq(payments.entityType, 'store')))
    .$dynamic();

    // 🚀 Lógica de Visibilidad 
    const visibilityCondition = currentUserId
      ? sql`(${stores.approved} = false OR ${stores.timepostEnd} > NOW() OR ${stores.userId} = ${currentUserId})`
      : sql`(${stores.approved} = false OR ${stores.timepostEnd} > NOW())`;

    // 🚀 Aplicamos los filtros sin sobreescribir (usando AND)
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
      query = query.orderBy(desc(stores.createdAt));
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const storesMap = new Map<string, any>();

    for (const row of rows) {
      const storeId = row.stores.id;

      if (!storesMap.has(storeId)) {
        storesMap.set(storeId, {
          ...row.stores,
          referenceCode: row.payments?.referenceCode || null,
          paymentMethod: row.payments?.paymentMethod || null,
          reviews: [], 
          totalRating: 0,
          totalReviews: 0
        });
      }

      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';

        const { data } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

        storesMap.get(storeId).reviews.push({
           ...row.rating,
           stars: Number(row.rating.rating) || 0,
           comment: commentText,
           name: row.users?.name + ' ' + row.users?.lastName?.substring(0, 1),
           image: data?.signedUrl,
           displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    const finalResult = await Promise.all(Array.from(storesMap.values()).map(async (store: any) => {
      store.totalReviews = store.reviews.length;

      if (store.totalReviews > 0) {
        const sum = store.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
        store.totalRating = Math.round((sum / store.totalReviews) * 10) / 10;
        store.rating = store.totalRating; 
      } else {
        store.totalRating = 0;
        store.rating = 0;
      }

      const safeDescription = store.description || store.descriptionStores || '';
      store.description = safeDescription;
      store.descriptionStores = safeDescription;

      if (store.imageStores && store.imageStores.trim() !== '' && !store.imageStores.startsWith('http')) {
          const rutaArchivo = store.imageStores.startsWith('stores/') 
              ? store.imageStores : `stores/${store.imageStores}`;

          const { data } = await supabase
              .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 

          if (data) {
              return { ...store, image: data.signedUrl, imageStores: data.signedUrl }; 
          }
      }
      return { ...store, image: store.imageStores }; 
    }));

    return finalResult;
  } catch (error: any) {
    console.error("❌ Error en getStores:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL POR ID
// =====================================================================
export const getStoreById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(stores)
      .leftJoin(ratingTable, eq(ratingTable.referenceId, stores.id))
      .leftJoin(reviewsTable, eq(reviewsTable.relationshipId, ratingTable.id))
      .leftJoin(users, eq(ratingTable.userId, users.id))
      .where(eq(stores.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
  
    const storeFinal: any = {
      ...rows[0].stores, 
      reviews: [],
      totalRating: 0,
      totalReviews: 0           
    };

    for (const row of rows) {
      const { data } = await supabase
      .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+row.users?.imageUrl, 3600);

      if (row.rating && row.rating.id) {
        const commentText = row.reviews?.comment || '';
        storeFinal.reviews.push({
          ...row.rating,
          stars: Number(row.rating.rating) || 0,
          comment: commentText,
          name: row.users?.name + ' ' + row.users?.lastName?.substring(0, 1),
          image: data?.signedUrl,
          displayTime: new Date(row.rating.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    storeFinal.totalReviews = storeFinal.reviews.length;
    if (storeFinal.totalReviews > 0) {
      const sum = storeFinal.reviews.reduce((acc: number, curr: any) => acc + (Number(curr.stars) || 0), 0);
      storeFinal.totalRating = Math.round((sum / storeFinal.totalReviews) * 10) / 10;
      storeFinal.rating = storeFinal.totalRating;
    }

    const safeDescription = storeFinal.description || storeFinal.descriptionStores || '';
    storeFinal.description = safeDescription;
    storeFinal.descriptionStores = safeDescription;

    if (storeFinal.imageStores && storeFinal.imageStores.trim() !== '' && !storeFinal.imageStores.startsWith('http')) {
        const rutaArchivo = storeFinal.imageStores.startsWith('stores/') 
            ? storeFinal.imageStores : `stores/${storeFinal.imageStores}`;

        const { data, error } = await supabase
            .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
            
        if (!error && data) {
            storeFinal.image = data.signedUrl;
            storeFinal.imageStores = data.signedUrl;
        }
    } else {
        storeFinal.image = storeFinal.imageStores;
    }

    return storeFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener el negocio por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR NEGOCIO
// =====================================================================
export const createStore = async (data: any) => {
  try {
    let cleanImage = sanitizeText(data.imageStores) || '';
    if (cleanImage.startsWith('stores/')) {
      cleanImage = cleanImage.replace('stores/', '');
    }

    // 🚀 OBTENEMOS LAS COORDENADAS DEL ZIP 
    const { lat, lng } = await getCoordsFromZip(data.zip || '');

    return await db.transaction(async (tx) => {
      
      const safeDesc = sanitizeText(data.description || data.descriptionStores) || '';

      const storePayload: any = {
        nameStores: sanitizeText(data.nameStores || data.name) || 'Sin nombre',
        categoryId: sanitizeText(data.categoryId) || 'General',
        addressStores: sanitizeText(data.addressStores || data.address) || '',
        zip: sanitizeText(data.zip) || null,
        phone: sanitizeText(data.phone) || '',
        imageStores: cleanImage,
        descriptionStores: safeDesc,
        lat: data.lat ? Number(data.lat) : lat, // 🚀 AHORA SE GUARDA LA LATITUD
        lng: data.lng ? Number(data.lng) : lng, // 🚀 AHORA SE GUARDA LA LONGITUD
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        approved: false 
      };
      
      const [newStore] = await tx.insert(stores).values(storePayload).returning();

      if (data.referenceCode && data.paymentMethod) {
        const basePrice = await getCurrentStorePrice();

        await tx.insert(payments).values({
          entityType: 'store',
          entityId: newStore.id,
          userId: storePayload.userId,
          referenceCode: sanitizeText(data.referenceCode) || '', 
          paymentMethod: sanitizeText(data.paymentMethod) || '', 
          amount: basePrice, 
          durationDays: 30, 
          status: "pending"
        });
      }

      return {
         ...newStore,
         referenceCode: data.referenceCode,
         paymentMethod: data.paymentMethod,
         description: safeDesc,
         descriptionStores: safeDesc
      };
    });
  } catch (error: any) { 
    console.error("❌ Error en createStore:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint')) || (error.message && error.message.includes('duplicate key'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado. Por favor, ingresa un código válido y único.");
    }
    throw new Error(`Error al crear el negocio: ${error.message}`);
  }
};

// =====================================================================
// 🔄 4. ACTUALIZAR NEGOCIO
// =====================================================================
export const updateStore = async (id: string, data: any) => {
  try {
    const res = await fetch(`http://192.168.1.201:3000/stores/${id}`);
    const response = await res.json();
    const amount = Number(response.payments) || 0;

    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      
      const allowedFields = ['nameStores', 'categoryId', 'addressStores', 'zip', 'phone', 'lat', 'lng', 'imageStores', 'descriptionStores'];
      const updatePayload: any = {};
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) {
           updatePayload[key] = (key === 'lat' || key === 'lng') ? Number(data[key]) : sanitizeText(data[key]);
        }
      }

      if (data.description !== undefined || data.descriptionStores !== undefined) {
        const safeDesc = sanitizeText(data.description !== undefined ? data.description : data.descriptionStores);
        updatePayload.descriptionStores = safeDesc;
      }

      if (data.imageStores && typeof data.imageStores === 'string' && data.imageStores.startsWith('stores/')) {
        updatePayload.imageStores = data.imageStores.replace('stores/', '');
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
          .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'store')));
      }

      const updated = await tx
        .update(stores)
        .set(updatePayload) 
        .where(eq(stores.id, cleanId))
        .returning();
        
      const store = updated[0];

      if (isApproved && store) {
        const notifPayload: any = {
            title: "¡Negocio Verificado! 🏪",
            description: `El negocio ${store.nameStores} ahora es parte de la red de servicios. ¡Visita su perfil!`,
            type: "store", 
            visibleAt: new Date(), 
            userId: store.userId || TEMP_USER_ID, 
        };

        if ('referenceId' in notifications) notifPayload.referenceId = String(store.id);
        else if ('reference_id' in notifications) notifPayload.reference_id = String(store.id);

        await tx.insert(notifications).values(notifPayload);
      }

      return store || null;
    });

  } catch (error: any) { 
    console.error("❌ Error en updateStore:", error);
    throw new Error(`Error al actualizar el negocio: ${error.message}`);
  }
};

// =====================================================================
// 🚀 5. INGRESO DE RATING Y RESEÑA
// =====================================================================
export const createStoreReview = async (data: any) => {
  try {
    let validUserId = sanitizeText(data.userId) || null;
    if (!validUserId || validUserId.length < 20) {
        validUserId = TEMP_USER_ID; 
    }

    const targetReferenceId = sanitizeText(data.reference_id || data.referenceId);

    let existingRating = null;

    if (validUserId && targetReferenceId) {
       existingRating = await db.select()
          .from(ratingTable)
          .where(
            and(
              eq(ratingTable.referenceId, targetReferenceId),
              eq(ratingTable.userId, validUserId)
            )
          )
          .limit(1);

        if (existingRating && existingRating.length > 0) {
            throw new Error("El usuario ya ha publicado una reseña para este negocio.");
        }
    }

    const ratingPayload: any = {
      rating: String(Number(data.stars || data.rating || 5)), 
      userId: validUserId,
    };

    if ('typeEntry' in ratingTable) ratingPayload.typeEntry = 'stores';
    else ratingPayload.type_entry = 'stores';

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
        .where(sql`${typeDetail.typeCode} = 'Store' OR ${typeDetail.typeCode} = 'Stores'`)
        .limit(1);

      if (!typeCodeRecord || typeCodeRecord.length === 0) {
        throw new Error("Error en la Base de Datos: La categoría 'Store' no existe en la tabla typeDetail.");
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

    return {
      id: generatedRatingId,
      stars: Number(newRating[0].rating),
      comment: savedComment,
    };

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en createStoreReview:", error.message);
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 6. ELIMINAR NEGOCIO 
// =====================================================================
export const deleteStore = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(stores).where(eq(stores.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar el negocio: ${error.message}`);
  }
};

// =====================================================================
// 🔄 7. RENOVAR NEGOCIO
// =====================================================================
export const renewStore = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    if (!refCode || !payMethod || !cleanId) {
      throw new Error("Se requiere el código de referencia y método de pago.");
    }

    return await db.transaction(async (tx) => {
      const basePrice = await getCurrentStorePrice();

      await tx.insert(payments).values({
        entityType: 'store',
        entityId: cleanId,
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: basePrice, 
        durationDays: 30, 
        status: "pending"
      });

      const updated = await tx
        .update(stores)
        .set({ approved: false }) 
        .where(eq(stores.id, cleanId))
        .returning();
        
      return {
         ...updated[0],
         referenceCode: refCode,
         paymentMethod: payMethod
      };
    });

  } catch (error: any) { 
    console.error("❌ Error en renewStore:", error);
    if (error.code === '23505' || (error.message && error.message.includes('unique constraint'))) {
       throw new Error("Ese código de referencia de pago ya fue utilizado en otra transacción.");
    }
    throw new Error(`Error al renovar el negocio: ${error.message}`);
  }
};