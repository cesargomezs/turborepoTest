import { Router } from 'express';
import { 
  getJobs, 
  getJobById, 
  createJob, 
  updateJob, 
  deleteJob,
  createJobReview,
  renewJob // 🚀 Importamos la nueva función para renovar
} from '../controllers/jobs.controller';

const router = Router();

// 🔍 GET: Obtener todas las ofertas de empleo (Soporta ?zip=12345 y ?userId=...)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const currentUserId = req.query.userId as string; // 🚀 Capturamos userId para identificar al dueño
    
    const jobsList = await getJobs(zipCode, currentUserId);
    return res.status(200).json(jobsList);
  } catch (error: any) {
    console.error("❌ Error en GET /jobs:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener las ofertas de empleo' });
  }
});

// 📥 POST: Crear nueva oferta de empleo
router.post('/', async (req, res) => {
  try {
    const newJob = await createJob(req.body);
    return res.status(201).json(newJob);
  } catch (error: any) {
    console.error("❌ Error en POST /jobs:", error.message);
    
    // 🚀 BLINDAJE: Manejo especial para el código de Zelle/Venmo duplicado
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
});

// 🚀 POST: Crear nueva reseña/opinión para una empresa
// IMPORTANTE: Va ANTES de las rutas con :id para blindar el enrutamiento de Express
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createJobReview(req.body);
    return res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /jobs/reviews:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar Vacante de Empleo (Pago adicional)
// IMPORTANTE: Va antes del GET /:id genérico
router.post('/:id/renew', async (req, res) => {
  try {
    const renewedJob = await renewJob(req.params.id, req.body);
    return res.status(200).json(renewedJob);
  } catch (error: any) {
    console.error(`❌ Error en POST /jobs/${req.params.id}/renew:`, error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una oferta de empleo específica por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getJobById(id);
    if (!item) {
      return res.status(404).json({ error: 'Oferta de empleo no encontrada' });
    }
    return res.status(200).json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /jobs/${req.params.id}:`, error.message);
    return res.status(500).json({ error: 'Error al obtener la oferta de empleo' });
  }
});

// 🔄 PUT: Actualizar oferta de empleo (Ideal para aprobación, meses dinámicos y procesar pagos)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedJob = await updateJob(id, req.body);
    
    if (!updatedJob) {
       return res.status(404).json({ error: 'Oferta de empleo no encontrada o no se pudo actualizar' });
    }
    
    return res.status(200).json(updatedJob);
  } catch (error: any) {
    console.error(`❌ Error en PUT /jobs/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar oferta de empleo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedJob = await deleteJob(id);
    
    if (!deletedJob) {
      return res.status(404).json({ error: 'Oferta de empleo no encontrada' });
    }
    
    return res.status(200).json({ message: 'Oferta de empleo eliminada correctamente', job: deletedJob });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /jobs/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;