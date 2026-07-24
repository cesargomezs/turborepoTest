import { Router, Response } from 'express';
import { 
    getEvents, 
    getEventById, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} from '../controllers/events.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos el middleware de seguridad

const router = Router();

// 🔍 GET: Obtener todos los eventos (soporta filtro por código postal)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar el error string | string[]
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);
    
    const list = await getEvents(zip);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /events:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un evento específico por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const event = await getEventById(id);
    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    return res.status(200).json(event);
  } catch (error: any) {
    console.error("❌ Error en GET /events/:id :", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear un nuevo evento (valida código de pago único e inyecta userId)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extraemos y aseguramos el ID del usuario desde el token
    const userIdFromToken = req.user?.id || req.user?.userId;
    
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newEvent = await createEvent(payload);
    return res.status(201).json(newEvent);
  } catch (error: any) {
    console.error("❌ Error en POST /events:", error.message);
    
    // 🚀 BLINDAJE: Manejo especial para el código de Zelle/Venmo duplicado
    if (error.message.includes("utilizado") || error.message.includes("unique")) {
       return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar un evento (Aprobar y disparar notificaciones/tarifas dinámicas)
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
    console.error("❌ Error en PUT /events/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un evento
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedEvent = await deleteEvent(id);
    if (!deletedEvent) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    return res.status(200).json({ message: "Evento eliminado correctamente", event: deletedEvent });
  } catch (error: any) {
    console.error("❌ Error en DELETE /events/:id :", error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;