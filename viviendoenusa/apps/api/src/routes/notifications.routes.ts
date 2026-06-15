import { Router } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    deleteNotification 
} from '../controllers/notifications.controller';

const router = Router();

// 🔍 GET: /notifications -> Trae la lista para el Header.tsx
router.get('/', async (req, res) => {
    try {
        const data = await getNotifications();
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 👀 PUT: /notifications/:id -> Marcar como leída
router.put('/:id', async (req, res) => {
    try {
        const updated = await markNotificationAsRead(req.params.id);
        res.status(200).json(updated);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// 🗑️ DELETE: /notifications/:id -> Borrarla cuando el usuario la toca/cierra
router.delete('/:id', async (req, res) => {
    try {
        await deleteNotification(req.params.id);
        res.status(200).json({ message: "Notificación eliminada correctamente" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;