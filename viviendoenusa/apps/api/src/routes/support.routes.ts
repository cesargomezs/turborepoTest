import { Router, Response } from 'express';
import { 
  getSupports, 
  getSupportById, 
  createSupport, 
  updateSupport, 
  deleteSupport,
  createSupportReview 
} from '../controllers/support.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

const router = Router();

// 🔍 GET: Obtener todos los registros de soporte (Soporta ?zip=12345)
// Nota: verifyToken aquí validará el header si se requiere estrictamente sesión, 
// o puedes omitirlo si el listado es público. Lo dejamos protegido según la regla solicitada.
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const zipParam = req.query.zip;
    const zipCode = typeof zipParam === 'string' ? zipParam : undefined; 
    
    const supportList = await getSupports(zipCode);
    res.json(supportList);
  } catch (error: any) {
    console.error("❌ Error en GET /support:", error.message);
    res.status(500).json({ error: 'Error interno del servidor al obtener registros de soporte' });
  }
});

// 📥 POST: Sugerir/Crear nuevo registro de soporte (Requiere Token en Header)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🛡️ Si el middleware verifyToken falla o no hay usuario, retornará 401 automáticamente desde el middleware.
    // Extraemos el ID del usuario directamente del token decodificado
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    console.log("📦 Datos enviados a createSupport con Usuario:", JSON.stringify(payload, null, 2));
    
    const newSupport = await createSupport(payload);
    res.status(201).json(newSupport);
  } catch (error: any) {
    console.error("❌ Error en POST /support:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🚀 POST: Crear nueva reseña/opinión para un registro de soporte
router.post('/reviews', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newReview = await createSupportReview(payload);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /support/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un registro de soporte específico por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const item = await getSupportById(id);
    if (!item) {
      return res.status(404).json({ error: 'Registro de soporte no encontrado' });
    }
    res.json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /support/${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Error al obtener el registro de soporte' });
  }
});

// 🔄 PUT: Actualizar un registro de soporte
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedSupport = await updateSupport(id, req.body);
    
    if (!updatedSupport) {
       return res.status(404).json({ error: 'Registro de soporte no encontrado o no se pudo actualizar' });
    }
    
    res.json(updatedSupport);
  } catch (error: any) {
    console.error(`❌ Error en PUT /support/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un registro de soporte
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedSupport = await deleteSupport(id);
    
    if (!deletedSupport) {
      return res.status(404).json({ error: 'Registro de soporte no encontrado' });
    }
    
    res.json({ message: 'Registro de soporte eliminado correctamente', support: deletedSupport });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /support/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;