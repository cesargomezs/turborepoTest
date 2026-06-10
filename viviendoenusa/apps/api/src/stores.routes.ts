import { Router } from 'express';
import { 
  getStores, 
  getStoreById, 
  createStore, 
  updateStore, 
  deleteStore,
  createStoreReview // 🚀 Importamos la nueva función del controlador
} from './controllers/stores.controller';

const router = Router();

// 🔍 GET: Obtener tiendas (soporta ?zip=12345)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const storesList = await getStores(zipCode);
    res.json(storesList);
  } catch (error: any) {
    console.error("❌ Error en GET /stores:", error.message);
    res.status(500).json({ error: 'Error interno del servidor al obtener tiendas' });
  }
});

// 📥 POST: Crear nueva tienda
router.post('/', async (req, res) => {
  try {
    console.log("📦 Datos recibidos POST /stores:", JSON.stringify(req.body, null, 2));
    const newStore = await createStore(req.body);
    res.status(201).json(newStore);
  } catch (error: any) {
    console.error("❌ Error en POST /stores:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🚀 POST: Crear nueva reseña/opinión para una tienda
// IMPORTANTE: Va ANTES de las rutas con :id para blindar el enrutamiento de Express
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createStoreReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /stores/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una tienda por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getStoreById(id);
    if (!store) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }
    res.json(store);
  } catch (error: any) {
    console.error(`❌ Error en GET /stores/${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Error al obtener la tienda' });
  }
});

// 🔄 PUT: Actualizar una tienda (Ideal para aprobar: { approved: true })
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedStore = await updateStore(id, req.body);
    
    if (!updatedStore) {
       return res.status(404).json({ error: 'Tienda no encontrada o no se pudo actualizar' });
    }
    
    res.json(updatedStore);
  } catch (error: any) {
    console.error(`❌ Error en PUT /stores/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar una tienda
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStore = await deleteStore(id);
    
    if (!deletedStore) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }
    
    res.json({ message: 'Tienda eliminada correctamente', store: deletedStore });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /stores/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;