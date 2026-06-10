import { Router } from 'express';
import { 
  getJobs, 
  getJobById, 
  createJob, 
  updateJob, 
  deleteJob,
  createJobReview // 🚀 Importamos la función
} from './controllers/jobs.controller';

const router = Router();

// 🔍 GET: Obtener empleos (soporta ?zip=12345)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const itemsList = await getJobs(zipCode);
    res.json(itemsList);
  } catch (error: any) {
    console.error("❌ Error en GET /jobs:", error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📥 🚀 POST: Crear reseña para un empleo
router.post('/reviews', async (req, res) => {
  try {
    console.log("📝 Recibiendo reseña de empleo:", req.body);
    const newReview = await createJobReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /jobs/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getJobById(id);
    if (!item) {
      return res.status(404).json({ error: 'Empleo no encontrado' });
    }
    res.json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /jobs/${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Error al obtener el empleo' });
  }
});

// 📥 POST: Crear nuevo empleo
router.post('/', async (req, res) => {
  try {
    console.log("📦 Datos recibidos POST /jobs:", JSON.stringify(req.body, null, 2));
    const newItem = await createJob(req.body);
    res.status(201).json(newItem);
  } catch (error: any) {
    console.error("❌ Error en POST /jobs:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedItem = await updateJob(id, req.body);
    
    if (!updatedItem) {
       return res.status(404).json({ error: 'Empleo no encontrado o no se pudo actualizar' });
    }
    
    res.json(updatedItem);
  } catch (error: any) {
    console.error(`❌ Error en PUT /jobs/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await deleteJob(id);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Empleo no encontrado' });
    }
    
    res.json({ message: 'Eliminado correctamente', item: deletedItem });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /jobs/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;