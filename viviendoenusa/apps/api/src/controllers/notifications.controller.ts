import { db } from "../../../../packages/db/src"; 
import { notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql ,and} from "drizzle-orm";

// 🔍 OBTENER NOTIFICACIONES (Filtrado por usuario y fecha)
// 🔍 OBTENER NOTIFICACIONES (Filtrado por usuario y fecha)
export const getNotifications = async (userId: string) => {
    try {
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
  
      return list.map((notif: any) => {
          // ... (tu lógica de formato se mantiene igual)
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
    } catch (error: any) {
      console.error("❌ Error al obtener notificaciones:", error);
      throw new Error(`Error: ${error.message}`);
    }
};

// 👀 MARCAR COMO LEÍDA 
export const markNotificationAsRead = async (id: string) => {
    try {
        const updated = await db.update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id))
            .returning();
        return updated[0];
    } catch (error: any) {
        throw new Error(`Error al actualizar: ${error.message}`);
    }
};

// 🗑️ ELIMINAR NOTIFICACIÓN (Cuando el usuario la toca)
export const deleteNotification = async (id: string) => {
    try {
        const deleted = await db.delete(notifications)
            .where(eq(notifications.id, id))
            .returning();
        return deleted[0];
    } catch (error: any) {
        throw new Error(`Error al eliminar: ${error.message}`);
    }
};