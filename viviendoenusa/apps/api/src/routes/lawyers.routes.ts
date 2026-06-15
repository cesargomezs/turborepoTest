import { Router } from 'express';
import { 
  getLawyers, 
  getLawyerByIdWithReviews, 
  createLawyer, 
  updateLawyer, 
  createRating, 
  deleteLawyer, 
  renewLawyer 
} from '../controllers/lawyers.controller';

const router = Router();

// 🔍 OBTENER TODOS LOS ABOGADOS (Soporta filtrado por Zip y paso opcional de userId)
router.get('/', async (req, res) => {
  try {
    const zip = req.query.zip as string;
    const userId = req.query.userId as string; // Captura el ID enviado por el frontend
    
    const result = await getLawyers(zip, userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 OBTENER ABOGADO POR ID CON SUS RESEÑAS
router.get('/:id', async (req, res) => {
  try {
    const result = await getLawyerByIdWithReviews(req.params.id);
    if (!result) return res.status(404).json({ error: "Abogado no encontrado" });
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 📥 CREAR UN NUEVO ABOGADO (Y SU PRIMER PAGO PENDIENTE)
router.post('/', async (req, res) => {
  try {
    const result = await createLawyer(req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 ACTUALIZAR/APROBAR ABOGADO (Cálculo de fechas y estado de pago)
router.put('/:id', async (req, res) => {
  try {
    const result = await updateLawyer(req.params.id, req.body);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🚀 CREAR UNA CALIFICACIÓN Y RESEÑA (Doble Insert en el controlador)
router.post('/rating', async (req, res) => {
  try {
    const result = await createRating(req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🗑️ ELIMINAR UN ABOGADO
router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteLawyer(req.params.id);
    if (!result) return res.status(404).json({ error: "No se encontró el abogado a eliminar" });
    return res.json({ message: "Abogado eliminado con éxito", result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 RENOVAR PUBLICACIÓN VENCIDA (Genera nuevo historial de pago y pasa approved a false)
router.post('/:id/renew', async (req, res) => {
  try {
    const result = await renewLawyer(req.params.id, req.body);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;