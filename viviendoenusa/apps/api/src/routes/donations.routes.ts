import { Router, Response } from 'express';
// 🚀 Asegúrate de que los dos puntos (..) estén correctos según tus carpetas
import { getDonations, createDonation, updateDonationStatus } from '../controllers/donations.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos el candado de seguridad

const router = Router();

// 🔍 GET: Obtener lista de donaciones por Zip Code
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar el error string | string[] de TypeScript
    const zipParam = req.query.zip;
    const zipCode = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined); 
    
    const donationsList = await getDonations(zipCode);
    return res.status(200).json(donationsList);
  } catch (error: any) {
    console.error("❌ Error en la ruta GET /donations:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener donaciones' });
  }
});

// 📥 POST: Crear nueva donación
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extraemos el ID del usuario directamente del token validado
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    // 🚀 EL "CHIVATO": Esto imprimirá en tu terminal EXACTAMENTE lo que mandó el celular
    console.log("📦 Datos recibidos en el Router POST /donations:", JSON.stringify(payload, null, 2));

    const newDonation = await createDonation(payload);
    return res.status(201).json(newDonation);
  } catch (error: any) {
    console.error("❌ Error en la ruta POST /donations:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 PUT: Actualizar estado de la donación (Entregado/Activo)
router.put('/:id/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID desde los parámetros
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const { status } = req.body;
    
    const updatedDonation = await updateDonationStatus(id, status);
    
    if (!updatedDonation) {
       return res.status(404).json({ error: 'Donación no encontrada o no se pudo actualizar' });
    }
    
    return res.status(200).json(updatedDonation);
  } catch (error: any) {
    console.error(`❌ Error en la ruta PUT /donations/${req.params.id}/status:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;