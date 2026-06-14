import { db } from "../../../../packages/db/src"; // Ajusta la ruta a tu carpeta db
import { notifications } from "../../../../packages/db/src/schema"; // Ajusta a tu schema
import { eq, desc, lte } from "drizzle-orm";

// 🔍 OBTENER NOTIFICACIONES (Solo las que su 'visibleAt' ya se cumplió)
export const getNotifications = async () => {
  try {
    const now = new Date();

    const list = await db.select()
      .from(notifications)
      .where(lte(notifications.visibleAt, now)) // Solo traer las que ya pasaron la fecha visible
      .orderBy(desc(notifications.visibleAt))
      .limit(20);

    return list.map(notif => ({
        id: notif.id,
        title: notif.title,
        description: notif.description,
        type: notif.type,
        referenceId: notif.referenceId,
        read: notif.isRead,
        time: new Date(notif.visibleAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // O toLocaleDateString()
    }));
  } catch (error: any) {
    console.error("❌ Error al obtener notificaciones:", error);
    throw new Error(`Error: ${error.message}`);
  }
};

// 👀 MARCAR COMO LEÍDA (Opcional, por si prefieres no borrarlas de inmediato)
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