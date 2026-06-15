import cron from 'node-cron';
import { db } from "../../../../packages/db/src"; 
import { lawyers, notifications } from "../../../../packages/db/src/schema";
import { sql, eq, and } from 'drizzle-orm';

// Esta tarea corre CADA MINUTO para pruebas (controlando duplicados por día)
cron.schedule('* * * * *', async () => {
  console.log("⏰ [CRON] Buscando suscripciones vencidas o próximas a vencer...");

  try {
    // 🚀 1. PRÓXIMOS A VENCER: Entre mañana (hoy + 1) y los próximos 5 días
    const expiringSoon = await db.select({
        id: lawyers.id,
        userId: lawyers.userId,
        nameLawy: lawyers.nameLawy
    })
    .from(lawyers)
    .where(
        and(
            eq(lawyers.approved, true),
            sql`DATE(${lawyers.timepostEnd}) > CURRENT_DATE AND DATE(${lawyers.timepostEnd}) <= CURRENT_DATE + INTERVAL '5 days'`
        )
    );

    // 🚀 2. VENCIDOS: Si la fecha es hoy o ya pasó, pero sigue marcado como approved = true
    const expiredToday = await db.select({
        id: lawyers.id,
        userId: lawyers.userId,
        nameLawy: lawyers.nameLawy
    })
    .from(lawyers)
    .where(
        and(
            eq(lawyers.approved, true),
            sql`DATE(${lawyers.timepostEnd}) <= CURRENT_DATE`
        )
    );

    console.log(`📊 Encontrados -> En rango de 1-5 días: ${expiringSoon.length} | Vencidos: ${expiredToday.length}`);

    // 3. Insertar notificaciones diarias por vencer (Evitando duplicados)
    if (expiringSoon.length > 0) {
      for (const lawyer of expiringSoon) {
        if (lawyer.userId) {
            
            // 🔍 CONTROL: Verificar si ya se le envió una alerta de tipo 'warning' el día de hoy
            const existingNotification = await db.select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.referenceId, lawyer.id),
                  eq(notifications.type, "warning"),
                  sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                )
              )
              .limit(1);

            // Si no existe ninguna hoy, se inserta
            if (existingNotification.length === 0) {
                await db.insert(notifications).values({
                  userId: lawyer.userId,
                  title: "Suscripción por vencer",
                  description: `Tu perfil de abogado (${lawyer.nameLawy}) vencerá pronto. ¡Renuévalo para no perder visibilidad!`,
                  referenceId: lawyer.id,
                  type: "warning",
                  isRead: false 
                });
                console.log(`🔔 Alerta de vencimiento diario guardada para: ${lawyer.nameLawy}`);
            } else {
                console.log(`⏭️ Notificación omitida (ya se envió hoy) para: ${lawyer.nameLawy}`);
            }
        }
      }
    }

    // 4. Insertar notificaciones de perfiles ya vencidos (Evitando duplicados)
    if (expiredToday.length > 0) {
      for (const lawyer of expiredToday) {
        if (lawyer.userId) {

            // 🔍 CONTROL: Verificar si ya se le envió una alerta de tipo 'error' el día de hoy
            const existingNotification = await db.select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.referenceId, lawyer.id),
                  eq(notifications.type, "error"),
                  sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                )
              )
              .limit(1);

            // Si no existe ninguna hoy, se inserta
            if (existingNotification.length === 0) {
                await db.insert(notifications).values({
                  userId: lawyer.userId,
                  title: "Suscripción Vencida",
                  description: `Tu perfil (${lawyer.nameLawy}) ya no es público por vencimiento. Renueva tu pago para reactivarlo.`,
                  referenceId: lawyer.id, // ✅ Agregado también aquí para el control total
                  type: "error",
                  isRead: false
                });
                console.log(`🔔 Alerta de perfil ya vencido guardada para: ${lawyer.nameLawy}`);
                
                // Opcional: Si quieres ocultarlo del mapa automáticamente al vencer, puedes descomentar la línea de abajo:
                // await db.update(lawyers).set({ approved: false }).where(eq(lawyers.id, lawyer.id));
            } else {
                console.log(`⏭️ Alerta de vencimiento omitida (ya se envió hoy) para: ${lawyer.nameLawy}`);
            }
        }
      }
    }

    console.log("✅ [CRON] Revisión finalizada exitosamente.\n");

  } catch (error) {
    console.error("❌ [CRON] Error ejecutando la tarea programada:", error);
  }
});