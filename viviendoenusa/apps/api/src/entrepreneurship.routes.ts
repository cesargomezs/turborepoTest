import { Router } from 'express';
import { 
  getEntrepreneurships, 
  getEntrepreneurshipById, 
  createEntrepreneurship, 
  updateEntrepreneurship, 
  deleteEntrepreneurship,
  createEntrepreneurshipReview // 🚀 1. Importamos la nueva función para reseñas
} from './controllers/entrepreneurship.controller'; // Nota: Usa '../' si este archivo está dentro de la carpeta 'routes'

const router = Router();

// 🔍 GET: Obtener emprendimientos (soporta ?zip=12345)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const itemsList = await getEntrepreneurships(zipCode);
    res.json(itemsList);
  } catch (error: any) {
    console.error("❌ Error en GET /entrepreneurship:", error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📥 🚀 POST: Crear reseña para un emprendimiento
// (Lo colocamos aquí arriba para que no haya conflictos con la ruta /:id)
router.post('/reviews', async (req, res) => {
  try {
    console.log("📝 Recibiendo reseña:", req.body);
    const newReview = await createEntrepreneurshipReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getEntrepreneurshipById(id);
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
router.post('/', async (req, res) => {
  try {
    console.log("📦 Datos recibidos POST /entrepreneurship:", JSON.stringify(req.body, null, 2));
    const newItem = await createEntrepreneurship(req.body);
    res.status(201).json(newItem);
  } catch (error: any) {
    console.error("❌ Error en POST /entrepreneurship:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar (ej. { verified: true })
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

export default router;