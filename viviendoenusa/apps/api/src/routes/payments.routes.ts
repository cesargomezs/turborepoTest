import { Router, Response } from 'express';
import { 
    getPendingPayments, 
    approveGenericPayment 
} from '../controllers/payments.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🚀 Importamos seguridad

const router = Router();

// 🔍 GET: /payments -> Trae el historial de pagos pendientes (para tu uso interno)
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const pending = await getPendingPayments();
        return res.status(200).json(pending);
    } catch (error: any) {
        console.error("❌ Error en GET /payments:", error.message);
        return res.status(500).json({ message: error.message || 'Error al obtener pagos' });
    }
});

// ✅ PUT: /payments/:id/approve -> Aprueba el pago y enciende el perfil del Abogado/Tienda
router.put('/:id/approve', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        // 🚀 Extracción segura del ID
        const idParam = req.params.id;
        const id = typeof idParam === 'string' ? idParam : (Array.isArray(idParam) ? idParam[0] : '');

        const result = await approveGenericPayment(id);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error(`❌ Error en PUT /payments/${req.params.id}/approve:`, error.message);
        return res.status(400).json({ message: error.message || 'Error al aprobar el pago' });
    }
});

export default router;