import { Router } from 'express';
// 🚀 Asegúrate de que los dos puntos (..) estén correctos según tus carpetas
import { getDonations, createDonation, updateDonationStatus } from '../controllers/donations.controller';

const router = Router();

// 🔍 GET: Obtener lista de donaciones por Zip Code
router.get('/', async (req, res) => {
  try {
    // Extraemos el zip de la URL (ej. /donations?zip=91730)
    const zipCode = req.query.zip as string; 
    
    const donationsList = await getDonations(zipCode);
    res.json(donationsList);
  } catch (error: any) {
    console.error("❌ Error en la ruta GET /donations:", error.message);
    res.status(500).json({ error: 'Error interno del servidor al obtener donaciones' });
  }
});

// 📥 POST: Crear nueva donación
router.post('/', async (req, res) => {
  try {
    // 🚀 EL "CHIVATO": Esto imprimirá en tu terminal EXACTAMENTE lo que mandó el celular
    console.log("📦 Datos recibidos en el Router POST /donations:", JSON.stringify(req.body, null, 2));

    const newDonation = await createDonation(req.body);
    res.status(201).json(newDonation);
  } catch (error: any) {
    console.error("❌ Error en la ruta POST /donations:", error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar estado de la donación (Entregado/Activo)
router.put('/:id/status', async (req, res) => {
  try {
    // req.params.id extrae el UUID de la URL como string
    const { id } = req.params; 
    const { status } = req.body;
    
    const updatedDonation = await updateDonationStatus(id, status);
    
    if (!updatedDonation) {
       return res.status(404).json({ error: 'Donación no encontrada o no se pudo actualizar' });
    }
    
    res.json(updatedDonation);
  } catch (error: any) {
    console.error(`❌ Error en la ruta PUT /donations/${req.params.id}/status:`, error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;