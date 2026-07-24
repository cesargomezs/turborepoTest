import { Router, Response } from 'express';
import { 
  getJobs, 
  getJobById, 
  createJob, 
  updateJob, 
  deleteJob,
  createJobReview
} from '../controllers/jobs.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos seguridad

const router = Router();

// 🔍 GET: Obtener todas las ofertas de empleo
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar string | string[]
    const zipParam = req.query.zip;
    const zipCode = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined); 
    
    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined); 
    
    // 🚀 Priorizamos el userId validado del token
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;

    const jobsList = await getJobs(zipCode, currentUserId);
    return res.status(200).json(jobsList);
  } catch (error: any) {
    console.error("❌ Error en GET /jobs:", error.message);
    return res.status(500).json({ error: 'Error interno al obtener ofertas' });
  }
});

// 📥 POST: Crear vacante (Ahora auto-aprobada si la empresa es Premium)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el creador desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newJob = await createJob(payload);
    return res.status(201).json(newJob);
  } catch (error: any) {
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// ⭐ POST: Crear reseña (Bloqueo inteligente por compañía)
router.post('/reviews', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el autor desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newReview = await createJobReview(payload);
    return res.status(201).json(newReview);
  } catch (error: any) {
    if (error.message === "ALREADY_REVIEWED") {
       return res.status(409).json({ error: "Ya calificaste a esta empresa anteriormente." });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una vacante específica
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const item = await getJobById(id);
    if (!item) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar vacante
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedJob = await updateJob(id, req.body);
    if (!updatedJob) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json(updatedJob);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar vacante
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedJob = await deleteJob(id);
    if (!deletedJob) return res.status(404).json({ error: 'Oferta no encontrada' });
    return res.status(200).json({ message: 'Oferta eliminada correctamente' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;