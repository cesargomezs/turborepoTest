import { Router, Response } from 'express';
import {
  getCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  createCommunityReview,
  updateCommunityPost,
  deleteCommunityPost,
  handlePostVote 
} from '../controllers/community.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos el middleware de seguridad

const router = Router();

// ==========================================
// 📌 RUTAS ESTÁTICAS (Van siempre primero)
// ==========================================

// 🔍 1. OBTENER TODOS LOS POSTS (con filtro opcional de ZIP)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar el error de string | string[]
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);

    const posts = await getCommunityPosts(zip);
    res.json(posts);
  } catch (error: any) {
    console.error("❌ Error en GET /community:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 📥 2. CREAR UN NUEVO POST
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extraemos y aseguramos el ID del usuario desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newPost = await createCommunityPost(payload);
    res.status(201).json(newPost);
  } catch (error: any) {
    console.error("❌ Error en POST /community:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 📥 3. CREAR UN COMENTARIO (REVIEW)
router.post('/review', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el ID del usuario desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newReview = await createCommunityReview(payload);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /community/review:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 4. PROCESAR UN VOTO (LIKE / DISLIKE) CON RASTREADORES
router.post('/vote', verifyToken, async (req: AuthRequest, res: Response) => {
  //console.log("📥 Petición recibida en /community/vote");
  
  // 🚀 Obtenemos el userId validado por el token de forma segura
  const userIdFromToken = req.user?.id || req.user?.userId;
  const { postId, voteType } = req.body;
  const userId = userIdFromToken || req.body.userId; // Prioriza el token
  
  if (!postId || !userId || !voteType) {
    console.error("❌ Faltan datos en el body de /vote:", req.body);
    return res.status(400).json({ error: "Faltan datos obligatorios (postId, userId, voteType)" });
  }

  try {
    const result = await handlePostVote(postId, userId, voteType);
    res.json(result);
  } catch (error: any) {
    console.error("❌ Error en el controlador de votos:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📌 RUTAS DINÁMICAS (Con /:id - Van al final)
// ==========================================

// 🔍 5. OBTENER UN POST POR SU ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const post = await getCommunityPostById(id);
    if (!post) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }
    res.json(post);
  } catch (error: any) {
    console.error(`❌ Error en GET /community/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 6. ACTUALIZAR UN POST EXISTENTE
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedPost = await updateCommunityPost(id, req.body);
    if (!updatedPost) {
      return res.status(404).json({ error: 'Publicación no encontrada para actualizar' });
    }
    res.json(updatedPost);
  } catch (error: any) {
    console.error(`❌ Error en PUT /community/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ 7. ELIMINAR UN POST
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedPost = await deleteCommunityPost(id);
    if (!deletedPost) {
      return res.status(404).json({ error: 'Publicación no encontrada para eliminar' });
    }
    res.json({ message: 'Publicación eliminada correctamente', post: deletedPost });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /community/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;