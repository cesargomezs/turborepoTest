import { Router } from 'express';
import { 
    getTariffs, 
    getTariffById, 
    createTariff, 
    updateTariff, 
    deleteTariff 
} from '../controllers/tariffs.controller';

const router = Router();

// 🔍 GET: Obtener todas las tarifas (Soporta ?typeCode=Store)
router.get('/', async (req, res) => {
  try {
    // 🚀 ESTO ES CLAVE: Capturamos el parámetro de la URL
    const typeCode = req.query.typeCode as string; 
    
    // Y se lo pasamos a la función
    const list = await getTariffs(typeCode);
    
    return res.status(200).json(list);
  } catch (error: any) {
    console.error("❌ Error en GET /tariffs:", error.message);
    return res.status(500).json({ error: error.message });
  }
});



// 🔍 GET: Traer una tarifa específica por su ID
router.get('/', async (req, res) => {
    try {
      const typeCode = req.query.typeCode as string; // 🚀 Ahora usamos typeCode
      const onlyActive = req.query.all !== 'true'; 
  
      const list = await getTariffs(typeCode, onlyActive);
      return res.status(200).json(list);
    } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 📥 POST: Crear una nueva tarifa
router.post('/', async (req, res) => {
  try {
    const newTariff = await createTariff(req.body);
    return res.status(201).json(newTariff);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar precio, descripción o desactivar tarifa
router.put('/:id', async (req, res) => {
  try {
    const updatedTariff = await updateTariff(req.params.id, req.body);
    if (!updatedTariff) return res.status(404).json({ error: "Tarifa no encontrada" });
    
    return res.status(200).json(updatedTariff);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar tarifa físicamente de la BD
router.delete('/:id', async (req, res) => {
  try {
    const deletedTariff = await deleteTariff(req.params.id);
    if (!deletedTariff) return res.status(404).json({ error: "Tarifa no encontrada" });
    
    return res.status(200).json({ message: "Tarifa eliminada", tariff: deletedTariff });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;