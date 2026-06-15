import { Router } from 'express';
// 🚀 Asegúrate de que la ruta de importación coincida con la ubicación de tu controlador
import { 
    getJobs, 
    getJobById, 
    createJob, 
    updateJob, 
    deleteJob, 
    createJobReview 
} from '../controllers/jobs.controller'; 

const router = Router();

// 🔍 1. Obtener todos los empleos (Con filtro ZIP opcional)
// Ruta: GET /jobs?zip=12345
router.get('/', async (req, res) => {
  try {
    const { zip } = req.query;
    const jobsList = await getJobs(zip as string);
    res.status(200).json(jobsList);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al obtener los empleos' });
  }
});

// 📥 6. Crear reseña para un empleo
// ⚠️ IMPORTANTE: Esta ruta va ANTES de /:id para que Express no confunda "reviews" con un ID de empleo
// Ruta: POST /jobs/reviews
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createJobReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    // 🚀 Aquí atrapamos el error exacto que lanzamos desde el controlador
    if (error.message === "ALREADY_REVIEWED") {
      return res.status(400).json({ message: "ALREADY_REVIEWED" });
    }
    res.status(500).json({ message: error.message || 'Error al guardar la reseña' });
  }
});

// 🔍 2. Obtener un empleo individual por ID
// Ruta: GET /jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getJobById(id);
    
    if (!job) {
      return res.status(404).json({ message: 'Empleo no encontrado' });
    }
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al obtener el empleo' });
  }
});

// 📥 3. Crear un nuevo empleo
// Ruta: POST /jobs
router.post('/', async (req, res) => {
  try {
    const newJob = await createJob(req.body);
    res.status(201).json(newJob);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al crear el empleo' });
  }
});

// 🔄 4. Actualizar un empleo (Ej. Aprobarlo)
// Ruta: PUT /jobs/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedJob = await updateJob(id, req.body);
    
    if (!updatedJob) {
      return res.status(404).json({ message: 'Empleo no encontrado para actualizar' });
    }
    res.status(200).json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al actualizar el empleo' });
  }
});

// 🗑️ 5. Eliminar un empleo (Rechazar)
// Ruta: DELETE /jobs/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedJob = await deleteJob(id);
    
    if (!deletedJob) {
      return res.status(404).json({ message: 'Empleo no encontrado para eliminar' });
    }
    res.status(200).json({ message: 'Empleo eliminado correctamente', job: deletedJob });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error al eliminar el empleo' });
  }
});

export default router;