import { Router, Response } from 'express';
import { 
  getEntrepreneurships, 
  getEntrepreneurshipById, 
  createEntrepreneurship, 
  updateEntrepreneurship, 
  deleteEntrepreneurship,
  createEntrepreneurshipReview, 
  voteEntrepreneurship,          
  getEntrepreneurshipsByIds
} from '../controllers/entrepreneurship.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos seguridad

const router = Router();

// 🔍 GET: Obtener emprendimientos (soporta ?zip=12345)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar string | string[]
    const zipParam = req.query.zip;
    const zipCode = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined); 
    
    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    
    // 🚀 Priorizamos el userId validado del token
    const userId = req.user?.id || req.user?.userId || queryUserId;

    const itemsList = await getEntrepreneurships(zipCode, userId);
    res.json(itemsList);
  } catch (error: any) {
    console.error("❌ Error en GET /entrepreneurship:", error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📥 🚀 POST: Crear reseña para un emprendimiento
router.post('/reviews', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el ID del usuario directamente desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    console.log("📝 Recibiendo reseña:", payload);
    const newReview = await createEntrepreneurshipReview(payload);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 👍 🚀 POST: Registrar Voto (Me gusta / No me gusta)
router.post('/vote', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Aseguramos que el voto se registre a nombre del usuario autenticado
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    console.log("👍 Recibiendo voto:", payload);
    const result = await voteEntrepreneurship(payload);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship/vote:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    
    // 🚀 Usamos el token como prioridad
    const userId = req.user?.id || req.user?.userId || queryUserId;

    const item = await getEntrepreneurshipById(id, userId);
    if (!item) {
      return res.status(404).json({ error: 'Emprendimiento no encontrado' });
    }
    res.json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /entrepreneurship/${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Error al obtener el emprendimiento' });
  }
});

// 📥 POST: Crear nuevo emprendimiento
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el creador desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    console.log("📦 Datos recibidos POST /entrepreneurship:", JSON.stringify(payload, null, 2));
    const newItem = await createEntrepreneurship(payload);
    res.status(201).json(newItem);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar (ej. { verified: true })
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedItem = await updateEntrepreneurship(id, req.body);
    
    if (!updatedItem) {
       return res.status(404).json({ error: 'Emprendimiento no encontrado o no se pudo actualizar' });
    }
    
    res.json(updatedItem);
  } catch (error: any) {
    console.error(`❌ Error en PUT /entrepreneurship/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedItem = await deleteEntrepreneurship(id);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Emprendimiento no encontrado' });
    }
    
    res.json({ message: 'Eliminado correctamente', item: deletedItem });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /entrepreneurship/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🚀 POST: Cargar elementos guardados
router.post('/batch', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Forzamos el userId del token para proteger la privacidad de los guardados
    const userIdFromToken = req.user?.id || req.user?.userId;
    const userId = userIdFromToken || req.body.userId;

    const { ids } = req.body;
    const items = await getEntrepreneurshipsByIds(ids, userId);
    res.json(items);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship/batch:", error.message);
    res.status(500).json({ error: 'Error al cargar guardados' });
  }
});

export default router;