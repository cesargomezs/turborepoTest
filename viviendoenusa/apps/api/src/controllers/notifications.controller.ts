import { Response } from 'express';
import { db } from "../../../../packages/db/src"; 
import { notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { AuthRequest } from '../middleware/authMiddleware'; // ⬅️ Ajusta la ruta a tu middleware

// 🔍 OBTENER NOTIFICACIONES (Filtrado por token y fecha)
export const getNotifications = async (req: AuthRequest, res: Response) => {
    // 🛡️ PROTECCIÓN CRÍTICA: Validamos que el middleware haya inyectado el usuario
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "No autorizado: Usuario no identificado." });
    }
    try {
      // 🔒 Tomamos el ID directamente del token verificado, no de la URL
      const userId = req.user.id; 

      // 🚀 Usamos SQL puro para comparar con la fecha actual del servidor de base de datos
      const list = await db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            sql`visible_at <= CURRENT_TIMESTAMP` // SQL puro de Postgres, más robusto
          )
        )
        .orderBy(desc(notifications.visibleAt));
  
      console.log(`📊 [DEBUG] Notificaciones encontradas para ${userId}:`, list.length);
  
      const formattedList = list.map((notif: any) => {
          const rawDate = notif.visibleAt || notif.visible_at || notif.createdAt || notif.created_at;
          
          let safeTime = 'N/A';
          if (rawDate) {
              safeTime = new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
  
          return {
              id: notif.id,
              title: notif.title || 'Notificación',
              description: notif.description || '',
              type: notif.type || 'alert',
              referenceId: notif.referenceId || notif.reference_id || null,
              read: notif.isRead !== undefined ? notif.isRead : (notif.is_read || false),
              time: safeTime
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
        // 🚀 SOLUCIÓN: Convertir explícitamente a string
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
        // 🚀 SOLUCIÓN: Convertir explícitamente a string
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