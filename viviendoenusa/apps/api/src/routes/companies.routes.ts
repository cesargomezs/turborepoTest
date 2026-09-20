import { Router, Response } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  renewCompany,
  deleteCompany
} from '../controllers/companies.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; 

const router = Router();

// ==========================================
// 📌 RUTAS PÚBLICAS (GET - Sin verifyToken para permitir lectura a invitados)
// ==========================================

// 🔍 1. OBTENER TODAS LAS EMPRESAS
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;

    const companiesList = await getCompanies(currentUserId);
    res.json(companiesList);
  } catch (error: any) {
    console.error("❌ Error en GET /companies:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 2. OBTENER UNA EMPRESA POR SU ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined);
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;

    const company = await getCompanyById(id, currentUserId);
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    res.json(company);
  } catch (error: any) {
    console.error(`❌ Error en GET /companies/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 📌 RUTAS PROTEGIDAS (Escritura y Modificación - Con verifyToken estricto)
// ==========================================

// 📥 3. CREAR UNA NUEVA EMPRESA
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newCompany = await createCompany(payload);
    res.status(201).json(newCompany);
  } catch (error: any) {
    console.error("❌ Error en POST /companies:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 4. ACTUALIZAR UNA EMPRESA
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedCompany = await updateCompany(id, req.body);
    if (!updatedCompany) {
      return res.status(404).json({ error: 'Empresa no encontrada para actualizar' });
    }
    res.json(updatedCompany);
  } catch (error: any) {
    console.error(`❌ Error en PUT /companies/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🔄 5. RENOVAR SUSCRIPCIÓN DE EMPRESA
router.post('/:id/renew', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const renewed = await renewCompany(id, req.body);
    res.json(renewed);
  } catch (error: any) {
    console.error(`❌ Error en POST /companies/${req.params.id}/renew:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ 6. ELIMINAR UNA EMPRESA
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedCompany = await deleteCompany(id);
    if (!deletedCompany) {
      return res.status(404).json({ error: 'Empresa no encontrada para eliminar' });
    }
    res.json({ message: 'Empresa eliminada correctamente', company: deletedCompany });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /companies/${req.params.id}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;