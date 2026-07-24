import { Router, Response } from 'express';
import { 
    getTariffs, 
    getTariffById, 
    createTariff, 
    updateTariff, 
    deleteTariff 
} from '../controllers/tariffs.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

const router = Router();

// 🔍 GET: Obtener todas las tarifas (Soporta ?typeCode=Store y ?all=true)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Solución segura para evitar el error string | string[]
    const typeCodeParam = req.query.typeCode;
    const typeCode = typeof typeCodeParam === 'string' ? typeCodeParam : (Array.isArray(typeCodeParam) ? typeCodeParam[0] as string : undefined); 
    
    const onlyActive = req.query.all !== 'true'; 

    const list = await getTariffs(typeCode, onlyActive);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /tariffs:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear una nueva tarifa
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newTariff = await createTariff(payload);
    return res.status(201).json(newTariff);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar precio, descripción o desactivar tarifa
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedTariff = await updateTariff(id, req.body);
    if (!updatedTariff) return res.status(404).json({ error: "Tarifa no encontrada" });
    
    return res.status(200).json(updatedTariff);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar tarifa físicamente de la BD
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedTariff = await deleteTariff(id);
    if (!deletedTariff) return res.status(404).json({ error: "Tarifa no encontrada" });
    
    return res.status(200).json({ message: "Tarifa eliminada", tariff: deletedTariff });
    
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;