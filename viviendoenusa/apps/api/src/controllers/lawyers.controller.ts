import { db } from "../../../../packages/db/src"; 
import { lawyers, rating } from "../../../../packages/db/src/schema"; 
import { eq } from "drizzle-orm";

// 🔍 1. CONSULTA GENERAL: Obtiene los abogados filtrados por zip (opcional) incluyendo promedios y lista de calificaciones
export const getLawyers = async (zip?: string) => {
  try {
    // Inicializamos la query base con el leftJoin de los ratings
    let query = db
      .select()
      .from(lawyers)
      .leftJoin(rating, eq(rating.referenceId, lawyers.id))
      .$dynamic(); // Volvemos la query dinámica para agregar condicionales

    // 🎯 Si el frontend envía el código postal, aplicamos el filtro en la consulta de Postgres
    if (zip && zip.trim().length === 5) {
      query = query.where(eq(lawyers.zip, zip.trim()));
    }

    const rows = await query;

    if (!rows || rows.length === 0) return [];

    // Agrupamos por abogado para procesar sus promedios individuales
    const lawyersMap = new Map<string, any>();

    for (const row of rows) {
      const lawyerId = row.lawyers.id;

      if (!lawyersMap.has(lawyerId)) {
        lawyersMap.set(lawyerId, {
          ...row.lawyers,
          rawRatings: []
        });
      }

      if (row.rating) {
        lawyersMap.get(lawyerId).rawRatings.push(row.rating);
      }
    }

    // Convertimos el mapa en el arreglo final calculando las matemáticas de cada uno
    const finalResult = Array.from(lawyersMap.values()).map((lawyer: any) => {
      const ratingsArray = lawyer.rawRatings;
      let averageRating = 0;

      if (ratingsArray.length > 0) {
        const sum = ratingsArray.reduce((acc: number, curr: any) => acc + Number(curr?.rating || 0), 0);
        averageRating = Math.round((sum / ratingsArray.length) * 10) / 10;
      }

      // Estructura limpia compatible con tu LawyerCard del frontend
      return {
        id: lawyer.id,
        nameLawy: lawyer.nameLawy,
        area: lawyer.area,
        lat: lawyer.lat,
        lng: lawyer.lng,
        phone: lawyer.phone,
        imageUrl: lawyer.imageUrl,
        userId: lawyer.userId,
        createdAt: lawyer.createdAt,
        approved: lawyer.approved,
        
        // 🛡️ BLINDAJE: Forzamos string para evitar el error de casteo "code: 42804" en Postgres
        zip: lawyer.zip ? String(lawyer.zip) : null,

        totalReviews: ratingsArray.length,
        totalRating: averageRating, 
        rating: ratingsArray         
      };
    });

    return finalResult;
  } catch (error: any) {
    console.error("❌ Error en getLawyers con Ratings:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL: Obtener un abogado específico por ID con sus reviews
export const getLawyerByIdWithReviews = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(lawyers)
      .leftJoin(rating, eq(rating.referenceId, lawyers.id))
      .where(eq(lawyers.id, id));
  
    if (!rows || rows.length === 0) return null;
  
    const ratingsArray = rows
      .filter(row => row.rating !== null && row.rating !== undefined)
      .map(row => row.rating);
  
    let averageRating = 0;
    if (ratingsArray.length > 0) {
      const sum = ratingsArray.reduce((acc, curr) => acc + Number(curr?.rating || 0), 0);
      averageRating = Math.round((sum / ratingsArray.length) * 10) / 10;
    }
  
    return {
      ...rows[0].lawyers, 
      totalReviews: ratingsArray.length, 
      totalRating: averageRating,         
      rating: ratingsArray              
    };
  } catch (error: any) {
    throw new Error(`Error al obtener el abogado por ID: ${error.message}`);
  }
};

// 📥 3. INGRESO: Crear un nuevo abogado
export const createLawyer = async (data: any) => {
  try {
    const newLawyer = await db.insert(lawyers).values(data).returning();
    return newLawyer[0];
  } catch (error: any) { 
    throw new Error(`Error al crear el abogado: ${error.message}`);
  }
};

// 🔍 4. CONSULTA SIMPLE: Obtener un abogado por ID sin joints
export const getLawyerById = async (id: string) => {
  const result = await db.select().from(lawyers).where(eq(lawyers.id, id));
  return result[0] || null;
};

// 🔄 5. ACTUALIZACIÓN: Modificar datos existentes de un abogado
export const updateLawyer = async (id: string, data: any) => {
  try {
    const updated = await db
      .update(lawyers)
      .set(data)
      .where(eq(lawyers.id, id))
      .returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar el abogado: ${error.message}`);
  }
};

// 🚀 6. INGRESO DE RATING: Crear una nueva calificación/reseña asociada
export const createRating = async (data: any) => {
  try {
    const formattedData = {
      ...data,
      rating: data.rating ? String(Number(data.rating).toFixed(2)) : "0.00"
    };

    const newRating = await db.insert(rating).values(formattedData).returning();
    return newRating[0];
  } catch (error: any) {
    throw new Error(`Error al crear la calificación: ${error.message}`);
  }
};