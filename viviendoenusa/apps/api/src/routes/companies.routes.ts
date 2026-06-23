import { Router } from 'express';
import { 
  getCompanies, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  renewCompany // 🚀 NUEVO: Importamos la función de renovación
} from '../controllers/companies.controller';

const router = Router();

// 🔍 GET: Obtener todas las empresas (Soporta filtro opcional ?userId=...)
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.query.userId as string; 
    const companiesList = await getCompanies(currentUserId);
    return res.status(200).json(companiesList);
  } catch (error: any) {
    console.error("❌ Error en GET /companies:", error.message);
    return res.status(500).json({ error: 'Error interno del servidor al obtener las empresas' });
  }
});

// 📥 POST: Registrar una nueva empresa (Valida unicidad de EIN corporativo y pago)
router.post('/', async (req, res) => {
  try {
    const newCompany = await createCompany(req.body);
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
// 🚀 NUEVO: Esta es la ruta a la que llamará el frontend cuando caduque el plan de la empresa
router.post('/:id/renew', async (req, res) => {
  try {
    const renewedCompany = await renewCompany(req.params.id, req.body);
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params; 
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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