import { db } from "../../../../packages/db/src"; 
import { companies, users, payments, notifications, tariffs, typeDetail, promoCodes } from "../../../../packages/db/src/schema"; 
import { eq, desc, sql, and } from "drizzle-orm";
import { createClient } from '@supabase/supabase-js'; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const NOMBRE_BUCKET = 'images'; 

const TEMP_USER_ID = "baeb641a-3fa4-4fef-9846-d75947d1bca9";

const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 📲 NUEVA FUNCIÓN: ALERTA DE TELEGRAM PARA EMPRESAS
const sendTelegramAlert = async (companyName: string, refCode: string, method: string) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.warn("⚠️ Credenciales de Telegram no configuradas.");
    return;
  }

  const message = `🏢 *NUEVA EMPRESA REGISTRADA*\n\n*Nombre:* ${companyName}\n*Pago:* ${method}\n*Referencia:* ${refCode}\n\n⚠️ Ingresa al panel de administrador en la app para verificar y aprobar.`;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("❌ Error enviando alerta a Telegram:", err);
  }
};

// 💰 EXTRAE LOS 3 PRECIOS DE LA BASE DE DATOS
const getCurrentCompanyPrices = async () => {
  try {
    const currentYear = new Date().getFullYear().toString();
    const activeTariff = await db.select({ 
        basic: tariffs.priceBasic,
        premium: tariffs.pricePremium,
        unlimited: tariffs.priceUnlimited
    })
    .from(tariffs)
    .innerJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`) 
    .where(and(sql`${typeDetail.typeCode} ILIKE 'Company%'`, eq(tariffs.isActive, true), eq(tariffs.planType, currentYear)))
    .limit(1);

    if (activeTariff && activeTariff.length > 0) {
      return {
        basic: activeTariff[0].basic || "50.00",
        premium: activeTariff[0].premium || "99.00",
        unlimited: activeTariff[0].unlimited || "149.00"
      };
    }
  } catch (error) {
    console.warn("⚠️ Error obteniendo tarifas de Empresa, usando valores por defecto");
  }
  return { basic: "50.00", premium: "99.00", unlimited: "149.00" };
};

export const getCompanies = async (currentUserId?: string) => {
  try {
    let query = db.select().from(companies)
      .leftJoin(payments, and(eq(payments.entityId, companies.id), eq(payments.entityType, 'company')))
      .orderBy(desc(companies.createdAt))
      .$dynamic();

    if (currentUserId) {
      query = query.where(eq(companies.userId, currentUserId));
    }

    const rows = await query;
    if (!rows || rows.length === 0) return [];

    const companiesMap = new Map<string, any>();

    for (const row of rows) {
      const compId = row.companies.id;
      if (!companiesMap.has(compId)) {
        let publicUrl = row.companies.logoUrl;
        if (publicUrl && !publicUrl.startsWith('http')) {
            const cleanName = publicUrl.startsWith('companies/') ? publicUrl : `companies/${publicUrl}`;
            const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(cleanName, 3600); 
            if (data?.signedUrl) publicUrl = data.signedUrl;
        }

        companiesMap.set(compId, {
          ...row.companies,
          logoUrl: publicUrl,
          referenceCode: row.payments?.referenceCode || null,
          paymentMethod: row.payments?.paymentMethod || null,
        });
      }
    }

    return Array.from(companiesMap.values());
  } catch (error: any) {
    console.error("❌ Error en getCompanies:", error);
    return [];
  }
};

export const getCompanyById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) return null;

    const rows = await db.select().from(companies)
      .leftJoin(payments, and(eq(payments.entityId, companies.id), eq(payments.entityType, 'company')))
      .where(eq(companies.id, cleanId));
  
    if (!rows || rows.length === 0) return null;
    
    const company = rows[0].companies;
    if (company.logoUrl && !company.logoUrl.startsWith('http')) {
        const cleanName = company.logoUrl.startsWith('companies/') ? company.logoUrl : `companies/${company.logoUrl}`;
        const { data } = await supabase.storage.from(NOMBRE_BUCKET).createSignedUrl(cleanName, 3600);
        if (data?.signedUrl) company.logoUrl = data.signedUrl;
    }

    return {
      ...company,
      referenceCode: rows[0].payments?.referenceCode || null,
      paymentMethod: rows[0].payments?.paymentMethod || null,
    };
  } catch (error: any) {
    throw new Error(`Error al obtener la empresa: ${error.message}`);
  }
};

export const createCompany = async (data: any) => {
  try {
    const createdCompanyResult = await db.transaction(async (tx) => {
      let finalLogoUrl = sanitizeText(data.logoUrl) || '';

      if (data.logoBase64) {
        try {
          const fileName = `logo_${Date.now()}_${Math.round(Math.random() * 1000)}.webp`;
          const buffer = Buffer.from(data.logoBase64, 'base64');
          
          const { data: uploadData, error } = await supabase.storage
            .from(NOMBRE_BUCKET)
            .upload(`companies/${fileName}`, buffer, {
              contentType: 'image/webp', 
              upsert: false
            });
          
          if (!error && uploadData?.path) {
            finalLogoUrl = fileName; 
          }
        } catch (err) { }
      } else if (finalLogoUrl.startsWith('companies/')) {
        finalLogoUrl = finalLogoUrl.replace('companies/', '');
      }

      const validUserId = sanitizeText(data.userId) || TEMP_USER_ID;
      const selectedPlan = sanitizeText(data.premiumPlan) || 'basic';
      const metodoPago = data.paymentMethod ? String(data.paymentMethod).toLowerCase().trim() : '';
      const codigoReferencia = data.referenceCode ? String(data.referenceCode).trim() : '';

      // 🚀 1. MAGIA DEL CUPÓN: Validamos por el plan O por el método de pago
      const isCoupon = selectedPlan === 'cupon' || metodoPago === 'cupon';

      if (isCoupon) {
        if (!codigoReferencia) throw new Error("Por favor, ingresa el código del cupón.");
        const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, codigoReferencia));
        
        if (!promo) throw new Error("El cupón ingresado no existe.");
        if (promo.isUsed) throw new Error("Este cupón ya fue utilizado.");
      }
      
      const companyPayload: any = {
        userId: validUserId,
        name: sanitizeText(data.name) || 'Empresa Sin Nombre',
        ein: sanitizeText(data.ein) || null, 
        phoneCode: sanitizeText(data.phoneCode) || '+1',
        phone: sanitizeText(data.phone) || '',
        contactMethod: sanitizeText(data.contactMethod) || 'whatsapp',
        email: sanitizeText(data.email) || null,
        website: sanitizeText(data.website) || null,
        logoUrl: finalLogoUrl, 
        isVerified: isCoupon ? true : false, // 👈 Si es cupón, nace verificada
        premiumPlan: isCoupon ? 'cupon' : selectedPlan, // 👈 Ajuste dinámico del plan
        status: isCoupon ? 'approved' : 'pending', // 👈 Si es cupón, nace aprobada
      };

      const [newCompany] = await tx.insert(companies).values(companyPayload).returning();

      // 🚀 Si hay un código, registramos el pago
      if (codigoReferencia && metodoPago) {
        const prices = await getCurrentCompanyPrices();
        let amountToPay = prices.basic;
        if (selectedPlan === 'premium') amountToPay = prices.premium;
        if (selectedPlan === 'unlimited') amountToPay = prices.unlimited;

        await tx.insert(payments).values({
          entityType: 'company',
          entityId: newCompany.id,
          userId: validUserId,
          referenceCode: codigoReferencia, 
          paymentMethod: metodoPago, 
          amount: isCoupon ? "0.00" : amountToPay, // 👈 Monto cero si es cupón
          durationDays: 30, 
          status: isCoupon ? "approved" : "pending", // 👈 Pago aprobado de inmediato
          approvedAt: isCoupon ? new Date() : null
        });
      }

      // 🚀 2. QUEMAR EL CUPÓN
      if (isCoupon) {
        await tx.update(promoCodes)
        .set({
          isUsed: true, 
          usedByUserId: validUserId, 
          usedForEntityId: newCompany.id, 
          entityType: 'company',
          usedAt: new Date() 
        })
        .where(eq(promoCodes.code, codigoReferencia)); 
      }

      return {
         ...newCompany,
         referenceCode: codigoReferencia,
         paymentMethod: metodoPago
      };
    });

      // 🚀 NUEVO: DISPARA LA ALERTA A TELEGRAM
      if (createdCompanyResult) {
        sendTelegramAlert(
          createdCompanyResult.name,
          createdCompanyResult.referenceCode || 'N/A',
          createdCompanyResult.paymentMethod || 'N/A'
        ).catch(e => console.log("Notificación de Telegram falló", e));
      }

      return createdCompanyResult;

  } catch (error: any) { 
    if (error.code === '23505' || error.message.includes('unique constraint')) {
       throw new Error("Ya existe una empresa registrada con este EIN o referencia de pago duplicada.");
    }
    throw new Error(`Error al registrar la empresa: ${error.message}`);
  }
};

export const updateCompany = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    return await db.transaction(async (tx) => {
      const updatePayload: any = { updatedAt: new Date() };
      const allowedFields = ['name', 'ein', 'phoneCode', 'phone', 'contactMethod', 'email', 'website', 'logoUrl', 'premiumPlan'];
      
      for (const key of allowedFields) {
        if (data[key] !== undefined) updatePayload[key] = sanitizeText(data[key]);
      }

      if (data.logoUrl && data.logoUrl.startsWith('companies/')) {
        updatePayload.logoUrl = data.logoUrl.replace('companies/', '');
      }

      const isApproved = String(data.approved).toLowerCase() === 'true';

      if (isApproved) {
        updatePayload.status = 'approved';
        updatePayload.isVerified = true; 
        
        // Mantener el plan de la empresa
        const compCurrent = await tx.select({ premiumPlan: companies.premiumPlan }).from(companies).where(eq(companies.id, cleanId)).limit(1);
        const planActive = compCurrent.length > 0 ? compCurrent[0].premiumPlan : 'basic';
        
        let monthsToAdd = Number(data.durationMonths) || 1; 
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + monthsToAdd);
        updatePayload.timepostEnd = expirationDate; 

        const prices = await getCurrentCompanyPrices();
        let basePrice = Number(prices.basic);
        if (planActive === 'premium') basePrice = Number(prices.premium);
        if (planActive === 'unlimited') basePrice = Number(prices.unlimited);

        const totalAmount = (monthsToAdd * basePrice).toFixed(2); 

        await tx.update(payments)
          .set({ 
             status: "approved", 
             approvedAt: new Date(), 
             durationDays: monthsToAdd * 30, 
             amount: totalAmount, 
             timepost_end: expirationDate 
          })
          .where(and(eq(payments.entityId, cleanId), eq(payments.entityType, 'company')));

        const comp = await tx.select({ userId: companies.userId, name: companies.name }).from(companies).where(eq(companies.id, cleanId)).limit(1);
        if (comp.length > 0) {
            await tx.insert(notifications).values({
                title: "¡Empresa Verificada! 🏢",
                description: `La suscripción de ${comp[0].name} ha sido aprobada. Ya puedes publicar vacantes sin límite.`,
                type: "alert", 
                visibleAt: new Date(), 
                userId: comp[0].userId || TEMP_USER_ID, 
            });
        }
      }

      const updated = await tx.update(companies).set(updatePayload).where(eq(companies.id, cleanId)).returning();
      return updated[0] || null;
    });

  } catch (error: any) { 
    throw new Error(`Error al actualizar la empresa: ${error.message}`);
  }
};

export const renewCompany = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    const refCode = sanitizeText(data.referenceCode);
    const payMethod = sanitizeText(data.paymentMethod);

    if (!refCode || !payMethod || !cleanId) throw new Error("Se requiere el código de referencia y método de pago.");

    return await db.transaction(async (tx) => {
      const compCurrent = await tx.select({ premiumPlan: companies.premiumPlan }).from(companies).where(eq(companies.id, cleanId)).limit(1);
      const planActive = compCurrent.length > 0 ? compCurrent[0].premiumPlan : 'basic';

      const prices = await getCurrentCompanyPrices();
      let amountToPay = prices.basic;
      if (planActive === 'premium') amountToPay = prices.premium;
      if (planActive === 'unlimited') amountToPay = prices.unlimited;

      await tx.insert(payments).values({
        entityType: 'company',
        entityId: cleanId,
        userId: sanitizeText(data.userId) || TEMP_USER_ID, 
        referenceCode: refCode, 
        paymentMethod: payMethod, 
        amount: amountToPay, 
        durationDays: 30, 
        status: "pending"
      });

      const updated = await tx.update(companies).set({ status: 'pending', isVerified: false }).where(eq(companies.id, cleanId)).returning();
        
      return { ...updated[0], referenceCode: refCode, paymentMethod: payMethod };
    });

  } catch (error: any) { 
    if (error.code === '23505' || error.message.includes('unique constraint')) {
       throw new Error("Ese código de referencia de pago ya fue utilizado.");
    }
    throw new Error(`Error al renovar la suscripción: ${error.message}`);
  }
};

export const deleteCompany = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(companies).where(eq(companies.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la empresa: ${error.message}`);
  }
};