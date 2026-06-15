import { Router } from 'express';
import { 
  getSupports, 
  getSupportById, 
  createSupport, 
  updateSupport, 
  deleteSupport,
  createSupportReview // 🚀 Importamos la nueva función del controlador
} from '../controllers/support.controller';

const router = Router();

// 🔍 GET: Obtener todos los registros de soporte (Soporta ?zip=12345)
router.get('/', async (req, res) => {
  try {
    const zipCode = req.query.zip as string; 
    const supportList = await getSupports(zipCode);
    res.json(supportList);
  } catch (error: any) {
    console.error("❌ Error en GET /support:", error.message);
    res.status(500).json({ error: 'Error interno del servidor al obtener registros de soporte' });
  }
});

// 📥 POST: Sugerir/Crear nuevo registro de soporte
router.post('/', async (req, res) => {
  try {
    console.log("📦 Datos recibidos POST /support:", JSON.stringify(req.body, null, 2));
    const newSupport = await createSupport(req.body);
    res.status(201).json(newSupport);
  } catch (error: any) {
    console.error("❌ Error en POST /support:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🚀 POST: Crear nueva reseña/opinión para un registro de soporte
// IMPORTANTE: Va ANTES de las rutas con :id para blindar el enrutamiento de Express
router.post('/reviews', async (req, res) => {
  try {
    const newReview = await createSupportReview(req.body);
    res.status(201).json(newReview);
  } catch (error: any) {
    console.error("❌ Error en POST /support/reviews:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener un registro de soporte específico por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getSupportById(id);
    if (!item) {
      return res.status(404).json({ error: 'Registro de soporte no encontrado' });
    }
    res.json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /support/${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Error al obtener el registro de soporte' });
  }
});

// 🔄 PUT: Actualizar un registro de soporte (Ideal para aprobación: { approved: true })
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updatedSupport = await updateSupport(id, req.body);
    
    if (!updatedSupport) {
       return res.status(404).json({ error: 'Registro de soporte no encontrado o no se pudo actualizar' });
    }
    
    res.json(updatedSupport);
  } catch (error: any) {
    console.error(`❌ Error en PUT /support/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar un registro de soporte
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupport = await deleteSupport(id);
    
    if (!deletedSupport) {
      return res.status(404).json({ error: 'Registro de soporte no encontrado' });
    }
    
    res.json({ message: 'Registro de soporte eliminado correctamente', support: deletedSupport });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /support/${req.params.id}:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;