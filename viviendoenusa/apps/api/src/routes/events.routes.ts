import { Router, Response } from 'express';
import { 
    getEvents, 
    getEventById, 
    createEvent, 
    updateEvent, 
    createEventReview, 
    reportContent      
} from '../controllers/events.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; 

const router = Router();

// ==========================================
// 📌 RUTAS ESTÁTICAS (Van siempre primero)
// ==========================================

// 🔍 GET: Obtener todos los eventos (soporta filtro por código postal)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);
    const userId = req.query.userId as string; 
    
    const list = await getEvents(zip, userId);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /events:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear un nuevo evento
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;
    
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newEvent = await createEvent(payload);
    return res.status(201).json(newEvent);
  } catch (error: any) {
    console.error("❌ Error en POST /events:", error.message);
    
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
});

// 📥 POST: Crear una reseña de evento
router.post('/reviews', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newReview = await createEventReview(payload);
    return res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /events/reviews:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🚨 POST: Reportar evento o reseña
router.post('/reports', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const result = await reportContent(payload);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("❌ Error en POST /events/reports:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 📌 RUTAS DINÁMICAS (Con /:id - Van al final)
// ==========================================

// 🔍 GET: Obtener un evento específico por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const event = await getEventById(id);
    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    return res.status(200).json(event);
  } catch (error: any) {
    console.error(`❌ Error en GET /events/${req.params.id}:`, error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar o Renovar un evento (Mantiene reseñas y genera un nuevo pago en estado pendiente)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedEvent = await updateEvent(id, req.body);
    if (!updatedEvent) {
      return res.status(404).json({ error: "Evento no encontrado o no se pudo actualizar" });
    }
    return res.status(200).json(updatedEvent);
  } catch (error: any) {
    console.error(`❌ Error en PUT /events/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;