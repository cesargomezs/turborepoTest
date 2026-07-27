import { Request, Response } from 'express';
import { db } from "../../../../packages/db/src"; 
import { userTermsAcceptance } from "../../../../packages/db/src/schema"; 
import { eq, sql } from 'drizzle-orm'; // 🚀 Importamos sql

const sanitizeText = (str: any) => {
  if (typeof str !== 'string') return null;
  return str.replace(/<[^>]*>?/gm, '').trim();
};

export const acceptTerms = async (req: Request, res: Response) => {
  const userId = sanitizeText(req.body.userId);
  
  const forwarded = req.headers['x-forwarded-for'];
  const ipString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const rawIp = ipString ? ipString.split(',')[0].trim() : req.socket.remoteAddress || req.ip || '0.0.0.0';
  const ipAddress = sanitizeText(rawIp);

  try {
    if (!userId) {
      return res.status(400).json({ error: "El userId es requerido" });
    }

    await db.insert(userTermsAcceptance).values({
      userId: userId, 
      ipAddress: ipAddress,
      acceptedAt: new Date(),
      user_id: userId,
      ip_address: ipAddress,
      accepted_at: new Date()
    } as any);

    return res.status(201).json({ message: "Términos aceptados correctamente" });
  } catch (error: any) {
    console.error("❌ Error registrando términos:", error.message);
    return res.status(500).json({ error: "Error interno al registrar la aceptación de términos" });
  }
};

export const checkTermsStatus = async (req: Request, res: Response) => {
  const userId = sanitizeText(req.params.userId);
  
  try {
    if (!userId) {
      return res.status(400).json({ error: "El userId es requerido" });
    }

    const result = await db
      .select()
      .from(userTermsAcceptance)
      .where(eq((userTermsAcceptance as any).userId || (userTermsAcceptance as any).user_id, userId)) 
      .limit(1);
  
    return res.status(200).json({ hasAccepted: result.length > 0 });
  } catch (error: any) {
    console.error("❌ Error consultando términos:", error.message);
    return res.status(500).json({ error: "Error interno al consultar estado de términos" });
  }
};

// 🚀 NUEVA FUNCIÓN: Obtener los términos dinámicos
export const getActiveTerms = async (req: Request, res: Response) => {
  try {
    // Consultamos la tabla public.legal_documents por el documento activo
    // Drizzle devuelve el array de resultados directamente
    const result = await db.execute(sql`
      SELECT version, content_html 
      FROM public.legal_documents 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    // Evaluamos si el array tiene elementos
    if (result && result.length > 0) {
      return res.status(200).json(result[0]);
    }
    
    return res.status(404).json({ error: "No hay términos y condiciones activos" });
  } catch (error: any) {
    console.error("❌ Error obteniendo términos legales:", error.message);
    return res.status(500).json({ error: "Error interno al obtener el documento legal" });
  }
};