import { Router, Response } from 'express';
import { 
    getNotifications, 
    markNotificationAsRead, 
    deleteNotification 
} from '../controllers/notifications.controller';
import { AuthRequest, verifyToken } from '../middleware/authMiddleware'; // 🛡️ Importamos la seguridad unificada

const router = Router();

// 🔍 GET: /notifications -> Trae la lista filtrada por userId
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
    console.log("Petición recibida en /notifications con query:", req.query);
    try {
        // 🚀 BLINDAJE: Extraemos el userId de forma SEGURA directamente desde el token
        const userIdFromToken = req.user?.id || req.user?.userId;

        // Validación para asegurarnos de que el ID del token existe
        if (!userIdFromToken) {
            return res.status(401).json({ message: "No autorizado. Token inválido o sin ID." });
        }

        // 🚀 Inyectamos el ID seguro en la petición para que el controlador lo use
        // Esto ignora cualquier ?userId= falso que alguien intente enviar por la URL
        req.query.userId = userIdFromToken as string;

        // Llamamos a nuestra función que filtra en la base de datos
        const data = await getNotifications(req as any, res);
        
        // Respondemos con la data obtenida (verificando que el controlador no haya respondido ya)
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

// 🗑️ DELETE: /notifications/:id -> Borrarla cuando el usuario la toca/cierra
router.delete('/:id', verifyToken, async (req: AuthRequest, res: Response) => {
    try {
        await deleteNotification(req as any, res);
        if (!res.headersSent) res.status(200).json({ message: "Notificación eliminada correctamente" });
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
});

export default router;