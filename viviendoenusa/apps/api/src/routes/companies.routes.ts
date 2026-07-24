import { Router, Response } from 'express';
import { 
  getCompanies, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  renewCompany 
} from '../controllers/companies.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos seguridad

const router = Router();

// 🔍 GET: Obtener todas las empresas (Soporta filtro opcional ?userId=...)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura para evitar string | string[]
    const userIdParam = req.query.userId;
    const queryUserId = typeof userIdParam === 'string' ? userIdParam : (Array.isArray(userIdParam) ? userIdParam[0] as string : undefined); 
    
    // 🚀 Priorizamos el userId validado del token
    const currentUserId = req.user?.id || req.user?.userId || queryUserId;

    const companiesList = await getCompanies(currentUserId);
    return res.status(200).json(companiesList);
  } catch (error: any) {
    console.error("❌ Error en GET /companies:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener las empresas' });
  }
});

// 📥 POST: Registrar una nueva empresa (Valida unicidad de EIN corporativo y pago)
router.post('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Inyectamos el creador desde el token para evitar suplantaciones
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const newCompany = await createCompany(payload);
    return res.status(201).json(newCompany);
  } catch (error: any) {
    console.error("❌ Error en POST /companies:", error.message);
    
    // Blindaje por si el EIN ya existe o hay pago duplicado
    if (error.message.includes("existe") || error.message.includes("unique") || error.message.includes("duplicate")) {
       return res.status(409).json({ error: error.message });
    }
    
    return res.status(400).json({ error: error.message });
  }
});

// 🔄 POST: Renovar Suscripción de Empresa (Pago)
router.post('/:id/renew', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID de la empresa
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    // 🚀 Inyectamos el usuario desde el token por seguridad
    const userIdFromToken = req.user?.id || req.user?.userId;
    const payload = {
      ...req.body,
      userId: userIdFromToken || req.body.userId
    };

    const renewedCompany = await renewCompany(id, payload);
    return res.status(200).json(renewedCompany);
  } catch (error: any) {
    console.error(`❌ Error en POST /companies/${req.params.id}/renew:`, error.message);
    if (error.message.includes("utilizado") || error.message.includes("unique") || error.message.includes("duplicate")) {
       return res.status(409).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// 🔍 GET: Obtener una empresa específica por ID
router.get('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 🚀 Extracción segura del ID
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const company = await getCompanyById(id);
    
    if (!company) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    return res.status(200).json(company);
  } catch (error: any) {
    console.error(`❌ Error en GET /companies/${req.params.id}:`, error.message);
    return res.status(500).json({ error: 'Error al obtener los detalles de la empresa' });
  }
});

// 🔄 PUT: Actualizar perfil de empresa (Ideal para que el Admin cambie planes o verifique)
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const updatedCompany = await updateCompany(id, req.body);
    
    if (!updatedCompany) {
       return res.status(404).json({ error: 'Empresa no encontrada o no se pudo actualizar' });
    }
    
    return res.status(200).json(updatedCompany);
  } catch (error: any) {
    console.error(`❌ Error en PUT /companies/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

// 🗑️ DELETE: Eliminar perfil corporativo
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

    const deletedCompany = await deleteCompany(id);
    
    if (!deletedCompany) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    
    return res.status(200).json({ message: 'Empresa eliminada correctamente', company: deletedCompany });
  } catch (error: any) {
    console.error(`❌ Error en DELETE /companies/${req.params.id}:`, error.message);
    return res.status(400).json({ error: error.message });
  }
});

export default router;