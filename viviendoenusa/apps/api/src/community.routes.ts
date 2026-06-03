import { Router } from "express";
import { 
  getCommunityPosts, 
  getCommunityPostById,
  createCommunityPost,
  createCommunityReview,
  updateCommunityPost,
  deleteCommunityPost
} from "./controllers/community.controller";

const router = Router();

// 🔍 1. GET: Obtener todos los posts (soporta filtro ?zip=90210)
router.get("/", async (req, res) => {
    try {
      // Capturamos el código postal de la URL si el usuario lo envía
      const { zip } = req.query; 
      const data = await getCommunityPosts(zip as string);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
});

// 🔍 2. GET: Obtener un post individual por su ID
router.get("/:id", async (req, res) => {
    try {
      const data = await getCommunityPostById(req.params.id);
      if (!data) return res.status(404).json({ message: "Post no encontrado" });
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
});

// 📥 3. POST: Crear una nueva publicación en la comunidad
router.post("/", async (req, res) => {
    try {
      const newPost = await createCommunityPost(req.body);
      return res.status(201).json(newPost);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
});

// 📥 4. POST: Agregar un comentario a una publicación (En la tabla reviews)
router.post("/review", async (req, res) => {
    try {
      const newReview = await createCommunityReview(req.body);
      return res.status(201).json(newReview);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
});

// 🔄 5. PUT: Actualizar un post (Usado para sumar Likes / Dislikes desde el frontend)
router.put("/:id", async (req, res) => {
    try {
      const updatedPost = await updateCommunityPost(req.params.id, req.body);
      if (!updatedPost) return res.status(404).json({ message: "Post no encontrado" });
      return res.status(200).json(updatedPost);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
});

// 🗑️ 6. DELETE: Eliminar un post (Útil para moderación o si el usuario quiere borrar su post)
router.delete("/:id", async (req, res) => {
    try {
      const deletedPost = await deleteCommunityPost(req.params.id);
      if (!deletedPost) return res.status(404).json({ message: "Post no encontrado" });
      return res.status(200).json({ message: "Post eliminado con éxito", deleted: deletedPost });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
});

export default router;