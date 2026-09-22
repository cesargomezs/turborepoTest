import { Router } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    deleteNotification,
    deleteAllNotifications 
} from '../controllers/notifications.controller';
import { verifyToken } from '../middleware/authMiddleware'; 

const router = Router();

// 🚀 FIX: Enlace directo a los controladores. Express les pasará (req, res) automáticamente sin sobreescribirlos.
router.get('/', verifyToken, getNotifications as any);

router.put('/:id', verifyToken, markNotificationAsRead as any);

// 📌 RUTAS ESTÁTICAS DE BORRADO (Siempre van antes de las dinámicas /:id)
router.delete('/all', verifyToken, deleteAllNotifications as any);

// 📌 RUTAS DINÁMICAS
router.delete('/:id', verifyToken, deleteNotification as any);

export default router;