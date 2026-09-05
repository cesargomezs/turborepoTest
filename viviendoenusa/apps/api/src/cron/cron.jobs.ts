import cron from 'node-cron';
import { db } from "../../../../packages/db/src"; 
import { lawyers, notifications, users, stores, events, jobs, support, companies, userDevices } from "../../../../packages/db/src/schema";
import { sql, eq, and, isNotNull, inArray } from 'drizzle-orm'; 

// ============================================================================
// 1. CRON DE VENCIMIENTOS - Corre a la medianoche
// ============================================================================
cron.schedule('0 0 * * *', async () => {
  console.log("⏰ [CRON] Buscando suscripciones vencidas o próximas a vencer...");

  try {
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

    if (expiringSoon.length > 0) {
      for (const lawyer of expiringSoon) {
        if (lawyer.userId) {
            const existingNotification = await db.select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.referenceId, lawyer.id),
                  eq(notifications.type, "lawyer"), 
                  sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                )
              )
              .limit(1);

            if (existingNotification.length === 0) {
                await db.insert(notifications).values({
                  userId: lawyer.userId,
                  title: "Suscripción por vencer",
                  description: `Tu perfil de abogado (${lawyer.nameLawy}) vencerá pronto. ¡Renuévalo para no perder visibilidad!`,
                  referenceId: lawyer.id,
                  type: "lawyer",
                  isRead: false 
                });
                console.log(`🔔 Alerta de vencimiento diario guardada para: ${lawyer.nameLawy}`);
            }
        }
      }
    }

    if (expiredToday.length > 0) {
      for (const lawyer of expiredToday) {
        if (lawyer.userId) {
            const existingNotification = await db.select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.referenceId, lawyer.id),
                  eq(notifications.type, "lawyer"), 
                  sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                )
              )
              .limit(1);

            if (existingNotification.length === 0) {
                await db.insert(notifications).values({
                  userId: lawyer.userId,
                  title: "Suscripción Vencida",
                  description: `Tu perfil (${lawyer.nameLawy}) ya no es público por vencimiento. Renueva tu pago para reactivarlo.`,
                  referenceId: lawyer.id, 
                  type: "lawyer",
                  isRead: false
                });
                console.log(`🔔 Alerta de perfil ya vencido guardada para: ${lawyer.nameLawy}`);
            }
        }
      }
    }
    console.log("✅ [CRON] Revisión de vencimientos finalizada.\n");
  } catch (error) {
    console.error("❌ [CRON] Error ejecutando la tarea de vencimientos:", error);
  }
});


// ============================================================================
// 2. MOTOR DE MARKETING POR CÓDIGO POSTAL
// ============================================================================

async function launchGeoMarketingCampaign(activePromotions: any[], type: string, itemNameKey: string) {
    // 👇 MODIFICACIÓN TEMPORAL DE PRUEBA 👇
    const promosForToday = activePromotions.filter(promo => {
        // 🚀 MODO PRUEBA ACTIVO: Dejamos pasar todo ignorando los días
        return true; 
        
        /* CÓDIGO ORIGINAL (Comentado para la prueba):
        const days = promo.daysActive ? Math.floor(promo.daysActive) : 0; 
        const plan = promo.premiumPlan ? promo.premiumPlan.toLowerCase() : 'free';

        if (plan === 'unlimited' || plan === 'premium') return days % 7 === 0;       
        if (plan === 'basic' || plan === 'intermediate') return days % 15 === 0; 
        if (plan === 'free' || plan === 'coupon') return days === 0; 
        
        return false;
        */
    });

    console.log(`🔍 [DEBUG] Revisando categoría ${type}: Encontramos ${activePromotions.length} activos. Dejando pasar TODOS por modo prueba.`);

    if (promosForToday.length === 0) return; 

    for (const promo of promosForToday) {
        if (!promo.zip) continue; 

        const nearbyUsers = await db.select({ id: users.id })
            .from(users)
            .where(
                and(
                    isNotNull(users.zip),
                    eq(users.zip, promo.zip)
                )
            );

        if (nearbyUsers.length === 0) continue;

        const itemName = promo[itemNameKey] || "este servicio";
        const titleText = `📍 En tu área: ${itemName}`;
        const bodyText = `¡Este servicio está disponible en tu código postal (${promo.zip})! Aprovecha lo que ofrece hoy.`;
        
        const notificationsToInsert = nearbyUsers.map(u => ({
            userId: u.id,
            title: titleText,
            description: bodyText,
            referenceId: promo.id,
            type: type,
            isRead: false
        }));

        if (notificationsToInsert.length > 0) {
            await db.insert(notifications).values(notificationsToInsert);
            console.log(`📣 Marketing guardado para ${nearbyUsers.length} usuarios en el ZIP ${promo.zip} para ${itemName}`);
        }

        // ====================================================================
        // 🚀 ENVÍO REAL DE PUSH NOTIFICATIONS A LOS DISPOSITIVOS
        // ====================================================================
        const userIds = nearbyUsers.map(u => u.id);
        const devices = await db.select()
                                .from(userDevices)
                                .where(inArray(userDevices.userId, userIds));

        if (devices && devices.length > 0) {
            const messages = devices.map(device => ({
                to: device.expoPushToken,
                sound: 'default',
                title: titleText,
                body: bodyText,
                data: { type: type, referenceId: promo.id },
            }));

            const chunks = [];
            for (let i = 0; i < messages.length; i += 100) {
                chunks.push(messages.slice(i, i + 100));
            }

            for (const chunk of chunks) {
                try {
                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Accept-encoding': 'gzip, deflate',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(chunk),
                    });
                } catch (e) {
                    console.error("❌ Error enviando PUSH en CRON Marketing:", e);
                }
            }
            console.log(`📲 PUSH enviado a ${devices.length} dispositivos para la promo ${promo.id}`);
        }
    }
}

// 🚀 FUNCIÓN PRINCIPAL QUE AGRUPA TODAS LAS CATEGORÍAS
async function executeMarketingMotor() {
  console.log("🚀 [CRON MARKETING] Iniciando cruce por código postal (ZIP)...");

  try {
    const activeStores = await db.select({
        id: stores.id,
        name: stores.nameStores,
        premiumPlan: stores.premiumPlan, 
        zip: stores.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${stores.createdAt})`
    }).from(stores).where(eq(stores.approved, true));
    
    await launchGeoMarketingCampaign(activeStores, "store", "name");

    const activeEvents = await db.select({
      id: events.id,
      title: events.title, 
      premiumPlan: events.premiumPlan,
      zip: events.zip,
      daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${events.timepostEnd})` 
      })
      .from(events)
      .where(
          and(
              eq(events.approved, true),
              sql`${events.dateEvent} >= CURRENT_DATE`
          )
      );
  
    await launchGeoMarketingCampaign(activeEvents, "event", "title");

    const activeJobs = await db.select({
        id: jobs.id,
        title: jobs.title,
        premiumPlan: companies.premiumPlan,
        zip: jobs.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${jobs.createdAt})`
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.approved, true));
    
    await launchGeoMarketingCampaign(activeJobs, "job", "title");

    const activeSupport = await db.select({
        id: support.id,
        name: support.nameSupp,
        premiumPlan: support.premiumPlan,
        zip: support.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${support.createdAt})`
    }).from(support).where(eq(support.approved, true));
    
    await launchGeoMarketingCampaign(activeSupport, "support", "name");

    const activeLawyers = await db.select({
        id: lawyers.id,
        nameLawy: lawyers.nameLawy,
        premiumPlan: lawyers.premiumPlan,
        zip: lawyers.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${lawyers.createdAt})` 
    }).from(lawyers).where(eq(lawyers.approved, true));
    
    await launchGeoMarketingCampaign(activeLawyers, "lawyer", "nameLawy");

    console.log("✅ [CRON MARKETING] Las 5 categorías procesadas exitosamente.\n");

  } catch (error) {
    console.error("❌ [CRON MARKETING] Error ejecutando la tarea:", error);
  }
}

// ============================================================================
// ⏰ EJECUCIÓN DIARIA OFICIAL (8:00 AM)
// ============================================================================
cron.schedule('0 8 * * *', async () => {
    await executeMarketingMotor();
});

// ============================================================================
// 🧪 PRUEBA TEMPORAL (Se ejecuta 2 minutos después de arrancar el servidor)
// ============================================================================
setTimeout(async () => {
    console.log("🛠️ [TEST] Ejecutando prueba de notificaciones 2 minutos después del despliegue...");
    await executeMarketingMotor();
}, 2 * 60 * 1000); // 2 minutos en milisegundos