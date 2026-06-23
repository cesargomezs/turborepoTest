import { db } from "../../../../packages/db/src"; 
import { tariffs, typeDetail } from "../../../../packages/db/src/schema"; 
import { eq, and, sql,ilike } from "drizzle-orm";

// 🛡️ FUNCIÓN DE SEGURIDAD ANTI-XSS: Siempre devuelve un string, nunca null
const sanitizeText = (str: any): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

// 🔍 1. OBTENER TARIFAS
export const getTariffs = async (typeCode?: string, onlyActive: boolean = true) => {
  try {
    const cleanTypeCode = sanitizeText(typeCode);
    const currentYear = new Date().getFullYear().toString(); 
    
    const rows = await db.select({
        id: tariffs.id,
        referenceId: tariffs.referenceId,
        planType: tariffs.planType,
        price: tariffs.priceBasic,
        description: tariffs.description,
        isActive: tariffs.isActive,
        createdAt: tariffs.createdAt,
        userId: tariffs.userId,
        typeCode: typeDetail.typeCode 
    })
    .from(tariffs)
    .leftJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`)
    .where(
      and(
        eq(tariffs.planType, currentYear),
        onlyActive ? eq(tariffs.isActive, true) : undefined,
        // 🚀 Drizzle nativo: Filtra estricto ignorando mayúsculas/minúsculas
        cleanTypeCode ? ilike(typeDetail.typeCode, `${cleanTypeCode}%`) : undefined
      )
    );

    return rows;
  } catch (error: any) {
    console.error("❌ Error en getTariffs:", error);
    throw new Error(`Error al obtener las tarifas: ${error.message}`);
  }
};

// 🔍 2. OBTENER UNA TARIFA POR ID
export const getTariffById = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const rows = await db.select({
        id: tariffs.id,
        referenceId: tariffs.referenceId,
        planType: tariffs.planType,
        price: tariffs.priceBasic,
        description: tariffs.description,
        isActive: tariffs.isActive,
        createdAt: tariffs.createdAt,
        userId: tariffs.userId,
        typeCode: typeDetail.typeCode
    })
    .from(tariffs)
    .leftJoin(typeDetail, sql`${tariffs.referenceId} = ${typeDetail.id}::text`)
    .where(eq(tariffs.id, cleanId));

    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`Error al obtener la tarifa: ${error.message}`);
  }
};

// 📥 3. CREAR NUEVA TARIFA
export const createTariff = async (data: any) => {
  try {
    let resolvedReferenceId = sanitizeText(data.referenceId);
    
    if (!resolvedReferenceId && data.typeCode) {
      const typeCodeRecord = await db.select({ id: typeDetail.id })
        .from(typeDetail)
        .where(sql`${typeDetail.typeCode} ILIKE ${sanitizeText(data.typeCode)}`)
        .limit(1);
        
      if (typeCodeRecord && typeCodeRecord.length > 0) {
        resolvedReferenceId = typeCodeRecord[0].id;
      }
    }

    const currentYear = new Date().getFullYear().toString();

    // 🚀 FIX DE TYPESCRIPT: Quitamos los "|| null" porque el esquema espera Strings
    const payload = {
      referenceId: resolvedReferenceId || 'general',
      planType: sanitizeText(data.planType) || currentYear, 
      price: String(Number(data.price || 0).toFixed(2)), 
      description: sanitizeText(data.description), // sanitizeText ya maneja los vacíos
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      userId: sanitizeText(data.userId) // Eliminado el || null
    };

    const newTariff = await db.insert(tariffs).values(payload).returning();
    return newTariff[0];
  } catch (error: any) {
    console.error("❌ Error en createTariff:", error);
    throw new Error(`Error al crear la tarifa: ${error.message}`);
  }
};

// 🔄 4. ACTUALIZAR TARIFA 
export const updateTariff = async (id: string, data: any) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const updatePayload: any = {};

    if (data.referenceId !== undefined) updatePayload.referenceId = sanitizeText(data.referenceId);
    if (data.planType !== undefined) updatePayload.planType = sanitizeText(data.planType);
    if (data.price !== undefined) updatePayload.price = String(Number(data.price).toFixed(2));
    if (data.description !== undefined) updatePayload.description = sanitizeText(data.description);
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);
    
    // 🚀 FIX DE TYPESCRIPT: Asignamos un string seguro, sin nulls
    if (data.userId !== undefined) updatePayload.userId = sanitizeText(data.userId); 

    const updated = await db.update(tariffs)
      .set(updatePayload)
      .where(eq(tariffs.id, cleanId))
      .returning();

    return updated[0] || null;
  } catch (error: any) {
    console.error("❌ Error en updateTariff:", error);
    throw new Error(`Error al actualizar la tarifa: ${error.message}`);
  }
};

// 🗑️ 5. ELIMINAR TARIFA
export const deleteTariff = async (id: string) => {
  try {
    const cleanId = sanitizeText(id);
    if (!cleanId) throw new Error("ID inválido");

    const deleted = await db.delete(tariffs).where(eq(tariffs.id, cleanId)).returning();
    return deleted[0] || null;
  } catch (error: any) {
    throw new Error(`Error al eliminar la tarifa: ${error.message}`);
  }
};