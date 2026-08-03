import { db } from "../../../../packages/db/src"; 
import { community, reviews, countlikes, users, notifications, userDevices } from "../../../../packages/db/src/schema"; // 🚀 Agregado notifications y userDevices
import { eq, desc, and, sql, inArray } from "drizzle-orm"; 
import { createClient } from '@supabase/supabase-js';
import zipcodes from 'zipcodes'; // 🚀 IMPORTACIÓN DE LA LIBRERÍA DE GEOLOCALIZACIÓN

// =====================================================================
// ☁️ CONFIGURACIÓN DE SUPABASE Y CONSTANTES
// =====================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const radiusMiles = process.env.RADIUMILE || 20; // 🚀 Radio estandarizado a 20 millas
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

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
      console.log("🔕 [PUSH MASIVO COMUNIDAD] Ningún usuario cercano tiene dispositivos registrados.");
      return;
    }

    const messages = devices.map(device => ({
      to: device.expoPushToken,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: "community", referenceId: payload.referenceId },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    console.log(`📱 [PUSH MASIVO COMUNIDAD] Enviando ${messages.length} notificaciones en la zona...`);

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
    console.log(`✅ [PUSH MASIVO COMUNIDAD] ¡Envío completado exitosamente!`);
  } catch (error) {
    console.error("❌ [PUSH MASIVO COMUNIDAD] Error enviando notificaciones:", error);
  }
};

// =====================================================================
// 🔍 1. CONSULTA GENERAL (Con filtro de Zip Code optimizado)
// =====================================================================
export const getCommunityPosts = async (zip?: string) => {
  try {
    const cleanZip = zip ? sanitizeText(String(zip)) : null;

    if (zip && (!cleanZip || cleanZip.length !== 5)) {
      return []; 
    }

    let query = db
      .select({
        community: community,
        reviews: reviews,
        users: users,
      })
      .from(community)
      .leftJoin(reviews, eq(reviews.relationshipId, community.id)) 
      .leftJoin(users, eq(reviews.userId, users.id)) 
      .$dynamic(); 

    // 🚀 Lógica de Geofencing Súper Rápida
    if (cleanZip) {
      const nearbyZips = zipcodes.radius(cleanZip as any, Number(radiusMiles)); 

      if (nearbyZips && nearbyZips.length > 0) {
        query = query.where(inArray(community.zip, nearbyZips as string[]));
      } else {
        query = query.where(eq(community.zip, cleanZip));
      }
    } 
    
    query = query.orderBy(desc(community.id));

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
        const nombreUsuario = usr?.name + ' ' + (usr?.lastName ? usr.lastName.substring(0, 1) : '') || 'Usuario Anónimo';

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
          userName: usr?.name + ' ' + (usr?.lastName ? usr.lastName.substring(0, 1) : '') || 'Usuario Anónimo'
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
// 📥 3. CREAR POST (CON GEOLOCALIZACIÓN AUTOMÁTICA Y PUSH)
// =====================================================================
export const createCommunityPost = async (data: any) => {
  try {
    const cleanPayload = sanitizePayload(data);

    // 🚀 VALIDACIÓN ESTRICTA DEL USER_ID
    const validUserId = sanitizeText(cleanPayload.userId);
    if (!validUserId) {
      throw new Error("El ID del usuario es obligatorio para crear una publicación en la comunidad.");
    }

    // 🚀 OBTENEMOS LAS COORDENADAS SÍNCRONAS
    const { lat, lng } = getCoordsFromZip(cleanPayload.zip || '');
    
    cleanPayload.lat = cleanPayload.lat ? Number(cleanPayload.lat) : lat;
    cleanPayload.lng = cleanPayload.lng ? Number(cleanPayload.lng) : lng;

    if (cleanPayload.imageUrl && cleanPayload.imageUrl.startsWith('community/')) {
      cleanPayload.imageUrl = cleanPayload.imageUrl.replace('community/', '');
    }

    let pushNotificationData: any = null;

    const createdPostResult = await db.transaction(async (tx) => {
      const newPost = await tx.insert(community).values(cleanPayload).returning();
      const postRecord = newPost[0];

      // 🚀 NOTIFICACIONES MASIVAS (GEOFENCING 20 MILLAS)
      console.log("✅ [DEBUG PUSH COMUNIDAD] Post creado. Calculando usuarios en zona...");

      const titleText = "¡Nueva publicación en tu comunidad! 🏘️";
      
      const rawText = cleanPayload.text || cleanPayload.textContent || cleanPayload.text_content || 'Alguien ha compartido algo nuevo en tu área.';
      const bodyText = rawText.length > 40 ? rawText.substring(0, 40) + '...' : rawText;
      
      let usersToNotify: { id: string }[] = [];

      if (cleanPayload.zip) {
        const nearbyZips = zipcodes.radius(cleanPayload.zip as any, Number(radiusMiles)); 

        if (nearbyZips && nearbyZips.length > 0) {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(inArray(users.zip, nearbyZips as string[]), sql`${users.id} != ${validUserId}`)); 
        } else {
          usersToNotify = await tx.select({ id: users.id })
                                  .from(users)
                                  .where(and(eq(users.zip, String(cleanPayload.zip)), sql`${users.id} != ${validUserId}`));
        }
      }

      if (usersToNotify.length > 0) {
        const notificationsToInsert = usersToNotify.map(u => {
          const payload: any = {
            title: titleText,
            description: bodyText,
            type: "community", 
            visibleAt: new Date(), 
            userId: u.id,
            isRead: false
          };
          if ('referenceId' in notifications) payload.referenceId = String(postRecord.id);
          else if ('reference_id' in notifications) payload.reference_id = String(postRecord.id);
          return payload;
        });

        await tx.insert(notifications).values(notificationsToInsert);

        pushNotificationData = {
          title: titleText,
          body: bodyText,
          referenceId: String(postRecord.id),
          userIds: usersToNotify.map(u => u.id) 
        };
      }

      return postRecord;
    });

    // 🚀 ENVÍO PUSH FUERA DE LA TRANSACCIÓN
    if (pushNotificationData) {
      sendMassPushNotification(pushNotificationData).catch(err => {
         console.error("❌ [DEBUG PUSH] Falló el Push Notification de la comunidad:", err);
      });
    }

    return createdPostResult;

  } catch (error: any) { 
    throw new Error(`Error al crear la publicación: ${error.message}`);
  }
};

// =====================================================================
// 📥 4. CREAR COMENTARIO
// =====================================================================
export const createCommunityReview = async (data: any) => {
  try {
    const cleanPayload = sanitizePayload(data);

    // 🚀 VALIDACIÓN ESTRICTA
    const validUserId = sanitizeText(cleanPayload.userId);
    if (!validUserId) {
        throw new Error("No estás autorizado para comentar. Se requiere iniciar sesión.");
    }

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

    // 🚀 VALIDACIÓN ESTRICTA
    if (!cleanUserId) {
      throw new Error("Debes iniciar sesión para votar en una publicación.");
    }
    if (!cleanPostId) throw new Error("Parámetros de voto inválidos.");

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