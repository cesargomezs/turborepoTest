import { Response } from 'express';
import { db } from "../../../../packages/db/src"; 
import { notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { AuthRequest } from '../middleware/authMiddleware'; 

// ⏱️ FUNCIÓN AUXILIAR: Calcula el tiempo relativo de forma amigable
const formatRelativeTime = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    
    const notifDate = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - notifDate.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "hace un momento";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays === 1) return "ayer";
    if (diffDays < 7) return `hace ${diffDays} días`;
    
    // Si tiene más de una semana, devuelve "15 oct"
    return notifDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// 🔍 OBTENER NOTIFICACIONES (Filtrado por token, sin restricción de tiempo)
export const getNotifications = async (req: AuthRequest, res: Response) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "No autorizado: Usuario no identificado." });
    }
    try {
      const userId = req.user.id; 

      const list = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.visibleAt));
  
      const formattedList = list.map((notif: any) => {
          const rawDate = notif.visibleAt || notif.visible_at || notif.createdAt || notif.created_at;
          
          return {
              id: notif.id,
              title: notif.title || 'Notificación',
              description: notif.description || '',
              type: notif.type || 'alert',
              referenceId: notif.referenceId || notif.reference_id || null,
              read: notif.isRead !== undefined ? notif.isRead : (notif.is_read || false),
              // 🚀 APLICAMOS LA FUNCIÓN DE TIEMPO RELATIVO AQUÍ
              time: formatRelativeTime(rawDate)
          };
      });

      return res.status(200).json(formattedList);
    } catch (error: any) {
      console.error("❌ Error al obtener notificaciones:", error);
      return res.status(500).json({ error: `Error: ${error.message}` });
    }
};

// 👀 MARCAR COMO LEÍDA (Protegida)
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user.id); 
        const notificationId = String(req.params.id);

        const updated = await db.update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.userId, userId) 
                )
            )
            .returning();
            
        if (updated.length === 0) {
             return res.status(404).json({ error: 'Notificación no encontrada o no tienes acceso.' });
        }

        return res.status(200).json(updated[0]);
    } catch (error: any) {
        return res.status(500).json({ error: `Error al actualizar: ${error.message}` });
    }
};

// 🗑️ ELIMINAR NOTIFICACIÓN (Protegida)
export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const userId = String(req.user.id); 
        const notificationId = String(req.params.id);

        const deleted = await db.delete(notifications)
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.userId, userId) 
                )
            )
            .returning();
            
        if (deleted.length === 0) {
             return res.status(404).json({ error: 'Notificación no encontrada o no tienes acceso.' });
        }

        return res.status(200).json(deleted[0]);
    } catch (error: any) {
        return res.status(500).json({ error: `Error al eliminar: ${error.message}` });
    }
};