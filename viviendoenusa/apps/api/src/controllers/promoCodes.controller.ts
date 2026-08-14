import { db } from "../../../../packages/db/src";
import { promoCodes } from "../../../../packages/db/src/schema";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";

// 🚀 GENERAR CUPÓN (Para que tú lo uses desde tu panel SAdmin o Postman)
export const generatePromoCode = async (req: Request, res: Response) => {
    try {
      let newCode = "";
      let exists = true;
      
      // Bucle de seguridad: Si por coincidencia existe, vuelve a generar otro al instante
      while (exists) {
        newCode = `VIP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const [found] = await db.select().from(promoCodes).where(eq(promoCodes.code, newCode));
        if (!found) exists = false; // Si no existe, rompemos el ciclo y lo usamos
      }
  
      const [newPromo] = await db.insert(promoCodes).values({
        code: newCode,
        isUsed: false
      }).returning();
  
      return res.status(201).json({ success: true, promoCode: newPromo });
    } catch (error: any) {
      return res.status(500).json({ error: `Error al generar cupón: ${error.message}` });
    }
  };

// 🚀 VALIDAR CUPÓN (Para verificar si existe y no se ha usado)
export const validatePromoCode = async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      if (!code) return res.status(400).json({ error: "Código requerido" });
  
      // 🚀 SOLUCIÓN: Convertimos a String explícitamente para evitar el error TS2339
      const cleanCode = String(code).trim();
  
      const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, cleanCode));
  
      if (!promo) return res.status(404).json({ error: "El cupón no existe." });
      if (promo.isUsed) return res.status(400).json({ error: "Este cupón ya fue utilizado." });
  
      return res.status(200).json({ success: true, message: "Cupón válido y disponible." });
    } catch (error: any) {
      return res.status(500).json({ error: `Error al validar cupón: ${error.message}` });
    }
  };