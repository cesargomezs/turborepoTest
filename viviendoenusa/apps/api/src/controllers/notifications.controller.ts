import { db } from "../../../../packages/db/src"; 
import { notifications } from "../../../../packages/db/src/schema"; 
import { eq, desc, lte } from "drizzle-orm";

// 🔍 OBTENER NOTIFICACIONES (Solo las que su 'visibleAt' ya se cumplió)
export const getNotifications = async () => {
  try {
    const now = new Date();

    const list = await db.select()
      .from(notifications)
      .where(lte(notifications.visibleAt, now)) 
      .orderBy(desc(notifications.visibleAt))
      .limit(20);

    // 🚀 BLINDAJE: Verificamos los nombres de las columnas y evitamos que un 'null' rompa el Date()
    return list.map((notif: any) => {
        const rawDate = notif.visibleAt || notif.visible_at || notif.createdAt || notif.created_at;
        
        let safeTime = '';
        try {
            if (rawDate) {
                safeTime = new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (e) {
            safeTime = 'N/A';
        }

        return {
            id: notif.id,
            title: notif.title || 'Notificación',
            description: notif.description || '',
            type: notif.type || 'alert',
            referenceId: notif.referenceId || notif.reference_id || null, // Cobertura Drizzle
            read: notif.isRead !== undefined ? notif.isRead : (notif.is_read || false), // Cobertura Drizzle
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