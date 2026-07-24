import { Router, Response } from 'express';
import { 
    getStores, 
    getStoreById, 
    createStore, 
    updateStore, 
    deleteStore,
    createStoreReview,
    renewStore 
} from '../controllers/stores.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos la seguridad

const router = Router();

// 🔍 GET: Obtener todas las tiendas (soporta filtro por código postal)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar string | string[]
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);
    
    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    
    // 🚀 Priorizamos el ID del token, pero aceptamos el de la query para vistas específicas
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;
    
    const list = await getStores(zip, currentUserId);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /stores:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear una nueva tienda (valida código de pago único)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extraemos e inyectamos el userId validado desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newStore = await createStore(payload);
    return res.status(201).json(newStore);
  } catch (error: any) {
    console.error("❌ Error en POST /stores:", error.message);
    
    // 🚀 BLINDAJE: Manejo especial para el código de Zelle/Venmo duplicado
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
});

// ⭐ POST: Crear una reseña/rating para una tienda
router.post('/reviews', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Aseguramos que la reseña pertenezca al usuario del token
    const userIdFromToken = req.user?.id || req.user?.userId;
    
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newReview = await createStoreReview(payload);
    return res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /stores/reviews:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar Tienda (Pago adicional)
// IMPORTANTE: Va antes del GET /:id genérico
router.post('/:id/renew', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID de la tienda
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    // 🚀 Inyectamos el usuario desde el token por seguridad
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const renewedStore = await renewStore(id, payload);
    return res.status(200).json(renewedStore);
  } catch (error: any) {
    console.error(`❌ Error en POST /stores/${req.params.id}/renew:`, error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una tienda específica por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const store = await getStoreById(id);
    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }
    return res.status(200).json(store);
  } catch (error: any) {
    console.error("❌ Error en GET /stores/:id :", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar una tienda (Aprobar, meses dinámicos y procesar pagos)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedStore = await updateStore(id, req.body);
    if (!updatedStore) {
      return res.status(404).json({ error: "Tienda no encontrada o no se pudo actualizar" });
    }
    return res.status(200).json(updatedStore);
  } catch (error: any) {
    console.error("❌ Error en PUT /stores/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar una tienda
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedStore = await deleteStore(id);
    if (!deletedStore) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }
    return res.status(200).json({ message: "Tienda eliminada correctamente", store: deletedStore });
  } catch (error: any) {
    console.error("❌ Error en DELETE /stores/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;