import { Router } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    deleteNotification 
} from '../controllers/notifications.controller';

const router = Router();

// 🔍 GET: /notifications -> Trae la lista filtrada por userId
router.get('/', async (req, res) => {
    console.log("Petición recibida en /notifications con query:", req.query);
    try {
        // 1. Extraemos el userId de los parámetros de búsqueda (?userId=...)
        const userId = req.query.userId as string;

        // 2. Validación básica para asegurarnos de que el ID viene presente
        if (!userId) {
            return res.status(400).json({ message: "El ID de usuario es requerido." });
        }

        // 3. Llamamos a nuestra función corregida que filtra en la base de datos
        const data = await getNotifications(userId);
        
        // 4. Respondemos con la data obtenida
        res.status(200).json(data);

    } catch (error: any) {
        console.error("❌ Error en el endpoint /notifications:", error);
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