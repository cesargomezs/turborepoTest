import { db } from "../../../../packages/db/src"; 
import { lawyers, rating } from "../../../../packages/db/src/schema"; 
import { eq } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; // 🚀 Importación de Supabase

// 🚀 Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🔍 1. CONSULTA GENERAL: Obtiene los abogados filtrados por zip con promedios y URLs firmadas
export const getLawyers = async (rawZip?: string | number) => {
  try {
    // 🚀 LÓGICA DE BLINDAJE: Aseguramos que el Zip sea un string limpio
    const zip = rawZip ? String(rawZip).trim() : '';
    console.log(`🚨 [BACKEND] getLawyers llamado. Zip recibido: "${zip}"`);

    let query = db
      .select()
      .from(lawyers)
      .leftJoin(rating, eq(rating.referenceId, lawyers.id))
      .$dynamic(); 

    if (zip && zip.length === 5) {
      console.log(`✅ Aplicando filtro estricto en BD para el Zip Code: ${zip}`);
      query = query.where(eq(lawyers.zip, zip));
    } else {
      console.log(`⚠️ No se aplicó filtro (El Zip es inválido o vino vacío). Devolviendo todos.`);
    }

    const rows = await query;

    if (!rows || rows.length === 0) return [];

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

    const finalResult = Array.from(lawyersMap.values()).map((lawyer: any) => {
      const ratingsArray = lawyer.rawRatings;
      let averageRating = 0;

      if (ratingsArray.length > 0) {
        const sum = ratingsArray.reduce((acc: number, curr: any) => acc + Number(curr?.rating || 0), 0);
        averageRating = Math.round((sum / ratingsArray.length) * 10) / 10;
      }

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
        zip: lawyer.zip ? String(lawyer.zip) : null,
        totalReviews: ratingsArray.length,
        totalRating: averageRating, 
        rating: ratingsArray         
      };
    });

    // 🚀 LÓGICA SUPABASE: Transformar las imágenes a URLs seguras (Signed URLs)
    const lawyersConImagenesSeguras = await Promise.all(finalResult.map(async (lawyer) => {
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

    return lawyersConImagenesSeguras;
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
  
    const lawyerFinal: any = {
      ...rows[0].lawyers, 
      totalReviews: ratingsArray.length, 
      totalRating: averageRating,         
      rating: ratingsArray              
    };

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

// 📥 3. INGRESO: Crear un nuevo abogado
export const createLawyer = async (data: any) => {
  try {
    if (data.imageUrl && data.imageUrl.startsWith('lawyers/')) {
      data.imageUrl = data.imageUrl.replace('lawyers/', '');
    }
    const newLawyer = await db.insert(lawyers).values(data).returning();
    return newLawyer[0];
  } catch (error: any) { 
    throw new Error(`Error al crear el abogado: ${error.message}`);
  }
};

// 🔍 4. CONSULTA SIMPLE: Obtener un abogado por ID sin joints
export const getLawyerById = async (id: string) => {
  const result = await db.select().from(lawyers).where(eq(lawyers.id, id));
  
  if (!result || result.length === 0) return null;
  const lawyerFinal = result[0];

  if (lawyerFinal.imageUrl && lawyerFinal.imageUrl.trim() !== '' && !lawyerFinal.imageUrl.startsWith('http')) {
      const rutaArchivo = lawyerFinal.imageUrl.startsWith('lawyers/') 
          ? lawyerFinal.imageUrl : `lawyers/${lawyerFinal.imageUrl}`;

      const { data, error } = await supabase
          .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
          
      if (!error && data) {
          (lawyerFinal as any).image = data.signedUrl;
          lawyerFinal.imageUrl = data.signedUrl;
      }
  }

  return lawyerFinal;
};

// 🔄 5. ACTUALIZACIÓN: Modificar datos existentes de un abogado
export const updateLawyer = async (id: string, data: any) => {
  try {
    if (data.imageUrl && data.imageUrl.startsWith('lawyers/')) {
      data.imageUrl = data.imageUrl.replace('lawyers/', '');
    }

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