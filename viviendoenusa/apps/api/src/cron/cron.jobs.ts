import cron from 'node-cron';
import { db } from "../../../../packages/db/src"; 
// 🚀 TODAS LAS TABLAS IMPORTADAS SEGÚN EL NUEVO ESQUEMA
import { lawyers, notifications, users, stores, events, jobs, support, companies } from "../../../../packages/db/src/schema";
import { sql, eq, and, isNotNull } from 'drizzle-orm';

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
// 2. CRON DE MARKETING POR CÓDIGO POSTAL - 10:00 AM
// ============================================================================

async function launchGeoMarketingCampaign(activePromotions: any[], type: string, itemNameKey: string) {
    // 1. Filtrar a quién le toca notificación hoy según su plan
    const promosForToday = activePromotions.filter(promo => {
        const days = promo.daysActive ? Math.floor(promo.daysActive) : 0; 
        const plan = promo.premiumPlan ? promo.premiumPlan.toLowerCase() : 'free';

        // Unlimited (4 al mes): Notifica días 0, 7, 14, 21, 28...
        if (plan === 'unlimited' || plan === 'premium') return days % 7 === 0;       
        // Basic (2 al mes): Notifica días 0, 15, 30...
        if (plan === 'basic' || plan === 'intermediate') return days % 15 === 0; 
        // Free / Coupon (1 al mes): Notifica solo el día de creación
        if (plan === 'free' || plan === 'coupon') return days === 0; 
        
        return false;
    });

    if (promosForToday.length === 0) return; 

    for (const promo of promosForToday) {
        if (!promo.zip) continue; // Saltar si el negocio no tiene ZIP 

        // 2. BÚSQUEDA POR ZIP: Se notifica a los usuarios en el mismo código postal
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
        
        // 3. Preparar inserción masiva
        const notificationsToInsert = nearbyUsers.map(u => ({
            userId: u.id,
            title: `📍 En tu área: ${itemName}`,
            description: `¡Este servicio está disponible en tu código postal (${promo.zip})! Aprovecha lo que ofrece hoy.`,
            referenceId: promo.id,
            type: type,
            isRead: false
        }));

        // 4. Batch Insert 
        if (notificationsToInsert.length > 0) {
            await db.insert(notifications).values(notificationsToInsert);
            console.log(`📣 Marketing enviado a ${nearbyUsers.length} usuarios en el ZIP ${promo.zip} para ${itemName}`);
        }
    }
}

// ⏰ Ejecutamos el motor de marketing todos los días a las 10:00 AM
cron.schedule('0 10 * * *', async () => {
  console.log("🚀 [CRON MARKETING] Iniciando cruce por código postal (ZIP)...");

  try {
    // ----------------------------------------------------
    // A. PROCESAR TIENDAS (stores)
    // ----------------------------------------------------
    const activeStores = await db.select({
        id: stores.id,
        name: stores.nameStores,
        premiumPlan: stores.premiumPlan, 
        zip: stores.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${stores.createdAt})`
    }).from(stores).where(eq(stores.approved, true));
    
    await launchGeoMarketingCampaign(activeStores, "store", "name");

    // ----------------------------------------------------
    // B. PROCESAR EVENTOS (events)
    // ----------------------------------------------------
    const activeEvents = await db.select({
        id: events.id,
        title: events.title, 
        premiumPlan: events.premiumPlan,
        zip: events.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${events.timepostEnd})`
    }).from(events).where(eq(events.approved, true));
    
    await launchGeoMarketingCampaign(activeEvents, "event", "title");

    // ----------------------------------------------------
    // C. PROCESAR TRABAJOS (jobs) 🚀 JOIN CON COMPANIES
    // ----------------------------------------------------
    const activeJobs = await db.select({
        id: jobs.id,
        title: jobs.title,
        premiumPlan: companies.premiumPlan, // Obtenemos el plan de la empresa
        zip: jobs.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${jobs.createdAt})`
    })
    .from(jobs)
    .leftJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobs.approved, true));
    
    await launchGeoMarketingCampaign(activeJobs, "job", "title");

    // ----------------------------------------------------
    // D. PROCESAR APOYO (support)
    // ----------------------------------------------------
    const activeSupport = await db.select({
        id: support.id,
        name: support.nameSupp,
        premiumPlan: support.premiumPlan,
        zip: support.zip,
        daysActive: sql<number>`EXTRACT(DAY FROM CURRENT_DATE - ${support.createdAt})`
    }).from(support).where(eq(support.approved, true));
    
    await launchGeoMarketingCampaign(activeSupport, "support", "name");

    // ----------------------------------------------------
    // E. PROCESAR ABOGADOS (lawyers)
    // ----------------------------------------------------
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
});