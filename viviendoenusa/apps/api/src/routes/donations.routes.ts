import { Router, Response } from 'express';
import { getDonations, createDonation, updateDonationStatus } from '../controllers/donations.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; 

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const zipParam = req.query.zip;
    const zipCode = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined); 
    
    const donationsList = await getDonations(zipCode);
    return res.status(200).json(donationsList);
  } catch (error: any) {
    console.error("❌ Error en la ruta GET /donations:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener donaciones' });
  }
});

router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;

    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newDonation = await createDonation(payload);
    return res.status(201).json(newDonation);
  } catch (error: any) {
    console.error("❌ Error en la ruta POST /donations:", error.message);
    return res.status(400).json({ error: error.message });
  }
});

router.put('/:id/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const { status, approved } = req.body;
    
    const updatedDonation = await updateDonationStatus(id, status, approved);
    
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