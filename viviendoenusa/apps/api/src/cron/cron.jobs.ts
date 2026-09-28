import cron from 'node-cron';
import { db } from "../../../../packages/db/src"; 
import { lawyers, notifications, users, stores, events, jobs, support, companies, userDevices } from "../../../../packages/db/src/schema";
import { sql, eq, and, isNotNull, inArray } from 'drizzle-orm'; 

// ============================================================================
// 1. CRON DE VENCIMIENTOS - Corre a la medianoche (00:00) HORA DEL PACÍFICO
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
                  isRead: false,
                  visibleAt: new Date()
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
                  isRead: false,
                  visibleAt: new Date()
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
}, {
  timezone: "America/Los_Angeles"
});

// ============================================================================
// 2. MOTOR DE RECORDATORIOS PARA EVENTOS (BLINDADO CONTRA DUPLICADOS Y FUTUROS)
// ============================================================================
async function launchEventReminders() {
    console.log("📅 [CRON EVENTOS] Calculando cuenta regresiva exacta para eventos...");

    const activeEvents = await db.select({
        id: events.id,
        title: events.title,
        premiumPlan: events.premiumPlan,
        zip: events.zip,
        daysLeft: sql<number>`DATE(${events.dateEvent}) - CURRENT_DATE`
    })
    .from(events)
    .where(
        and(
            eq(events.approved, true),
            sql`DATE(${events.dateEvent}) >= CURRENT_DATE`
        )
    );

    if (activeEvents.length === 0) return;

    for (const event of activeEvents) {
        if (!event.zip) continue;

        const daysLeft = Number(event.daysLeft);
        const plan = event.premiumPlan ? event.premiumPlan.toLowerCase() : 'free';

        let shouldNotify = false;
        let bodyText = "";
        const titleText = "Recordatorio de Evento 📅";

        if (plan === 'unlimited' || plan === 'premium') {
            if ([7, 3, 1, 0].includes(daysLeft)) shouldNotify = true;
        } else if (plan === 'basic' || plan === 'intermediate') {
            if ([3, 0].includes(daysLeft)) shouldNotify = true;
        } else {
            if (daysLeft === 0) shouldNotify = true;
        }

        if (!shouldNotify) continue;

        if (daysLeft === 0) {
            bodyText = `¡Es hoy! No te pierdas: ${event.title}`;
        } else if (daysLeft === 1) {
            bodyText = `¡Falta solo 1 día para: ${event.title}!`;
        } else {
            bodyText = `¡Faltan solo ${daysLeft} días para: ${event.title}!`;
        }

        const nearbyUsers = await db.select({ id: users.id })
            .from(users)
            .where(and(isNotNull(users.zip), eq(users.zip, event.zip)));

        if (nearbyUsers.length === 0) continue;

        for (const u of nearbyUsers) {
            // 🛡️ BLINDAJE ANTIDUPLICADOS: Verificamos si ya existe una notificación idéntica para este usuario y evento hoy
            const [existingNotif] = await db.select({ id: notifications.id })
                .from(notifications)
                .where(
                    and(
                        eq(notifications.userId, u.id),
                        eq(notifications.referenceId, event.id),
                        eq(notifications.type, "event"),
                        sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                    )
                )
                .limit(1);

            if (!existingNotif) {
                await db.insert(notifications).values({
                    userId: u.id,
                    title: titleText,
                    description: bodyText,
                    referenceId: event.id,
                    type: "event",
                    isRead: false,
                    visibleAt: new Date()
                });

                // Enviar Push unitaria o controlada al dispositivo de este usuario
                const [device] = await db.select().from(userDevices).where(eq(userDevices.userId, u.id)).limit(1);
                if (device?.expoPushToken) {
                    const [unreadResult] = await db.select({ count: sql<number>`count(*)` })
                        .from(notifications)
                        .where(and(eq(notifications.userId, u.id), eq(notifications.isRead, false)));

                    const unreadCount = Number(unreadResult?.count) || 1;

                    try {
                        await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: device.expoPushToken,
                                sound: 'default',
                                title: titleText,
                                body: bodyText,
                                badge: unreadCount,
                                data: { type: "event", referenceId: event.id },
                            }),
                        });
                    } catch (e) {
                        console.error("❌ Error enviando PUSH individual de Eventos:", e);
                    }
                }
            }
        }
        console.log(`📣 Recordatorio de Evento procesado para el ZIP ${event.zip}: ${bodyText}`);
    }
}

// ============================================================================
// 3. MOTOR DE MARKETING (TIENDAS, EMPLEOS, APOYOS, ABOGADOS)
// ============================================================================
async function launchGeoMarketingCampaign(activePromotions: any[], type: string, itemNameKey: string) {
    const promosForToday = activePromotions.filter(promo => {
        const days = promo.daysActive ? Math.floor(promo.daysActive) : 0; 
        const plan = promo.premiumPlan ? promo.premiumPlan.toLowerCase() : 'free';

        if (plan === 'unlimited' || plan === 'premium') return days % 7 === 0;       
        if (plan === 'basic' || plan === 'intermediate') return days % 15 === 0; 
        if (plan === 'free' || plan === 'coupon') return days === 0; 
        
        return false;
    });

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
        
        for (const u of nearbyUsers) {
            // 🛡️ BLINDAJE ANTIDUPLICADOS DIARIO PARA MARKETING
            const [existingNotif] = await db.select({ id: notifications.id })
                .from(notifications)
                .where(
                    and(
                        eq(notifications.userId, u.id),
                        eq(notifications.referenceId, promo.id),
                        eq(notifications.type, type),
                        sql`DATE(${notifications.createdAt}) = CURRENT_DATE`
                    )
                )
                .limit(1);

            if (!existingNotif) {
                await db.insert(notifications).values({
                    userId: u.id,
                    title: titleText,
                    description: bodyText,
                    referenceId: promo.id,
                    type: type,
                    isRead: false,
                    visibleAt: new Date()
                });

                const [device] = await db.select().from(userDevices).where(eq(userDevices.userId, u.id)).limit(1);
                if (device?.expoPushToken) {
                    const [unreadResult] = await db.select({ count: sql<number>`count(*)` })
                        .from(notifications)
                        .where(and(eq(notifications.userId, u.id), eq(notifications.isRead, false)));

                    const unreadCount = Number(unreadResult?.count) || 1;

                    try {
                        await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: device.expoPushToken,
                                sound: 'default',
                                title: titleText,
                                body: bodyText,
                                badge: unreadCount,
                                data: { type: type, referenceId: promo.id },
                            }),
                        });
                    } catch (e) {
                        console.error("❌ Error enviando PUSH de Marketing:", e);
                    }
                }
            }
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
        daysActive: sql<number>`CURRENT_DATE - DATE(${stores.createdAt})`
    }).from(stores).where(
        and(
            eq(stores.approved, true),
            sql`DATE(${stores.timepostEnd}) >= CURRENT_DATE`
        )
    );
    await launchGeoMarketingCampaign(activeStores, "store", "name");

    await launchEventReminders();

    const activeJobs = await db.select({
        id: jobs.id,
        title: jobs.title,
        premiumPlan: companies.premiumPlan,
        zip: jobs.zip,
        daysActive: sql<number>`CURRENT_DATE - DATE(${jobs.createdAt})`
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(
        and(
            eq(jobs.approved, true),
            sql`DATE(${companies.timepostEnd}) >= CURRENT_DATE`
        )
    );
    await launchGeoMarketingCampaign(activeJobs, "job", "title");

    const activeSupport = await db.select({
        id: support.id,
        name: support.nameSupp,
        premiumPlan: support.premiumPlan,
        zip: support.zip,
        daysActive: sql<number>`CURRENT_DATE - DATE(${support.createdAt})`
    }).from(support).where(
        and(
            eq(support.approved, true),
            sql`DATE(${support.timepostEnd}) >= CURRENT_DATE`
        )
    );
    await launchGeoMarketingCampaign(activeSupport, "support", "name");

    const activeLawyers = await db.select({
        id: lawyers.id,
        nameLawy: lawyers.nameLawy,
        premiumPlan: lawyers.premiumPlan,
        zip: lawyers.zip,
        daysActive: sql<number>`CURRENT_DATE - DATE(${lawyers.createdAt})` 
    }).from(lawyers).where(
        and(
            eq(lawyers.approved, true),
            sql`DATE(${lawyers.timepostEnd}) >= CURRENT_DATE`
        )
    );
    await launchGeoMarketingCampaign(activeLawyers, "lawyer", "nameLawy");

    console.log("✅ [CRON MARKETING] Las 5 categorías procesadas exitosamente.\n");

  } catch (error) {
    console.error("❌ [CRON MARKETING] Error ejecutando la tarea:", error);
  }
}

// ============================================================================
// ⏰ EJECUCIÓN DIARIA OFICIAL (7:00 AM) HORA DEL PACÍFICO
// ============================================================================
cron.schedule('0 7 * * *', async () => {
    await executeMarketingMotor();
}, {
    timezone: "America/Los_Angeles"
});