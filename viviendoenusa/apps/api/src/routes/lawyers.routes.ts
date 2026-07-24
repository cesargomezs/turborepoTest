import { Router, Response } from 'express';
import { 
    getLawyers, 
    getLawyerByIdWithReviews, 
    createLawyer, 
    updateLawyer, 
    deleteLawyer,
    createRating,
    renewLawyer
} from '../controllers/lawyers.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos el middleware y AuthRequest

const router = Router();

// 🔍 GET: Obtener todos los abogados (soporta filtro por código postal y por usuario)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // Validación segura para evitar string | string[]
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);

    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;
    
    const list = await getLawyers(zip, currentUserId);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /lawyers:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un abogado específico por ID (incluyendo sus reseñas)
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const lawyer = await getLawyerByIdWithReviews(id);
    if (!lawyer) {
      return res.status(404).json({ error: "Abogado no encontrado" });
    }
    return res.status(200).json(lawyer);
  } catch (error: any) {
    console.error("❌ Error en GET /lawyers/:id :", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear un nuevo registro de abogado (Inyecta automáticamente el userId del token)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newLawyer = await createLawyer(payload);
    return res.status(201).json(newLawyer);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers:", error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar un abogado (Aprobar y calcular tarifa dinámica)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedLawyer = await updateLawyer(id, req.body);
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
router.post('/rating', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newRating = await createRating(payload);
    return res.status(201).json(newRating);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers/rating:", error.message);
    if (error.message.includes("ya ha publicado")) {
        return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar un abogado expirado (Genera nuevo pago)
router.post('/:id/renew', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const renewedLawyer = await renewLawyer(id, req.body);
    return res.status(200).json(renewedLawyer);
  } catch (error: any) {
    console.error("❌ Error en POST /layers/:id/renew :", error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un abogado
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedLawyer = await deleteLawyer(id);
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