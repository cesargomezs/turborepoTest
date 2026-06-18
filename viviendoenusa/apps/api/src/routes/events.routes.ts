import { Router } from 'express';
import { 
    getEvents, 
    getEventById, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} from '../controllers/events.controller';

const router = Router();

// 🔍 GET: Obtener eventos (soporta filtrado por código postal ?zip=12345)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const eventsList = await getEvents(zipCode);
    
    return res.json(eventsList);
  } catch (error: any) {
    console.error("❌ Error en GET /events:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener eventos' });
  }
});

// 🚀 GET: Obtener un evento por ID (¡ESTA ES LA RUTA QUE USA LA NOTIFICACIÓN!)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await getEventById(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Si lo encuentra, lo devuelve al frontend para abrir el Modal expandido
    return res.json(event);
  } catch (error: any) {
    console.error(`❌ Error en GET /events/${req.params.id}:`, error.message);
    return res.status(500).json({ error: 'Error al obtener el evento' });
  }
});

// 📥 POST: Crear nuevo evento (Y registrar el pago en pendiente)
router.post('/', async (req, res) => {
  try {
    const newEvent = await createEvent(req.body);
    return res.status(201).json(newEvent);
  } catch (error: any) {
    console.error("❌ Error en POST /events:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar/Aprobar un evento (Y disparar Notificaciones Programadas/Instantáneas)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedEvent = await updateEvent(id, req.body);
    
    if (!updatedEvent) {
       return res.status(404).json({ error: 'Evento no encontrado o no se pudo actualizar' });
    }
    
    return res.json(updatedEvent);
  } catch (error: any) {
    console.error(`❌ Error en PUT /events/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un evento (Sirve también para rechazar en revisión)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await deleteEvent(id);
    
    if (!deletedEvent) {
      return res.status(404).json({ error: 'Evento no encontrado para eliminar' });
    }
    
    return res.json({ message: 'Evento eliminado correctamente', event: deletedEvent });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /events/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;