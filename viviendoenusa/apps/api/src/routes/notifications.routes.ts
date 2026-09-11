import { Router, Response } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    deleteNotification,
    deleteAllNotifications // 🚀 1. IMPORTAMOS LA NUEVA FUNCIÓN
} from '../controllers/notifications.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; 

const router = Router();

// 🔍 GET: /notifications -> Trae la lista filtrada por userId
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const userIdFromToken = req.user?.id || req.user?.userId;

        if (!userIdFromToken) {
            return res.status(401).json({ message: "No autorizado. Token inválido o sin ID." });
        }

        req.query.userId = userIdFromToken as string;

        const data = await getNotifications(req as any, res);
        
        if (!res.headersSent) {
            res.status(200).json(data);
        }

    } catch (error: any) {
        console.error("❌ Error en el endpoint /notifications:", error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
});

// 👀 PUT: /notifications/:id -> Marcar como leída
router.put('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        const updated = await markNotificationAsRead(req as any, res);
        if (!res.headersSent) res.status(200).json(updated);
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 📌 RUTAS ESTÁTICAS DE BORRADO (Van antes de /:id)
// ==========================================

// 🗑️🔥 DELETE: /notifications/all -> Borrar todas las notificaciones del usuario
router.delete('/all', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        await deleteAllNotifications(req as any, res);
        if (!res.headersSent) res.status(200).json({ message: "Todas las notificaciones eliminadas correctamente" });
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
});

// ==========================================
// 📌 RUTAS DINÁMICAS DE BORRADO (Van al final)
// ==========================================

// 🗑️ DELETE: /notifications/:id -> Borrarla individualmente
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        await deleteNotification(req as any, res);
        if (!res.headersSent) res.status(200).json({ message: "Notificación eliminada correctamente" });
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
});

export default router;