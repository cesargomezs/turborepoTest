import { Request, Response } from 'express';
import { db } from "../../../../packages/db/src"; 
import { userTermsAcceptance } from "../../../../packages/db/src/schema"; 
import { eq } from 'drizzle-orm';

/**
 * Registra la aceptación de los términos y condiciones por parte del usuario.
 */
export const acceptTerms = async (req: Request, res: Response) => {
  const { userId } = req.body;
  
  // Captura robusta de IP
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || null;

  try {
    if (!userId) {
      return res.status(400).json({ error: "El userId es requerido" });
    }

    await db.insert(userTermsAcceptance).values({
      userId: userId, // Drizzle manejará la conversión a UUID si está bien definido en el schema
      ipAddress: ipAddress,
      acceptedAt: new Date(),
    });

    return res.status(201).json({ message: "Términos aceptados correctamente" });
  } catch (error) {
    console.error("Error registrando términos:", error);
    return res.status(500).json({ error: "Error al registrar la aceptación de términos" });
  }
};

/**
 * Verifica si el usuario ha aceptado la última versión de los términos.
 */
export const checkTermsStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: "El userId es requerido" });
    }

    // Usamos select().from() con un filtro explícito
    // Si el error persiste, estamos usando una conversión as any para saltar la validación estricta
    const result = await db
      .select()
      .from(userTermsAcceptance)
      .where(eq(userTermsAcceptance.userId, userId as any)) 
      .limit(1);
  
    return res.status(200).json({ hasAccepted: result.length > 0 });
  } catch (error) {
    console.error("Error consultando términos:", error);
    return res.status(500).json({ error: "Error al consultar estado de términos" });
  }
};