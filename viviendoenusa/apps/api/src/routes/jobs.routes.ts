import { Router } from 'express';
import { 
  getJobs, 
  getJobById, 
  createJob, 
  updateJob, 
  deleteJob,
  createJobReview
} from '../controllers/jobs.controller';

const router = Router();

// 🔍 GET: Obtener todas las ofertas de empleo
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const currentUserId = req.query.userId as string; 
    const jobsList = await getJobs(zipCode, currentUserId);
    return res.status(200).json(jobsList);
  } catch (error: any) {
    console.error("❌ Error en GET /jobs:", error.message);
    return res.status(500).json({ error: 'Error interno al obtener ofertas' });
  }
});

// 📥 POST: Crear vacante (Ahora auto-aprobada si la empresa es Premium)
router.post('/', async (req, res) => {
  try {
    const newJob = await createJob(req.body);
    return res.status(201).json(newJob);
  } catch (error: any) {
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// ⭐ POST: Crear reseña (Bloqueo inteligente por compañía)
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createJobReview(req.body);
    return res.status(201).json(newReview);
  } catch (error: any) {
    if (error.message === "ALREADY_REVIEWED") {
       return res.status(409).json({ error: "Ya calificaste a esta empresa anteriormente." });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una vacante específica
router.get('/:id', async (req, res) => {
  try {
    const item = await getJobById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar vacante
router.put('/:id', async (req, res) => {
  try {
    const updatedJob = await updateJob(req.params.id, req.body);
    if (!updatedJob) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json(updatedJob);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar vacante
router.delete('/:id', async (req, res) => {
  try {
    const deletedJob = await deleteJob(req.params.id);
    if (!deletedJob) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json({ message: 'Oferta eliminada correctamente' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;