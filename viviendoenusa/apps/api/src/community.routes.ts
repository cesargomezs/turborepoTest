import { Router } from 'express';
import {
  getCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  createCommunityReview,
  updateCommunityPost,
  deleteCommunityPost,
  handlePostVote // 🚀 Importamos nuestra nueva función de votos
} from './controllers/community.controller';

const router = Router();

// ==========================================
// 📌 RUTAS ESTÁTICAS (Van siempre primero)
// ==========================================

// 🔍 1. OBTENER TODOS LOS POSTS (con filtro opcional de ZIP)
router.get('/', async (req, res) => {
  try {
    const zip = req.query.zip as string | undefined;
    const posts = await getCommunityPosts(zip);
    res.json(posts);
  } catch (error: any) {
    console.error("❌ Error en GET /community:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 📥 2. CREAR UN NUEVO POST
router.post('/', async (req, res) => {
  try {
    const newPost = await createCommunityPost(req.body);
    res.status(201).json(newPost);
  } catch (error: any) {
    console.error("❌ Error en POST /community:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 📥 3. CREAR UN COMENTARIO (REVIEW)
router.post('/review', async (req, res) => {
  try {
    const newReview = await createCommunityReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /community/review:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 4. PROCESAR UN VOTO (LIKE / DISLIKE) CON RASTREADORES
router.post('/vote', async (req, res) => {
  console.log("📥 Petición recibida en /community/vote");
  const { postId, userId, voteType } = req.body;
  
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
router.get('/:id', async (req, res) => {
  try {
    const post = await getCommunityPostById(req.params.id);
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
router.put('/:id', async (req, res) => {
  try {
    const updatedPost = await updateCommunityPost(req.params.id, req.body);
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
router.delete('/:id', async (req, res) => {
  try {
    const deletedPost = await deleteCommunityPost(req.params.id);
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