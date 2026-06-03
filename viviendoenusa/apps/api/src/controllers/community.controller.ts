import { db } from "../../../../packages/db/src"; 
import { community, reviews } from "../../../../packages/db/src/schema"; 
import { eq, desc } from "drizzle-orm";

// 🔍 1. CONSULTA GENERAL: Obtener posts filtrados por ZIP con sus comentarios anidados
export const getCommunityPosts = async (zip?: string) => {
  try {
    let query = db
      .select()
      .from(community)
      .leftJoin(reviews, eq(reviews.relationshipId, community.id)) // Cruce por relationshipId
      .orderBy(desc(community.id)) // 🚀 AGREGADO: Ordenar del más reciente al más antiguo
      .$dynamic(); 

    // Si viene el ZIP desde el teléfono, filtramos
    if (zip && zip.trim().length === 5) {
      query = query.where(eq(community.zip, String(zip.trim()))); 
    }

    const rows = await query;

    if (!rows || rows.length === 0) return [];

    // Agrupamos por publicación para procesar sus comentarios sin duplicar posts
    const postsMap = new Map<string, any>();

    for (const row of rows) {
      const postId = row.community.id;

      if (!postsMap.has(postId)) {
        postsMap.set(postId, {
          ...row.community,
          zip: row.community.zip ? String(row.community.zip) : null, // Blindaje de tipo
          commentsList: [] // Inicializamos el arreglo de comentarios vacío
        });
      }

      // Si la fila trae un comentario asociado y tiene texto, lo inyectamos al arreglo
      if (row.reviews && row.reviews.comment) {
        postsMap.get(postId).commentsList.push(row.reviews);
      }
    }

    // Convertimos el mapa en un arreglo limpio
    return Array.from(postsMap.values());
  } catch (error) {
    console.error("❌ Error en getCommunityPosts:", error);
    return [];
  }
};

// 🔍 2. CONSULTA INDIVIDUAL: Obtener un post específico por su ID con todos sus comentarios
export const getCommunityPostById = async (id: string) => {
  try {
    const rows = await db
      .select()
      .from(community)
      .leftJoin(reviews, eq(reviews.relationshipId, community.id))
      .where(eq(community.id, id));

    if (!rows || rows.length === 0) return null;

    // Extraemos todos los comentarios descartando nulos o vacíos
    const commentsArray = rows
      .filter(row => row.reviews !== null && row.reviews !== undefined && row.reviews.comment)
      .map(row => row.reviews);

    return {
      ...rows[0].community,
      zip: rows[0].community.zip ? String(rows[0].community.zip) : null,
      commentsList: commentsArray
    };
  } catch (error: any) {
    throw new Error(`Error al obtener la publicación por ID: ${error.message}`);
  }
};

// 📥 3. CREAR POST: Insertar una nueva publicación en la comunidad
export const createCommunityPost = async (data: any) => {
  try {
    const newPost = await db.insert(community).values(data).returning();
    return newPost[0];
  } catch (error: any) { 
    throw new Error(`Error al crear la publicación: ${error.message}`);
  }
};

// 📥 4. CREAR COMENTARIO (REVIEW): Insertar una respuesta en una publicación
export const createCommunityReview = async (data: any) => {
  try {
    const newReview = await db.insert(reviews).values(data).returning();
    return newReview[0];
  } catch (error: any) { 
    throw new Error(`Error al crear el comentario: ${error.message}`);
  }
};

// 🔄 5. ACTUALIZAR POST: Modificar datos (ideal para sumar Likes/Dislikes)
export const updateCommunityPost = async (id: string, data: any) => {
  try {
    const updated = await db
      .update(community)
      .set(data)
      .where(eq(community.id, id))
      .returning();
    return updated[0] || null;
  } catch (error: any) { 
    throw new Error(`Error al actualizar la publicación: ${error.message}`);
  }
};

// 🗑️ 6. ELIMINAR POST: Borrar una publicación de la base de datos
export const deleteCommunityPost = async (id: string) => {
  try {
    const deleted = await db
      .delete(community)
      .where(eq(community.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la publicación: ${error.message}`);
  }
};