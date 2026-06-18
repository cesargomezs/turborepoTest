import { Router } from 'express';
import { 
    getLawyers, 
    getLawyerByIdWithReviews, 
    createLawyer, 
    updateLawyer, 
    deleteLawyer,
    renewLawyer,
    createRating
} from '../controllers/lawyers.controller';

const router = Router();

// 🔍 GET: Obtener todos los abogados (Soporta filtrado por ?zip=12345 y ?userId=...)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const userId = req.query.userId as string;
    
    const lawyersList = await getLawyers(zipCode, userId);
    return res.json(lawyersList);
  } catch (error: any) {
    console.error("❌ Error en GET /lawyers:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener abogados' });
  }
});

// 🚀 GET: Obtener un abogado específico (¡ESTA ES LA RUTA QUE USA LA NOTIFICACIÓN!)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lawyer = await getLawyerByIdWithReviews(id);
    
    if (!lawyer) {
      return res.status(404).json({ error: 'Abogado no encontrado' });
    }
    
    return res.json(lawyer);
  } catch (error: any) {
    console.error(`❌ Error en GET /lawyers/${req.params.id}:`, error.message);
    return res.status(500).json({ error: 'Error al obtener el abogado' });
  }
});

// 📥 POST: Crear nuevo abogado (Y registrar el pago inicial)
router.post('/', async (req, res) => {
  try {
    const newLawyer = await createLawyer(req.body);
    return res.status(201).json(newLawyer);
  } catch (error: any) {
    console.error("❌ Error en POST /lawyers:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// ⭐ POST: Crear una nueva calificación/reseña
router.post('/rating', async (req, res) => {
    try {
      const newRating = await createRating(req.body);
      return res.status(201).json(newRating);
    } catch (error: any) {
      console.error("❌ Error en POST /lawyers/rating:", error.message);
      return res.status(400).json({ error: error.message });
    }
});

// 🔄 POST: Renovar un abogado vencido (Registra nuevo pago)
router.post('/:id/renew', async (req, res) => {
    try {
      const { id } = req.params;
      const renewedLawyer = await renewLawyer(id, req.body);
      return res.status(200).json(renewedLawyer);
    } catch (error: any) {
      console.error(`❌ Error en POST /lawyers/${req.params.id}/renew:`, error.message);
      return res.status(400).json({ error: error.message });
    }
});

// 🔄 PUT: Actualizar/Aprobar un abogado (Y disparar Notificación Global)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedLawyer = await updateLawyer(id, req.body);
    
    if (!updatedLawyer) {
       return res.status(404).json({ error: 'Abogado no encontrado o no se pudo actualizar' });
    }
    
    return res.json(updatedLawyer);
  } catch (error: any) {
    console.error(`❌ Error en PUT /lawyers/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un abogado (Para rechazar solicitudes o limpiar BD)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLawyer = await deleteLawyer(id);
    
    if (!deletedLawyer) {
      return res.status(404).json({ error: 'Abogado no encontrado para eliminar' });
    }
    
    return res.json({ message: 'Abogado eliminado correctamente', lawyer: deletedLawyer });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /lawyers/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;