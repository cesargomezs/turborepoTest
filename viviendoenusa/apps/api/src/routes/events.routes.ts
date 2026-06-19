import { Router } from 'express';
import { 
    getEvents, 
    getEventById, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} from '../controllers/events.controller';

const router = Router();

// 🔍 GET: Obtener todos los eventos (soporta filtro por código postal)
router.get('/', async (req, res) => {
  try {
    const zip = req.query.zip as string;
    
    const list = await getEvents(zip);
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /events:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un evento específico por ID
router.get('/:id', async (req, res) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    return res.status(200).json(event);
  } catch (error: any) {
    console.error("❌ Error en GET /events/:id :", error.message);
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear un nuevo evento (valida código de pago único)
router.post('/', async (req, res) => {
  try {
    const newEvent = await createEvent(req.body);
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
router.put('/:id', async (req, res) => {
  try {
    const updatedEvent = await updateEvent(req.params.id, req.body);
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
router.delete('/:id', async (req, res) => {
  try {
    const deletedEvent = await deleteEvent(req.params.id);
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