import { db } from "../../../../packages/db/src"; 
import { community, reviews, countlikes, users } from "../../../../packages/db/src/schema"; 
import { eq, desc, and, sql, inArray } from "drizzle-orm"; 
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

// 🚀 1. Inicializamos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS: Elimina etiquetas HTML o scripts maliciosos
const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🛡️ BARRERA DE SANITIZACIÓN PARA OBJETOS: Limpia todos los textos de un payload
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

// =====================================================================
// 🔍 1. CONSULTA GENERAL (Con filtro de Zip Code optimizado a 4 Millas)
// =====================================================================
export const getCommunityPosts = async (zip?: string) => {
  try {
    const cleanZip = zip ? sanitizeText(String(zip)) : null;

    // 🛡️ Si enviaron un ZIP pero es inválido, devolvemos vacío
    if (zip && (!cleanZip || cleanZip.length !== 5)) {
      return []; 
    }
    
    // 🚀 Obtenemos lat y lng del ZIP
    const { lat, lng } = await getCoordsFromZip(cleanZip || ''); 
    const radiusMiles = 4; // Rango de búsqueda: 4 millas

    // 🚀 Fórmula de Distancia Haversine (Segura para Drizzle ORM)
    const distanceFormula = sql`(
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(${lat}::numeric)) * cos(radians(${community.lat}::numeric)) * cos(radians(${community.lng}::numeric) - radians(${lng}::numeric)) + 
          sin(radians(${lat}::numeric)) * sin(radians(${community.lat}::numeric))
        ))
      )
    )`;

    let query = db
      .select({
        community: community,
        reviews: reviews,
        users: users,
        distance: distanceFormula.as('distance') // Agregamos la distancia al resultado
      })
      .from(community)
      .leftJoin(reviews, eq(reviews.relationshipId, community.id)) 
      .leftJoin(users, eq(reviews.userId, users.id)) 
      .$dynamic(); 

    // 🚀 APLICAMOS EL FILTRO CONDICIONALMENTE
    if (cleanZip) {
      query = query.where(sql`${distanceFormula} <= ${radiusMiles}`);
      // Ordenamos para mostrar los más cercanos primero
      query = query.orderBy(distanceFormula);
    } else {
      // Si no hay código postal, simplemente traemos todas de la más nueva a la más vieja
      query = query.orderBy(desc(community.id));
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const postsMap = new Map<string, any>();

    for (const row of rows) {
      const postId = row.community.id;

      if (!postsMap.has(postId)) {
        const dbPost = row.community as any;
        const textoNormalizado = dbPost.text || dbPost.textContent || dbPost.text_content || '';

        postsMap.set(postId, {
          ...row.community,
          text: textoNormalizado,
          textContent: textoNormalizado, 
          zip: row.community.zip ? String(row.community.zip) : null, 
          commentsList: [] 
        });
      }

      if (row.reviews && row.reviews.id) {
        
        const usr = row.users as any;
        const nombreUsuario = usr?.name + ' ' + usr?.lastName?.substring(0, 1) || 'Usuario Anónimo';

        const { data, error } = await supabase
        .storage.from(NOMBRE_BUCKET).createSignedUrl('users/'+usr?.imageUrl, 3600);

        postsMap.get(postId).commentsList.push({
          ...row.reviews,
          image: data?.signedUrl,
          userName: nombreUsuario
        });
      }
    }

    const rawPosts = Array.from(postsMap.values());

    // 🔗 CONEXIÓN DIRECTA A LA TABLA COUNTLIKES PARA LOS TOTALES
    if (rawPosts.length > 0) {
      const postIds = rawPosts.map(post => post.id);
      
      const targetColName = (countlikes as any).communityId ? 'communityId' : 'relationshipId';
      const targetColumn = (countlikes as any)[targetColName];

      const votesFromDb = await db
        .select()
        .from(countlikes)
        .where(inArray(targetColumn, postIds));

      rawPosts.forEach((post: any) => {
        const postVotes = votesFromDb.filter((v: any) => String(v[targetColName]) === String(post.id));
        post.likes = postVotes.reduce((sum, v) => sum + (Number(v.likes) || 0), 0);
        post.dislikes = postVotes.reduce((sum, v) => sum + (Number(v.dislikes) || 0), 0);
      });
    }

    const postsConImagenesSeguras = await Promise.all(rawPosts.map(async (post) => {
        if (post.imageUrl && post.imageUrl.trim() !== '') {
            const rutaArchivo = post.imageUrl.startsWith('community/') 
                ? post.imageUrl : `community/${post.imageUrl}`;

            const { data, error } = await supabase
                .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600); 

            if (!error && data) {
                return { ...post, image: data.signedUrl, imageUrl: data.signedUrl }; 
            }
        }
        return post; 
    }));
    
   return postsConImagenesSeguras;

  } catch (error) {
    console.error("❌ Error en getCommunityPosts:", error);
    return [];
  }
};

// =====================================================================
// 🔍 2. CONSULTA INDIVIDUAL
// =====================================================================
export const getCommunityPostById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db
      .select()
      .from(community)
      .leftJoin(reviews, eq(reviews.relationshipId, community.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(community.id, cleanId));

    if (!rows || rows.length === 0) return null;
    const commentsArray = rows
      .filter(row => row.reviews !== null && row.reviews !== undefined && row.reviews.id)
      .map(row => {
        const usr = row.users as any;
        return {
          ...row.reviews,
          userName: usr?.name + ' ' + usr?.lastName?.substring(0, 1) || 'Usuario Anónimo'
        };
      });
      

    const dbPostBase = rows[0].community as any;
    const textoNormalizadoBase = dbPostBase.text || dbPostBase.textContent || dbPostBase.text_content || '';

    const postFinal: any = {
      ...rows[0].community,
      text: textoNormalizadoBase,
      textContent: textoNormalizadoBase,
      zip: rows[0].community.zip ? String(rows[0].community.zip) : null,
      commentsList: commentsArray
    };

    const targetColName = (countlikes as any).communityId ? 'communityId' : 'relationshipId';
    const targetColumn = (countlikes as any)[targetColName];

    const postVotes = await db
      .select()
      .from(countlikes)
      .where(eq(targetColumn, cleanId));
    
    postFinal.likes = postVotes.reduce((sum, v) => sum + (Number(v.likes) || 0), 0);
    postFinal.dislikes = postVotes.reduce((sum, v) => sum + (Number(v.dislikes) || 0), 0);

    if (postFinal.imageUrl && postFinal.imageUrl.trim() !== '') {
        const rutaArchivo = postFinal.imageUrl.startsWith('community/') 
            ? postFinal.imageUrl : `community/${postFinal.imageUrl}`;

        const { data, error } = await supabase
            .storage.from(NOMBRE_BUCKET).createSignedUrl(rutaArchivo, 3600);
            
        if (!error && data) {
            postFinal.image = data.signedUrl;
            postFinal.imageUrl = data.signedUrl;
        }
    }
    
    return postFinal;
  } catch (error: any) {
    throw new Error(`Error al obtener la publicación por ID: ${error.message}`);
  }
};

// =====================================================================
// 📥 3. CREAR POST (CON GEOLOCALIZACIÓN AUTOMÁTICA)
// =====================================================================
export const createCommunityPost = async (data: any) => {
  try {
    // 🛡️ Sanitizamos absolutamente todo el cuerpo de la petición
    const cleanPayload = sanitizePayload(data);

    // 🚀 Obtenemos las coordenadas a partir del ZIP y las guardamos
    const { lat, lng } = await getCoordsFromZip(cleanPayload.zip || '');
    
    // Aseguramos que la latitud y longitud se incluyan en el payload
    cleanPayload.lat = cleanPayload.lat ? Number(cleanPayload.lat) : lat;
    cleanPayload.lng = cleanPayload.lng ? Number(cleanPayload.lng) : lng;

    if (cleanPayload.imageUrl && cleanPayload.imageUrl.startsWith('community/')) {
      cleanPayload.imageUrl = cleanPayload.imageUrl.replace('community/', '');
    }
    const newPost = await db.insert(community).values(cleanPayload).returning();
    return newPost[0];
  } catch (error: any) { 
    throw new Error(`Error al crear la publicación: ${error.message}`);
  }
};

// =====================================================================
// 📥 4. CREAR COMENTARIO
// =====================================================================
export const createCommunityReview = async (data: any) => {
  try {
    // 🛡️ Sanitizamos todo el cuerpo del comentario para evitar inyecciones en el hilo
    const cleanPayload = sanitizePayload(data);

    const newReview = await db.insert(reviews).values(cleanPayload).returning();
    return newReview[0];
  } catch (error: any) { 
    throw new Error(`Error al crear el comentario: ${error.message}`);
  }
};

// =====================================================================
// 🔄 5. PROCESAR VOTO
// =====================================================================
export const handlePostVote = async (postId: string, userId: string, voteType: 'like' | 'dislike') => {
  try {
    const cleanPostId = sanitizeText(postId);
    const cleanUserId = sanitizeText(userId);

    if (!cleanPostId || !cleanUserId) throw new Error("Parámetros de voto inválidos");

    console.log("\n==========================================");
    console.log(`⚙️ [CTRL-VOTO] NUEVA PETICIÓN DE VOTO`);
    console.log("==========================================");

    const targetColName = (countlikes as any).communityId ? 'communityId' : 'relationshipId';
    const targetColumn = (countlikes as any)[targetColName];

    const votosPrevios = await db
      .select()
      .from(countlikes)
      .where(and(eq(targetColumn, cleanPostId), eq(countlikes.userId, cleanUserId)));

    const existingVote = votosPrevios.length > 0 ? votosPrevios[0] : null;
    const hasLiked = existingVote && existingVote.likes === 1;
    const hasDisliked = existingVote && existingVote.dislikes === 1;

    if (voteType === 'like') {
      if (hasLiked) {
        await db.delete(countlikes).where(eq(countlikes.id, existingVote.id));
      } else if (hasDisliked) {
        await db.update(countlikes).set({ likes: 1, dislikes: 0 }).where(eq(countlikes.id, existingVote.id));
      } else {
        await db.insert(countlikes).values({ [targetColName]: cleanPostId, userId: cleanUserId, likes: 1, dislikes: 0 } as any);
      }
    } else if (voteType === 'dislike') {
      if (hasDisliked) {
        await db.delete(countlikes).where(eq(countlikes.id, existingVote.id));
      } else if (hasLiked) {
        await db.update(countlikes).set({ likes: 0, dislikes: 1 }).where(eq(countlikes.id, existingVote.id));
      } else {
        await db.insert(countlikes).values({ [targetColName]: cleanPostId, userId: cleanUserId, likes: 0, dislikes: 1 } as any);
      }
    }

    const allPostVotes = await db.select().from(countlikes).where(eq(targetColumn, cleanPostId));
    let trueLikes = 0;
    let trueDislikes = 0;
    
    allPostVotes.forEach((v: any) => {
      trueLikes += (Number(v.likes) || 0);
      trueDislikes += (Number(v.dislikes) || 0);
    });

    try {
      await db.execute(sql`UPDATE community SET likes = ${trueLikes}, dislikes = ${trueDislikes} WHERE id = ${cleanPostId}`);
    } catch(e: any) {}

    let finalUserVote = null;
    if (voteType === 'like' && !hasLiked) finalUserVote = 'like';
    if (voteType === 'dislike' && !hasDisliked) finalUserVote = 'dislike';

    return {
      success: true,
      likes: trueLikes,     
      dislikes: trueDislikes, 
      userVote: finalUserVote
    };

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO EN VOTO:", error.message);
    throw new Error(`Error en la transacción de voto: ${error.message}`);
  }
};

// =====================================================================
// 🔄 6. ACTUALIZAR POST
// =====================================================================
export const updateCommunityPost = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    // 🛡️ Sanitizamos antes de actualizar
    const cleanPayload = sanitizePayload(data);

    const updated = await db.update(community).set(cleanPayload).where(eq(community.id, cleanId)).returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar la publicación: ${error.message}`);
  }
};

// =====================================================================
// 🗑️ 7. ELIMINAR POST
// =====================================================================
export const deleteCommunityPost = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(community).where(eq(community.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la publicación: ${error.message}`);
  }
};