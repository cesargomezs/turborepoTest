import { Router, Response } from 'express';
import {
  getDonations,
  getDonationById, // 🚀 1. IMPORTAMOS LA NUEVA FUNCIÓN
  createDonation,
  updateDonationStatus,
  deleteDonation
} from '../controllers/donations.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 📌 RUTAS ESTÁTICAS (Van siempre primero)
// ==========================================

// 🔍 1. OBTENER TODAS LAS DONACIONES (con filtro opcional de ZIP y userId)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const zipParam = req.query.zip;
    const zip = typeof zipParam === 'string' ? zipParam : (Array.isArray(zipParam) ? zipParam[0] as string : undefined);

    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;

    const items = await getDonations(zip, currentUserId);
    res.json(items);
  } catch (error: any) {
    console.error("❌ Error en GET /donations:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 📥 2. CREAR UNA NUEVA DONACIÓN
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newDonation = await createDonation(payload);
    res.status(201).json(newDonation);
  } catch (error: any) {
    console.error("❌ Error en POST /donations:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📌 RUTAS DINÁMICAS (Con /:id - Van al final)
// ==========================================

// 🔍 2.5 OBTENER UNA DONACIÓN POR ID (Para Notificaciones Push)
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const item = await getDonationById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Donación no encontrada' });
    }
    res.json(item);
  } catch (error: any) {
    console.error(`❌ Error en GET /donations/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 3. ACTUALIZAR ESTADO O APROBACIÓN DE LA DONACIÓN
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const { status, approved } = req.body;
    const updated = await updateDonationStatus(id, status, approved);
    
    if (!updated) {
      return res.status(404).json({ error: 'Donación no encontrada para actualizar' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error(`❌ Error en PUT /donations/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 4. ACTUALIZAR ESTADO ESPECÍFICO (COMPATIBILIDAD CON RUTA /status)
router.put('/:id/status', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const { status, approved } = req.body;
    const updated = await updateDonationStatus(id, status, approved);
    
    if (!updated) {
      return res.status(404).json({ error: 'Donación no encontrada para actualizar estado' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error(`❌ Error en PUT /donations/${req.params.id}/status:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ 5. ELIMINAR UNA DONACIÓN
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deleted = await deleteDonation(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Donación no encontrada para eliminar' });
    }
    res.json({ message: 'Donación eliminada correctamente', donation: deleted });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /donations/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;