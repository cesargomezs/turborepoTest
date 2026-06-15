import { Router } from 'express';
import { 
    getPendingPayments, 
    approveGenericPayment 
} from '../controllers/payments.controller';

const router = Router();

// 🔍 GET: /payments -> Trae el historial de pagos pendientes (para tu uso interno)
router.get('/', async (req, res) => {
    try {
        const pending = await getPendingPayments();
        res.status(200).json(pending);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error al obtener pagos' });
    }
});

// ✅ PUT: /payments/:id/approve -> Aprueba el pago y enciende el perfil del Abogado/Tienda
router.put('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await approveGenericPayment(id);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Error al aprobar el pago' });
    }
});

export default router;