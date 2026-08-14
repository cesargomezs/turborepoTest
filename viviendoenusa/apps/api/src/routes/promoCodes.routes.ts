import { Router } from "express";
import { generatePromoCode, validatePromoCode } from "../controllers/promoCodes.controller";

const router = Router();

// Endpoint para crear el cupón (Asegúrate de protegerlo luego con tu middleware de Admin)
router.post("/generate", generatePromoCode);

// Endpoint para validar si el cupón está activo
router.get("/validate/:code", validatePromoCode);

export default router;