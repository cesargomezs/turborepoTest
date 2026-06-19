import { Router } from 'express';
import { 
    getLawyers, 
    getLawyerByIdWithReviews, 
    createLawyer, 
    updateLawyer, 
    deleteLawyer,
    createRating,
    renewLawyer
} from '../controllers/lawyers.controller';

const router = Router();

// 🔍 GET: Obtener todos los abogados (soporta filtro por código postal y por usuario)
router.get('/', async (req, res) => {
  try {
    const zip = req.query.zip as string;
    const userId = req.query.userId as string; // Para el panel de control (mis abogados)
    
    const list = await getLawyers(zip, userId);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /lawyers:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un abogado específico por ID (incluyendo sus reseñas)
router.get('/:id', async (req, res) => {
  try {
    const lawyer = await getLawyerByIdWithReviews(req.params.id);
    if (!lawyer) {
      return res.status(404).json({ error: "Abogado no encontrado" });
    }
    return res.status(200).json(lawyer);
  } catch (error: any) {
    console.error("❌ Error en GET /lawyers/:id :", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear un nuevo registro de abogado (con o sin pago)
router.post('/', async (req, res) => {
  try {
    const newLawyer = await createLawyer(req.body);
    return res.status(201).json(newLawyer);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers:", error.message);
    // Manejo especial para el código de Zelle duplicado
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar un abogado (Aprobar y calcular tarifa dinámica)
router.put('/:id', async (req, res) => {
  try {
    const updatedLawyer = await updateLawyer(req.params.id, req.body);
    if (!updatedLawyer) {
      return res.status(404).json({ error: "Abogado no encontrado o no se pudo actualizar" });
    }
    return res.status(200).json(updatedLawyer);
  } catch (error: any) {
    console.error("❌ Error en PUT /lawyers/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// ⭐ POST: Crear una reseña/calificación para un abogado
router.post('/rating', async (req, res) => {
  try {
    const newRating = await createRating(req.body);
    return res.status(201).json(newRating);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers/rating:", error.message);
    // Manejo especial si el usuario ya reseñó
    if (error.message.includes("ya ha publicado")) {
        return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar un abogado expirado (Genera nuevo pago)
router.post('/:id/renew', async (req, res) => {
  try {
    const renewedLawyer = await renewLawyer(req.params.id, req.body);
    return res.status(200).json(renewedLawyer);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers/:id/renew :", error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un abogado
router.delete('/:id', async (req, res) => {
  try {
    const deletedLawyer = await deleteLawyer(req.params.id);
    if (!deletedLawyer) {
      return res.status(404).json({ error: "Abogado no encontrado" });
    }
    return res.status(200).json({ message: "Abogado eliminado correctamente", lawyer: deletedLawyer });
  } catch (error: any) {
    console.error("❌ Error en DELETE /lawyers/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;