import { db } from "../../../../packages/db/src";
import { payments, lawyers, stores, jobs, events } from "../../../../packages/db/src/schema"; 
import { eq, desc } from "drizzle-orm";

// 🔍 OBTENER TODOS LOS PAGOS
export const getPendingPayments = async () => {
  try {
    return await db.select()
      .from(payments)
      .where(eq(payments.status, "pending"))
      .orderBy(desc(payments.createdAt));
  } catch (error: any) {
    console.error("❌ Error obteniendo pagos pendientes:", error);
    throw new Error(`Error: ${error.message}`);
  }
};

// ✅ APROBAR PAGO GENÉRICO
export const approveGenericPayment = async (paymentId: string) => {
  try {
    return await db.transaction(async (tx) => {
      
      const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
      
      if (!payment || payment.status !== "pending") {
          throw new Error("Pago no encontrado o ya fue procesado.");
      }

      if (!payment.entityId) {
          throw new Error("El pago no tiene un ID de entidad asociado.");
      }

      const today = new Date();
      const monthsToAdd = Math.round((payment.durationDays || 30) / 30);
      
      const expirationDate = new Date();
      expirationDate.setMonth(today.getMonth() + monthsToAdd);

      // 🚀 Guardamos el resultado en una variable para imprimirlo limpio
      const updatedPayment = await tx.update(payments)
        .set({ 
          status: "approved", 
          approvedAt: today,
          timepost_end: expirationDate 
        })
        .where(eq(payments.id, paymentId))
        .returning(); // Trae la fila actualizada

      // 🚀 Ahora imprimimos el resultado exacto, no la transacción entera
      //console.log("✅ Fila de pago actualizada:", updatedPayment[0]);

      switch (payment.entityType) {
        case 'lawyer':
          await tx.update(lawyers)
            .set({ 
              approved: true, 
              timepostEnd: expirationDate 
            })
            .where(eq(lawyers.id, payment.entityId));
          break;

        case 'store':
          // await tx.update(stores)
          //   .set({ approved: true, timepostEnd: expirationDate })
          //   .where(eq(stores.id, payment.entityId));
          break;

        default:
          throw new Error(`Tipo de entidad desconocida: ${payment.entityType}`);
      }

      return { 
        success: true, 
        message: `${payment.entityType} aprobado hasta ${expirationDate.toLocaleDateString()}` 
      };
    });
  } catch (error: any) {
    console.error("❌ Error aprobando pago maestro:", error.message);
    throw error;
  }
};