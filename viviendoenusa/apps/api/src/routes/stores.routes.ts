import { Router } from 'express';
import { 
    getStores, 
    getStoreById, 
    createStore, 
    updateStore, 
    deleteStore,
    createStoreReview,
    renewStore // 🚀 Función para renovar la tienda
} from '../controllers/stores.controller';

const router = Router();

// 🔍 GET: Obtener todas las tiendas (soporta filtro por código postal)
router.get('/', async (req, res) => {
  try {
    const zip = req.query.zip as string;
    const currentUserId = req.query.userId as string; // Por si envías el userId desde el front
    
    const list = await getStores(zip, currentUserId);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /stores:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear una nueva tienda (valida código de pago único)
router.post('/', async (req, res) => {
  try {
    const newStore = await createStore(req.body);
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
// 🚀 FIX: Cambiado de '/rating' a '/reviews' para que coincida con el Frontend
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createStoreReview(req.body);
    return res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /stores/reviews:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar Tienda (Pago adicional)
// IMPORTANTE: Va antes del GET /:id genérico
router.post('/:id/renew', async (req, res) => {
  try {
    const renewedStore = await renewStore(req.params.id, req.body);
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
router.get('/:id', async (req, res) => {
  try {
    const store = await getStoreById(req.params.id);
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
router.put('/:id', async (req, res) => {
  try {
    const updatedStore = await updateStore(req.params.id, req.body);
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
router.delete('/:id', async (req, res) => {
  try {
    const deletedStore = await deleteStore(req.params.id);
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